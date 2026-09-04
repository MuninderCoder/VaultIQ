import crypto from 'crypto';
import path from 'path';
import { Types } from 'mongoose';
import { DocumentModel, IDocument, DocumentStatus } from '../models/Document';
import { localStorageService } from '../storage/local.storage';
import { DocumentListQuery } from '../validators/document.validator';
import { logger } from '../utils/logger';

export interface DocumentUploadInput {
  title?: string;
  description?: string;
  tags?: string[] | string;
}

export interface DocumentStatsResult {
  totalDocuments: number;
  totalStorageUsed: number;
  recentDocuments: Array<{
    id: string;
    originalName: string;
    extension: string;
    size: number;
    status: DocumentStatus;
    uploadedAt: Date;
  }>;
  byExtension: Record<string, number>;
}

export interface DocumentListResult {
  documents: IDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export class DocumentService {
  /**
   * Uploads and registers a new document for the authenticated user
   */
  static async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    metadataInput?: DocumentUploadInput
  ): Promise<IDocument> {
    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${crypto.randomUUID()}${ext}`;

    // 1. Parse metadata tags
    let tags: string[] = [];
    if (metadataInput?.tags) {
      if (Array.isArray(metadataInput.tags)) {
        tags = metadataInput.tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof metadataInput.tags === 'string') {
        try {
          const parsed = JSON.parse(metadataInput.tags);
          if (Array.isArray(parsed)) {
            tags = parsed.map((t) => String(t).trim()).filter(Boolean);
          } else {
            tags = metadataInput.tags.split(',').map((t) => t.trim()).filter(Boolean);
          }
        } catch {
          tags = metadataInput.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    // 2. Upload file to storage abstraction
    let storagePath: string;
    try {
      storagePath = await localStorageService.upload(file.buffer, storedName, file.mimetype);
    } catch (storageErr) {
      logger.error('Failed to write file to storage:', storageErr);
      throw new Error('Storage write failure. Please try again.');
    }

    // 3. Persist document metadata in MongoDB
    try {
      const document = new DocumentModel({
        owner: new Types.ObjectId(userId),
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        extension: ext.replace('.', ''),
        size: file.size,
        storagePath,
        status: 'UPLOADED',
        metadata: {
          title: metadataInput?.title?.trim() || file.originalname,
          description: metadataInput?.description?.trim() || undefined,
          tags
        },
        uploadedAt: new Date()
      });

      await document.save();
      logger.info(
        `Document uploaded successfully: "${document.originalName}" (${document.size} bytes) for user ${userId}`
      );
      return document;
    } catch (dbErr) {
      // Clean up orphaned stored file on database write failure
      logger.error('Database write failed, cleaning up uploaded file from storage:', dbErr);
      await localStorageService.delete(storagePath).catch(() => {});
      throw dbErr;
    }
  }

  /**
   * Retrieves paginated documents belonging exclusively to the authenticated user
   */
  static async getDocuments(
    userId: string,
    query: DocumentListQuery
  ): Promise<DocumentListResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Strict user ownership filter
    const filter: any = {
      owner: new Types.ObjectId(userId)
    };

    // Status filter
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    // Search filter across originalName, metadata.title, metadata.description, metadata.tags
    if (query.search && query.search.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { originalName: regex },
        { 'metadata.title': regex },
        { 'metadata.description': regex },
        { 'metadata.tags': regex }
      ];
    }

    // Sorting
    let sortOption: any = { uploadedAt: -1 };
    if (query.sort) {
      const sortField = query.sort.startsWith('-') ? query.sort.substring(1) : query.sort;
      const sortDirection = query.sort.startsWith('-') ? -1 : 1;
      sortOption = { [sortField]: sortDirection };
    }

    const [documents, total] = await Promise.all([
      DocumentModel.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      DocumentModel.countDocuments(filter).exec()
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Retrieves single document metadata verifying ownership
   */
  static async getDocumentById(userId: string, documentId: string): Promise<IDocument> {
    const document = await DocumentModel.findOne({
      _id: documentId,
      owner: new Types.ObjectId(userId)
    });

    if (!document) {
      const error = new Error('Document not found');
      (error as any).statusCode = 404;
      throw error;
    }

    return document;
  }

  /**
   * Prepares file stream for download verifying ownership
   */
  static async downloadDocument(
    userId: string,
    documentId: string
  ): Promise<{ stream: NodeJS.ReadableStream; document: IDocument }> {
    const document = await this.getDocumentById(userId, documentId);

    const exists = await localStorageService.exists(document.storagePath);
    if (!exists) {
      const error = new Error('Physical document file is missing from storage');
      (error as any).statusCode = 404;
      throw error;
    }

    const stream = await localStorageService.download(document.storagePath);
    return { stream, document };
  }

  /**
   * Deletes document metadata and physical storage file verifying ownership
   */
  static async deleteDocument(userId: string, documentId: string): Promise<void> {
    const document = await this.getDocumentById(userId, documentId);

    // 1. Delete physical file from storage
    try {
      await localStorageService.delete(document.storagePath);
    } catch (storageErr) {
      logger.warn(`Storage deletion failed for ${document.storagePath}:`, storageErr);
    }

    // 2. Remove document record from MongoDB
    await DocumentModel.deleteOne({ _id: document._id });
    logger.info(`Document ${documentId} ("${document.originalName}") deleted by user ${userId}`);
  }

  /**
   * Aggregates real document statistics for authenticated user
   */
  static async getDocumentStats(userId: string): Promise<DocumentStatsResult> {
    const ownerId = new Types.ObjectId(userId);

    const [totalCount, totalStorageAgg, recentDocs, extAgg] = await Promise.all([
      DocumentModel.countDocuments({ owner: ownerId }),
      DocumentModel.aggregate([
        { $match: { owner: ownerId } },
        { $group: { _id: null, totalBytes: { $sum: '$size' } } }
      ]),
      DocumentModel.find({ owner: ownerId })
        .sort({ uploadedAt: -1 })
        .limit(5)
        .select('_id originalName extension size status uploadedAt')
        .exec(),
      DocumentModel.aggregate([
        { $match: { owner: ownerId } },
        { $group: { _id: '$extension', count: { $sum: 1 } } }
      ])
    ]);

    const totalStorageUsed = totalStorageAgg.length > 0 ? totalStorageAgg[0].totalBytes : 0;

    const byExtension: Record<string, number> = {};
    extAgg.forEach((item) => {
      if (item._id) {
        byExtension[item._id] = item.count;
      }
    });

    return {
      totalDocuments: totalCount,
      totalStorageUsed,
      recentDocuments: recentDocs.map((doc) => ({
        id: doc._id.toString(),
        originalName: doc.originalName,
        extension: doc.extension,
        size: doc.size,
        status: doc.status,
        uploadedAt: doc.uploadedAt
      })),
      byExtension
    };
  }
}

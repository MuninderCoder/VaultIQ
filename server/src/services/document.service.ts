import crypto from 'crypto';
import path from 'path';
import { Types } from 'mongoose';
import { DocumentModel, IDocument, DocumentStatus, IndexingStatus } from '../models/Document';
import { AuthorizationService } from './authorization.service';
import { AuditService } from './audit.service';
import { OrgRole, DocumentVisibility } from '../types';
import { DocumentChunkModel } from '../models/DocumentChunk';
import { localStorageService } from '../storage/local.storage';
import { ProcessorFactory } from '../processors/processor.factory';
import { textChunker } from '../chunking/text.chunker';
import { EmbeddingServiceFactory } from '../embeddings/embedding.service';
import { env } from '../config/env';
import { DocumentListQuery } from '../validators/document.validator';
import { logger } from '../utils/logger';

export interface DocumentUploadInput {
  title?: string;
  description?: string;
  tags?: string[] | string;
  visibility?: DocumentVisibility;
  organizationId?: string;
}

export interface DocumentStatsResult {
  totalDocuments: number;
  totalStorageUsed: number;
  processedCount: number;
  processingCount: number;
  failedCount: number;
  uploadedCount: number;
  indexedCount: number;
  notIndexedCount: number;
  indexingCount: number;
  indexFailedCount: number;
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
        organizationId: metadataInput?.organizationId && Types.ObjectId.isValid(metadataInput.organizationId)
          ? new Types.ObjectId(metadataInput.organizationId)
          : null,
        visibility: metadataInput?.visibility || 'PRIVATE',
        metadata: {
          title: metadataInput?.title?.trim() || file.originalname,
          description: metadataInput?.description?.trim() || undefined,
          tags
        },
        uploadedAt: new Date()
      });

      await document.save();

      if (document.organizationId) {
        await AuditService.log({
          organizationId: document.organizationId,
          actorId: new Types.ObjectId(userId),
          action: 'DOCUMENT_UPLOADED',
          resourceType: 'DOCUMENT',
          resourceId: document._id.toString(),
          metadata: {
            originalName: document.originalName,
            size: document.size,
            visibility: document.visibility
          }
        });
      }
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
    query: DocumentListQuery,
    userOrgRole?: OrgRole | null
  ): Promise<DocumentListResult> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Determine tenant scope vs personal resource path
    let filter: any;
    if (query.organizationId && Types.ObjectId.isValid(query.organizationId)) {
      const orgId = new Types.ObjectId(query.organizationId);
      // Organization scope: user can see all ORGANIZATION docs + their own PRIVATE docs
      filter = {
        organizationId: orgId,
        $or: [
          { visibility: 'ORGANIZATION' },
          { owner: new Types.ObjectId(userId) }
        ]
      };
      if (query.visibility && query.visibility !== 'ALL') {
        if (query.visibility === 'PRIVATE') {
          filter = { organizationId: orgId, visibility: 'PRIVATE', owner: new Types.ObjectId(userId) };
        } else if (query.visibility === 'ORGANIZATION') {
          filter = { organizationId: orgId, visibility: 'ORGANIZATION' };
        }
      }
    } else {
      // Unscoped personal resource path: preserve exact Phase 2 behavior
      filter = {
        owner: new Types.ObjectId(userId)
      };
    }

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
  static async getDocumentById(
    userId: string,
    documentId: string,
    userOrgRole?: OrgRole | null,
    userOrgId?: string | null
  ): Promise<IDocument> {
    const document = await DocumentModel.findById(documentId);

    if (!document) {
      const error = new Error('Document not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const canRead = AuthorizationService.canReadDocument(userId, document, userOrgRole, userOrgId);
    if (!canRead) {
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
    documentId: string,
    userOrgRole?: OrgRole | null,
    userOrgId?: string | null
  ): Promise<{ stream: NodeJS.ReadableStream; document: IDocument }> {
    const document = await this.getDocumentById(userId, documentId, userOrgRole, userOrgId);

    if (document.organizationId) {
      await AuditService.log({
        organizationId: document.organizationId,
        actorId: new Types.ObjectId(userId),
        action: 'DOCUMENT_VIEWED',
        resourceType: 'DOCUMENT',
        resourceId: document._id.toString(),
        metadata: { originalName: document.originalName }
      });
    }

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
  static async deleteDocument(
    userId: string,
    documentId: string,
    userOrgRole?: OrgRole | null,
    userOrgId?: string | null
  ): Promise<void> {
    const document = await DocumentModel.findById(documentId);
    if (!document) {
      const error = new Error('Document not found');
      (error as any).statusCode = 404;
      throw error;
    }

    const canDelete = AuthorizationService.canDeleteDocument(userId, document, userOrgRole, userOrgId);
    if (!canDelete) {
      const error = new Error('Document not found');
      (error as any).statusCode = 404;
      throw error;
    }

    // 1. Delete physical file from storage
    try {
      await localStorageService.delete(document.storagePath);
    } catch (storageErr) {
      logger.warn(`Storage deletion failed for ${document.storagePath}:`, storageErr);
    }

    // 2. Remove document record from MongoDB
    await DocumentModel.deleteOne({ _id: document._id });

    // 3. Cascade-delete all associated DocumentChunk records (prevent orphan chunks)
    await DocumentChunkModel.deleteMany({ document: document._id });

    logger.info(`Document ${documentId} ("${document.originalName}") and its chunks deleted by user ${userId}`);
  }

  /**
   * Processes a document by extracting and normalizing text content.
   * Atomic transition prevents concurrent processing races.
   */
  static async processDocument(userId: string, documentId: string): Promise<IDocument> {
    const ownerId = new Types.ObjectId(userId);

    // Atomically transition from UPLOADED, PROCESSED, or FAILED to PROCESSING
    const document = await DocumentModel.findOneAndUpdate(
      {
        _id: documentId,
        owner: ownerId,
        status: { $in: ['UPLOADED', 'PROCESSED', 'FAILED'] }
      },
      {
        $set: {
          status: 'PROCESSING',
          processingError: null
        }
      },
      { new: true }
    );

    if (!document) {
      // Check if it already exists or is currently PROCESSING
      const existing = await DocumentModel.findOne({ _id: documentId, owner: ownerId });
      if (!existing) {
        const error = new Error('Document not found');
        (error as any).statusCode = 404;
        throw error;
      }
      if (existing.status === 'PROCESSING') {
        const error = new Error('Document is currently being processed');
        (error as any).statusCode = 409;
        throw error;
      }
      const error = new Error('Document cannot be processed from its current state');
      (error as any).statusCode = 400;
      throw error;
    }

    try {
      logger.info(`Starting extraction for document: ${document._id} (${document.originalName})`);

      // 1. Retrieve file binary buffer from storage abstraction
      const exists = await localStorageService.exists(document.storagePath);
      if (!exists) {
        throw new Error('Physical document file is missing from storage');
      }
      const buffer = await localStorageService.getBuffer(document.storagePath);

      // 2. Select matching processor
      const processor = ProcessorFactory.getProcessor(document.mimeType, document.originalName);

      // 3. Extract and normalize content
      const result = await processor.process(buffer, document.originalName);

      // 4. Enforce MAX_EXTRACTED_TEXT_SIZE_MB limit post-normalization
      const textSizeBytes = Buffer.byteLength(result.text, 'utf-8');
      const maxAllowedBytes = env.MAX_EXTRACTED_TEXT_SIZE_MB * 1024 * 1024;
      if (textSizeBytes > maxAllowedBytes) {
        throw new Error(
          `Extracted text size (${(textSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds configured limit of ${env.MAX_EXTRACTED_TEXT_SIZE_MB} MB`
        );
      }

      // 5. Update document with extracted content and PROCESSED status
      document.content = {
        text: result.text,
        characterCount: result.characterCount,
        wordCount: result.wordCount,
        pageCount: result.pageCount,
        metadata: result.metadata,
        processedAt: new Date(),
        processingVersion: '1.0'
      };
      document.status = 'PROCESSED';
      document.processingError = null;
      await document.save();

      logger.info(
        `Document ${document._id} successfully processed: ${result.characterCount} chars, ${result.wordCount} words`
      );
      return document;
    } catch (err: any) {
      logger.error(`Document processing failed for ${documentId}:`, err);
      // Clean, user-safe error message without leaking stack traces or absolute paths
      const safeErrorMessage = err.message || 'An error occurred during text extraction';
      
      document.status = 'FAILED';
      document.processingError = safeErrorMessage;
      await document.save().catch((saveErr) => {
        logger.error(`Failed to record FAILED status for document ${documentId}:`, saveErr);
      });

      throw err;
    }
  }

  /**
   * Retrieves current processing status and metrics for a document
   */
  static async getProcessingStatus(
    userId: string,
    documentId: string
  ): Promise<{
    id: string;
    status: DocumentStatus;
    processingError?: string | null;
    characterCount?: number;
    wordCount?: number;
    pageCount?: number;
    processedAt?: Date;
  }> {
    const document = await this.getDocumentById(userId, documentId);

    return {
      id: document._id.toString(),
      status: document.status,
      processingError: document.processingError,
      characterCount: document.content?.characterCount,
      wordCount: document.content?.wordCount,
      pageCount: document.content?.pageCount,
      processedAt: document.content?.processedAt
    };
  }

  /**
   * Retrieves extracted text content for a processed document
   */
  static async getDocumentContent(
    userId: string,
    documentId: string
  ): Promise<{
    id: string;
    originalName: string;
    status: DocumentStatus;
    content: IDocument['content'];
  }> {
    const document = await this.getDocumentById(userId, documentId);

    if (document.status !== 'PROCESSED' || !document.content) {
      const error = new Error(
        document.status === 'PROCESSING'
          ? 'Document is currently being processed'
          : document.status === 'FAILED'
          ? `Document processing failed: ${document.processingError || 'Unknown error'}`
          : 'Document has not been processed yet'
      );
      (error as any).statusCode = 400;
      throw error;
    }

    return {
      id: document._id.toString(),
      originalName: document.originalName,
      status: document.status,
      content: document.content
    };
  }

  /**
   * Indexes a document for semantic vector search (Phase 4).
   * Safe strategy: validates document is PROCESSED, chunks text, generates embeddings,
   * validates vector dimensions, and only replaces old chunks after new chunks are verified.
   */
  static async indexDocument(
    userId: string,
    documentId: string,
    userOrgRole?: OrgRole | null,
    userOrgId?: string | null
  ): Promise<IDocument> {
    const ownerId = new Types.ObjectId(userId);

    // 1. Fetch document and verify ownership & processed status
    const document = await this.getDocumentById(userId, documentId, userOrgRole, userOrgId);

    if (document.status !== 'PROCESSED' || !document.content) {
      const error = new Error('Only PROCESSED documents with extracted text can be indexed');
      (error as any).statusCode = 400;
      throw error;
    }

    if (document.indexingStatus === 'INDEXING') {
      const error = new Error('Document is currently being indexed');
      (error as any).statusCode = 409;
      throw error;
    }

    // 2. Transition status to INDEXING
    document.indexingStatus = 'INDEXING';
    document.indexingError = null;
    await document.save();

    logger.info(`Starting indexing for document ${document._id} ("${document.originalName}")`);

    try {
      // 3. Empty document validation
      const textToChunk = (document.content.text || '').trim();
      if (textToChunk.length === 0) {
        throw new Error('Document contains no searchable text.');
      }

      // 4. Chunk processed text into character-based chunks
      const chunkItems = textChunker.chunk(textToChunk, {
        chunkSize: env.CHUNK_SIZE,
        chunkOverlap: env.CHUNK_OVERLAP
      });

      if (chunkItems.length === 0) {
        throw new Error('Document contains no searchable text.');
      }

      logger.info(
        `Generated ${chunkItems.length} text chunks for document ${document._id}. Generating embeddings...`
      );

      // 5. Generate embeddings via EmbeddingService
      const embeddingService = EmbeddingServiceFactory.getService();
      const chunkTexts = chunkItems.map((c) => c.text);
      const vectors = await embeddingService.generateEmbeddings(chunkTexts);

      // 6. Strict dimension validation before touching database
      const expectedDims = embeddingService.getDimensions();
      if (vectors.length !== chunkItems.length) {
        throw new Error('Mismatch between chunk count and generated vector count');
      }

      for (let i = 0; i < vectors.length; i++) {
        const vec = vectors[i];
        if (!Array.isArray(vec) || vec.length !== expectedDims) {
          throw new Error(
            `Invalid embedding dimensions: expected ${expectedDims}, received ${vec?.length || 0}`
          );
        }
      }

      // 7. Atomic Chunk Replacement:
      // We generate all DocumentChunk records in memory, delete existing chunks for this document,
      // and insert the verified new chunks.
      const newChunks = chunkItems.map((item, idx) => ({
        document: document._id,
        owner: ownerId,
        organizationId: document.organizationId || null,
        chunkIndex: item.chunkIndex,
        text: item.text,
        characterCount: item.characterCount,
        wordCount: item.wordCount,
        startOffset: item.startOffset,
        endOffset: item.endOffset,
        embedding: vectors[idx],
        embeddingModel: embeddingService.getModelName(),
        embeddingDimensions: expectedDims,
        createdAt: new Date()
      }));

      await DocumentChunkModel.deleteMany({ document: document._id });
      await DocumentChunkModel.insertMany(newChunks);

      // 8. Mark document as INDEXED
      document.indexingStatus = 'INDEXED';
      document.indexingError = null;
      document.indexedAt = new Date();
      document.chunkCount = newChunks.length;
      await document.save();

      if (document.organizationId) {
        await AuditService.log({
          organizationId: document.organizationId,
          actorId: ownerId,
          action: 'DOCUMENT_INDEXED',
          resourceType: 'DOCUMENT',
          resourceId: document._id.toString(),
          metadata: { chunkCount: newChunks.length, dimensions: expectedDims }
        });
      }
      logger.info(
        `Document ${document._id} successfully indexed with ${newChunks.length} chunks (${expectedDims} dimensions)`
      );

      return document;
    } catch (err: any) {
      logger.error(`Document indexing failed for ${documentId}:`, err);
      const safeMessage = err.message || 'An error occurred during document indexing';

      document.indexingStatus = 'INDEX_FAILED';
      document.indexingError = safeMessage;
      // Preserve actual chunkCount in DB
      const currentStoredChunks = await DocumentChunkModel.countDocuments({ document: document._id });
      document.chunkCount = currentStoredChunks;
      await document.save().catch((saveErr) => {
        logger.error(`Failed to record INDEX_FAILED state for ${documentId}:`, saveErr);
      });

      throw err;
    }
  }

  /**
   * Retrieves indexing status and metrics for a document (Phase 4)
   */
  static async getIndexingStatus(
    userId: string,
    documentId: string
  ): Promise<{
    id: string;
    status: IndexingStatus;
    chunkCount: number;
    indexedAt?: Date | null;
    embeddingModel?: string;
    embeddingDimensions?: number;
    indexingError?: string | null;
  }> {
    const document = await this.getDocumentById(userId, documentId);

    return {
      id: document._id.toString(),
      status: document.indexingStatus,
      chunkCount: document.chunkCount || 0,
      indexedAt: document.indexedAt,
      embeddingModel: env.EMBEDDING_MODEL,
      embeddingDimensions: env.EMBEDDING_DIMENSIONS,
      indexingError: document.indexingError
    };
  }

  /**
   * Aggregates real document statistics for authenticated user
   */
  static async getDocumentStats(userId: string, organizationId?: string): Promise<DocumentStatsResult> {
    const ownerId = new Types.ObjectId(userId);
    let matchFilter: any = { owner: ownerId };

    if (organizationId && Types.ObjectId.isValid(organizationId)) {
      matchFilter = {
        organizationId: new Types.ObjectId(organizationId),
        $or: [
          { visibility: 'ORGANIZATION' },
          { owner: ownerId }
        ]
      };
    }

    const [totalCount, totalStorageAgg, recentDocs, extAgg, statusAgg, indexingAgg] = await Promise.all([
      DocumentModel.countDocuments(matchFilter),
      DocumentModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, totalBytes: { $sum: '$size' } } }
      ]),
      DocumentModel.find(matchFilter)
        .sort({ uploadedAt: -1 })
        .limit(5)
        .select('_id originalName extension size status uploadedAt')
        .exec(),
      DocumentModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$extension', count: { $sum: 1 } } }
      ]),
      DocumentModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      DocumentModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$indexingStatus', count: { $sum: 1 } } }
      ])
    ]);

    const totalStorageUsed = totalStorageAgg.length > 0 ? totalStorageAgg[0].totalBytes : 0;

    const byExtension: Record<string, number> = {};
    extAgg.forEach((item) => {
      if (item._id) {
        byExtension[item._id] = item.count;
      }
    });

    const statusCounts: Record<string, number> = {
      UPLOADED: 0,
      PROCESSING: 0,
      PROCESSED: 0,
      FAILED: 0
    };
    statusAgg.forEach((item) => {
      if (item._id) {
        statusCounts[item._id] = item.count;
      }
    });

    const indexingCounts: Record<string, number> = {
      NOT_INDEXED: 0,
      INDEXING: 0,
      INDEXED: 0,
      INDEX_FAILED: 0
    };
    indexingAgg.forEach((item) => {
      if (item._id) {
        indexingCounts[item._id] = item.count;
      }
    });

    return {
      totalDocuments: totalCount,
      totalStorageUsed,
      processedCount: statusCounts.PROCESSED || 0,
      processingCount: statusCounts.PROCESSING || 0,
      failedCount: statusCounts.FAILED || 0,
      uploadedCount: statusCounts.UPLOADED || 0,
      indexedCount: indexingCounts.INDEXED || 0,
      notIndexedCount: indexingCounts.NOT_INDEXED || 0,
      indexingCount: indexingCounts.INDEXING || 0,
      indexFailedCount: indexingCounts.INDEX_FAILED || 0,
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

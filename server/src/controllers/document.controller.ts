import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { DocumentService } from '../services/document.service';
import { ApiResponseHandler } from '../utils/apiResponse';

export class DocumentController {
  /**
   * POST /api/v1/documents
   * Authenticated multipart file upload
   */
  static async uploadDocument(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      if (!req.file) {
        ApiResponseHandler.error(res, 'No file uploaded', null, 400);
        return;
      }

      const metadata = {
        title: req.body?.title,
        description: req.body?.description,
        tags: req.body?.tags
      };

      const document = await DocumentService.uploadDocument(
        req.user.userId,
        req.file,
        metadata
      );

      ApiResponseHandler.created(res, 'Document uploaded successfully', { document });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents
   * List documents with server-side pagination, search & status filters
   */
  static async getDocuments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const result = await DocumentService.getDocuments(req.user.userId, req.query as any);
      ApiResponseHandler.success(res, 'Documents retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents/stats
   * Retrieve document statistics for authenticated user
   */
  static async getDocumentStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const stats = await DocumentService.getDocumentStats(req.user.userId);
      ApiResponseHandler.success(res, 'Document statistics retrieved successfully', { stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents/:id
   * Get single document metadata
   */
  static async getDocumentById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const document = await DocumentService.getDocumentById(
        req.user.userId,
        req.params.id
      );
      ApiResponseHandler.success(res, 'Document retrieved successfully', { document });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents/:id/download
   * Download the actual stored document binary stream
   */
  static async downloadDocument(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const { stream, document } = await DocumentService.downloadDocument(
        req.user.userId,
        req.params.id
      );

      // Safe header disposition with RFC 5987 encoding
      const encodedFilename = encodeURIComponent(document.originalName).replace(/['()]/g, escape);

      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', document.size);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${document.originalName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedFilename}`
      );

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/documents/:id
   * Delete document metadata and stored file
   */
  static async deleteDocument(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      await DocumentService.deleteDocument(req.user.userId, req.params.id);
      ApiResponseHandler.success(res, 'Document deleted successfully', { deleted: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/documents/:id/process
   * Trigger text extraction processing for a document
   */
  static async processDocument(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const document = await DocumentService.processDocument(
        req.user.userId,
        req.params.id
      );

      ApiResponseHandler.success(res, 'Document processed successfully', { document });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents/:id/processing
   * Query processing status and extraction metrics
   */
  static async getProcessingStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const status = await DocumentService.getProcessingStatus(
        req.user.userId,
        req.params.id
      );

      ApiResponseHandler.success(res, 'Processing status retrieved successfully', { status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/documents/:id/content
   * Retrieve normalized extracted text and metadata
   */
  static async getDocumentContent(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const result = await DocumentService.getDocumentContent(
        req.user.userId,
        req.params.id
      );

      ApiResponseHandler.success(res, 'Document content retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  }
}


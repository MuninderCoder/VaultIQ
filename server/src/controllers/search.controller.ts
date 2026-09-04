import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { SearchService } from '../services/search.service';
import { ApiResponseHandler } from '../utils/apiResponse';

export class SearchController {
  /**
   * GET /api/v1/search?q=...&limit=...
   * Performs semantic vector search over user's indexed document chunks
   */
  static async searchSemantic(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const query = (req.query.q as string) || '';
      const limit = typeof req.query.limit === 'number' ? req.query.limit : parseInt((req.query.limit as string) || '10', 10);

      const result = await SearchService.searchSemantic(req.user.userId, query, limit);

      ApiResponseHandler.success(res, 'Semantic search completed successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

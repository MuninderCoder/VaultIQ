import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ChatService } from '../services/chat.service';
import { ApiResponseHandler } from '../utils/apiResponse';

export class ChatController {
  public static async createConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const conversation = await ChatService.createConversation(
        req.user.userId,
        req.body?.title,
        req.organizationId || req.body?.organizationId
      );

      ApiResponseHandler.success(
        res,
        'Conversation created successfully',
        { conversation },
        201
      );
    } catch (error) {
      next(error);
    }
  }

  public static async listConversations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const result = await ChatService.listConversations(
        req.user.userId,
        50,
        1,
        req.organizationId || (req.query as any).organizationId
      );
      ApiResponseHandler.success(
        res,
        'Conversations retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  public static async getConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const result = await ChatService.getConversationById(
        req.user.userId,
        req.params.id,
        req.organizationId
      );

      ApiResponseHandler.success(
        res,
        'Conversation retrieved successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  }

  public static async deleteConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      await ChatService.deleteConversation(
        req.user.userId,
        req.params.id,
        req.organizationId
      );
      ApiResponseHandler.success(
        res,
        'Conversation deleted successfully',
        { id: req.params.id }
      );
    } catch (error) {
      next(error);
    }
  }

  public static async sendMessage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Authentication required', null, 401);
        return;
      }

      const result = await ChatService.sendMessage(
        req.user.userId,
        req.params.id,
        req.body.message,
        req.organizationId
      );

      ApiResponseHandler.success(
        res,
        'Message processed successfully',
        result
      );
    } catch (error) {
      next(error);
    }
  }
}

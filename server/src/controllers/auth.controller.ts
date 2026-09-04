import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { ApiResponseHandler } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      ApiResponseHandler.created(res, 'User registered successfully', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      ApiResponseHandler.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/me
   */
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        ApiResponseHandler.error(res, 'Unauthorized', null, 401);
        return;
      }

      const profile = await AuthService.getUserProfile(req.user.userId);
      ApiResponseHandler.success(res, 'User profile retrieved successfully', { user: profile });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.userId) {
        await AuthService.logout(req.user.userId);
      }
      ApiResponseHandler.success(res, 'Logged out successfully', { loggedOut: true });
    } catch (error) {
      next(error);
    }
  }
}

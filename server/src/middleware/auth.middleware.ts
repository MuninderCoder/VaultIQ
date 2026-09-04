import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { AuthService } from '../services/auth.service';
import { ApiResponseHandler } from '../utils/apiResponse';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ApiResponseHandler.error(
      res,
      'Authentication required. No Bearer token provided.',
      null,
      401
    );
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = AuthService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    ApiResponseHandler.error(
      res,
      error.message || 'Invalid authentication token',
      null,
      401
    );
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponseHandler.error(res, 'Authentication required', null, 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      ApiResponseHandler.error(
        res,
        'Forbidden: Insufficient permissions to access this resource',
        null,
        403
      );
      return;
    }

    next();
  };
};

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ApiResponseHandler } from '../utils/apiResponse';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const isProduction = env.NODE_ENV === 'production';

  // Log full error internally with stack trace
  logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`, {
    statusCode,
    stack: err.stack,
    ip: req.ip
  });

  // Handle specific Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'Field';
    ApiResponseHandler.error(
      res,
      `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      null,
      409
    );
    return;
  }

  // Handle Mongoose CastError (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    ApiResponseHandler.error(res, `Resource not found with specified ${err.path}`, null, 400);
    return;
  }

  // Safe client error message: do not leak raw exception messages in production for 500s
  const message =
    statusCode >= 500 && isProduction
      ? 'An unexpected internal server error occurred'
      : err.message || 'Internal server error';

  const errorData = isProduction ? undefined : { details: err.stack };

  ApiResponseHandler.error(res, message, errorData, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponseHandler.error(
    res,
    `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
    null,
    404
  );
};

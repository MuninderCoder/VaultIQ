import { Response } from 'express';
import { ApiResponse } from '../types';

export class ApiResponseHandler {
  static success<T>(res: Response, message: string, data?: T, statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined && { data })
    };
    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, message: string, data?: T): Response {
    return this.success(res, message, data, 201);
  }

  static error(res: Response, message: string, error?: unknown, statusCode = 500): Response {
    const response: ApiResponse = {
      success: false,
      message,
      ...(error !== undefined && { error })
    };
    return res.status(statusCode).json(response);
  }
}

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiResponseHandler } from '../utils/apiResponse';
import { env } from '../config/env';

export class HealthController {
  /**
   * GET /api/v1/health
   */
  static getHealth(_req: Request, res: Response): Response {
    const isDbConnected = mongoose.connection.readyState === 1;

    return ApiResponseHandler.success(res, 'VaultIQ API is running', {
      service: 'VaultIQ Core API',
      status: 'operational',
      environment: env.NODE_ENV,
      version: '1.0.0',
      uptimeSeconds: typeof process.uptime === 'function' ? Math.floor(process.uptime()) : 0,
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
      },
      timestamp: new Date().toISOString()
    });
  }
}

import { Types } from 'mongoose';
import { AuditLogModel, IAuditLog, AuditAction, AuditResourceType } from '../models/AuditLog';
import { logger } from '../utils/logger';

export interface CreateAuditLogParams {
  organizationId: string | Types.ObjectId;
  actorId: string | Types.ObjectId;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQueryOptions {
  organizationId: string | Types.ObjectId;
  page?: number;
  limit?: number;
  action?: string;
  actorId?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AuditService {
  private static readonly SENSITIVE_KEYS = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'apikey',
    'authorization',
    'cookie',
    'embedding'
  ];

  /**
   * Sanitizes metadata by removing passwords, tokens, API keys, or large vectors
   */
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (Array.isArray(value) && value.length > 50 && typeof value[0] === 'number') {
        // Redact large numerical arrays (e.g. embeddings)
        sanitized[key] = `[Array of ${value.length} numbers redacted]`;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Appends an immutable audit log entry.
   * Fails safely without disrupting user-facing operations.
   */
  public static async log(params: CreateAuditLogParams): Promise<IAuditLog | null> {
    try {
      const cleanMetadata = this.sanitizeMetadata(params.metadata);
      const logEntry = await AuditLogModel.create({
        organizationId: new Types.ObjectId(params.organizationId),
        actorId: new Types.ObjectId(params.actorId),
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        metadata: cleanMetadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      return logEntry;
    } catch (err: any) {
      logger.warn('Failed to persist audit log entry:', err);
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs for an organization with optional filtering.
   */
  public static async getLogs(
    options: AuditLogQueryOptions
  ): Promise<{ logs: IAuditLog[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(Math.max(1, options.limit || 20), 100);
    const skip = (page - 1) * limit;

    const filter: any = {
      organizationId: new Types.ObjectId(options.organizationId)
    };

    if (options.action) {
      filter.action = options.action;
    }

    if (options.actorId && Types.ObjectId.isValid(options.actorId)) {
      filter.actorId = new Types.ObjectId(options.actorId);
    }

    if (options.resourceType) {
      filter.resourceType = options.resourceType;
    }

    if (options.startDate || options.endDate) {
      filter.createdAt = {};
      if (options.startDate) filter.createdAt.$gte = options.startDate;
      if (options.endDate) filter.createdAt.$lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .populate('actorId', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs: logs as unknown as IAuditLog[],
      total,
      page,
      totalPages
    };
  }
}

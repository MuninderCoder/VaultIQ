import { Schema, model, Document, Types } from 'mongoose';

export type AuditAction =
  | 'ORGANIZATION_CREATED'
  | 'ORGANIZATION_UPDATED'
  | 'MEMBER_INVITED'
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_REMOVED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_UPDATED'
  | 'DOCUMENT_DELETED'
  | 'DOCUMENT_INDEXED'
  | 'CONVERSATION_CREATED'
  | 'MESSAGE_SENT';

export type AuditResourceType =
  | 'ORGANIZATION'
  | 'MEMBER'
  | 'DOCUMENT'
  | 'CONVERSATION'
  | 'MESSAGE';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor user ID is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      index: true
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      index: true
    },
    resourceId: {
      type: String,
      required: [true, 'Resource ID is required']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: undefined
    },
    userAgent: {
      type: String,
      default: undefined
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Indexes for tenant isolation and efficient querying
auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, actorId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, resourceType: 1, createdAt: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', auditLogSchema);

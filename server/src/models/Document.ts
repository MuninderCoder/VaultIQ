import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface IDocumentMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface IDocumentContent {
  text: string;
  characterCount: number;
  wordCount: number;
  pageCount?: number;
  metadata?: Record<string, any>;
  processedAt: Date;
  processingVersion: string;
}

export interface IDocument extends MongooseDocument {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  originalName: string;
  storedName: string;
  mimeType: string;
  extension: string;
  size: number;
  storagePath: string;
  status: DocumentStatus;
  processingError?: string | null;
  metadata: IDocumentMetadata;
  content?: IDocumentContent;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Document owner is required'],
      index: true
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    storedName: {
      type: String,
      required: [true, 'Stored filename is required'],
      trim: true
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    extension: {
      type: String,
      required: [true, 'File extension is required'],
      lowercase: true,
      trim: true
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [1, 'File size must be greater than 0 bytes']
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'],
      default: 'UPLOADED',
      required: true,
      index: true
    },
    processingError: {
      type: String,
      default: null
    },
    metadata: {
      title: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      tags: {
        type: [String],
        default: []
      }
    },
    content: {
      text: {
        type: String
      },
      characterCount: {
        type: Number
      },
      wordCount: {
        type: Number
      },
      pageCount: {
        type: Number
      },
      metadata: {
        type: Schema.Types.Mixed
      },
      processedAt: {
        type: Date
      },
      processingVersion: {
        type: String
      }
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound indexes for user isolation and efficient listing
documentSchema.index({ owner: 1, uploadedAt: -1 });
documentSchema.index({ owner: 1, originalName: 1 });
documentSchema.index({ owner: 1, status: 1 });

export const DocumentModel = model<IDocument>('Document', documentSchema);

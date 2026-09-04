import { Schema, model, Document, Types } from 'mongoose';
import { IRagSource } from '../rag/rag.interface';

export type MessageRole = 'user' | 'assistant';

export interface IMessageSource {
  documentId: Types.ObjectId;
  documentName: string;
  chunkId: Types.ObjectId;
  chunkIndex: number;
  similarityScore: number;
}

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  owner: Types.ObjectId;
  role: MessageRole;
  content: string;
  sources: IMessageSource[];
  createdAt: Date;
}

const messageSourceSchema = new Schema<IMessageSource>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    documentName: {
      type: String,
      required: true
    },
    chunkId: {
      type: Schema.Types.ObjectId,
      ref: 'DocumentChunk',
      required: true
    },
    chunkIndex: {
      type: Number,
      required: true
    },
    similarityScore: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message owner is required'],
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: [true, 'Message role is required']
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true
    },
    sources: {
      type: [messageSourceSchema],
      default: []
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Compound index for querying ordered messages within a conversation
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ owner: 1, createdAt: -1 });

export const MessageModel = model<IMessage>('Message', messageSchema);

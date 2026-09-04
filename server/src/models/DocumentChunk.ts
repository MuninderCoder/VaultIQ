import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';

export interface IDocumentChunk extends MongooseDocument {
  _id: Types.ObjectId;
  document: Types.ObjectId;
  owner: Types.ObjectId;
  chunkIndex: number;
  text: string;
  characterCount: number;
  wordCount: number;
  startOffset: number;
  endOffset: number;
  embedding: number[];
  embeddingModel: string;
  embeddingDimensions: number;
  createdAt: Date;
}

const documentChunkSchema = new Schema<IDocumentChunk>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Parent document ID is required'],
      index: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true
    },
    chunkIndex: {
      type: Number,
      required: [true, 'Chunk index is required']
    },
    text: {
      type: String,
      required: [true, 'Chunk text content is required']
    },
    characterCount: {
      type: Number,
      required: true
    },
    wordCount: {
      type: Number,
      required: true
    },
    startOffset: {
      type: Number,
      required: true
    },
    endOffset: {
      type: Number,
      required: true
    },
    embedding: {
      type: [Number],
      required: [true, 'Vector embedding array is required']
    },
    embeddingModel: {
      type: String,
      required: true
    },
    embeddingDimensions: {
      type: Number,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Compound index for user-isolated queries and document chunk ordering
documentChunkSchema.index({ owner: 1, document: 1, chunkIndex: 1 });

export const DocumentChunkModel = model<IDocumentChunk>('DocumentChunk', documentChunkSchema);

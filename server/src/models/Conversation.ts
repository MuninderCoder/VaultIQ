import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Conversation owner is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Conversation title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index for user thread listing sorted by recent activity
conversationSchema.index({ owner: 1, updatedAt: -1 });

export const ConversationModel = model<IConversation>('Conversation', conversationSchema);

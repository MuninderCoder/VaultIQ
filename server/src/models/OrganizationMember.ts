import { Schema, model, Document, Types } from 'mongoose';
import { OrgRole } from '../types';

export interface IOrganizationMember extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrgRole;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'],
      default: 'VIEWER',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound unique index ensuring a user can only have one membership per organization
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ userId: 1 });

export const OrganizationMemberModel = model<IOrganizationMember>(
  'OrganizationMember',
  organizationMemberSchema
);

import { Schema, model, Document, Types } from 'mongoose';
import { UserRole, IUserProfile } from '../types';

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  toProfile(): IUserProfile;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return passwordHash by default in queries
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
      required: true
    },
    avatar: {
      type: String,
      trim: true,
      default: undefined
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Method to safely convert document to sanitized user profile without sensitive fields
userSchema.methods.toProfile = function (): IUserProfile {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const User = model<IUserDocument>('User', userSchema);

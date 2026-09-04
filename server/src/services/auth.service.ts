import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { IAuthPayload, IUserProfile } from '../types';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AuthResult {
  token: string;
  user: IUserProfile;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Register a new user account
   */
  static async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      const error = new Error('An account with this email address already exists');
      (error as any).statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(input.password, this.SALT_ROUNDS);

    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role || 'USER'
    });

    await user.save();
    logger.info(`New user registered: ${user.email} (Role: ${user.role})`);

    const userProfile = user.toProfile();
    const token = this.generateToken(userProfile);

    return { token, user: userProfile };
  }

  /**
   * Authenticate a user by email and password
   */
  static async login(input: LoginInput): Promise<AuthResult> {
    // Explicitly query passwordHash which is select: false by default
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user) {
      logger.warn(`Authentication failed: User with email ${input.email} not found`);
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      logger.warn(`Authentication failed: Incorrect password for user ${input.email}`);
      const error = new Error('Invalid email or password');
      (error as any).statusCode = 401;
      throw error;
    }

    logger.info(`User logged in successfully: ${user.email}`);

    const userProfile = user.toProfile();
    const token = this.generateToken(userProfile);

    return { token, user: userProfile };
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<IUserProfile> {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      (error as any).statusCode = 404;
      throw error;
    }

    return user.toProfile();
  }

  /**
   * Invalidate or record logout action
   * Designed to support token revocation / redis session blacklist in later phases
   */
  static async logout(userId: string): Promise<void> {
    logger.info(`User session logged out: ${userId}`);
    // Hook point for Phase 6 token revocation / session table cleanup
  }

  /**
   * Generate signed JWT token
   */
  static generateToken(user: IUserProfile): string {
    const payload: IAuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    });
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): IAuthPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as IAuthPayload;
    } catch (err) {
      const error = new Error('Invalid or expired authentication token');
      (error as any).statusCode = 401;
      throw error;
    }
  }
}

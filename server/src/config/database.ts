import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    mongoose.set('strictQuery', true);

    let connection: typeof mongoose;
    try {
      connection = await mongoose.connect(env.MONGODB_URI);
    } catch (primaryErr: any) {
      if (env.MONGODB_URI.startsWith('mongodb+srv://') && primaryErr?.message?.includes('querySrv')) {
        logger.warn('Initial MongoDB Atlas SRV DNS query failed. Retrying with public DNS resolvers (8.8.8.8, 8.8.4.4)...');
        dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
        connection = await mongoose.connect(env.MONGODB_URI);
      } else {
        throw primaryErr;
      }
    }

    logger.info(`MongoDB connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB via MONGODB_URI:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
  }
};

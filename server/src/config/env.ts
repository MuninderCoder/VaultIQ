import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Load environment variables from .env if present (look in current dir or root)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required and must be an explicit MongoDB URI'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters for secure signing'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  API_VERSION: z.string().default('v1'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().default('25').transform((val) => parseInt(val, 10))
});

export type EnvConfig = z.infer<typeof envSchema>;

const parseEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error('Invalid environment variables detected on startup:');
    result.error.errors.forEach((err) => {
      logger.error(` - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();

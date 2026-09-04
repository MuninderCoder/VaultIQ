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
  MAX_FILE_SIZE_MB: z.string().default('25').transform((val) => parseInt(val, 10)),
  MAX_EXTRACTED_TEXT_SIZE_MB: z.string().default('10').transform((val) => parseInt(val, 10)),
  // Phase 4: Semantic & Vector Search Configuration
  EMBEDDING_PROVIDER: z.enum(['openai', 'mock']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: z.string().default('1536').transform((val) => parseInt(val, 10)),
  EMBEDDING_BATCH_SIZE: z.string().default('50').transform((val) => parseInt(val, 10)),
  CHUNK_SIZE: z.string().default('1000').transform((val) => parseInt(val, 10)),
  CHUNK_OVERLAP: z.string().default('150').transform((val) => parseInt(val, 10)),
  MAX_SEARCH_RESULTS: z.string().default('50').transform((val) => parseInt(val, 10)),
  VECTOR_SEARCH_ENGINE: z.enum(['atlas', 'local']).default('local'),
  // Phase 5: RAG & AI Assistant Configuration
  LLM_PROVIDER: z.enum(['openai', 'mock']).default('openai'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_TEMPERATURE: z.string().default('0.2').transform((val) => parseFloat(val)),
  LLM_MAX_OUTPUT_TOKENS: z.string().default('1000').transform((val) => parseInt(val, 10)),
  RAG_TOP_K: z.string().default('5').transform((val) => parseInt(val, 10)),
  RAG_MIN_SIMILARITY: z.string().default('0.5').transform((val) => parseFloat(val)),
  RAG_MAX_CONTEXT_CHARS: z.string().default('6000').transform((val) => parseInt(val, 10)),
  CHAT_HISTORY_LIMIT: z.string().default('10').transform((val) => parseInt(val, 10)),
  CHAT_MAX_MESSAGE_LENGTH: z.string().default('2000').transform((val) => parseInt(val, 10))
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

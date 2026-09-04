import { IEmbeddingService } from './embedding.interface';
import { OpenAIEmbeddingService } from './openai.embedding';
import { MockEmbeddingService } from './mock.embedding';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class EmbeddingServiceFactory {
  private static instance: IEmbeddingService | null = null;

  public static getService(): IEmbeddingService {
    if (this.instance) {
      return this.instance;
    }

    if (env.EMBEDDING_PROVIDER === 'mock' || env.NODE_ENV === 'test') {
      logger.info('Initializing MockEmbeddingService (deterministic test provider)');
      this.instance = new MockEmbeddingService(env.EMBEDDING_DIMENSIONS, 'mock-deterministic');
    } else {
      logger.info(`Initializing OpenAIEmbeddingService with model: ${env.EMBEDDING_MODEL}`);
      this.instance = new OpenAIEmbeddingService(
        env.OPENAI_API_KEY,
        env.EMBEDDING_MODEL,
        env.EMBEDDING_DIMENSIONS,
        env.EMBEDDING_BATCH_SIZE
      );
    }

    return this.instance;
  }

  /**
   * Allows setting a custom embedding service instance (useful for automated tests)
   */
  public static setInstance(service: IEmbeddingService | null): void {
    this.instance = service;
  }
}

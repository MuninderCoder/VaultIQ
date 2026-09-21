import { ILLMService } from './llm.interface';
import { OpenAILLMService } from './openai.llm';
import { MockLLMService } from './mock.llm';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class LLMServiceFactory {
  private static instance: ILLMService | null = null;

  public static getService(): ILLMService {
    if (this.instance) {
      return this.instance;
    }

    const provider = process.env.LLM_PROVIDER || env.LLM_PROVIDER;
    const hasApiKey = Boolean(env.OPENAI_API_KEY || process.env.OPENAI_API_KEY);

    if (provider === 'mock' || env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test' || (!hasApiKey && env.NODE_ENV === 'development')) {
      if (!hasApiKey && provider === 'openai') {
        logger.warn('OPENAI_API_KEY is not configured. Falling back to MockLLMService for local development.');
      } else {
        logger.info('Initializing MockLLMService (deterministic test mode)');
      }
      this.instance = new MockLLMService();
    } else if (provider === 'openai') {
      logger.info(`Initializing OpenAILLMService with model: ${env.LLM_MODEL}`);
      this.instance = new OpenAILLMService();
    } else {
      throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
    }

    return this.instance;
  }

  public static setService(service: ILLMService | null): void {
    this.instance = service;
  }
}

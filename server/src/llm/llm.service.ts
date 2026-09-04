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

    if (provider === 'mock' || env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') {
      logger.info('Initializing MockLLMService (deterministic test mode)');
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

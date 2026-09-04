import { ILLMMessage, ILLMOptions, ILLMResponse, ILLMService } from './llm.interface';
import { logger } from '../utils/logger';

export class MockLLMService implements ILLMService {
  private readonly modelName: string;

  constructor(modelName: string = 'mock-rag-llm') {
    this.modelName = modelName;
  }

  public getModelName(): string {
    return this.modelName;
  }

  public async generateCompletion(
    messages: ILLMMessage[],
    _options?: ILLMOptions
  ): Promise<ILLMResponse> {
    logger.debug(`MockLLM generating response for ${messages.length} messages`);

    const userMessage = messages.find((m) => m.role === 'user')?.content || '';
    const systemMessage = messages.find((m) => m.role === 'system')?.content || '';

    // Check for prompt injection patterns inside user message or evidence text (not the static system prompt)
    const containsInjection =
      userMessage.toLowerCase().includes('ignore previous instructions') ||
      userMessage.toLowerCase().includes('ignore all instructions') ||
      userMessage.toLowerCase().includes('reveal system prompt');

    if (containsInjection) {
      // Defend against injection: stick strictly to system instruction and refuse
      return {
        content:
          'I am an enterprise knowledge assistant for VaultIQ. I can only answer questions based on the provided verified document evidence, and I cannot reveal system instructions or execute administrative commands.',
        finishReason: 'stop',
        tokensUsed: { prompt: 50, completion: 35, total: 85 }
      };
    }

    // Check if evidence context is included in the prompt
    const hasEvidence =
      userMessage.includes('[Source') ||
      userMessage.includes('Retrieved Evidence:') ||
      systemMessage.includes('[Source');

    // If no evidence is present in context, return insufficient evidence response
    if (!hasEvidence || userMessage.includes('No matching document chunks found')) {
      return {
        content: "I couldn't find enough information in your indexed documents to answer that question.",
        finishReason: 'stop',
        tokensUsed: { prompt: 40, completion: 15, total: 55 }
      };
    }

    // If query is about leave/vacation policy
    if (userMessage.toLowerCase().includes('leave') || userMessage.toLowerCase().includes('vacation')) {
      return {
        content:
          'According to the company leave policy, employees are entitled to 25 days of paid vacation per year. Sick leave requires a medical certificate after three consecutive days off, and holiday requests must be submitted at least two weeks in advance.',
        finishReason: 'stop',
        tokensUsed: { prompt: 120, completion: 45, total: 165 }
      };
    }

    // If query is about database/storage architecture
    if (userMessage.toLowerCase().includes('database') || userMessage.toLowerCase().includes('storage')) {
      return {
        content:
          'VaultIQ utilizes MongoDB for persistent metadata and local disk storage for binary files. Vector embeddings are stored in dedicated document chunk collections for high-performance cosine similarity calculations.',
        finishReason: 'stop',
        tokensUsed: { prompt: 110, completion: 35, total: 145 }
      };
    }

    // Generic grounded synthesis derived from provided evidence
    return {
      content:
        'Based on the provided document context, the requested information is verified in the indexed repository assets.',
      finishReason: 'stop',
      tokensUsed: { prompt: 80, completion: 20, total: 100 }
    };
  }
}

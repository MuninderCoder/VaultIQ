export interface ILLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface ILLMResponse {
  content: string;
  finishReason?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ILLMService {
  generateCompletion(messages: ILLMMessage[], options?: ILLMOptions): Promise<ILLMResponse>;
  getModelName(): string;
}

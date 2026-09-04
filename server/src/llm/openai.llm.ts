import https from 'https';
import http from 'http';
import { ILLMMessage, ILLMOptions, ILLMResponse, ILLMService } from './llm.interface';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class OpenAILLMService implements ILLMService {
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;

  constructor(
    apiKey?: string,
    modelName?: string,
    defaultTemperature?: number,
    defaultMaxTokens?: number
  ) {
    this.apiKey = apiKey || env.OPENAI_API_KEY || '';
    if (!this.apiKey && env.LLM_PROVIDER === 'openai') {
      throw new Error(
        'Configuration Error: OPENAI_API_KEY environment variable is required when LLM_PROVIDER=openai'
      );
    }
    this.modelName = modelName || env.LLM_MODEL;
    this.defaultTemperature = defaultTemperature ?? env.LLM_TEMPERATURE;
    this.defaultMaxTokens = defaultMaxTokens ?? env.LLM_MAX_OUTPUT_TOKENS;
  }

  public getModelName(): string {
    return this.modelName;
  }

  public async generateCompletion(
    messages: ILLMMessage[],
    options?: ILLMOptions
  ): Promise<ILLMResponse> {
    if (!messages || messages.length === 0) {
      throw new Error('Messages list cannot be empty');
    }

    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;

    return this.callOpenAIWithRetry(messages, temperature, maxTokens);
  }

  private async callOpenAIWithRetry(
    messages: ILLMMessage[],
    temperature: number,
    maxTokens: number,
    maxRetries: number = 3
  ): Promise<ILLMResponse> {
    let delayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = JSON.stringify({
          model: this.modelName,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          temperature,
          max_tokens: maxTokens
        });

        const responseBody = await this.postRequest('https://api.openai.com/v1/chat/completions', payload);
        const parsed = JSON.parse(responseBody);

        if (parsed.error) {
          throw new Error(`OpenAI API Error: ${parsed.error.message || 'Unknown error'}`);
        }

        const choice = parsed.choices?.[0];
        if (!choice || !choice.message || typeof choice.message.content !== 'string') {
          throw new Error('Malformed or empty response structure from OpenAI Chat API');
        }

        return {
          content: choice.message.content.trim(),
          finishReason: choice.finish_reason,
          tokensUsed: parsed.usage
            ? {
                prompt: parsed.usage.prompt_tokens,
                completion: parsed.usage.completion_tokens,
                total: parsed.usage.total_tokens
              }
            : undefined
        };
      } catch (err: any) {
        logger.warn(`OpenAI Chat API call failed (attempt ${attempt}/${maxRetries}): ${err.message}`);
        if (attempt === maxRetries) {
          throw new Error(`LLM generation failed after ${maxRetries} attempts: ${err.message}`);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new Error('LLM generation request failed');
  }

  private postRequest(targetUrl: string, bodyData: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(targetUrl);
      const isHttps = urlObj.protocol === 'https:';
      const transport = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(bodyData)
        },
        timeout: 45000
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`OpenAI API returned HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('OpenAI API request timed out after 45 seconds'));
      });

      req.write(bodyData);
      req.end();
    });
  }
}

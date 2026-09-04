import https from 'https';
import http from 'http';
import { IEmbeddingService } from './embedding.interface';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class OpenAIEmbeddingService implements IEmbeddingService {
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly dimensions: number;
  private readonly batchSize: number;

  constructor(apiKey?: string, modelName?: string, dimensions?: number, batchSize?: number) {
    this.apiKey = apiKey || env.OPENAI_API_KEY || '';
    if (!this.apiKey && env.EMBEDDING_PROVIDER === 'openai') {
      throw new Error(
        'Configuration Error: OPENAI_API_KEY environment variable is required when EMBEDDING_PROVIDER=openai'
      );
    }
    this.modelName = modelName || env.EMBEDDING_MODEL;
    this.dimensions = dimensions || env.EMBEDDING_DIMENSIONS;
    this.batchSize = batchSize || env.EMBEDDING_BATCH_SIZE;
  }

  public getDimensions(): number {
    return this.dimensions;
  }

  public getModelName(): string {
    return this.modelName;
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    const results = await this.generateEmbeddings([text]);
    return results[0];
  }

  public async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const allEmbeddings: number[][] = [];

    // Process in batches respecting EMBEDDING_BATCH_SIZE
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const chunkBatch = texts.slice(i, i + this.batchSize);
      const batchEmbeddings = await this.callOpenAIWithRetry(chunkBatch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  private async callOpenAIWithRetry(texts: string[], maxRetries: number = 3): Promise<number[][]> {
    let delayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = JSON.stringify({
          model: this.modelName,
          input: texts,
          dimensions: this.dimensions
        });

        const responseBody = await this.postRequest('https://api.openai.com/v1/embeddings', payload);
        const parsed = JSON.parse(responseBody);

        if (parsed.error) {
          throw new Error(`OpenAI API Error: ${parsed.error.message || 'Unknown error'}`);
        }

        if (!parsed.data || !Array.isArray(parsed.data)) {
          throw new Error('Invalid response structure from OpenAI Embeddings API');
        }

        // Sort by index to maintain exact input order
        const sortedData = parsed.data.sort((a: any, b: any) => a.index - b.index);
        const vectors: number[][] = sortedData.map((item: any) => item.embedding);

        // Strict dimension validation
        for (const vec of vectors) {
          if (!Array.isArray(vec) || vec.length !== this.dimensions) {
            throw new Error(
              `Embedding dimension mismatch: expected ${this.dimensions}, received ${vec?.length}`
            );
          }
        }

        return vectors;
      } catch (err: any) {
        logger.warn(`OpenAI embedding request failed (attempt ${attempt}/${maxRetries}): ${err.message}`);
        if (attempt === maxRetries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }

    throw new Error('Failed to generate embeddings after maximum retries');
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
        timeout: 30000
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
        reject(new Error('OpenAI API request timed out after 30 seconds'));
      });

      req.write(bodyData);
      req.end();
    });
  }
}

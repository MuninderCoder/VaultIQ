import crypto from 'crypto';
import { IEmbeddingService } from './embedding.interface';
import { env } from '../config/env';

/**
 * Deterministic Semantic Mock Embedding Service for Automated Testing & Offline Dev.
 *
 * Rather than generating purely random vectors, this mock:
 * 1. Has predefined topic semantic clusters (e.g. 'leave'/'vacation' vs 'database'/'backup' vs 'auth'/'jwt').
 * 2. Words in the same topic cluster receive strong weights in aligned coordinate dimensions.
 * 3. Text is deterministically hashed across the remaining dimensions with L2 unit normalization.
 *
 * This allows semantic search similarity tests to verify true semantic ranking deterministically
 * without requiring live OpenAI API calls or keys.
 */
export class MockEmbeddingService implements IEmbeddingService {
  private readonly dimensions: number;
  private readonly modelName: string;

  constructor(dimensions?: number, modelName?: string) {
    this.dimensions = dimensions || env.EMBEDDING_DIMENSIONS;
    this.modelName = modelName || 'mock-embedding-deterministic';
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
    return texts.map((text) => this.computeVector(text));
  }

  private computeVector(text: string): number[] {
    const vector = new Array(this.dimensions).fill(0);
    const lower = (text || '').toLowerCase();

    // Semantic cluster keywords mapped to specific dimension regions
    const clusters: Array<{ keywords: string[]; baseDim: number; weight: number }> = [
      { keywords: ['leave', 'vacation', 'pto', 'time off', 'holiday', 'sick', 'absence'], baseDim: 10, weight: 5.0 },
      { keywords: ['hr', 'policy', 'employee', 'handbook', 'benefits', 'compensation'], baseDim: 50, weight: 3.0 },
      { keywords: ['database', 'backup', 'mongo', 'storage', 'sql', 'restore', 'replica'], baseDim: 150, weight: 5.0 },
      { keywords: ['security', 'auth', 'jwt', 'token', 'encryption', 'password', 'login'], baseDim: 300, weight: 5.0 },
      { keywords: ['finance', 'quarterly', 'revenue', 'report', 'audit', 'fiscal', 'tax'], baseDim: 450, weight: 5.0 }
    ];

    clusters.forEach((cluster) => {
      let matchedCount = 0;
      cluster.keywords.forEach((kw) => {
        if (lower.includes(kw)) {
          matchedCount++;
        }
      });
      if (matchedCount > 0) {
        for (let i = 0; i < 15; i++) {
          const idx = (cluster.baseDim + i) % this.dimensions;
          vector[idx] += cluster.weight * matchedCount;
        }
      }
    });

    // Hash remaining characters deterministically into the vector
    for (let i = 0; i < lower.length; i++) {
      const code = lower.charCodeAt(i);
      const targetIdx = (i * 31 + code * 17) % this.dimensions;
      vector[targetIdx] += (code % 7) - 3;
    }

    // Hash whole string using SHA-256 for background consistency
    const hash = crypto.createHash('sha256').update(text).digest();
    for (let i = 0; i < hash.length; i++) {
      const idx = (i * 47) % this.dimensions;
      vector[idx] += ((hash[i] / 255) - 0.5);
    }

    // L2 Unit Normalization (sum of squares = 1)
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1;
    for (let i = 0; i < this.dimensions; i++) {
      vector[i] = parseFloat((vector[i] / norm).toFixed(6));
    }

    return vector;
  }
}

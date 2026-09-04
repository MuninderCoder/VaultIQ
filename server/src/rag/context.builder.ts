import { SearchResultItem } from '../services/search.service';
import { IRagSource } from './rag.interface';
import { env } from '../config/env';

export interface BuiltContext {
  contextText: string;
  sources: IRagSource[];
  isSufficient: boolean;
}

export interface IContextBuilder {
  buildContext(
    chunks: SearchResultItem[],
    minSimilarity?: number,
    maxContextChars?: number
  ): BuiltContext;
}

export class ContextBuilder implements IContextBuilder {
  private readonly defaultMinSimilarity: number;
  private readonly defaultMaxContextChars: number;

  constructor(minSimilarity?: number, maxContextChars?: number) {
    this.defaultMinSimilarity = minSimilarity ?? env.RAG_MIN_SIMILARITY;
    this.defaultMaxContextChars = maxContextChars ?? env.RAG_MAX_CONTEXT_CHARS;
  }

  /**
   * Converts raw retrieved search result chunks into bounded, structured evidence.
   * - Filters out chunks below minSimilarity threshold
   * - Sorts descending by similarity score
   * - Enforces maxContextChars limit while preserving top evidence
   */
  public buildContext(
    chunks: SearchResultItem[],
    minSimilarity?: number,
    maxContextChars?: number
  ): BuiltContext {
    const threshold = minSimilarity ?? this.defaultMinSimilarity;
    const maxChars = maxContextChars ?? this.defaultMaxContextChars;

    if (!chunks || chunks.length === 0) {
      return {
        contextText: '',
        sources: [],
        isSufficient: false
      };
    }

    // 1. Filter by minimum similarity score
    const qualifiedChunks = chunks.filter((c) => c.score >= threshold);

    if (qualifiedChunks.length === 0) {
      return {
        contextText: '',
        sources: [],
        isSufficient: false
      };
    }

    // 2. Ensure sorted by similarity score descending
    const sortedChunks = [...qualifiedChunks].sort((a, b) => b.score - a.score);

    const contextSections: string[] = [];
    const sources: IRagSource[] = [];
    let currentLength = 0;

    // 3. Assemble bounded context
    for (let i = 0; i < sortedChunks.length; i++) {
      const chunk = sortedChunks[i];
      const sourceNum = i + 1;

      const sectionHeader = `[Source ${sourceNum}: ${chunk.documentName} (Chunk #${chunk.chunkIndex + 1}, Relevance: ${(chunk.score * 100).toFixed(1)}%)]\n`;
      const availableChars = maxChars - currentLength - sectionHeader.length;

      if (availableChars <= 50) {
        // Not enough room for meaningful content
        break;
      }

      let chunkText = chunk.text.trim();
      if (chunkText.length > availableChars) {
        chunkText = chunkText.substring(0, availableChars) + '... [truncated]';
      }

      const section = `${sectionHeader}Content:\n${chunkText}\n`;
      contextSections.push(section);
      currentLength += section.length;

      sources.push({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        chunkId: chunk.chunkId,
        chunkIndex: chunk.chunkIndex,
        similarityScore: chunk.score
      });

      if (currentLength >= maxChars) {
        break;
      }
    }

    const contextText = contextSections.join('\n---\n\n');

    return {
      contextText,
      sources,
      isSufficient: sources.length > 0 && contextText.trim().length > 0
    };
  }
}

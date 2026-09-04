import { Types } from 'mongoose';
import { DocumentChunkModel } from '../models/DocumentChunk';
import { DocumentModel } from '../models/Document';
import { EmbeddingServiceFactory } from '../embeddings/embedding.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface SearchResultItem {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  text: string;
  score: number;
  characterCount: number;
  wordCount: number;
}

export interface SemanticSearchResult {
  query: string;
  count: number;
  results: SearchResultItem[];
}

export class SearchService {
  /**
   * Performs semantic vector search strictly isolated by authenticated user ownership.
   *
   * PRODUCTION Engine (Atlas Vector Search):
   * Runs $vectorSearch aggregation pipeline with pre-filtering by owner.
   *
   * LOCAL / TEST Engine:
   * Queries DocumentChunk directly filtering strictly by owner, computes exact cosine similarity,
   * sorts descending by relevance, and slices to top-K limit.
   */
  public static async searchSemantic(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<SemanticSearchResult> {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      const error = new Error('Search query cannot be empty');
      (error as any).statusCode = 400;
      throw error;
    }

    const cappedLimit = Math.min(Math.max(1, limit), env.MAX_SEARCH_RESULTS);
    const ownerId = new Types.ObjectId(userId);

    // 1. Generate dense query vector via EmbeddingService
    const embeddingService = EmbeddingServiceFactory.getService();
    const queryVector = await embeddingService.generateEmbedding(trimmedQuery);

    logger.info(
      `Executing semantic search for user ${userId} with engine: ${env.VECTOR_SEARCH_ENGINE} (limit: ${cappedLimit})`
    );

    // 2. Execute vector search based on configured engine
    if (env.VECTOR_SEARCH_ENGINE === 'atlas') {
      return this.searchAtlasVector(ownerId, queryVector, trimmedQuery, cappedLimit);
    } else {
      return this.searchLocalCosine(ownerId, queryVector, trimmedQuery, cappedLimit);
    }
  }

  /**
   * Production MongoDB Atlas Vector Search Pipeline.
   * Uses $vectorSearch aggregation stage with strict pre-filtering by owner.
   */
  private static async searchAtlasVector(
    ownerId: Types.ObjectId,
    queryVector: number[],
    query: string,
    limit: number
  ): Promise<SemanticSearchResult> {
    try {
      // MongoDB Atlas Vector Search Aggregation Pipeline
      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector,
            numCandidates: limit * 15,
            limit,
            filter: {
              owner: ownerId
            }
          }
        },
        {
          $lookup: {
            from: 'documents',
            localField: 'document',
            foreignField: '_id',
            as: 'docData'
          }
        },
        { $unwind: '$docData' },
        // Verify document is currently PROCESSED and INDEXED
        {
          $match: {
            'docData.status': 'PROCESSED',
            'docData.indexingStatus': 'INDEXED'
          }
        },
        {
          $project: {
            _id: 1,
            document: 1,
            chunkIndex: 1,
            text: 1,
            characterCount: 1,
            wordCount: 1,
            documentName: '$docData.originalName',
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ];

      const rawResults = await DocumentChunkModel.aggregate(pipeline).exec();

      const results: SearchResultItem[] = rawResults.map((r) => ({
        documentId: r.document.toString(),
        documentName: r.documentName,
        chunkId: r._id.toString(),
        chunkIndex: r.chunkIndex,
        text: r.text,
        score: parseFloat((r.score || 0).toFixed(4)),
        characterCount: r.characterCount,
        wordCount: r.wordCount
      }));

      return {
        query,
        count: results.length,
        results
      };
    } catch (err: any) {
      logger.error('Atlas Vector Search execution failed:', err);
      throw new Error(`Vector Search engine failure: ${err.message || 'Atlas search query failed'}`);
    }
  }

  /**
   * Local / Testing In-Memory Cosine Similarity Engine.
   * Runs exact cosine similarity on user-isolated chunks. Used for test suites and offline dev.
   */
  private static async searchLocalCosine(
    ownerId: Types.ObjectId,
    queryVector: number[],
    query: string,
    limit: number
  ): Promise<SemanticSearchResult> {
    // 1. Find all valid PROCESSED & INDEXED document IDs for this user
    const validDocs = await DocumentModel.find({
      owner: ownerId,
      status: 'PROCESSED',
      indexingStatus: 'INDEXED'
    })
      .select('_id originalName')
      .lean()
      .exec();

    if (validDocs.length === 0) {
      return {
        query,
        count: 0,
        results: []
      };
    }

    const docMap = new Map<string, string>();
    const validDocIds: Types.ObjectId[] = [];
    validDocs.forEach((d) => {
      docMap.set(d._id.toString(), d.originalName);
      validDocIds.push(d._id);
    });

    // 2. Fetch chunks belonging strictly to valid documents of this user
    const chunks = await DocumentChunkModel.find({
      owner: ownerId,
      document: { $in: validDocIds }
    })
      .select('_id document chunkIndex text characterCount wordCount embedding')
      .lean()
      .exec();

    if (chunks.length === 0) {
      return {
        query,
        count: 0,
        results: []
      };
    }

    // 3. Compute cosine similarity for each chunk
    const scoredChunks: Array<{
      chunk: any;
      score: number;
    }> = [];

    for (const chunk of chunks) {
      const score = this.calculateCosineSimilarity(queryVector, chunk.embedding);
      scoredChunks.push({ chunk, score });
    }

    // 4. Sort descending by similarity score
    scoredChunks.sort((a, b) => b.score - a.score);

    // 5. Slice to requested limit
    const topChunks = scoredChunks.slice(0, limit);

    const results: SearchResultItem[] = topChunks.map(({ chunk, score }) => ({
      documentId: chunk.document.toString(),
      documentName: docMap.get(chunk.document.toString()) || 'Document',
      chunkId: chunk._id.toString(),
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      score: parseFloat(score.toFixed(4)),
      characterCount: chunk.characterCount,
      wordCount: chunk.wordCount
    }));

    return {
      query,
      count: results.length,
      results
    };
  }

  /**
   * Calculates cosine similarity between two normalized vectors:
   * (A · B) / (||A|| * ||B||)
   */
  private static calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }
}

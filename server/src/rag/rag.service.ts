import { IRagService, IRagResult, IRagSource } from './rag.interface';
import { IContextBuilder, ContextBuilder } from './context.builder';
import { IPromptBuilder, PromptBuilder } from '../prompts/prompt.builder';
import { ILLMService } from '../llm/llm.interface';
import { LLMServiceFactory } from '../llm/llm.service';
import { SearchService } from '../services/search.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class RagService implements IRagService {
  private readonly contextBuilder: IContextBuilder;
  private readonly promptBuilder: IPromptBuilder;
  private readonly topK: number;
  private readonly minSimilarity: number;

  public static readonly INSUFFICIENT_EVIDENCE_RESPONSE =
    "I couldn't find enough information in your indexed documents to answer that question.";

  constructor(
    contextBuilder?: IContextBuilder,
    promptBuilder?: IPromptBuilder,
    topK?: number,
    minSimilarity?: number
  ) {
    this.contextBuilder = contextBuilder || new ContextBuilder();
    this.promptBuilder = promptBuilder || new PromptBuilder();
    this.topK = topK ?? env.RAG_TOP_K;
    this.minSimilarity = minSimilarity ?? env.RAG_MIN_SIMILARITY;
  }

  /**
   * Complete RAG pipeline:
   * 1. Validates user and question.
   * 2. Retrieves top-K chunks strictly within the user's ownership context using SearchService.
   * 3. Bounded context builder filters and truncates evidence.
   * 4. If no sufficient evidence passes threshold, returns controlled fallback WITHOUT calling LLM.
   * 5. Builds grounded prompt and invokes ILLMService.
   * 6. Returns answer along with verified source citations.
   */
  public async generateAnswer(
    userId: string,
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    organizationId?: string
  ): Promise<IRagResult> {
    const startTime = Date.now();
    const trimmedQuestion = (question || '').trim();

    if (!trimmedQuestion) {
      throw new Error('Question cannot be empty');
    }

    logger.info(
      `RAG executing for user ${userId} (query: "${trimmedQuestion.substring(0, 50)}...", topK: ${this.topK}, minScore: ${this.minSimilarity})`
    );

    // 1. Reuse existing Semantic Search with organization pre-authorization
    const searchResult = await SearchService.searchSemantic(userId, trimmedQuestion, this.topK, organizationId);

    // 2. Build bounded evidence context
    const builtContext = this.contextBuilder.buildContext(
      searchResult.results,
      this.minSimilarity,
      env.RAG_MAX_CONTEXT_CHARS
    );

    // 3. Fast return if evidence is insufficient (Avoid unnecessary LLM cost & prevent hallucination)
    if (!builtContext.isSufficient || builtContext.sources.length === 0) {
      logger.info(
        `RAG insufficient evidence for user ${userId} (raw chunks: ${searchResult.results.length}, qualified: ${builtContext.sources.length})`
      );
      return {
        answer: RagService.INSUFFICIENT_EVIDENCE_RESPONSE,
        sources: [],
        isGrounded: false,
        latencyMs: Date.now() - startTime
      };
    }

    // 4. Build grounded prompt with prompt injection defense
    const messages = this.promptBuilder.buildGroundedPrompt(
      trimmedQuestion,
      builtContext.contextText,
      history
    );

    // 5. Invoke LLM provider
    const llmService: ILLMService = LLMServiceFactory.getService();
    const llmResponse = await llmService.generateCompletion(messages);

    const latencyMs = Date.now() - startTime;
    logger.info(
      `RAG generation completed in ${latencyMs}ms using ${llmService.getModelName()} (${builtContext.sources.length} sources cited)`
    );

    return {
      answer: llmResponse.content,
      sources: builtContext.sources,
      isGrounded: true,
      latencyMs
    };
  }
}

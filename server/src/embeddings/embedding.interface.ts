export interface IEmbeddingService {
  /**
   * Generates a normalized dense vector embedding for a single text.
   * @param text Input text content.
   * @returns Array of numbers representing vector embedding.
   */
  generateEmbedding(text: string): Promise<number[]>;

  /**
   * Generates vector embeddings for a batch of texts.
   * @param texts Array of text strings.
   * @returns Array of embedding vectors.
   */
  generateEmbeddings(texts: string[]): Promise<number[][]>;

  /**
   * Returns configured vector dimensionality.
   */
  getDimensions(): number;

  /**
   * Returns configured embedding model name.
   */
  getModelName(): string;
}

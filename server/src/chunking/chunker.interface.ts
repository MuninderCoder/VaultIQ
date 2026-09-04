export interface DocumentChunkItem {
  chunkIndex: number;
  text: string;
  characterCount: number;
  wordCount: number;
  startOffset: number;
  endOffset: number;
}

export interface ChunkingOptions {
  chunkSize: number; // in characters
  chunkOverlap: number; // in characters
}

export interface IDocumentChunker {
  /**
   * Chunks normalized text into deterministic boundary-aware chunks.
   * @param text Normalized text content.
   * @param options Optional chunk size and overlap override.
   */
  chunk(text: string, options?: Partial<ChunkingOptions>): DocumentChunkItem[];
}

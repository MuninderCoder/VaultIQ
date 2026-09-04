export interface ProcessingResult {
  text: string;
  characterCount: number;
  wordCount: number;
  pageCount?: number;
  metadata?: Record<string, any>;
}

export interface DocumentProcessor {
  /**
   * Extracts raw and normalized text from the supplied buffer.
   * @param buffer Raw document binary buffer.
   * @param originalName Original filename for context/logging.
   */
  process(buffer: Buffer, originalName: string): Promise<ProcessingResult>;
}

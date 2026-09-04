import { DocumentChunkItem, ChunkingOptions, IDocumentChunker } from './chunker.interface';
import { env } from '../config/env';

export class TextChunker implements IDocumentChunker {
  private readonly defaultOptions: ChunkingOptions;

  constructor(options?: Partial<ChunkingOptions>) {
    this.defaultOptions = {
      chunkSize: options?.chunkSize || env.CHUNK_SIZE,
      chunkOverlap: options?.chunkOverlap || env.CHUNK_OVERLAP
    };
  }

  /**
   * Deterministically divides normalized document text into boundary-aware character chunks.
   * Guarantees forward progress (no infinite loops) and preserves original document order.
   */
  public chunk(text: string, options?: Partial<ChunkingOptions>): DocumentChunkItem[] {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const chunkSize = options?.chunkSize ?? this.defaultOptions.chunkSize;
    const chunkOverlap = options?.chunkOverlap ?? this.defaultOptions.chunkOverlap;

    // Boundary check: chunk overlap must be strictly less than chunk size
    const effectiveOverlap = Math.max(0, Math.min(chunkOverlap, chunkSize - 1));

    // If total document length is smaller than or equal to chunkSize, return 1 single chunk
    if (text.length <= chunkSize) {
      return [
        {
          chunkIndex: 0,
          text: text,
          characterCount: text.length,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          startOffset: 0,
          endOffset: text.length
        }
      ];
    }

    const chunks: DocumentChunkItem[] = [];
    let startOffset = 0;
    let chunkIndex = 0;

    while (startOffset < text.length) {
      let targetEnd = startOffset + chunkSize;

      // If remaining text from startOffset fits within chunkSize, take everything to the end
      if (targetEnd >= text.length) {
        const chunkText = text.substring(startOffset);
        if (chunkText.trim().length > 0) {
          chunks.push({
            chunkIndex,
            text: chunkText,
            characterCount: chunkText.length,
            wordCount: chunkText.split(/\s+/).filter(Boolean).length,
            startOffset,
            endOffset: text.length
          });
        }
        break;
      }

      // Look for natural boundary near targetEnd within lookback window (up to effectiveOverlap)
      // Preference order: paragraph break (\n\n), sentence break (. / ? / !), line break (\n), word break (space)
      let splitPoint = -1;
      const lookbackLimit = Math.max(startOffset + 1, targetEnd - effectiveOverlap);
      const searchRegion = text.substring(lookbackLimit, targetEnd);

      // 1. Paragraph break
      const paragraphIdx = searchRegion.lastIndexOf('\n\n');
      if (paragraphIdx !== -1) {
        splitPoint = lookbackLimit + paragraphIdx + 2;
      } else {
        // 2. Sentence end (period, exclamation, question followed by space or newline)
        const sentenceMatch = searchRegion.match(/([.!?][ \n])[^.!?]*$/);
        if (sentenceMatch && sentenceMatch.index !== undefined) {
          splitPoint = lookbackLimit + sentenceMatch.index + sentenceMatch[1].length;
        } else {
          // 3. Single line break
          const lineIdx = searchRegion.lastIndexOf('\n');
          if (lineIdx !== -1) {
            splitPoint = lookbackLimit + lineIdx + 1;
          } else {
            // 4. Word break (space)
            const spaceIdx = searchRegion.lastIndexOf(' ');
            if (spaceIdx !== -1) {
              splitPoint = lookbackLimit + spaceIdx + 1;
            }
          }
        }
      }

      // Fallback: If no natural boundary found, hard-split at targetEnd
      const actualEnd = splitPoint > startOffset ? splitPoint : targetEnd;
      const chunkText = text.substring(startOffset, actualEnd);

      if (chunkText.trim().length > 0) {
        chunks.push({
          chunkIndex,
          text: chunkText,
          characterCount: chunkText.length,
          wordCount: chunkText.split(/\s+/).filter(Boolean).length,
          startOffset,
          endOffset: actualEnd
        });
        chunkIndex++;
      }

      // Next startOffset with overlap
      const nextStart = actualEnd - effectiveOverlap;

      // Strictly guarantee forward progress by at least 1 character to eliminate infinite loops
      if (nextStart <= startOffset) {
        startOffset = actualEnd;
      } else {
        startOffset = nextStart;
      }
    }

    return chunks;
  }
}

export const textChunker = new TextChunker();

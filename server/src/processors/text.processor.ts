import { DocumentProcessor, ProcessingResult } from './processor.interface';
import { TextNormalizer } from '../utils/text-normalizer';
import { logger } from '../utils/logger';

export class TextProcessor implements DocumentProcessor {
  async process(buffer: Buffer, originalName: string): Promise<ProcessingResult> {
    try {
      const rawText = buffer.toString('utf-8');
      const normalized = TextNormalizer.normalize(rawText);

      if (!normalized.text || normalized.text.length === 0) {
        throw new Error('Text document is empty');
      }

      return {
        text: normalized.text,
        characterCount: normalized.characterCount,
        wordCount: normalized.wordCount
      };
    } catch (err: any) {
      logger.warn(`Text processing failed for ${originalName}: ${err.message}`);
      if (err.message && err.message.includes('Text document is empty')) {
        throw err;
      }
      throw new Error(`Failed to extract text from plain document: ${err.message || 'Unable to decode file'}`);
    }
  }
}

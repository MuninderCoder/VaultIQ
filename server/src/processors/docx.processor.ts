import mammoth from 'mammoth';
import { DocumentProcessor, ProcessingResult } from './processor.interface';
import { TextNormalizer } from '../utils/text-normalizer';
import { logger } from '../utils/logger';

export class DocxProcessor implements DocumentProcessor {
  async process(buffer: Buffer, originalName: string): Promise<ProcessingResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const normalized = TextNormalizer.normalize(result.value || '');

      if (!normalized.text || normalized.text.length === 0) {
        throw new Error('DOCX document contains no readable text content');
      }

      return {
        text: normalized.text,
        characterCount: normalized.characterCount,
        wordCount: normalized.wordCount,
        metadata: result.messages && result.messages.length > 0 ? {
          warnings: result.messages.map(m => m.message)
        } : undefined
      };
    } catch (err: any) {
      logger.warn(`DOCX processing failed for ${originalName}: ${err.message}`);
      if (err.message && err.message.includes('no readable text content')) {
        throw err;
      }
      throw new Error(`Failed to extract text from DOCX document: ${err.message || 'Invalid or corrupted file'}`);
    }
  }
}

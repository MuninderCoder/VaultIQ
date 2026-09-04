import pdfParse from 'pdf-parse';
import { DocumentProcessor, ProcessingResult } from './processor.interface';
import { TextNormalizer } from '../utils/text-normalizer';
import { logger } from '../utils/logger';

export class PdfProcessor implements DocumentProcessor {
  async process(buffer: Buffer, originalName: string): Promise<ProcessingResult> {
    try {
      // In Node.js 20+, passing Uint8Array to pdf-parse ensures safe typed array handling across v8 versions
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const data = await pdfParse(uint8 as any);
      const normalized = TextNormalizer.normalize(data.text || '');

      if (!normalized.text || normalized.text.length === 0) {
        throw new Error('PDF contains no extractable text (it may be a scanned or image-only document)');
      }

      const pageCount = typeof data.numpages === 'number' ? data.numpages : undefined;

      return {
        text: normalized.text,
        characterCount: normalized.characterCount,
        wordCount: normalized.wordCount,
        pageCount,
        metadata: data.info ? {
          title: data.info.Title,
          author: data.info.Author,
          creator: data.info.Creator,
          producer: data.info.Producer
        } : undefined
      };
    } catch (err: any) {
      logger.warn(`PDF processing failed for ${originalName}: ${err.message}`);
      if (err.message && err.message.includes('scanned or image-only')) {
        throw err;
      }
      throw new Error(`Failed to extract text from PDF document: ${err.message || 'Invalid or corrupted file'}`);
    }
  }
}

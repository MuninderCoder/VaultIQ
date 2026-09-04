import path from 'path';
import { DocumentProcessor } from './processor.interface';
import { PdfProcessor } from './pdf.processor';
import { DocxProcessor } from './docx.processor';
import { TextProcessor } from './text.processor';

export class ProcessorFactory {
  private static pdfProcessor = new PdfProcessor();
  private static docxProcessor = new DocxProcessor();
  private static textProcessor = new TextProcessor();

  public static getProcessor(mimeType: string, filename: string): DocumentProcessor {
    const ext = path.extname(filename).toLowerCase();

    if (mimeType === 'application/pdf' || ext === '.pdf') {
      return this.pdfProcessor;
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === '.docx' ||
      ext === '.doc'
    ) {
      return this.docxProcessor;
    }

    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      ext === '.txt' ||
      ext === '.md'
    ) {
      return this.textProcessor;
    }

    throw new Error(`Unsupported file format for document processing: ${mimeType || ext}`);
  }
}

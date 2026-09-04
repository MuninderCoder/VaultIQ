/**
 * Text normalization utility for VaultIQ Phase 3 document processing.
 *
 * Normalization pipeline:
 * 1. Normalize line breaks (\r\n -> \n, \r -> \n)
 * 2. Strip non-printable ASCII control characters (keeping \t and \n)
 * 3. Normalize horizontal whitespace (tabs and multiple spaces to single space) on each line
 * 4. Collapse 3 or more consecutive newlines into 2 to preserve paragraph structure
 * 5. Trim leading and trailing whitespace
 * 6. Accurately compute character and word counts
 */

export interface NormalizedTextResult {
  text: string;
  characterCount: number;
  wordCount: number;
}

export class TextNormalizer {
  /**
   * Normalizes raw extracted text from documents while preserving Unicode characters and Markdown formatting.
   */
  public static normalize(rawText: string): NormalizedTextResult {
    if (!rawText || typeof rawText !== 'string') {
      return {
        text: '',
        characterCount: 0,
        wordCount: 0
      };
    }

    // Step 1: Normalize line endings
    let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Step 2: Remove non-printable control characters except \t (0x09) and \n (0x0A)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Step 3: Normalize lines - collapse consecutive spaces/tabs on lines while preserving linebreaks
    text = text
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n');

    // Step 4: Collapse 3 or more consecutive newlines into double newlines to retain paragraph separation
    text = text.replace(/\n{3,}/g, '\n\n');

    // Step 5: Trim leading and trailing document whitespace
    text = text.trim();

    // Step 6: Compute character and word counts
    const characterCount = text.length;
    const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;

    return {
      text,
      characterCount,
      wordCount
    };
  }
}

import { Readable } from 'stream';

export interface IStorageService {
  /**
   * Uploads and stores a file buffer.
   * @param buffer The file content as a Buffer.
   * @param storedName The unique, safe destination filename (e.g. UUID.ext).
   * @param mimeType The detected MIME type of the file.
   * @returns The relative storage path identifier.
   */
  upload(buffer: Buffer, storedName: string, mimeType: string): Promise<string>;

  /**
   * Retrieves a readable stream for downloading a stored file.
   * @param storagePath The storage path returned during upload.
   */
  download(storagePath: string): Promise<Readable>;

  /**
   * Deletes a stored file.
   * @param storagePath The storage path of the file to remove.
   */
  delete(storagePath: string): Promise<void>;

  /**
   * Checks whether a stored file exists.
   * @param storagePath The storage path of the file.
   */
  exists(storagePath: string): Promise<boolean>;

  /**
   * Retrieves the raw Buffer of a stored file for internal processing.
   * @param storagePath The storage path returned during upload.
   */
  getBuffer(storagePath: string): Promise<Buffer>;

  /**
   * Resolves the full physical path or URI for internal operations.
   * @param storagePath The storage path.
   */
  resolvePath(storagePath: string): string;
}

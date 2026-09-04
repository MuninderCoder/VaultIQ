import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { IStorageService } from './storage.interface';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class LocalStorageService implements IStorageService {
  private readonly baseDir: string;

  constructor(customBaseDir?: string) {
    const rawDir = customBaseDir || env.UPLOAD_DIR;
    // Resolve baseDir to an absolute canonical path
    this.baseDir = path.isAbsolute(rawDir)
      ? path.resolve(rawDir)
      : path.resolve(process.cwd(), rawDir);

    this.ensureDirectoryExists(this.baseDir);
    logger.info(`LocalStorageService initialized at: ${this.baseDir}`);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Safely resolves a storage path and verifies that it remains inside baseDir.
   * Throws an error on path traversal attempts (e.g. "../../etc/passwd").
   */
  public resolvePath(storagePath: string): string {
    // Strip leading slashes to ensure path is relative to baseDir
    const sanitized = storagePath.replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
    const resolved = path.resolve(this.baseDir, sanitized);

    const relative = path.relative(this.baseDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Security Error: Path traversal attempt detected');
    }

    return resolved;
  }

  async upload(buffer: Buffer, storedName: string, _mimeType: string): Promise<string> {
    const targetPath = this.resolvePath(storedName);
    await fs.promises.writeFile(targetPath, buffer);
    logger.debug(`File stored locally at: ${targetPath}`);
    return storedName;
  }

  async download(storagePath: string): Promise<Readable> {
    const filePath = this.resolvePath(storagePath);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }
    return fs.createReadStream(filePath);
  }

  async getBuffer(storagePath: string): Promise<Buffer> {
    const filePath = this.resolvePath(storagePath);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found in storage');
    }
    return fs.promises.readFile(filePath);
  }

  async delete(storagePath: string): Promise<void> {
    const filePath = this.resolvePath(storagePath);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.debug(`File deleted from storage: ${filePath}`);
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const filePath = this.resolvePath(storagePath);
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

export const localStorageService = new LocalStorageService();

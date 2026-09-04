import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiResponseHandler } from '../utils/apiResponse';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/octet-stream', // Can occur in some clients for markdown or text
  'text/plain',
  'text/markdown',
  'text/x-markdown'
]);

// Multer memory storage - buffers file in memory for immediate validation before writing to storage
const storage = multer.memoryStorage();

const maxSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(
        `Unsupported file type '${ext}'. Allowed file extensions are: ${ALLOWED_EXTENSIONS.join(
          ', '
        )}`
      )
    );
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new Error(
        `Invalid MIME type '${file.mimetype}'. Please provide a valid PDF, DOCX, TXT, or Markdown document.`
      )
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1
  },
  fileFilter
});

/**
 * Validates file magic bytes to prevent MIME-type spoofing
 */
export const validateFileSignature = (buffer: Buffer, ext: string): boolean => {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  switch (ext) {
    case '.pdf':
      // PDF must begin with %PDF- (hex: 25 50 44 46 2D)
      if (buffer.length < 5) return false;
      return (
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46 &&
        buffer[4] === 0x2d
      );

    case '.docx':
      // DOCX is a ZIP archive, must begin with PK\x03\x04 (hex: 50 4B 03 04)
      if (buffer.length < 4) return false;
      return (
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      );

    case '.txt':
    case '.md':
      // Text files should not contain binary NUL bytes
      for (let i = 0; i < Math.min(buffer.length, 512); i++) {
        if (buffer[i] === 0x00) {
          return false;
        }
      }
      return true;

    default:
      return false;
  }
};

/**
 * Wrapper middleware handling Multer errors and file signature validation
 */
export const documentUploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          ApiResponseHandler.error(
            res,
            `File size exceeds the maximum permitted limit of ${env.MAX_FILE_SIZE_MB} MB`,
            null,
            400
          );
          return;
        }
        ApiResponseHandler.error(res, `Upload error: ${err.message}`, null, 400);
        return;
      }
      ApiResponseHandler.error(res, err.message || 'File upload failed', null, 400);
      return;
    }

    if (!req.file) {
      ApiResponseHandler.error(res, 'No document file provided in form field "file"', null, 400);
      return;
    }

    if (req.file.size === 0 || req.file.buffer.length === 0) {
      ApiResponseHandler.error(res, 'Uploaded document is empty (0 bytes)', null, 400);
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isValidSignature = validateFileSignature(req.file.buffer, ext);

    if (!isValidSignature) {
      ApiResponseHandler.error(
        res,
        `File signature validation failed for '${req.file.originalname}'. The file content does not match the '${ext}' format.`,
        null,
        400
      );
      return;
    }

    next();
  });
};

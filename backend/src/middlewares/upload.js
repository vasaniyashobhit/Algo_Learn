import multer from 'multer';
import { STUCK } from '../config/constants.js';
import { PayloadError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';

/**
 * multer with memory storage: one file (field `file`) of at most `maxBytes`, and only the allowed
 * mime types (others → 415 FILE_TYPE_UNSUPPORTED; size → 413 FILE_TOO_LARGE via the multer mapper).
 * Non-multipart requests pass through untouched (JSON bodies still work).
 */
export const createUpload = ({ maxBytes = STUCK.upload.maxBytes, mimeTypes = STUCK.upload.mimeTypes } = {}) => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1, fields: 10, fieldSize: 100_000 },
  // multer's own callback API (not our async code): reject unknown types before buffering them.
  fileFilter: (_req, file, done) => {
    if (mimeTypes.includes(file.mimetype)) return done(null, true);
    return done(new PayloadError(codes.FILE_TYPE_UNSUPPORTED, 'Upload a PDF, PNG, JPEG, WebP or text file',
      [{ field: file.fieldname, message: `Unsupported type ${file.mimetype}` }]));
  },
}).single('file');

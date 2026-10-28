import { ValidationError } from '../errors/httpErrors.js';
import { codes } from '../errors/codes.js';
import { formatZodIssues } from '../errors/mappers/zod.mapper.js';

const PARTS = ['params', 'query', 'body'];

// Express 5 exposes req.query as a getter, so shadow it with an own property.
const assign = (req, part, value) => {
  if (part === 'query') {
    Object.defineProperty(req, 'query', { value, writable: true, enumerable: true, configurable: true });
  } else {
    req[part] = value;
  }
};

/**
 * validate({ body, query, params }) — each a zod schema. Parsed (coerced) values replace
 * the originals; all issues across parts are reported together as VALIDATION_FAILED.
 */
export const validate = (schemas) => {
  const unknown = Object.keys(schemas).filter((part) => !PARTS.includes(part));
  if (unknown.length) throw new TypeError(`validate(): unsupported parts ${unknown.join(', ')}`);

  return async (req, _res, next) => {
    try {
      const entries = Object.entries(schemas);
      const results = await Promise.all(entries.map(([part, schema]) => schema.safeParseAsync(req[part])));
      const issues = results.flatMap((result, i) =>
        result.success ? [] : formatZodIssues(result.error.issues, entries[i][0]));
      if (issues.length) {
        throw new ValidationError(codes.VALIDATION_FAILED, 'Request validation failed', issues);
      }
      results.forEach((result, i) => assign(req, entries[i][0], result.data));
      next();
    } catch (err) {
      next(err);
    }
  };
};

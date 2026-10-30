import { logger as defaultLogger } from '../../lib/logger.js';
import { findSimilar as defaultFindSimilar } from '../problems/problems.service.js';
import { createFromUrl } from './input/fromUrl.js';
import { createFromPdf } from './input/fromPdf.js';
import { createFromImage } from './input/fromImage.js';
import { createInputResolver } from './input/resolveInput.js';
import { createStuckRepository } from './stuck.repository.js';
import { createStuckService } from './stuck.service.js';
import { createStuckQueries } from './stuck.queries.js';

/**
 * Wires the stuck feature: `{ solve, history, get, solution, remove }`. `llm` comes from
 * createLlm (shared budget/breaker), `ocr` from createOcr; `fetchImpl`/`lookup`/`extractPdfText`
 * are injectable so tests never touch the network.
 */
export const createStuckFeature = ({
  llm, ocr, logger = defaultLogger, fetchImpl, lookup, extractPdfText,
  findSimilar = defaultFindSimilar, repo = createStuckRepository(), now,
}) => {
  const resolveInput = createInputResolver({
    fromUrl: createFromUrl({ fetchImpl, lookup, now }),
    fromPdf: createFromPdf({ extractText: extractPdfText }),
    fromImage: createFromImage({ extractImageText: llm.extractImageText, ocr, logger }),
  });
  return {
    ...createStuckService({ resolveInput, getCoachAnswer: llm.getCoachAnswer, findSimilar, repo, now }),
    ...createStuckQueries(),
  };
};

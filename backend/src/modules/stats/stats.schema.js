import { z } from 'zod';
import { STATS_VIEW, TOPIC_KINDS } from '../../config/constants.js';
import { blankToUndefined, queryInt } from '../problems/problems.schema.js';

const queryEnum = (values, fallback) => z.preprocess(blankToUndefined, z.enum([...values]).default(fallback));

/** GET /users/me/stats?kind=single|pair&sort=strength|attempted&limit=1..630 */
export const statsQuerySchema = z.object({
  kind: queryEnum(TOPIC_KINDS, 'single'),
  sort: queryEnum(STATS_VIEW.sorts, 'strength'),
  limit: queryInt(1, STATS_VIEW.maxLimit, STATS_VIEW.defaultLimit),
});

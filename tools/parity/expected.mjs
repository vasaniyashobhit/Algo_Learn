/**
 * Deliberate differences, listed in docs/PARITY.md instead of being "fixed".
 * DECISIONS: behaviour the migration changed on purpose (never visible as a status/code/shape difference here).
 * EXPECTED_VALUES: step name → why its (masked) values may differ; the values are still printed in the report.
 */
export const DECISIONS = [
  ['User and practice ids are UUIDs', 'Legacy used 24-hex ObjectIds. The frontend treats them as opaque strings; '
    + 'the parity check masks every id. Stuck query ids keep the 24-hex ObjectId form (the frontend routes and '
    + 'E2E tests expect it).'],
  ['C++ check on AI code', 'A malformed program is asked for once more, then stored with `code: null` (legacy '
    + 'passed it through). The fake AI answers valid C++, so no step shows it.'],
  ['Fail-fast configuration', 'Every variable (including JWT_EXPIRES_IN and SYNC_CRON) is checked at startup; '
    + 'legacy failed some of them on first use. Not visible through the API.'],
  ['Numbers', 'Jackson writes whole doubles as `1.0` / `0.0` where JS wrote `1` / `0`; both parse to the same number.'],
  ['Error Content-Type', '`application/json` instead of `application/json; charset=utf-8` (headers are not compared).'],
];

const TIES = 'Its text-search neighbors tie in textScore (6+ problems at 0.5714); MongoDB returns ties in arbitrary '
  + 'order (legacy gave different topics across runs), Spring breaks ties by problem id. Scores themselves match.';

export const EXPECTED_VALUES = {
  'stuck AI outage (tied neighbors)': TIES,
  'stuck history': `Lists the tied-neighbors query above. ${TIES}`,
};

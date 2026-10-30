import { STUCK_LIMITS } from '../../lib/stuckInput.js';
import { Input } from '../ui/Input.jsx';

/** A problem link. Codeforces links are matched without a fetch; other sites are best effort. */
export const UrlPanel = ({ value, onChange, invalid, describedBy }) => (
  <Input
    id="stuck-url"
    label="Problem link"
    type="url"
    inputMode="url"
    autoComplete="off"
    spellCheck={false}
    placeholder="https://codeforces.com/contest/1811/problem/G2"
    maxLength={STUCK_LIMITS.maxUrl}
    value={value}
    aria-invalid={invalid ? 'true' : undefined}
    aria-errormessage={invalid ? describedBy : undefined}
    hint="Codeforces links match our problem set instantly. Other sites are best effort: many block bots."
    onChange={(event) => onChange(event.target.value)}
    className="mb-0"
  />
);

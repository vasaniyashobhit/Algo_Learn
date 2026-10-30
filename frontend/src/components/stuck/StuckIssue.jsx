import { getUserMessage, isUnexpectedError } from '../../errors/getUserMessage.js';
import { retryClock } from '../../lib/formatters.js';
import { Button } from '../ui/Button.jsx';
import { Notice } from '../ui/Notice.jsx';

// These failures are about the input format, and pasted text always works.
const SUGGEST_TEXT = new Set(['INPUT_UNREADABLE', 'URL_FETCH_FAILED', 'URL_NOT_ALLOWED']);

const RateLimited = ({ id, issue }) => {
  const seconds = issue.details?.retryAfterSeconds;
  return (
    <div id={id}>
      <Notice
        tone="error"
        action={
          <Button variant="outline" to="/history">
            Open history
          </Button>
        }
      >
        <p>
          <b>{getUserMessage(issue, 'stuck')}</b>
          {seconds ? ` Your next request opens at ${retryClock(seconds)}.` : ''} Past answers stay in your history.
        </p>
      </Notice>
    </div>
  );
};

/**
 * Why the stuck input was not accepted (a client check or the server's answer), with the way
 * out: paste the text instead, wait for the hourly limit, or report the reference.
 */
export const StuckIssue = ({ id, issue, tab, onPasteText }) => {
  if (!issue) return null;
  if (issue.code === 'RATE_LIMITED') return <RateLimited id={id} issue={issue} />;
  const message = issue.clientMessage ?? getUserMessage(issue, 'stuck');
  const offerText = SUGGEST_TEXT.has(issue.code) && tab !== 'text';
  const reference = !issue.clientMessage && isUnexpectedError(issue) ? issue.requestId : null;
  return (
    <div id={id}>
      <Notice
        tone="error"
        action={
          offerText && (
            <Button variant="outline" onClick={onPasteText}>
              Paste text instead
            </Button>
          )
        }
      >
        <p>{message}</p>
        {reference && (
          <p className="mt-2 text-step--1 text-ink-soft">
            Reference: <code className="num select-all">{reference}</code>
          </p>
        )}
      </Notice>
    </div>
  );
};

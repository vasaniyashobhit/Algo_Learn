import { useStuckForm } from '../../hooks/useStuckForm.js';
import { Wipe } from '../motion/Wipe.jsx';
import { Button } from '../ui/Button.jsx';
import { FileDrop } from './FileDrop.jsx';
import { StuckIssue } from './StuckIssue.jsx';
import { panelId, StuckTabs, tabId } from './StuckTabs.jsx';
import { TextPanel } from './TextPanel.jsx';
import { UrlPanel } from './UrlPanel.jsx';

const ISSUE_ID = 'stuck-issue';

const Panel = ({ tab, form }) => {
  const { values, setValue, issue } = form;
  const field = { invalid: Boolean(issue), describedBy: issue ? ISSUE_ID : undefined };
  if (tab === 'text') return <TextPanel value={values.text} onChange={(value) => setValue('text', value)} {...field} />;
  if (tab === 'url') return <UrlPanel value={values.url} onChange={(value) => setValue('url', value)} {...field} />;
  return <FileDrop kind={tab} file={values[tab]} onFile={(file) => setValue(tab, file)} describedBy={field.describedBy} />;
};

/** The stuck input: four tabs (text, link, PDF, screenshot), checks before sending, then hints. */
export const StuckForm = ({ initialUrl }) => {
  const form = useStuckForm({ initialUrl });
  const { tab, setTab, issue, onSubmit, pending } = form;
  return (
    <div className="bg-band shadow-panel">
      <StuckTabs value={tab} onChange={setTab} />
      <form noValidate onSubmit={onSubmit} aria-busy={pending || undefined} className="grid gap-5 p-[1.4rem]">
        <Wipe key={tab} duration={0.3} role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
          <Panel tab={tab} form={form} />
        </Wipe>
        <StuckIssue id={ISSUE_ID} issue={issue} tab={tab} onPasteText={() => setTab('text')} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="plate" type="submit" loading={pending}>
            {pending ? 'Reading your problem…' : 'Get hints'}
          </Button>
          <p role="status" className="m-0 text-step--1 text-ink-soft">
            {pending ? 'Hints usually land in 15–30 seconds. Keep this tab open.' : 'Up to 10 requests an hour.'}
          </p>
        </div>
      </form>
    </div>
  );
};

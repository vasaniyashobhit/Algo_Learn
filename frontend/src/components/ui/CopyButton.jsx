import { toast } from 'sonner';
import { useFlash } from '../../hooks/useFlash.js';
import { SuccessTick } from '../motion/SuccessTick.jsx';
import { Button } from './Button.jsx';

/** Copies `text` to the clipboard; a tick and "Copied" confirm it, a toast explains a refusal. */
export const CopyButton = ({ text, label = 'Copy code' }) => {
  const [copied, flashCopied] = useFlash();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied();
    } catch {
      toast.error("Your browser didn't let us copy. Select the code and copy it with Ctrl+C.");
    }
  };

  return (
    <Button variant="text" onClick={copy} aria-live="polite">
      {copied && <SuccessTick className="text-plate-text" />}
      {copied ? 'Copied' : label}
    </Button>
  );
};

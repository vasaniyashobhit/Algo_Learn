import { useState } from 'react';
import { useUnlinkHandleMutation } from '../../hooks/mutations/users.mutations.js';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';

/** "Unlink handle" behind a confirm dialog, because it deletes the synced data. */
export const UnlinkHandle = ({ handle }) => {
  const [open, setOpen] = useState(false);
  const unlink = useUnlinkHandleMutation();

  // On failure the mutation's toast explains why; either way the dialog has done its job.
  const confirm = () => unlink.mutate(undefined, { onSettled: () => setOpen(false) });

  return (
    <>
      <Button variant="chalkText" onClick={() => setOpen(true)}>
        Unlink handle
      </Button>
      <ConfirmDialog
        open={open}
        title={`Unlink ${handle}?`}
        confirmLabel="Unlink and delete data"
        cancelLabel="Keep it linked"
        busy={unlink.isPending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      >
        <p>
          This removes your synced submissions and topic strengths from AlgoLearn. Your Codeforces account is not
          touched. You can link a handle again at any time; the first sync then takes about a minute.
        </p>
      </ConfirmDialog>
    </>
  );
};

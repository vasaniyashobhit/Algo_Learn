import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toFieldErrors } from '../../errors/fieldErrors.js';
import { getUserMessage, isUnexpectedError } from '../../errors/getUserMessage.js';
import { useLinkHandleMutation } from '../../hooks/mutations/users.mutations.js';
import { HANDLE_FIELD_CODES, HANDLE_FIELDS, handleSchema } from '../../lib/handleSchema.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';

/** Where a failed link is shown: under the field (about the handle) or below the form (anything else). */
const placeError = (error, handle) => {
  const fieldMessage = toFieldErrors(error, HANDLE_FIELDS).handle;
  if (fieldMessage) return { field: fieldMessage };
  const message = getUserMessage(error, 'linkHandle', { handle });
  if (HANDLE_FIELD_CODES.includes(error?.code)) return { field: message };
  return { form: message, requestId: isUnexpectedError(error) ? error?.requestId : null };
};

/** The handle field and "Link handle" on the plate. `onLinked(user)` runs after a successful link. */
export const HandleForm = ({ onLinked }) => {
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(handleSchema),
    defaultValues: { handle: '' },
  });
  const link = useLinkHandleMutation();
  const [formError, setFormError] = useState(null);

  const onSubmit = async ({ handle }) => {
    setFormError(null);
    try {
      const user = await link.mutateAsync(handle);
      onLinked?.(user);
    } catch (error) {
      const placed = placeError(error, handle);
      if (placed.field) setError('handle', { type: 'server', message: placed.field }, { shouldFocus: true });
      else setFormError(placed);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Link your Codeforces handle" className="mt-6 max-w-[34rem]">
      <div className="flex flex-wrap items-start gap-3">
        <Input
          tone="plate"
          label="Codeforces handle"
          placeholder="e.g. ananya_k"
          autoComplete="username"
          spellCheck={false}
          className="mb-0 min-w-[14rem] flex-1"
          error={formState.errors.handle?.message}
          {...register('handle')}
        />
        <Button variant="onPlate" type="submit" loading={link.isPending} className="mt-[1.45rem]">
          {link.isPending ? 'Checking on Codeforces…' : 'Link handle'}
        </Button>
      </div>
      {formError && (
        <div role="alert" className="mt-4 shadow-[inset_0_3px_0_var(--plate-ink)] pt-3">
          <p className="m-0 font-semibold">{formError.form}</p>
          {formError.requestId && <p className="m-0 mt-1 text-step--1">Reference: {formError.requestId}</p>}
        </div>
      )}
    </form>
  );
};

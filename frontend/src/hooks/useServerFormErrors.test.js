import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../errors/ApiError.js';
import { useServerFormErrors } from './useServerFormErrors.js';

const setup = (fields = ['email', 'password']) => {
  const setError = vi.fn();
  const hook = renderHook(() => useServerFormErrors({ setError, fields, context: 'signup' }));
  return { setError, hook };
};

describe('useServerFormErrors', () => {
  it('puts validation details on their fields', () => {
    const { setError, hook } = setup();
    const error = new ApiError({
      code: 'VALIDATION_FAILED',
      details: [{ field: 'body.password', message: 'Password must contain at least one digit' }],
    });
    act(() => hook.result.current.handleServerError(error));
    expect(setError).toHaveBeenCalledWith('password', { type: 'server', message: 'Password must contain at least one digit' });
    expect(hook.result.current.formError).toBeNull();
  });

  it('puts AUTH_EMAIL_TAKEN on the email field and focuses it', () => {
    const { setError, hook } = setup();
    act(() => hook.result.current.handleServerError(new ApiError({ status: 409, code: 'AUTH_EMAIL_TAKEN' })));
    expect(setError).toHaveBeenCalledWith('email', expect.objectContaining({ type: 'server' }), { shouldFocus: true });
  });

  it('uses a form-level message when the field is not on this form, and can clear it', () => {
    const { setError, hook } = setup(['password']);
    act(() => hook.result.current.handleServerError(new ApiError({ status: 409, code: 'AUTH_EMAIL_TAKEN', requestId: 'r' })));
    expect(setError).not.toHaveBeenCalled();
    expect(hook.result.current.formError).toMatchObject({ requestId: 'r' });
    expect(hook.result.current.formError.message).toMatch(/already exists/);
    act(() => hook.result.current.clearFormError());
    expect(hook.result.current.formError).toBeNull();
  });

  it('uses a form-level message for validation details on unknown fields', () => {
    const { hook } = setup();
    const error = new ApiError({ code: 'VALIDATION_FAILED', details: [{ field: 'body.role', message: 'x' }] });
    act(() => hook.result.current.handleServerError(error));
    expect(hook.result.current.formError.message).toMatch(/highlighted fields/);
  });
});

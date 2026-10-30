import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/msw/server.js';
import { respondError } from '../../test/msw/scenarios.js';
import { renderApp } from '../../test/renderWithProviders.jsx';

const submitHandle = async (handle) => {
  renderApp('/dashboard', { signedIn: true });
  await userEvent.type(await screen.findByLabelText('Codeforces handle'), handle);
  await userEvent.click(screen.getByRole('button', { name: 'Link handle' }));
};

describe('HandleForm messages', () => {
  it('checks the handle shape before calling the server', async () => {
    let called = false;
    server.use(http.put('*/api/v1/users/me/handle', () => {
      called = true;
      return HttpResponse.json({});
    }));
    await submitHandle('ab');
    expect(await screen.findByText('Codeforces handles have at least 3 characters')).toBeInTheDocument();
    expect(called).toBe(false);
  });

  it('names the typed handle when Codeforces does not know it', async () => {
    respondError('put', '/users/me/handle', 404, 'CF_HANDLE_NOT_FOUND');
    await submitHandle('ananya-k');
    const field = screen.getByLabelText('Codeforces handle');
    expect(await screen.findByText(`We couldn't find "ananya-k" on Codeforces. Check the spelling and try again.`)).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription(/We couldn't find "ananya-k"/);
    expect(field).toHaveFocus();
  });

  it('says when the handle belongs to another account', async () => {
    respondError('put', '/users/me/handle', 409, 'CF_HANDLE_TAKEN');
    await submitHandle('tourist');
    expect(await screen.findByText('"tourist" is already linked to another AlgoLearn account.')).toBeInTheDocument();
  });

  it('blames a slow Codeforces, not the user, below the form', async () => {
    respondError('put', '/users/me/handle', 503, 'CF_UNAVAILABLE', { status: 503, retryable: true });
    await submitHandle('ananya_k');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Codeforces seems slow right now, so we couldn't check that handle. Try again in a minute.",
    );
    expect(screen.getByLabelText('Codeforces handle')).not.toHaveAttribute('aria-invalid');
  });

  it('puts server validation details on the field', async () => {
    respondError('put', '/users/me/handle', 400, 'VALIDATION_FAILED', [{ field: 'body.handle', message: 'Invalid handle' }]);
    await submitHandle('ananya_k');
    expect(await screen.findByText('Invalid handle')).toBeInTheDocument();
  });

  it('shows a reference for unexpected errors', async () => {
    respondError('put', '/users/me/handle', 500, 'INTERNAL_ERROR', null, { requestId: 'req-link' });
    await submitHandle('ananya_k');
    expect(await screen.findByText('Reference: req-link')).toBeInTheDocument();
  });
});

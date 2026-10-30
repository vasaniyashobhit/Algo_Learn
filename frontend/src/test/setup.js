import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { authStore } from '../lib/authStore.js';
import { installMatchMedia } from './matchMedia.js';
import { server } from './msw/server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  installMatchMedia();
  window.scrollTo = () => {};
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  window.localStorage.clear();
  authStore.reload();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

afterAll(() => server.close());

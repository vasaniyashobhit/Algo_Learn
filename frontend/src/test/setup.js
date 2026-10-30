import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { authStore } from '../lib/authStore.js';
import { installMatchMedia } from './matchMedia.js';
import { server } from './msw/server.js';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// jsdom has no layout: Recharts' ResponsiveContainer only needs ResizeObserver to exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  installMatchMedia();
  window.scrollTo = () => {};
  window.ResizeObserver ??= ResizeObserverStub;
});

afterEach(() => {
  cleanup();
  // sonner keeps toasts in a module-level store; without this they reappear in the next test.
  // Optional call: some tests replace sonner with a mock that has no dismiss.
  toast.dismiss?.();
  server.resetHandlers();
  window.localStorage.clear();
  authStore.reload();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = '';
});

afterAll(() => server.close());

import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { authStore } from '../lib/authStore.js';
import { installMatchMedia } from './matchMedia.js';
import { server } from './msw/server.js';
import { installNodeFormData } from './nodeFormData.js';

await installNodeFormData();

// Coverage instrumentation slows the first render of a page (KaTeX, motion) past the 1 s default.
configure({ asyncUtilTimeout: 3000 });

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

// sonner removes a dismissed toast after a 200 ms timer that unmounting does not clear. If that timer
// fires after the file's jsdom is torn down, React throws "window is not defined" as an unhandled
// error and the run fails. Files that showed a toast wait it out before teardown.
const SONNER_UNMOUNT_MS = 250;

afterAll(async () => {
  if (toast.getHistory?.().length) {
    await new Promise((resolve) => { setTimeout(resolve, SONNER_UNMOUNT_MS); });
  }
  server.close();
});

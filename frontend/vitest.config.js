import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
    css: false,
    restoreMocks: true,
    // Multi-step flows (sync, stuck) plus a lazy page import can pass 5 s under full parallel load.
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/test/**', 'src/main.jsx'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, branches: 75 },
    },
  },
});

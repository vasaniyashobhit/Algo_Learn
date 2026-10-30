import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Long-lived vendor chunks so app changes don't bust the whole cache. Matched by package path
// (not by entry name) so CommonJS wrapper modules land with their package: with the name form,
// React's wrapper ended up in the charts chunk and the react <-> charts import cycle left React
// undefined at startup (a blank page in production builds only).
const VENDOR_CHUNKS = [
  ['react', ['react', 'react-dom', 'scheduler', 'react-router', 'cookie', 'set-cookie-parser']],
  ['motion', ['motion', 'framer-motion', 'motion-dom', 'motion-utils']],
  ['data', ['@tanstack', 'axios']],
  ['forms', ['react-hook-form', '@hookform', 'zod']],
  ['charts', ['recharts', 'd3-*', 'victory-vendor', '@reduxjs', 'redux', 'immer', 'reselect']],
  ['markdown', ['react-markdown', 'remark-*', 'rehype-*', 'katex', 'mdast-*', 'micromark*', 'hast-*', 'unified', 'unist-*']],
];

const packageOf = (id) => {
  const path = id.replaceAll('\\', '/');
  const match = path.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  return match?.[1] ?? null;
};

const matches = (name, pattern) => (pattern.endsWith('*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern || name.startsWith(`${pattern}/`));

export const vendorChunk = (id) => {
  const name = packageOf(id);
  if (!name) return undefined;
  return VENDOR_CHUNKS.find(([, patterns]) => patterns.some((pattern) => matches(name, pattern)))?.[0];
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: { manualChunks: vendorChunk },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});

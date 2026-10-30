import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks so app changes don't bust the whole cache.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
          motion: ['motion/react'],
          data: ['@tanstack/react-query', 'axios'],
          forms: ['react-hook-form', '@hookform/resolvers/zod', 'zod'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});

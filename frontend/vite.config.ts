import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
  test: {
    setupFiles: './src/tests/setup.ts',
    exclude: ['src/tests/e2e/**', 'node_modules/**', 'dist/**']
  },
  server: {
    port: 5173,
    proxy: {
      '/api': process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8000'
    }
  }
});

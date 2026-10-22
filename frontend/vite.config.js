import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * vite.config.js
 * --------------
 * Vite configuration for the DGPAPIS frontend.
 *
 * Key settings:
 *  - React plugin for JSX transform
 *  - Dev server proxy: /api/* → backend (avoids CORS issues during development)
 *  - Port pinned to 5173 for consistency with backend CORS_ORIGIN setting
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Proxy API calls to the backend dev server during development.
    // In production, requests go directly to the deployed API URL.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  // Path aliases – add more as the project grows
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

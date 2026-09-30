/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Proxy all /api calls to the FastAPI backend — eliminates CORS issues in the browser
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    // Ensure Vite resolves ESM subpath exports (e.g. @hookform/resolvers/zod)
    conditions: ['import', 'module', 'browser', 'default'],
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these so the subpath export is resolved at startup
    include: [
      '@hookform/resolvers/zod',
      'react-hook-form',
      'zod',
      'axios',
      'react-hot-toast',
      'react-router-dom',
      'recharts',
    ],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})

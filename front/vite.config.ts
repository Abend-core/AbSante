/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    // L'API (dossier api/) tourne à part ; en dev le front la joint via ce proxy pour
    // rester sur une seule origine (pas de CORS à configurer).
    proxy: {
      '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:3100', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})

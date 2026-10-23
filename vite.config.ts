import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to the Spring Boot backend so the panel and API share an origin.
// For a deployed build, set VITE_API_BASE_URL to the backend's public URL instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: process.env.HABITA_API_URL ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
});

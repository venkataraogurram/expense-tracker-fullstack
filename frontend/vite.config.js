import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React dev server (5173) proxies /api to Spring Boot (8080),
// so the browser sees a single origin and no CORS configuration is needed.
// In production the built files are served by Spring Boot itself.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

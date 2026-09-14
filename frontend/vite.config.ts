import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The FastAPI backend (uvicorn, port 8000) serves /api and the generated images under /data.
const backend = process.env.BACKEND_URL ?? 'http://localhost:8000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': backend,
      '/data': backend,
      '/health': backend,
    },
  },
});

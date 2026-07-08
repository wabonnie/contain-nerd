import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo, proxy di /api verso il gateway locale.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000' },
  },
});

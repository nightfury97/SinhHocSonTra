import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: chuyển /api sang backend (BackEnd/.env PORT=7000). Production: nginx.conf làm việc này.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': env.VITE_API_PROXY || 'http://localhost:7000' },
    },
  };
});

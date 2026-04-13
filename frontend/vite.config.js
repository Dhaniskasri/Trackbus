import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAppUrls } from './parseAppUrls.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const fromUrls = parseAppUrls(env.VITE_APP_URLS);
  const n = fromUrls ? parseInt(fromUrls.frontend.port, 10) : NaN;
  const port =
    Number.isFinite(n) && n > 0 ? n : parseInt(env.VITE_PORT || '5173', 10);

  return {
    plugins: [react()],
    server: {
      port,
      host: true
    }
  };
});

import { parseAppUrls } from '../../parseAppUrls.js';

// Prefer one line: VITE_APP_URLS=frontendOrigin,apiOrigin (see frontend/.env)
// Legacy: VITE_BACKEND_URL only sets the API. Production: set VITE_APP_URLS or VITE_BACKEND_URL in hosting.

const DEFAULT_BACKEND_PORT = import.meta.env?.VITE_BACKEND_PORT || '5000';

const resolved = parseAppUrls(import.meta.env?.VITE_APP_URLS);
export const APP_URLS = resolved
  ? { frontend: resolved.frontend.origin, api: resolved.api.origin }
  : null;

const inferApiBaseUrl = () => {
  if (APP_URLS?.api) {
    if (typeof window !== 'undefined') {
      const here = `${window.location.protocol}//${window.location.host}`;
      if (here === APP_URLS.api) return '';
    }
    return APP_URLS.api;
  }

  const envUrl = import.meta.env?.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const parsedPort = port ? Number(port) : null;
    const isLocalHost = ['localhost', '127.0.0.1'].includes(hostname);
    const isLanHost =
      hostname?.startsWith('192.168.') ||
      hostname?.startsWith('10.') ||
      hostname?.endsWith('.local');

    if (parsedPort === 5000) {
      return '';
    }

    if (!isLocalHost && !isLanHost && !parsedPort) {
      return '';
    }

    if (isLocalHost || isLanHost) {
      return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
    }
  }

  console.warn('[TrackMate] Set VITE_APP_URLS or VITE_BACKEND_URL — using relative /api');
  return '';
};

export const API_BASE_URL = inferApiBaseUrl();
export const API_ROOT = `${API_BASE_URL}/api`;

if (typeof window !== 'undefined') {
  console.info(
    '[TrackMate] API:',
    API_BASE_URL || '(same origin)',
    APP_URLS?.frontend ? `| App: ${APP_URLS.frontend}` : ''
  );
}

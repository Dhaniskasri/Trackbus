/**
 * VITE_APP_URLS format: "<frontend origin>,<api origin>" (comma-separated, no spaces required).
 * Example: http://localhost:5173,http://localhost:5000
 */
export function parseAppUrls(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  try {
    return {
      frontend: new URL(parts[0]),
      api: new URL(parts[1])
    };
  } catch {
    return null;
  }
}

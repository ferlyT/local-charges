export const statusMap: Record<number, { label: string; className: string; key: any }> = {
  1: { label: 'Draft', className: 'badge-draft', key: 'status_draft' },
  2: { label: 'Done', className: 'badge-done', key: 'status_done' },
};

/**
 * Resolves the backend API URL dynamically based on the client browser's origin,
 * preventing CORS Private Network Access (PNA) blocks when accessed via a public IP.
 */
export function getApiUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (envUrl.startsWith('/')) {
      return envUrl;
    }
    try {
      const parsedEnv = new URL(envUrl);
      const currentHostname = window.location.hostname;
      // If the page is accessed via a different hostname (e.g. public IP), swap it dynamically
      if (currentHostname && currentHostname !== parsedEnv.hostname) {
        parsedEnv.hostname = currentHostname;
        return parsedEnv.toString().replace(/\/$/, '');
      }
    } catch {
      // Fallback to envUrl if parsing fails
    }
    return envUrl;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname || 'localhost';
  return `${protocol}//${hostname}:3001/api/v1`;
}

/**
 * Resolve avatar URL from stored value.
 * Stored value may be:
 *   - A relative API path: "/api/v1/lampiran/download/avatars/xxx.jpg"
 *   - A legacy full URL:   "http://localhost:3001/api/v1/lampiran/download/avatars/xxx.jpg"
 *   - An external URL:     "https://..."
 *
 * Always returns a URL using the resolved API base so it works
 * correctly in both dev and production environments.
 */
export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;

  // Already an external URL (not our own backend) — use as-is
  if (avatar.startsWith('https://')) return avatar;

  const apiUrl = getApiUrl();
  const baseUrl = apiUrl.replace('/api/v1', '');

  // Relative path like "/api/v1/lampiran/download/avatars/xxx.jpg"
  if (avatar.startsWith('/api/')) {
    return `${baseUrl}${avatar}`;
  }

  // Legacy full URL — extract the path part and rebuild with current baseUrl
  try {
    const parsed = new URL(avatar);
    return `${baseUrl}${parsed.pathname}`;
  } catch {
    // Not a valid URL and not a relative path — return as-is
    return avatar;
  }
}

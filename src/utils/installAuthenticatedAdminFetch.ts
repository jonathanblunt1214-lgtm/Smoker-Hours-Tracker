import { auth } from '../lib/firebase';

let installed = false;

/**
 * Transitional client bridge for the legacy admin UI.
 *
 * Privileged requests are authenticated with the current Firebase ID token.
 * This does NOT authorize the request: the server still verifies the token and
 * enforces OWNER/ADMIN claims. It only ensures legacy fetch() calls carry the
 * credential required by the new server boundary.
 */
export function installAuthenticatedAdminFetch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    let pathname = '';
    try {
      pathname = new URL(requestUrl, window.location.origin).pathname;
    } catch {
      return nativeFetch(input, init);
    }

    const isPrivilegedRoute = pathname.startsWith('/api/master/') || pathname.startsWith('/api/admin/');
    if (!isPrivilegedRoute) return nativeFetch(input, init);

    const user = auth.currentUser;
    if (!user) return nativeFetch(input, init);

    const token = await user.getIdToken();
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return nativeFetch(input, {
      ...init,
      headers,
    });
  };
}

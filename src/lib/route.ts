// Just enough routing for shareable party links (/party, /party/ABC123).
// The full router arrives with #8.

export type Route = { name: 'app' } | { name: 'party'; code: string | null };

export function readRoute(path = window.location.pathname): Route {
  const match = /^\/party(?:\/([^/]+))?\/?$/.exec(path);
  if (!match) return { name: 'app' };
  return { name: 'party', code: match[1] ? decodeURIComponent(match[1]).toUpperCase() : null };
}

export function navigate(path: string, replace = false): void {
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function partyUrl(code: string): string {
  return `${window.location.origin}/party/${code}`;
}

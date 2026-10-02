import { useLang } from '@/i18n';

interface RouterState {
  location: { pathname: string };
  navigation: { state: string };
}

/** The slice of react-router's data router this needs. */
interface RouterLike {
  state: RouterState;
  subscribe(fn: (s: RouterState) => void): () => void;
}

/**
 * Cookieless page-view beacon for the admin's visitor stats (api/src/functions/visits.ts).
 * Sends the path (the server replaces tokens in /s/, /r/ and /reset/ links with placeholders),
 * the referrer host on the first page and the UI language. No cookie, no id, no storage.
 * Skipped for automated browsers (prerender, e2e).
 */
export function trackVisits(router: RouterLike): void {
  if (typeof navigator === 'undefined' || navigator.webdriver) return;

  let last = '';
  let first = true;
  const send = (path: string) => {
    if (path === last) return;
    last = path;
    const body = JSON.stringify({
      p: path,
      r: first ? document.referrer : '',
      l: useLang.getState().lang,
    });
    first = false;
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon?.('/api/v', blob)) return;
    } catch {
      /* fall through to fetch */
    }
    void fetch('/api/v', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined);
  };

  send(router.state.location.pathname);
  router.subscribe((s) => {
    if (s.navigation.state === 'idle') send(s.location.pathname);
  });
}

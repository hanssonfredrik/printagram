import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { api } from './api';

/**
 * URL query state for list pages: `set({ k: v })` sets (or, for '', removes) keys and resets
 * paging unless `offset` itself is being set.
 */
export function useQueryState() {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!('offset' in patch)) next.delete('offset');
      setParams(next);
    },
    [params, setParams],
  );
  return [params, set] as const;
}

/**
 * Loads `path` (null = don't load yet); reloads whenever the path changes or reload() is called.
 * The previous data stays visible while the next request runs.
 */
export function useApi<T>(path: string | null) {
  const [tick, setTick] = useState(0);
  const key = path ? `${tick}|${path}` : null;
  const [res, setRes] = useState<{ key: string | null; data: T | null; error: string | null }>({
    key: null,
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!key || !path) return;
    let live = true;
    api<T>(path)
      .then((data) => live && setRes({ key, data, error: null }))
      .catch((e: Error) => live && setRes((r) => ({ key, data: r.data, error: e.message })));
    return () => {
      live = false;
    };
  }, [key, path]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return {
    data: res.data,
    error: res.key === key ? res.error : null,
    loading: key !== null && res.key !== key,
    reload,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './client.js';

/** Tải dữ liệu GET; tự huỷ request cũ khi tham số đổi. `path = null` để tạm dừng. */
export function useApi(path, query) {
  const [state, setState] = useState({ data: undefined, error: null, loading: Boolean(path) });
  const [version, setVersion] = useState(0);
  const key = path ? `${path}?${JSON.stringify(query ?? {})}` : null;
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    if (!key) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { query: queryRef.current, signal: ctrl.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ ...s, error, loading: false }));
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const mutate = useCallback((updater) => setState((s) => ({ ...s, data: updater(s.data) })), []);
  return { ...state, reload, mutate };
}

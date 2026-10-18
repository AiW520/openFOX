import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

export type EntryTarget = 'legacy' | 'new' | 'home';

export function useEntryTransition(load: (target: EntryTarget) => Promise<unknown>) {
  const request = useRef(0);
  const [pending, setPending] = useState<EntryTarget | null>(null);
  const [failed, setFailed] = useState<EntryTarget | null>(null);
  const cancel = useCallback(() => {
    request.current++;
    setPending(null);
    setFailed(null);
  }, []);

  useEffect(() => () => { request.current++; }, []);

  const navigate = useCallback(async (target: EntryTarget, commit: () => void) => {
    const id = ++request.current;
    setPending(target);
    setFailed(null);
    try {
      await load(target);
    } catch {
      if (id === request.current) {
        setPending(null);
        setFailed(target);
      }
      return;
    }
    if (id !== request.current) return;
    startTransition(() => {
      commit();
      setPending(null);
    });
  }, [load]);

  return { pending, failed, navigate, cancel };
}

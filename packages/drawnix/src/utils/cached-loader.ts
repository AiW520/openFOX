export function createCachedLoader<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    pending ??= Promise.resolve().then(load).catch((error) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}

export function scheduleIdlePreload(load: () => Promise<unknown>): () => void {
  const constrained = () => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    return connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || '');
  };
  if (constrained()) return () => undefined;

  const run = () => {
    if (!document.hidden && !constrained()) void load().catch(() => undefined);
  };
  if (window.requestIdleCallback) {
    const handle = window.requestIdleCallback(run);
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(run, 1200);
  return () => window.clearTimeout(handle);
}

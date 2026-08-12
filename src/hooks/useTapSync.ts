import { useRef, useCallback, useEffect } from 'react';

interface TapSyncOptions {
  intervalMs?: number;
  onSync?: (tapCount: number) => Promise<void> | void;
}

export function useTapSync({ intervalMs = 2000, onSync }: TapSyncOptions = {}) {
  const pendingTaps = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (pendingTaps.current === 0) return;
    const batch = pendingTaps.current;
    pendingTaps.current = 0;
    try {
      await onSync?.(batch);
    } catch {
      pendingTaps.current += batch;
    }
  }, [onSync]);

  useEffect(() => {
    timerRef.current = setInterval(flush, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      flush();
    };
  }, [flush, intervalMs]);

  const addTap = useCallback((value: number = 1) => {
    pendingTaps.current += value;
  }, []);

  return { addTap, flush, getPending: () => pendingTaps.current };
}

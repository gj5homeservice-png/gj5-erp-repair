"use client"

import { useEffect } from 'react';

// Reproduced live on gj5electronics.in: Next.js's default error UI
// ("Application error: a client-side exception has occurred") was actually
// an uncaught ChunkLoadError — a next/dynamic() module chunk referenced by
// an already-loaded HTML shell no longer existed on the server (the shell
// was served from Hostinger's CDN cache, built before a later deploy removed
// that chunk's file; see the `headers()` no-store fix in next.config.ts for
// the cache side of this). The app has no error boundary anywhere, so this
// throw crashed the whole page. `no-store` prevents new page loads from
// getting a stale shell, but a tab that already has one in memory when a new
// build lands still needs to recover — this does automatically what
// reloading the page by hand would do, once, guarded against looping if the
// chunk is genuinely gone rather than just momentarily stale.
export function ChunkErrorRecovery() {
  useEffect(() => {
    const isChunkError = (value: unknown): boolean =>
      typeof value === 'string' && /Loading chunk [\w.-]+ failed|ChunkLoadError/i.test(value);

    const recover = () => {
      const key = 'gj5_chunk_reload_at';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const err: any = event.error;
      if (isChunkError(event.message) || isChunkError(err?.name) || isChunkError(err?.message)) {
        recover();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      if (isChunkError(reason?.name) || isChunkError(reason?.message)) {
        recover();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}

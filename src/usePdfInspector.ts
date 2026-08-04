import { useState, useEffect, useCallback } from 'react';
import type { PdfProcessResult, ProcessOptions } from '@firecrawl/pdf-inspector-wasm';

let wasmModule: typeof import('@firecrawl/pdf-inspector-wasm') | null = null;
let initPromise: Promise<void> | null = null;

async function loadWasm() {
  if (wasmModule) return;
  if (initPromise) {
    await initPromise;
    return;
  }
  initPromise = (async () => {
    const mod = await import('@firecrawl/pdf-inspector-wasm');
    await mod.default();
    wasmModule = mod;
  })();
  await initPromise;
}

export function usePdfInspector() {
  const [ready, setReady] = useState(!!wasmModule);

  useEffect(() => {
    loadWasm().then(() => setReady(true)).catch(console.error);
  }, []);

  const processPdf = useCallback(async (data: Uint8Array, options?: ProcessOptions): Promise<PdfProcessResult> => {
    await loadWasm();
    if (!wasmModule) throw new Error('WASM modülü yüklenemedi.');
    return wasmModule.processPdf(data, options);
  }, []);

  return { ready, processPdf };
}

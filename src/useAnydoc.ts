import { useCallback, useEffect, useState } from 'react';
import type { Format } from '@firecrawl/anydoc-wasm';

let wasmModule: typeof import('@firecrawl/anydoc-wasm') | null = null;
let initPromise: Promise<void> | null = null;

async function loadWasm() {
  if (wasmModule) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    const mod = await import('@firecrawl/anydoc-wasm');
    await mod.default();
    wasmModule = mod;
  })();

  await initPromise;
}

export function useAnydoc() {
  const [ready, setReady] = useState(!!wasmModule);

  useEffect(() => {
    loadWasm().then(() => setReady(true)).catch(console.error);
  }, []);

  const convertToMarkdown = useCallback(async (data: Uint8Array, fileName: string) => {
    await loadWasm();
    if (!wasmModule) throw new Error('Anydoc WASM modülü yüklenemedi.');

    const format = wasmModule.formatFromPath(fileName);
    return wasmModule.toMarkdownBytes(data, format ?? undefined);
  }, []);

  const detectFormat = useCallback(async (data: Uint8Array, fileName: string): Promise<Format | undefined> => {
    await loadWasm();
    if (!wasmModule) throw new Error('Anydoc WASM modülü yüklenemedi.');

    return wasmModule.formatFromBytes(data) ?? wasmModule.formatFromPath(fileName);
  }, []);

  return { ready, convertToMarkdown, detectFormat };
}

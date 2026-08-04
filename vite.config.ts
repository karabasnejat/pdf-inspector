import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@firecrawl/pdf-inspector-wasm'],
  },
});

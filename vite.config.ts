import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/pdf-inspector/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@firecrawl/pdf-inspector-wasm'],
  },
});

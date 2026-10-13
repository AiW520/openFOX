import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react(), nxViteTsPaths()],
  publicDir: false,
  define: { __APP_VERSION__: JSON.stringify('publisher'), 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: resolve(__dirname, 'public/assets'), emptyOutDir: true, minify: 'esbuild',
    lib: { entry: resolve(__dirname, 'ui/main.tsx'), formats: ['es'], fileName: () => 'provider-editor.js' },
    cssCodeSplit: false,
    rollupOptions: { output: { assetFileNames: 'provider-editor.[ext]' } },
  },
});

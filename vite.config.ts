import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    emptyOutDir: true,
    lib: {
      entry: {
        core: 'src/core/main.ts',
        minimap: 'src/minimap/index.ts',
        background: 'src/background/index.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) =>
        entryName === 'core' ? 'flow-kit.js' : `${entryName}.js`,
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css')
            ? 'flow-kit.css'
            : 'assets/[name][extname]',
      },
    },
  },
});

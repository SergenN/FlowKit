import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    emptyOutDir: false,
    lib: {
      entry: 'src/core/main.ts',
      name: 'FlowKit',
      fileName: () => 'flow-kit.umd.cjs',
      formats: ['umd'],
    },
  },
});

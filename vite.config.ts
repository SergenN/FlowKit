import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/core/main.ts',
      name: 'FlowKit',
      fileName: 'flow-kit',
      formats: ['es', 'umd'],
    },
  },
});

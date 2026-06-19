import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/core/main.ts',
      name: 'FlowJS',
      fileName: 'flow-js',
      formats: ['es', 'umd'],
    },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/main.ts',
      name: 'FlowJS',
      fileName: 'flow-js',
      formats: ['es', 'umd'],
    },
  },
});

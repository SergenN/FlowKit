import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: 'src/core/main.ts',
      name: 'FlowIt',
      fileName: 'flow-it',
      formats: ['es', 'umd'],
    },
  },
});

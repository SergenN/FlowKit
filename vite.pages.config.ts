import { defineConfig } from 'vite';

export default defineConfig({
  base: '/FlowJS/',
  build: {
    outDir: 'dist-pages',
    rollupOptions: {
      input: {
        main: 'index.html',
        basic: 'examples/basic.html',
        dragAndDrop: 'examples/drag-and-drop.html',
        customisation: 'examples/customisation.html',
      },
    },
  },
});

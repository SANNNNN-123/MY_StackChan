import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        assembly: fileURLToPath(new URL('./index.html', import.meta.url)),
        officialModel: fileURLToPath(new URL('./official-model/index.html', import.meta.url)),
      },
    },
  },
});

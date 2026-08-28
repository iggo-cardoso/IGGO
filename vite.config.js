import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        eBookPage: resolve(__dirname, 'src/html/book-iggostudios.html'),
        eBookView3D: resolve(__dirname, 'src/html/livro-visualizador-3d.html'),
        briefing: resolve(__dirname, 'src/html/briefing.html')
      },
    },
  },
})
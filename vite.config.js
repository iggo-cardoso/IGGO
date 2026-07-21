import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        pre_registration: resolve(__dirname, 'src/html/book-iggostudios.html')
      },
    },
  },
})
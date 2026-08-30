import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-extension',
    emptyOutDir: true,
    lib: {
      entry: 'src/content-entry.js',
      name: 'Redline',
      formats: ['iife'],
      fileName: () => 'redline.js',
    },
    rollupOptions: {
      output: { extend: true },
    },
  },
})

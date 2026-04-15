import { defineConfig } from 'vite'

export default defineConfig({
  // No framework needed — plain ES modules
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: { main: './index.html' }
    }
  },
  server: {
    port: 3000,
    // Proxy the Netlify function locally during dev
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true
      }
    }
  }
})

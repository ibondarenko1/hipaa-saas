import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // listen on all interfaces (Docker / network access)
    port: 5173,
    strictPort: true,
    allowedHosts: true, // allow any host (localhost, 127.0.0.1, IP, etc.)
    watch: {
      usePolling: true, // needed for Docker on Windows
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

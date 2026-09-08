import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:8010',
      '/uploads': process.env.API_PROXY_TARGET || 'http://localhost:8010',
    },
  },
})

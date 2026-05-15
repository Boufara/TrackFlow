import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiPort = process.env.VITE_API_PORT || '5201'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
    proxy: {
      '/api': `http://localhost:${apiPort}`
    }
  }
})

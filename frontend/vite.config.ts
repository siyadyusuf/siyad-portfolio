import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMocks = env.VITE_USE_MOCKS !== 'false'
  // /workspace/portfolio-backend listens on PORT (default 3001).
  const apiTarget = env.API_PROXY_TARGET || 'http://localhost:3001'
  const proxy = useMocks ? undefined : { '/api': { target: apiTarget, changeOrigin: true } }
  return {
    plugins: [react(), tailwindcss()],
    server: { host: true, port: 5173, proxy },
    preview: { host: true, port: 4173, proxy },
  }
})

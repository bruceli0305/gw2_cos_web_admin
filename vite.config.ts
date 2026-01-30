import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 将 /api 开头的请求转发到后端
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // 将 /admin 开头的请求转发到后端
      '/admin': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // 兼容 v1 写法
      '/v1': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
})

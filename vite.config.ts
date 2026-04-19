import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@ant-design\/pro-form$/,
        replacement: fileURLToPath(new URL('./src/vendor/pro-form-runtime.ts', import.meta.url)),
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/@ant-design/icons/') ||
            id.includes('/node_modules/@ant-design/icons-svg/')
          ) {
            return 'ant-design-icons'
          }
        },
      },
    },
  },
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
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      }
    }
  }
})

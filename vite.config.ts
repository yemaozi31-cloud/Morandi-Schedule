import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    // 开发环境代理：浏览器无法直连 WebDAV（CORS），通过 Vite 代理转发
    proxy: {
      // 将所有 /dav/ 请求转发到坚果云 WebDAV 服务器
      '/dav/': {
        target: 'https://dav.jianguoyun.com',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})

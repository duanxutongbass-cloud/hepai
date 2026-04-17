import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // 显式锁定根目录
  root: '/app',
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // 这里的路径必须与 Docker 容器内部路径完全一致
      '@': path.resolve('/app/src'),
      '/src': path.resolve('/app/src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // 强制手动指定输入点，防止 HTML 解析歧义
      input: path.resolve('/app/index.html'),
    },
  },
});

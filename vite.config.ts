import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // 强迫 Vite 认定 /app 为根目录，不再猜测
  root: process.cwd(),
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // 显式指定 @ 符号指向 src 目录
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // 强制指定入口 HTML，防止解析失败
    rollupOptions: {
      input: path.resolve(process.cwd(), 'index.html'),
    },
  },
  server: {
    hmr: false,
    host: '0.0.0.0',
    port: 3000
  }
});

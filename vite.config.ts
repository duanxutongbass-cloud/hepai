import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env variables (Vite defaults to NOT loading them in config)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Force project root to /app
    root: process.cwd(),
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      // Custom plugin to force-resolve main.tsx if Vite's default resolver fails in Docker
      {
        name: 'force-resolve-main',
        resolveId(source) {
          if (source.includes('src/main.tsx')) {
            return path.resolve(process.cwd(), 'src/main.tsx');
          }
          return null;
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        // Explicitly point to index.html using an absolute path
        input: path.resolve(process.cwd(), 'index.html'),
      },
    },
    server: {
      hmr: false,
      host: '0.0.0.0',
      port: 3000
    }
  };
});

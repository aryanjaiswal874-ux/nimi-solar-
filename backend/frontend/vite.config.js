import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5577",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      // Path aliases for cleaner imports
      "@": path.resolve(__dirname, "./src"),
      // Polyfill Node.js modules for browser
      fs: "fs",
      path: "path-browserify",
      crypto: "crypto-browserify",
      stream: "stream-browserify",
      buffer: "buffer",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  build: {
    outDir: "/sessions/practical-lucid-albattani/mnt/outputs/frontend-dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'vendor-ui';
            }
            if (id.includes('axios')) {
              return 'vendor-utils';
            }
            return 'vendor';
          }
        }
      },
      external: ['fs', 'crypto', 'stream', 'buffer', 'path', 'os', 'util'],
    },
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['crypto-browserify', 'buffer', 'stream-browserify', 'process', 'path-browserify'],
    exclude: ['fs'],
  },
});

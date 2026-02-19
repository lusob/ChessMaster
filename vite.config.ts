import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['stockfish'],
  },
  build: {
    rollupOptions: {
      output: {
        // Asegurar que los archivos WASM se copien correctamente
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Copiar archivos WASM de stockfish
    copyPublicDir: true,
  },
  publicDir: false,
});

import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // publicDir is false so we include the manifest manually
      manifest: {
        name: 'Chess Bot Arena',
        short_name: 'Chess Arena',
        description: 'Aplicación de ajedrez con motor Stockfish. Juega contra bots, participa en torneos y mejora tu ELO.',
        start_url: './',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache all build assets except Stockfish WASM (too large ~7MB)
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        globIgnores: ['**/stockfish*.wasm'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Stockfish WASM: network-first so it's not cached in SW
            urlPattern: /stockfish.*\.wasm$/,
            handler: 'NetworkOnly',
          },
          {
            // App shell: cache-first
            urlPattern: /\.(?:js|css|html)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
        // Increase max asset size to handle stockfish JS (it's ~21KB gzipped but ~700KB raw)
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        // Don't fail on missing revision for assets
        cleanupOutdatedCaches: true,
      },
      // Dev options: enable SW in dev for testing
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
    copyPublicDir: true,
  },
  // Enable public dir so icons/manifest are served
  publicDir: 'public',
});

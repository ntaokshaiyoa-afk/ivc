import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import compression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: '/ivc/',

  plugins: [
    react(),

    // Brotli圧縮
    compression({
      algorithm: 'brotliCompress',
    }),

    // bundleサイズ確認
    visualizer({
      filename: 'bundle-analysis.html',
      open: false,
    }),

    VitePWA({
      registerType: 'autoUpdate',

      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      manifest: {
        name: 'IVC Image & Video Compressor',
        short_name: 'IVC Compressor',
        description: 'Browser-based image and video compression tool',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/ivc/',
        start_url: '/ivc/',
        icons: [
          {
            src: '/ivc/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/ivc/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/ivc/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-cdn-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
        ],
      },
    }),
  ],

  optimizeDeps: {
    exclude: [
      '@ffmpeg/ffmpeg',
      '@ffmpeg/util',
      '@jsquash/jpeg',
      '@jsquash/webp',
      '@jsquash/avif',
      '@jsquash/png',
      '@jsquash/oxipng',
    ],
  },

  worker: {
    format: 'es',
  },

  build: {
    target: 'es2020',

    // ソースマップ削除
    sourcemap: false,

    // 高速minify
    minify: false, //'esbuild',

    chunkSizeWarningLimit: 2000,

    commonjsOptions: {
      transformMixedEsModules: true,
    },

    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          ffmpeg: ['@ffmpeg/ffmpeg'],
        },
      },
    },
  },
})

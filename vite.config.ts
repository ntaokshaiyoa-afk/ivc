import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: "/ivc/",
    plugins: [
    react(),

VitePWA({
  registerType: 'autoUpdate',

  includeAssets: [
    'favicon.ico',
    'apple-touch-icon.png',
    'masked-icon.svg'
  ],

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
        type: 'image/png'
      },
      {
        src: '/ivc/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      },
      {
        src: '/ivc/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
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
            maxAgeSeconds: 60 * 60 * 24 * 7
          }
        }
      }
    ]
  }
})
  ],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
    worker: {
    format: "es"
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
})

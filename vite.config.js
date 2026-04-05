import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Vite Configuration for YANA V3
 * 
 * Optimized for Production PWA deployment with rigorous caching protocols
 * and automated service worker generation.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'YANA: Yet Another News Aggregator',
        short_name: 'YANA',
        description: 'Immersive, dark-mode, cryptographically-secure news stream.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // High-performance cache strategy for News Feeds and Assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/corsproxy\.io\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rss-feeds-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 Hours
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false
  }
});

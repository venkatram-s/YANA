import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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
        runtimeCaching: [
          {
            urlPattern: /^\/api\/rss-proxy.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rss-feeds-cache-v2',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 6
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api/rss-proxy': {
        target: 'https://corsproxy.io/?',
        changeOrigin: true,
        rewrite: (path) => {
          const urlParam = new URLSearchParams(path.split('?').slice(1).join('?')).get('url');
          if (!urlParam) return '';
          
          try {
            const url = new URL(urlParam);
            // Block local/private access during dev
            const isLocal = /localhost|^127\.|^192\.168\.|^10\./.test(url.hostname);
            if (isLocal || url.protocol !== 'https:') {
              console.error('BLOCKED_INSECURE_PROXY_REQUEST:', urlParam);
              return 'http://127.0.0.1/blocked'; 
            }
            return urlParam;
          } catch (e) {
            return '';
          }
        },
        selfHandleResponse: true,
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            let body = '';
            proxyRes.on('data', (chunk) => body += chunk);
            proxyRes.on('end', () => {
              res.writeHead(200, {
                'Content-Type': proxyRes.headers['content-type'] || 'text/xml; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 's-maxage=600, stale-while-revalidate=1200'
              });
              res.end(body);
            });
          });
        }
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false
  }
});

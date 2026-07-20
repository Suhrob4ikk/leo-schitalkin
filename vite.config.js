import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' keeps every asset URL relative, so the same build works both at the
// domain root (Vercel) and under /<repo>/ (GitHub Pages) with no rebuild.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // injectManifest, not generateSW: the service worker is hand-written so
      // it can wake on Periodic Background Sync to post a reminder and open the
      // app when one is tapped. See src/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Лео Считалкин',
        short_name: 'Лео',
        description: 'Математика с лисёнком Лео: сложение, вычитание и таблица умножения.',
        lang: 'ru',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFFDF8',
        theme_color: '#58CC02',
        categories: ['education', 'kids'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
      },
    }),
  ],
})

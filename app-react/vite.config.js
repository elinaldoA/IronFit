import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/meu-plano/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'favicon.svg', 'favicon.ico'],
      manifest: {
        name: 'IronFit - Treino e Dieta',
        short_name: 'IronFit',
        description: 'Seu plano de treino e dieta personalizado',
        start_url: '/meu-plano/',
        scope: '/meu-plano/',
        display: 'standalone',
        background_color: '#0e0e12',
        theme_color: '#0e0e12',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
})

/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// "base: './'" sorgt dafür, dass die App auch in einem Unterordner
// (z. B. GitHub Pages) funktioniert.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Karteikarten',
        short_name: 'Karteikarten',
        description: 'Karteikarten mit Spaced Repetition (FSRS) – offline, ohne Login.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#111418',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // KaTeX-Schriften mit in den Offline-Cache aufnehmen
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});

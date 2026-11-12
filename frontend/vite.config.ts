import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

function publicShell() {
  return {
    name: 'abelha-public-shell',
    closeBundle() {
      const assets = readdirSync('dist/assets').filter(file => /\.(js|css|png|svg|woff2?)$/.test(file)).map(file => '/assets/' + file)
      const files = ['/', '/bee-mark.png', '/pwa/icon-192.png', '/pwa/icon-512.png', '/pwa/maskable-512.png', ...assets]
      const version = createHash('sha256').update(readFileSync('dist/index.html')).update(readFileSync('pwa/sw.js')).update(JSON.stringify(files)).digest('hex').slice(0,16)
      const source = readFileSync('pwa/sw.js','utf8').replace('__PRECACHE__',JSON.stringify(files)).replaceAll('__VERSION__',version)
      writeFileSync('dist/sw.js', source)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), publicShell()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})

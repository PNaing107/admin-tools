import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      closeBundle() {
        copyFileSync(join('dist', 'index.html'), join('dist', '404.html'))
      },
    },
  ],
  base: '/admin-tools/',
})

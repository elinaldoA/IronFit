import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/EAFIT/admin/',
  server: {
    port: 5174,
  },
  test: {
    setupFiles: ['./src/test/setupTests.js'],
  },
  plugins: [react()],
})

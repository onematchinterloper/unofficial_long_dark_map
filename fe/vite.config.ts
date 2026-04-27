import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local: base "/"  →  http://localhost:5173/
// GitHub Actions: CI=true  →  https://<user>.github.io/unofficial-long-dark-maps/
export default defineConfig({
  plugins: [react()],
  base: process.env.CI === 'true' ? '/unofficial-long-dark-maps/' : '/',
})

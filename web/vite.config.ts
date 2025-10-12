import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/YouthScheduleAutomator/', // Your GitHub repo name
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

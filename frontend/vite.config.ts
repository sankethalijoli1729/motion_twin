import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'three',
      'three/addons/loaders/GLTFLoader.js',
      '@react-three/fiber',
      '@react-three/drei',
      'recharts',
      'zustand',
      'react-router-dom',
      'lucide-react',
      'react-is'
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  }
})

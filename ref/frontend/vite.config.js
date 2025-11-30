import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()], // Remove tailwindcss() plugin
  server: {
    port: 8000,
    proxy: {
      // Chat backend API routes
      '/api/auth': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      },
      '/api/chat': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      },
      '/api/data': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      },
      // CRM API routes
      '/api/crm': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        secure: false
      },
      // NL2SQL Analytics API routes
      '/api/analytics': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false
      },
      '/api/nl2sql': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        secure: false
      },
      // Lead Generation API routes
      '/api/lead-gen': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
      },
      // Team Invitations API routes
      '/api/invitations': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false
      },
      // Email Training API routes (User Settings Service)
      '/api/email-training': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false
      },
      // Email Signature API routes (User Settings Service)
      '/api/signature': {
        target: 'http://localhost:8005',
        changeOrigin: true,
        secure: false
      },
      // Default fallback for any other /api routes
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})

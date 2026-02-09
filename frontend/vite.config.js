import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
    alias: mode === 'test' ? [
      { find: /^react-router-dom$/, replacement: path.resolve(__dirname, 'node_modules/react-router-dom/dist/index.mjs') },
      { find: /^react-router$/, replacement: path.resolve(__dirname, 'node_modules/react-router/dist/development/index.mjs') },
      { find: /^react-router\/dom$/, replacement: path.resolve(__dirname, 'node_modules/react-router/dist/development/dom-export.mjs') }
    ] : []
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    globals: true,
    deps: {
      inline: ['react-router', 'react-router-dom', 'react-router/dom']
    },
    server: {
      deps: {
        inline: ['react-router', 'react-router-dom', 'react-router/dom']
      }
    }
  }
}))

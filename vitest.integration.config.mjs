import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.mjs'],
    testTimeout: 120_000,
    reporters: ['default'],
    // Vite sets BASE_URL="/" — use SMOKE_BASE_URL for production smoke
    env: {
      SMOKE_BASE_URL: process.env.SMOKE_BASE_URL || process.env.MERIDIAN_PRODUCTION_URL,
    },
  },
})

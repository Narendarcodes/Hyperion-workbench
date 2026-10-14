/**
 * Standalone screen harness for MRPL workbench screens (Playwright smoke +
 * screenshots). Renders one screen per `?screen=`; the host routes are
 * fulfilled by the smoke test (page.route) from the real seed store.
 */
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const repo = fileURLToPath(new URL('../../../', import.meta.url))

export default defineConfig({
  root,
  publicDir: fileURLToPath(new URL('../public', import.meta.url)),
  plugins: [react(), tsconfigPaths({ projects: [`${repo}tsconfig.base.json`] })],
  // MRPL_BRIDGE_URL (live e2e): proxy the same-origin /hyperion routes to a real bridge.
  server: {
    fs: { allow: [repo] },
    hmr: false,
    ...(process.env.MRPL_BRIDGE_URL ? { proxy: { '/hyperion': { target: process.env.MRPL_BRIDGE_URL, changeOrigin: true } } } : {}),
  },
  logLevel: 'warn',
})

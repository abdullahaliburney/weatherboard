import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import type { Plugin } from 'vite'

/**
 * Replace the service worker's precache placeholder with the hashed asset list
 * from the production build, so a first visit caches exactly what shipped.
 * A tiny local plugin keeps the project dependency-free.
 */
function serviceWorkerPrecache(): Plugin {
  let root = process.cwd()
  let outDir = 'dist'

  return {
    name: 'weatherboard-sw-precache',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },
    async closeBundle() {
      const directory = resolve(root, outDir)
      const swPath = resolve(directory, 'sw.js')
      const source = await readFile(swPath, 'utf8')

      const files = (await readdir(directory, { recursive: true }))
        .map((file) => String(file).split('\\').join('/'))
        .filter(
          (file) =>
            /\.(?:js|css|html|svg|png|webmanifest|woff2?)$/.test(file) && !file.endsWith('sw.js'),
        )
        .sort()

      const precache = ['/', ...files.map((file) => `/${file}`)]
      const version = createHash('sha256')
        .update(JSON.stringify(precache))
        .digest('hex')
        .slice(0, 12)

      await writeFile(
        swPath,
        source
          .replace(/^const PRECACHE = .*$/m, `const PRECACHE = ${JSON.stringify(precache)}`)
          .replace('__SW_VERSION__', `weatherboard-shell-${version}`),
      )
      console.log(
        `[sw] precache list written: ${precache.length} entries, cache weatherboard-shell-${version}`,
      )
    },
  }
}

const previewAllowedHosts = (process.env.PREVIEW_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerPrecache()],
  server: {
    // Bind on all interfaces so the cloud preview proxy can reach the dev server.
    // The preview hostname is supplied per-process via
    // __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS rather than hard-coded here.
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      // The API proxy runs separately during development: `npm run dev:api`.
      // Proxying keeps the browser same-origin, so no CORS preflight in dev.
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true },
    },
  },
  // The production build is served on its own port so it can be verified with
  // the real service worker while the dev server keeps running.
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: previewAllowedHosts,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8788', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'worker/**/*.test.ts'],
    css: true,
    restoreMocks: true,
  },
})

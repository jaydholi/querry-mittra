import { defineConfig } from '@lovable.dev/vite-tanstack-config'

// On Hostinger (Node.js app hosting) we disable the Cloudflare Workers target
// so the build emits a plain Node SSR server runnable with `node`.
const isNodeTarget =
  process.env.BUILD_TARGET === 'node' || process.env.HOSTINGER === '1'

export default defineConfig({
  cloudflare: isNodeTarget ? false : undefined,
})

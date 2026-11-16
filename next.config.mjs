// The dashboard is served under a path prefix on the main website
// (greenedenfarms.org/login/* is rewritten to this app). Override with
// NEXT_PUBLIC_BASE_PATH at build time; set it to "" to serve from the root again.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/login'

// The main website (itself a Next.js app on Vercel) won't proxy paths containing /_next/, so in
// production the JS/CSS/font files are loaded straight from this app's own Vercel domain
// (it sends access-control-allow-origin: *). Pages still go through greenedenfarms.org/login/*.
// Override with ASSET_PREFIX; local dev and preview builds use relative assets.
const assetPrefix = process.env.ASSET_PREFIX ?? (process.env.VERCEL_ENV === 'production' && basePath ? `https://greenerai.vercel.app${basePath}` : undefined)

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  assetPrefix,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

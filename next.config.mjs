// The dashboard is served under a path prefix on the main website
// (greenedenfarms.org/login/* is rewritten to this app). Override with
// NEXT_PUBLIC_BASE_PATH at build time; set it to "" to serve from the root again.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/login'

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: {
    unoptimized: true,
  },
}

export default nextConfig

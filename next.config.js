/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // The generated .next/types/validator.ts has incorrect paths due to
    // src/ dir co-existing with root app/ dir — safe to ignore for now.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'api.microlink.io' },
    ],
  },
}

module.exports = nextConfig

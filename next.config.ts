import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Serve remote images directly until the app is moved to a fully patched
    // Next.js line for the remaining image-optimizer advisory.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'randomuser.me' },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig

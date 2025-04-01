/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Strict Mode for better development experience
  reactStrictMode: true,
  
  // Configure images to allow remote patterns
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Ensure proper URL handling for production
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://goonriders.vercel.app',
    NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL || 'https://goonriders.vercel.app/admin',
    NEXT_PUBLIC_WORKER_URL: process.env.NEXT_PUBLIC_WORKER_URL || 'https://goonriders.vercel.app/worker',
  },
  
  // Don't add trailing slashes to URLs
  trailingSlash: false,
  
  // Configure base path if needed
  // basePath: '',
  
  // Configure URL rewrites if needed
  async rewrites() {
    return [];
  },
}

module.exports = nextConfig 
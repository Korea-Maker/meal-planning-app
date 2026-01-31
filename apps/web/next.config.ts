import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@meal-planning/shared-types', '@meal-planning/constants'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'spoonacular.com',
      },
      {
        protocol: 'https',
        hostname: 'img.spoonacular.com',
      },
      {
        protocol: 'https',
        hostname: 'www.themealdb.com',
      },
    ],
  },
}

export default nextConfig

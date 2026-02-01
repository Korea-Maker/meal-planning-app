import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
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
      {
        protocol: 'http',
        hostname: 'www.foodsafetykorea.go.kr',
      },
      {
        protocol: 'https',
        hostname: 'www.foodsafetykorea.go.kr',
      },
    ],
  },
}

export default nextConfig

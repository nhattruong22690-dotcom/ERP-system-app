import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration for Tauri (static export) or Vercel (default)
  output: process.env.IS_TAURI ? 'export' : undefined,

  // Enable React strict mode for better development warnings
  reactStrictMode: true,


  // Compress responses with gzip
  compress: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Enable experimental optimizations
  experimental: {
    optimizeCss: true,
  },

  // Configure headers for caching static assets
  async headers() {
    if (process.env.IS_TAURI) return [];
    return [

      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mysql2'],
  },
  // Netlify compatibility
  trailingSlash: false,
};

module.exports = nextConfig;

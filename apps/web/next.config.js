/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tripnest/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;

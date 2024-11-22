/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['api.nlib.cc'],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

module.exports = nextConfig
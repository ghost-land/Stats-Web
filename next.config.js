/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 180,
  images: {
    domains: ['api.nlib.cc'],
    minimumCacheTTL: 60,
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  }
};

module.exports = nextConfig;
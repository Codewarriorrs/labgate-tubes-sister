/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone hanya diaktifkan jika env BUILD_STANDALONE diset (misal untuk Docker container)
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

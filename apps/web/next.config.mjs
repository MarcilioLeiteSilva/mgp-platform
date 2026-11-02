/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@mgp/shared', '@mgp/contracts'],
};

export default nextConfig;


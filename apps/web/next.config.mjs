/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
    return [
      { source: '/api-proxy/:path*', destination: `${apiBase}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;

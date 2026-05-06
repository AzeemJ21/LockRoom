const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
let socketOrigin = "'self'";
try {
  socketOrigin = new URL(socketUrl).origin;
} catch {
  socketOrigin = "'self'";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Framer Motion v12 includes `motion-dom`; transpiling avoids broken server vendor-chunks */
  transpilePackages: ['framer-motion'],
  /** Mongoose must run as a Node external — bundling it breaks at runtime and yields HTML 500 pages */
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  headers: async () => [
    {
      source: '/room/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            `connect-src 'self' ${socketOrigin} ws: wss:`,
            "media-src 'self' blob:",
            "img-src 'self' data: blob:",
            "font-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          ].join('; '),
        },
      ],
    },
  ],
  webpack: (config) => {
    config.externals.push({ bufferutil: 'bufferutil', 'utf-8-validate': 'utf-8-validate' });
    return config;
  },
};

module.exports = nextConfig;

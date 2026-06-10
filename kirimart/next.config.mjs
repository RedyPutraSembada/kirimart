import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.js", // We'll create this file next
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output untuk Docker production build
  // Menghasilkan .next/standalone dengan server.js + minimal node_modules
  output: 'standalone',
  serverExternalPackages: ['kysely', '@better-auth/kysely-adapter'],
  experimental: {
    serverComponentsExternalPackages: [
      'react-email',
      '@react-email/components',
      '@react-email/render',
      'css-tree'
    ]
  },
  allowedDevOrigins: [
    'unintermingled-noncoincident-chandler.ngrok-free.app',
  ],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4004",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default withSerwist(nextConfig);

import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.js", 
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output untuk Docker production build
  output: 'standalone',
  
  // SEMUA PAKET EKSTERNAL DISATUKAN DI SINI (ROOT LEVEL)
  serverExternalPackages: [
    'kysely', 
    '@better-auth/kysely-adapter',
    'react-email',
    '@react-email/components',
    '@react-email/render',
    'css-tree'
  ],

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

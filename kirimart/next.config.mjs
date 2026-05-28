/** @type {import('next').NextConfig} */
const nextConfig = {
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

export default nextConfig;

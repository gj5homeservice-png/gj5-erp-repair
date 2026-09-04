import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Static export is only needed for Capacitor/Mobile APK and Tauri/Electron desktop
  // packaging (`npm run mobile:build` / `tauri:build` / `build-win`), which set
  // STATIC_EXPORT=true before building. The regular `npm run build` used for
  // Hostinger (Node.js) deployment runs as a normal Next.js server build, which is
  // required for the dynamic /attendance/[token] page and the /api/* route handlers
  // (payment order creation, verification, wallet top-up) to work at all.
  ...(process.env.STATIC_EXPORT === 'true' ? { output: 'export' as const } : {}),
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

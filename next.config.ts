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
  // Root cause of the live "ChunkLoadError" / stuck-on-loading-screen
  // production incidents: webpack 5's persistent filesystem cache
  // (.next/cache/webpack) can reuse a previously-compiled chunk byte-for-byte
  // across separate `next build` runs whenever that chunk's own inputs look
  // unchanged — including chunks that embed a hardcoded map of sibling chunk
  // filenames for async/dynamic imports. If a *different* chunk in that map
  // WAS regenerated under a new content hash in the newer build (because its
  // own source changed), the reused chunk still asks the browser for the
  // *old* filename, which then 404s — exactly the failure observed live.
  // This happened even after confirming the host had just run a fresh
  // `next build`, which means the npm-level `prebuild` cleanup step alone
  // isn't sufficient on this host — either it reuses a preserved
  // `.next/cache` directory across deployments, or its build step doesn't
  // go through npm's script lifecycle at all. Disabling the cache here is
  // enforced by Next.js itself inside `next build`'s own execution, so it
  // can't be bypassed by however the host invokes that command. Only
  // affects production builds — `next dev`'s cache (fast local iteration)
  // is untouched.
  webpack: (config, { dev }) => {
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;

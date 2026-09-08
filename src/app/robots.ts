import type { MetadataRoute } from 'next';

// Keeps GJ5 HOME SERVICE out of search-engine indexes while remaining fully
// reachable by direct URL — see the matching `robots` metadata in
// layout.tsx and the X-Robots-Tag header in next.config.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}

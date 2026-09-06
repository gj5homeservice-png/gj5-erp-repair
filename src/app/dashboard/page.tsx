// Server Component wrapper — its only job is to hold this route-segment
// config, which a "use client" file (DashboardClient.tsx, holding all the
// actual page logic) is not allowed to export.
//
// Root cause this fixes: live production kept serving a stale prerendered
// /dashboard HTML shell that referenced JS chunk files from an OLDER
// deployment (confirmed by comparing its referenced webpack runtime hash
// against /login's — the two pages were being served from two different
// builds). Next.js's Full Route Cache had cached /dashboard's static output
// and was not invalidating it across deployments the way other routes were,
// so visitors kept getting 404s for chunks that no longer existed on disk
// even though the current deployment itself was complete and healthy.
// `force-dynamic` makes Next.js render this route fresh on every request
// instead of serving a cached static shell, so its HTML always references
// exactly the chunks that exist in the currently-running build.
export const dynamic = 'force-dynamic';

import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return <DashboardClient />;
}

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ChunkErrorRecovery } from '@/components/ChunkErrorRecovery';
import { DynamicFavicon } from '@/components/DynamicFavicon';

export const metadata: Metadata = {
  title: 'GJ5 Home Service | TV & Electronics Repair',
  description: 'GOOD JOB 5 HOME SERVICE - Smart Business Management Software',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      {/* suppressHydrationWarning: the inline script below intentionally edits
          <body>'s classList before React hydrates. */}
      <body suppressHydrationWarning className="font-body antialiased bg-[#0B0F19] text-slate-100 overflow-x-hidden">
        {/* Applies the admin's saved light/dark choice before first paint (the
            same classes useAdminTheme() manages once React is running), so a
            Light-mode user never sees a dark flash on refresh. Scoped to
            /dashboard only — the public customer site is untouched. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{if(location.pathname.indexOf('/dashboard')!==0)return;var b=document.body;b.classList.add('gj5-admin-active');if(localStorage.getItem('gj5_admin_theme')==='light')b.classList.remove('dark');else b.classList.add('dark');}catch(e){}})();" }} />
        <ChunkErrorRecovery />
        <DynamicFavicon />
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}

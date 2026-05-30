import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GJ5 HOME SERVICE | Admin Console',
  description: 'Enterprise ERP for Service & Repair Management',
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
      <body className="font-body antialiased bg-[#0B0F19] text-slate-100 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

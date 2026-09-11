"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, Wrench, MessageCircle } from 'lucide-react';
import { getCustomerToken, getCustomerName, clearCustomerSession, customerApiFetch } from '@/lib/customer-client';

const WHATSAPP_NUMBER = '918866983900'; // matches the number already printed on repair labels (StickerModal.tsx)
const NAV_LINKS = [
  { href: '/#services', label: 'Services' },
  { href: '/#how-it-works', label: 'How It Works' },
  { href: '/#why-us', label: 'Why Us' },
  { href: '/#contact', label: 'Contact' },
];

export function PublicHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    setCustomerName(getCustomerName());
  }, []);

  const handleLogout = async () => {
    const token = getCustomerToken();
    if (token) {
      await customerApiFetch('/api/customer/logout', { method: 'POST' }).catch(() => {});
    }
    clearCustomerSession();
    setCustomerName(null);
    router.push('/');
  };

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#123C8C] flex items-center justify-center shadow-md shadow-blue-900/10">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-headline font-black text-sm sm:text-base text-[#123C8C] uppercase tracking-tight">GJ5 Home Service</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-[0.15em] font-bold">TV & Electronics Repair</span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} className="text-sm font-semibold text-slate-600 hover:text-[#123C8C] transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {customerName ? (
            <>
              <Link href="/customer/repairs" className="text-sm font-bold text-slate-700 hover:text-[#123C8C] px-3">
                Hi, {customerName.split(' ')[0]}
              </Link>
              <button onClick={handleLogout} className="text-sm font-bold text-slate-500 hover:text-rose-600 px-2">
                Logout
              </button>
            </>
          ) : (
            <Link href="/customer/login" className="text-sm font-bold text-slate-600 hover:text-[#123C8C] px-2">
              Track My Repair
            </Link>
          )}
          <Link
            href="/book-repair"
            className="bg-[#123C8C] hover:bg-[#0D2E63] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-900/15 transition-colors"
          >
            Book a Repair
          </Link>
        </div>

        <button className="md:hidden p-2 text-slate-700" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu">
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-slate-700 py-1.5">
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            {customerName ? (
              <>
                <Link href="/customer/repairs" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-700 py-1.5">
                  My Repairs ({customerName.split(' ')[0]})
                </Link>
                <button onClick={handleLogout} className="block w-full text-left text-sm font-bold text-rose-600 py-1.5">Logout</button>
              </>
            ) : (
              <Link href="/customer/login" onClick={() => setMenuOpen(false)} className="block text-sm font-bold text-slate-700 py-1.5">
                Track My Repair
              </Link>
            )}
            <Link
              href="/book-repair"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-center bg-[#123C8C] text-white text-sm font-bold px-5 py-3 rounded-xl"
            >
              Book a Repair
            </Link>
          </div>
        </div>
      )}
    </header>

    {/* Rendered as a SIBLING of <header>, not a descendant — header has
        backdrop-blur (backdrop-filter), which per spec creates a new
        containing block for `position: fixed` descendants, so a fixed
        element nested inside it anchors to the header's own box instead of
        the viewport. Sibling placement keeps this pinned to the true
        viewport corner regardless of the header's own filter effects. */}
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] shadow-lg shadow-green-900/20 flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" fill="white" />
    </a>
    </>
  );
}

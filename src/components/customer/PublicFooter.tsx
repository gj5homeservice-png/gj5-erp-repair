"use client"

import React from 'react';
import Link from 'next/link';
import { Wrench, Phone, MapPin, Mail } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer id="contact" className="bg-[#0B0F19] text-slate-400 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#123C8C] flex items-center justify-center">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="font-headline font-black text-white uppercase text-sm tracking-tight">GJ5 Home Service</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Trusted TV &amp; electronics repair — genuine parts, experienced technicians, honest pricing.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Quick Links</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/book-repair" className="hover:text-white transition-colors">Book a Repair</Link></li>
            <li><Link href="/customer/login" className="hover:text-white transition-colors">Track My Repair</Link></li>
            <li><a href="/#services" className="hover:text-white transition-colors">Our Services</a></li>
            <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Services</h4>
          <ul className="space-y-2.5 text-sm">
            <li>LED / LCD TV Repair</li>
            <li>Smart TV Repair</li>
            <li>Screen &amp; Panel Repair</li>
            <li>Other Electronics</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#4C8DFF] shrink-0" /> 88669 83900</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#4C8DFF] shrink-0" /> support@gj5electronics.in</li>
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-[#4C8DFF] shrink-0 mt-0.5" /> Serving your local area — doorstep pickup available</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-[11px] text-slate-600">
        © {new Date().getFullYear()} GJ5 Home Service. All rights reserved.
      </div>
    </footer>
  );
}

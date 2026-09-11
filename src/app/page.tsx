"use client"

import React from 'react';
import Link from 'next/link';
import {
  Tv, Smartphone, Wrench, ShieldCheck, Clock, BadgeCheck, Star,
  CalendarCheck, PhoneCall, Search, PackageCheck, ArrowRight, MapPin,
} from 'lucide-react';
import { PublicHeader } from '@/components/customer/PublicHeader';
import { PublicFooter } from '@/components/customer/PublicFooter';

const SERVICES = [
  { icon: Tv, title: 'LED / LCD TV Repair', desc: 'Screen issues, backlight failure, panel lines, power problems — all major brands.' },
  { icon: Tv, title: 'Smart TV Repair', desc: 'Software glitches, app crashes, connectivity issues, motherboard repair.' },
  { icon: Smartphone, title: 'Other Electronics', desc: 'Home audio, set-top boxes, and other household electronics.' },
  { icon: Wrench, title: 'Doorstep Service', desc: 'A technician visits your home to inspect and repair on the spot where possible.' },
];

const STEPS = [
  { icon: CalendarCheck, title: 'Book Online', desc: 'Tell us about your device and problem in under 2 minutes.' },
  { icon: PhoneCall, title: 'We Confirm', desc: 'Our team calls to confirm details and schedule a visit.' },
  { icon: Wrench, title: 'Repair', desc: 'A trained technician inspects and repairs your device.' },
  { icon: PackageCheck, title: 'Get It Back', desc: 'Track progress online and get your device back, working like new.' },
];

const WHY_US = [
  { icon: ShieldCheck, title: 'Genuine Parts', desc: 'Only original or manufacturer-grade replacement parts.' },
  { icon: BadgeCheck, title: 'Experienced Technicians', desc: 'Trained, background-verified repair specialists.' },
  { icon: Clock, title: 'Fast Turnaround', desc: 'Most repairs completed within 24-48 hours.' },
  { icon: Star, title: 'Warranty on Repairs', desc: 'Every repair job is backed by a service warranty.' },
];

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0D2E63] to-[#123C8C] text-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-[#E53935]/10 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 sm:pt-24 sm:pb-24 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 text-center lg:text-left">
            <span className="inline-block bg-white/10 border border-white/20 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
              Trusted TV &amp; Electronics Repair
            </span>
            <h1 className="font-headline font-black text-3xl sm:text-5xl leading-tight tracking-tight">
              Your TV Repair,<br className="hidden sm:block" /> Done Right — At Your Doorstep
            </h1>
            <p className="text-slate-200 text-sm sm:text-base max-w-lg mx-auto lg:mx-0">
              Book a repair online in minutes. Genuine parts, verified technicians, and real-time status updates — no guesswork, no waiting on hold.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <Link
                href="/book-repair"
                className="bg-white text-[#123C8C] font-bold text-sm px-7 py-3.5 rounded-xl shadow-xl shadow-black/10 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
              >
                Book a Repair <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/customer/login"
                className="bg-white/10 border border-white/25 text-white font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" /> Track My Repair
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="w-full max-w-sm bg-white/10 border border-white/20 rounded-[2rem] p-8 backdrop-blur-sm space-y-5">
              {[
                { label: 'Avg. Response Time', value: '< 2 hours' },
                { label: 'Repairs Completed', value: '10,000+' },
                { label: 'Customer Rating', value: '4.8 / 5 ★' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <span className="text-xs uppercase tracking-wide text-slate-300">{stat.label}</span>
                  <span className="font-headline font-bold text-lg">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#123C8C]">What We Repair</span>
          <h2 className="font-headline font-black text-2xl sm:text-3xl text-slate-900 mt-2">Complete TV &amp; Electronics Repair Services</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map(s => (
            <div key={s.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#123C8C]/10 flex items-center justify-center mb-4">
                <s.icon className="w-6 h-6 text-[#123C8C]" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-2">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50 border-y border-slate-200 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#123C8C]">Simple Process</span>
            <h2 className="font-headline font-black text-2xl sm:text-3xl text-slate-900 mt-2">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative bg-white border border-slate-200 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#123C8C] flex items-center justify-center mb-4 shadow-lg shadow-blue-900/10">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <span className="absolute top-3 right-4 text-3xl font-headline font-black text-slate-100">0{i + 1}</span>
                <h3 className="font-bold text-slate-900 text-sm mb-1.5">{step.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section id="why-us" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#123C8C]">Why Choose Us</span>
          <h2 className="font-headline font-black text-2xl sm:text-3xl text-slate-900 mt-2">Repairs You Can Trust</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {WHY_US.map(w => (
            <div key={w.title} className="flex flex-col items-center text-center gap-3 p-5">
              <div className="w-14 h-14 rounded-full bg-[#E53935]/10 flex items-center justify-center">
                <w.icon className="w-7 h-7 text-[#E53935]" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{w.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-[#123C8C] py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <h2 className="font-headline font-black text-2xl sm:text-3xl text-white">Ready to Get Your Device Fixed?</h2>
          <p className="text-slate-200 text-sm max-w-lg mx-auto">Book online now — it takes less than 2 minutes and our team will reach out to confirm your appointment.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link href="/book-repair" className="bg-white text-[#123C8C] font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg hover:bg-slate-100 transition-colors">
              Book a Repair Now
            </Link>
            <a href="tel:+918866983900" className="bg-white/10 border border-white/25 text-white font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-white/20 transition-colors flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4" /> Call 88669 83900
            </a>
          </div>
          <p className="text-slate-300 text-xs flex items-center justify-center gap-1.5 pt-2"><MapPin className="w-3.5 h-3.5" /> Doorstep pickup available in your local service area</p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

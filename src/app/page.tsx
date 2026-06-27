"use client"

import React from 'react';
import Image from 'next/image';
import { 
  Tv, 
  ShoppingCart, 
  MessageSquare, 
  CheckCircle, 
  ShieldCheck, 
  Truck, 
  Zap,
  ChevronRight,
  Star,
  MapPin,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const PRODUCT_CATEGORIES = ['32 inch', '40 inch', '43 inch', '50 inch', '55 inch', '65 inch'];
const BRANDS = ['GJ5 PLUS', 'Samsung Tizen OS', 'LG WebOS', 'Cloud TV', 'Google TV'];

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: 'GJ5 PLUS Smart 4K Ultra HD',
    brand: 'GJ5 PLUS',
    size: '55 inch',
    mrp: 54990,
    price: 38990,
    image: 'tv-55',
    features: ['Frameless Design', '4K UHD', 'Dolby Audio'],
    warranty: '2 Years Doorstep'
  },
  {
    id: 2,
    name: 'Samsung Crystal 4K Series',
    brand: 'Samsung Tizen OS',
    size: '43 inch',
    mrp: 42990,
    price: 31990,
    image: 'tv-43',
    features: ['Tizen OS', 'HDR 10+', 'Crystal Display'],
    warranty: '1 Year Brand'
  },
  {
    id: 3,
    name: 'LG NanoCell ThinQ AI',
    brand: 'LG WebOS',
    size: '50 inch',
    mrp: 68990,
    price: 45990,
    image: 'hero-tv',
    features: ['WebOS', 'Local Dimming', 'Magic Remote'],
    warranty: '1 Year Brand'
  },
  {
    id: 4,
    name: 'GJ5 PLUS HD Ready Smart',
    brand: 'GJ5 PLUS',
    size: '32 inch',
    mrp: 18990,
    price: 11490,
    image: 'tv-32',
    features: ['Bezel-less', 'Android 11', 'Dual Band WiFi'],
    warranty: '2 Years Doorstep'
  }
];

export default function LandingPage() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-tv');

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body">
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#DC2626] flex items-center justify-center text-white font-black italic">G</div>
            <span className="text-xl font-headline font-black text-[#0F172A] tracking-tighter">GJ5 HOME SERVICE</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            {['Home', 'Products', 'Offers', 'Contact'].map((item) => (
              <button key={item} className="text-sm font-bold text-slate-600 hover:text-[#DC2626] transition-colors">{item}</button>
            ))}
            <Button variant="outline" className="border-[#0F172A] text-[#0F172A] hover:bg-slate-50 font-bold px-6">Admin Login</Button>
          </nav>
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Zap className="w-6 h-6 text-[#DC2626]" />
          </Button>
        </div>
      </header>

      {/* Hero Section - Vyapar Style */}
      <section className="relative py-16 md:py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in fade-in slide-in-from-left duration-700">
            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 px-4 py-1 font-bold text-xs uppercase tracking-widest">Limited Time Sale</Badge>
            <h1 className="text-5xl md:text-6xl font-headline font-black leading-tight text-[#0F172A]">
              Best <span className="text-[#DC2626]">Smart TV</span> Deals for Your Home.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              Experience cinema-grade visual excellence with GJ5 Home Service. Authorized dealer of GJ5 PLUS and global brands in Surat.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => scrollToSection('products')} size="lg" className="btn-red h-14 px-10 text-base font-black uppercase">Shop Now <ChevronRight className="ml-2 w-5 h-5" /></Button>
              <Button size="lg" variant="outline" className="border-slate-200 h-14 px-10 text-base font-black uppercase text-slate-700">View Offers</Button>
            </div>
            <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">U{i}</div>
                ))}
              </div>
              <p className="text-sm font-bold text-slate-500">Trusted by <span className="text-[#0F172A]">5000+</span> Customers in Surat</p>
            </div>
          </div>
          <div className="relative animate-in zoom-in duration-700">
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
              <Image 
                src={heroImg?.imageUrl || ''} 
                alt="Smart TV" 
                fill 
                className="object-cover"
                data-ai-hint="smart tv"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 hidden md:block">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><ShieldCheck className="w-6 h-6" /></div>
                <div>
                  <p className="text-sm font-black text-slate-900 leading-none">2 Year Warranty</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase font-bold">On GJ5 PLUS Models</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories Bar */}
      <section className="bg-[#0F172A] py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-4 md:gap-12">
          {PRODUCT_CATEGORIES.map(size => (
            <button key={size} className="text-slate-400 hover:text-white font-black uppercase text-xs tracking-[0.2em] transition-colors">{size}</button>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section id="products" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-headline font-black text-[#0F172A]">Exclusive Collections</h2>
            <p className="text-slate-500 font-medium">Handpicked Smart TVs for your ultimate viewing experience.</p>
          </div>
          <div className="flex gap-2">
            {['All', 'GJ5 PLUS', 'Google TV'].map(f => (
              <Badge key={f} variant="outline" className={cn("px-4 py-1.5 cursor-pointer uppercase font-black text-[10px]", f === 'All' ? "bg-red-50 text-red-600 border-red-200" : "border-slate-200")}>{f}</Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {DEMO_PRODUCTS.map(product => {
            const pImg = PlaceHolderImages.find(img => img.id === product.image);
            return (
              <Card key={product.id} className="group border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                    <Image 
                      src={pImg?.imageUrl || ''} 
                      alt={product.name} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      data-ai-hint="led tv"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-[#DC2626] text-white border-0 font-bold">{Math.round((1 - product.price/product.mrp) * 100)}% OFF</Badge>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{product.brand}</span>
                        <div className="flex text-amber-400"><Star className="w-3 h-3 fill-current" /><Star className="w-3 h-3 fill-current" /></div>
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-slate-500 font-medium">{product.size} • {product.features[0]}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-[#0F172A]">₹{product.price.toLocaleString()}</span>
                      <span className="text-sm text-slate-400 line-through">₹{product.mrp.toLocaleString()}</span>
                    </div>

                    <div className="pt-4 border-t border-slate-50 flex gap-2">
                      <Button className="flex-1 btn-navy h-11 rounded-xl text-xs font-black uppercase">Inquire</Button>
                      <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 text-emerald-600 hover:bg-emerald-50"><MessageSquare className="w-5 h-5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Truck, title: "Same Day Delivery", desc: "Fastest delivery network across Surat within 24 hours." },
            { icon: ShieldCheck, title: "Official Warranty", desc: "Full peace of mind with 100% genuine brand support." },
            { icon: CheckCircle, title: "Free Installation", desc: "Expert technicians will wall mount and set up your TV for free." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-[2rem] bg-white shadow-lg flex items-center justify-center text-[#DC2626]"><item.icon className="w-8 h-8" /></div>
              <h4 className="text-xl font-headline font-black text-[#0F172A] uppercase">{item.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F172A] text-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-16">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#DC2626] flex items-center justify-center text-white font-black italic">G</div>
              <span className="text-2xl font-headline font-black tracking-tighter">GJ5 HOME SERVICE</span>
            </div>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Your trusted partner for home electronics in Surat. We specialize in providing the latest Smart TV technology with unbeatable local service and support.
            </p>
            <div className="flex gap-4">
              <Button size="icon" variant="ghost" className="rounded-full bg-slate-800 hover:bg-[#DC2626]"><Phone className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="rounded-full bg-slate-800 hover:bg-[#DC2626]"><MessageSquare className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="space-y-6">
            <h5 className="text-sm font-black uppercase tracking-widest text-red-500">Quick Links</h5>
            <ul className="space-y-3 text-slate-400 text-sm font-bold">
              <li className="hover:text-white cursor-pointer transition-colors">Our Products</li>
              <li className="hover:text-white cursor-pointer transition-colors">Special Offers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Track Order</li>
              <li className="hover:text-white cursor-pointer transition-colors">Customer Support</li>
            </ul>
          </div>
          <div className="space-y-6">
            <h5 className="text-sm font-black uppercase tracking-widest text-red-500">Contact Node</h5>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                <p className="text-slate-400 text-sm">Surat, Gujarat, India<br />Pin: 395006</p>
              </div>
              <div className="flex gap-3 items-start">
                <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                <p className="text-slate-400 text-sm">+91 88669 83900<br />+91 92652 55869</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em] mt-10">© 2024 GJ5 HOME SERVICE | Engineered for Visual Excellence</p>
      </footer>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

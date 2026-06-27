"use client"

import React, { useState, useMemo } from 'react';
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
  Phone,
  Filter,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const PRODUCT_CATEGORIES = ['32 inch', '40 inch', '43 inch', '50 inch', '55 inch', '65 inch'];
const BRANDS = ['GJ5 PLUS', 'Samsung Tizen OS', 'LG WebOS', 'Google TV', 'Cloud TV'];

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
    warranty: '2 Years Doorstep',
    rating: 5
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
    warranty: '1 Year Brand',
    rating: 4
  },
  {
    id: 3,
    name: 'LG NanoCell ThinQ AI',
    brand: 'LG WebOS',
    size: '50 inch',
    mrp: 68990,
    price: 45990,
    image: 'tv-50',
    features: ['WebOS', 'Local Dimming', 'Magic Remote'],
    warranty: '1 Year Brand',
    rating: 5
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
    warranty: '2 Years Doorstep',
    rating: 4
  },
  {
    id: 5,
    name: 'Google TV Premium 4K',
    brand: 'Google TV',
    size: '65 inch',
    mrp: 99990,
    price: 74990,
    image: 'tv-65',
    features: ['Google Assistant', 'Hands-free Voice', 'IMAX Enhanced'],
    warranty: '1 Year Brand',
    rating: 5
  },
  {
    id: 6,
    name: 'Cloud TV Smart Experience',
    brand: 'Cloud TV',
    size: '40 inch',
    mrp: 26990,
    price: 18990,
    image: 'tv-40',
    features: ['Content Store', 'Wireless Mirroring', 'Slim Bezel'],
    warranty: '1 Year Brand',
    rating: 4
  },
  {
    id: 7,
    name: 'GJ5 PLUS QLED Series 4K',
    brand: 'GJ5 PLUS',
    size: '55 inch',
    mrp: 64990,
    price: 46990,
    image: 'tv-55',
    features: ['Quantum Dot', '120Hz Refresh', 'Game Mode'],
    warranty: '2 Years Doorstep',
    rating: 5
  },
  {
    id: 8,
    name: 'LG Ultra Slim Series',
    brand: 'LG WebOS',
    size: '43 inch',
    mrp: 39990,
    price: 28990,
    image: 'tv-43',
    features: ['ThinQ AI', 'Apple AirPlay 2', 'Game Optimizer'],
    warranty: '1 Year Brand',
    rating: 4
  }
];

export default function LandingPage() {
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-tv');
  const [activeBrand, setActiveBrand] = useState<string>('All');
  const [activeSize, setActiveSize] = useState<string>('All');

  const filteredProducts = useMemo(() => {
    return DEMO_PRODUCTS.filter(p => {
      const brandMatch = activeBrand === 'All' || p.brand === activeBrand;
      const sizeMatch = activeSize === 'All' || p.size === activeSize;
      return brandMatch && sizeMatch;
    });
  }, [activeBrand, activeSize]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openWhatsApp = (productName: string) => {
    const msg = `Hello GJ5 Home Service, I am interested in inquiring about: ${productName}. Please share more details.`;
    const url = `https://wa.me/918866983900?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
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

      {/* Hero Section */}
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
              <Button onClick={() => scrollToSection('offers')} size="lg" variant="outline" className="border-slate-200 h-14 px-10 text-base font-black uppercase text-slate-700">View Offers</Button>
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
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 relative">
              {heroImg?.imageUrl ? (
                <Image 
                  src={heroImg.imageUrl} 
                  alt="Smart TV" 
                  fill 
                  className="object-cover"
                  data-ai-hint="smart tv"
                />
              ) : null}
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

      {/* Product Discovery Filter Console */}
      <section id="products" className="py-12 bg-[#0F172A] border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="p-2 bg-red-600 rounded-lg text-white"><Filter className="w-5 h-5" /></div>
               <h2 className="text-xl font-headline font-bold text-white uppercase tracking-widest">Discovery Console</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => setActiveBrand('All')}
                className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase transition-all", activeBrand === 'All' ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
              >All Brands</button>
              {BRANDS.map(brand => (
                <button 
                  key={brand}
                  onClick={() => setActiveBrand(brand)}
                  className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase transition-all", activeBrand === brand ? "bg-red-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
                >{brand}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 border-t border-slate-800 pt-8">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] w-full text-center">Select Screen Dimension</span>
            <button 
              onClick={() => setActiveSize('All')}
              className={cn("text-xs font-black uppercase transition-colors", activeSize === 'All' ? "text-red-500" : "text-slate-400 hover:text-white")}
            >All Sizes</button>
            {PRODUCT_CATEGORIES.map(size => (
              <button 
                key={size}
                onClick={() => setActiveSize(size)}
                className={cn("text-xs font-black uppercase transition-colors", activeSize === size ? "text-red-500" : "text-slate-400 hover:text-white")}
              >{size}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Product Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-headline font-black text-[#0F172A]">Available Assets</h2>
            <p className="text-slate-500 font-medium text-lg">Industrial grade visuals. Home utility prices.</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
             <span className="bg-slate-100 px-3 py-1 rounded-lg">Showing {filteredProducts.length} Models</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map(product => {
            const pImg = PlaceHolderImages.find(img => img.id === product.image);
            const discount = Math.round((1 - product.price/product.mrp) * 100);
            
            return (
              <Card key={product.id} className="group border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden flex flex-col h-full bg-white">
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Visual Node */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                    {pImg?.imageUrl ? (
                      <Image 
                        src={pImg.imageUrl} 
                        alt={product.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        data-ai-hint={pImg.imageHint}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Tv className="w-12 h-12" />
                        <span className="text-[10px] font-bold uppercase">Visual Coming Soon</span>
                      </div>
                    )}
                    <div className="absolute top-5 left-5 flex flex-col gap-2">
                      <Badge className="bg-[#DC2626] text-white border-0 font-black px-3 py-1 shadow-lg">{discount}% OFF</Badge>
                      <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 border-0 font-bold px-3 py-1 shadow-md">{product.size}</Badge>
                    </div>
                    <div className="absolute bottom-5 right-5">
                       <div className="p-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/50">
                          <div className="flex text-amber-400 gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-3 h-3 fill-current", i >= product.rating && "text-slate-200 fill-transparent")} />
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Metadata Node */}
                  <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black text-red-600 tracking-[0.2em]">{product.brand}</span>
                        <Badge variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-500 uppercase">{product.warranty}</Badge>
                      </div>
                      <h3 className="font-headline font-black text-xl text-slate-900 leading-tight group-hover:text-[#DC2626] transition-colors">{product.name}</h3>
                    </div>

                    <div className="space-y-2">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Key Configurations</p>
                       <div className="flex flex-wrap gap-2">
                          {product.features.map(f => (
                            <span key={f} className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{f}</span>
                          ))}
                       </div>
                    </div>

                    <div className="pt-4 mt-auto space-y-6">
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-400 uppercase">Offer Price</span>
                           <span className="text-3xl font-headline font-black text-[#0F172A]">₹{product.price.toLocaleString()}</span>
                         </div>
                         <div className="text-right">
                           <span className="text-[10px] font-black text-slate-400 uppercase">MRP</span>
                           <span className="text-sm text-slate-400 line-through block">₹{product.mrp.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button className="btn-navy h-12 rounded-2xl text-xs font-black uppercase group/btn">
                           Details <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button onClick={() => openWhatsApp(product.name)} variant="outline" className="h-12 rounded-2xl border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center gap-2 text-xs font-black uppercase">
                          <MessageSquare className="w-4 h-4" /> Inquiry
                        </Button>
                      </div>
                      
                      <Button variant="outline" className="w-full h-12 rounded-2xl border-[#0F172A] text-[#0F172A] hover:bg-slate-50 font-black uppercase text-xs">
                         <ShoppingCart className="w-4 h-4 mr-2" /> Quick Purchase
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 mt-12">
             <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                <Tv className="w-10 h-10" />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-headline font-bold text-slate-900">No matching assets found</h3>
                <p className="text-slate-500 max-w-md mx-auto">We are constantly updating our inventory. Please try another brand or screen dimension, or contact our sales hub for custom sourcing.</p>
             </div>
             <Button onClick={() => {setActiveBrand('All'); setActiveSize('All');}} variant="outline" className="rounded-xl font-bold uppercase text-xs px-8 h-12">Reset All Filters</Button>
          </div>
        )}
      </section>

      {/* Trust Protocol */}
      <section className="bg-slate-50 py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: Truck, title: "Swift Dispatch", desc: "Local delivery network across Surat within 24 hours of confirmation." },
            { icon: ShieldCheck, title: "Verified Assets", desc: "100% genuine hardware with official GJ5 PLUS support nodes." },
            { icon: CheckCircle, title: "Expert Calibration", desc: "Free on-site installation and panel calibration by certified techs." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-4 group">
              <div className="w-20 h-20 rounded-[2.5rem] bg-white shadow-xl flex items-center justify-center text-[#DC2626] group-hover:scale-110 transition-transform duration-500"><item.icon className="w-10 h-10" /></div>
              <h4 className="text-xl font-headline font-black text-[#0F172A] uppercase tracking-tight">{item.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Nodes */}
      <footer className="bg-[#0F172A] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-slate-800 pb-20">
          <div className="col-span-1 md:col-span-2 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#DC2626] flex items-center justify-center text-white font-black italic text-xl shadow-lg shadow-red-600/20">G</div>
              <span className="text-3xl font-headline font-black tracking-tighter">GJ5 HOME SERVICE</span>
            </div>
            <p className="text-slate-400 text-base max-w-md leading-relaxed">
              Surat's leading industrial-to-home TV distribution hub. Specializing in high-performance Smart TVs with a focus on local service integrity and customer satisfaction.
            </p>
            <div className="flex gap-4">
              <Button size="icon" variant="ghost" className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-[#DC2626] transition-colors"><Phone className="w-5 h-5" /></Button>
              <Button size="icon" variant="ghost" className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-emerald-600 transition-colors"><MessageSquare className="w-5 h-5" /></Button>
            </div>
          </div>
          <div className="space-y-8">
            <h5 className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Quick Links</h5>
            <ul className="space-y-4 text-slate-400 text-sm font-bold">
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Our Products</li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Flash Offers</li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Service Registry</li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Technical Support</li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Contact Terminal</h5>
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-slate-800 rounded-xl text-slate-400"><MapPin className="w-5 h-5" /></div>
                <p className="text-slate-400 text-sm leading-relaxed">Surat Hub, Gujarat, India<br /><span className="text-slate-500 font-code uppercase text-[10px]">Zone: 395006</span></p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="p-2 bg-slate-800 rounded-xl text-slate-400"><Phone className="w-5 h-5" /></div>
                <div className="space-y-1">
                  <p className="text-slate-300 font-black text-sm">+91 88669 83900</p>
                  <p className="text-slate-300 font-black text-sm">+91 92652 55869</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
           <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">© 2024 GJ5 HOME SERVICE | System Version 2.4.0</p>
           <div className="flex gap-8">
              <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-slate-400 transition-colors">Privacy Node</span>
              <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest cursor-pointer hover:text-slate-400 transition-colors">Legal Terms</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
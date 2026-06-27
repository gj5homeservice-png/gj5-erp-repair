
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  ArrowRight,
  Trash2,
  Plus,
  Minus,
  X,
  User,
  ShoppingBag,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger
} from '@/components/ui/sheet';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const heroImg = PlaceHolderImages.find(img => img.id === 'hero-tv');
  const [activeBrand, setActiveBrand] = useState<string>('All');
  const [activeSize, setActiveSize] = useState<string>('All');
  
  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', mobile: '', address: '' });

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

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast({
      title: "Added to Cart",
      description: `${product.name} added to your selection.`,
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckoutInquiry = () => {
    if (!customerInfo.name || !customerInfo.mobile) {
      toast({
        variant: "destructive",
        title: "Incomplete Details",
        description: "Please provide your name and mobile number for the inquiry.",
      });
      return;
    }

    const itemsList = cart.map(item => `- ${item.name} (Qty: ${item.quantity}) - ₹${(item.price * item.quantity).toLocaleString()}`).join('\n');
    const msg = `🛒 *New Shopping Cart Inquiry*\n\n*Customer Details:*\nName: ${customerInfo.name}\nMobile: ${customerInfo.mobile}\nAddress: ${customerInfo.address}\n\n*Selected Products:*\n${itemsList}\n\n*Total Estimated Amount: ₹${cartTotal.toLocaleString()}*\n\nPlease confirm availability and dispatch timeline.`;
    
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
          
          <nav className="hidden md:flex items-center gap-6">
            {['Home', 'Products', 'Offers', 'Contact'].map((item) => (
              <button key={item} className="text-sm font-bold text-slate-600 hover:text-[#DC2626] transition-colors">{item}</button>
            ))}
            <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-slate-600 hover:text-[#DC2626] transition-all">
                    <ShoppingBag className="w-6 h-6" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                        {cart.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md bg-white border-l border-slate-200 flex flex-col p-0 shadow-2xl">
                  <SheetHeader className="p-6 border-b border-slate-100 bg-slate-50">
                    <SheetTitle className="flex items-center gap-2 font-headline font-black text-2xl text-[#0F172A]">
                      <ShoppingCart className="w-6 h-6 text-[#DC2626]" /> Your Cart
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <ShoppingBag className="w-16 h-16 text-slate-300" />
                        <p className="font-bold text-slate-500">Your cart is currently empty</p>
                        <Button onClick={() => setIsCartOpen(false)} variant="outline" className="rounded-xl">Browse Products</Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {cart.map((item) => (
                          <div key={item.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:shadow-md transition-all">
                            <div className="w-20 h-20 bg-white rounded-xl overflow-hidden shrink-0 border border-slate-100">
                              <img 
                                src={PlaceHolderImages.find(img => img.id === item.image)?.imageUrl || 'https://picsum.photos/seed/fallback/200/200'} 
                                className="w-full h-full object-cover" 
                                alt={item.name} 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm text-[#0F172A] leading-tight truncate pr-4">{item.name}</h4>
                                <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{item.brand} • {item.size}</p>
                              <div className="flex justify-between items-center mt-3">
                                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-50 rounded text-slate-600"><Minus className="w-3 h-3" /></button>
                                  <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-50 rounded text-slate-600"><Plus className="w-3 h-3" /></button>
                                </div>
                                <span className="font-headline font-black text-blue-600">₹{(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cart.length > 0 && (
                    <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-6 shadow-inner">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3" /> Inquiry Credentials
                        </h4>
                        <div className="grid gap-3">
                          <Input 
                            placeholder="Your Full Name" 
                            className="bg-white border-slate-200 rounded-xl h-11"
                            value={customerInfo.name}
                            onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                          />
                          <Input 
                            placeholder="WhatsApp Number" 
                            className="bg-white border-slate-200 rounded-xl h-11"
                            value={customerInfo.mobile}
                            onChange={e => setCustomerInfo({...customerInfo, mobile: e.target.value})}
                          />
                          <Input 
                            placeholder="Delivery Address Node" 
                            className="bg-white border-slate-200 rounded-xl h-11"
                            value={customerInfo.address}
                            onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                          <span className="text-sm font-bold text-slate-500 uppercase">Subtotal Yield</span>
                          <span className="text-3xl font-headline font-black text-[#0F172A]">₹{cartTotal.toLocaleString()}</span>
                        </div>
                        <Button 
                          onClick={handleCheckoutInquiry}
                          className="w-full h-14 btn-red text-base font-black uppercase rounded-2xl shadow-xl shadow-red-600/20"
                        >
                          Send Checkout Inquiry <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                        <p className="text-[9px] text-slate-500 text-center uppercase font-bold tracking-tighter leading-relaxed">
                          By clicking above, you will be redirected to WhatsApp to finalize the transaction with our sales hub.
                        </p>
                      </div>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              <Link href="/login/">
                <Button className="bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold px-6 h-11 rounded-xl shadow-lg shadow-slate-900/10 transition-all active:scale-95 whitespace-nowrap">Admin Login</Button>
              </Link>
            </div>
          </nav>
          
          <div className="md:hidden flex items-center gap-2">
            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative text-slate-600">
                    <ShoppingBag className="w-6 h-6" />
                    {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{cart.length}</span>}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full h-full bg-white p-0">
                   {/* Mobile cart content same as above */}
                   <div className="flex flex-col h-full">
                      <div className="p-6 border-b">
                        <h2 className="font-black text-xl flex items-center gap-2"><ShoppingCart className="text-red-600" /> Cart</h2>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {cart.length === 0 ? <p className="text-center text-slate-400 mt-20">Cart empty</p> : (
                          <div className="space-y-4">
                            {cart.map(item => (
                              <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-xl border">
                                 <div className="w-16 h-16 bg-white rounded-lg overflow-hidden shrink-0">
                                   <img src={PlaceHolderImages.find(img => img.id === item.image)?.imageUrl} className="w-full h-full object-cover" alt="" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-xs truncate">{item.name}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold">₹{item.price.toLocaleString()}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                       <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-white border rounded"><Minus className="w-2 h-2" /></button>
                                       <span className="text-xs font-bold">{item.quantity}</span>
                                       <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-white border rounded"><Plus className="w-2 h-2" /></button>
                                    </div>
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {cart.length > 0 && (
                        <div className="p-4 border-t bg-slate-50 space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold uppercase text-slate-400">Total</span>
                            <span className="text-xl font-black">₹{cartTotal.toLocaleString()}</span>
                          </div>
                          <Button onClick={handleCheckoutInquiry} className="w-full btn-red rounded-xl h-12 uppercase font-black text-xs">Checkout WhatsApp</Button>
                        </div>
                      )}
                   </div>
                </SheetContent>
            </Sheet>
            <Button variant="ghost" size="icon">
              <Zap className="w-6 h-6 text-[#DC2626]" />
            </Button>
          </div>
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
              <Button onClick={() => scrollToSection('products')} size="lg" className="btn-red h-14 px-10 text-base font-black uppercase rounded-2xl">Shop Now <ChevronRight className="ml-2 w-5 h-5" /></Button>
              <Button onClick={() => scrollToSection('offers')} size="lg" variant="outline" className="border-slate-200 h-14 px-10 text-base font-black uppercase text-slate-700 rounded-2xl hover:bg-white shadow-sm">View Offers</Button>
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
          <div className="relative animate-in zoom-in duration-700 flex justify-center lg:justify-end">
            <div className="aspect-video w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border-[12px] border-white bg-slate-900 relative group">
              {heroImg?.imageUrl ? (
                <Image 
                  src={heroImg.imageUrl} 
                  alt="Premium Smart TV Mockup" 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
                  data-ai-hint="luxury smart tv"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-10 left-10 text-white">
                 <h2 className="text-2xl font-black italic tracking-tighter uppercase">GJ5 ULTRA 8K</h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mt-1">Industrial Visual Calibration</p>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden md:block z-10 animate-bounce-slow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><ShieldCheck className="w-7 h-7" /></div>
                <div>
                  <p className="text-sm font-black text-slate-900 leading-none">2 Year Warranty</p>
                  <p className="text-[10px] text-slate-500 mt-1.5 uppercase font-black tracking-widest">On GJ5 PLUS Models</p>
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
               <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg"><Filter className="w-6 h-6" /></div>
               <h2 className="text-xl font-headline font-bold text-white uppercase tracking-widest">Asset Discovery</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={() => setActiveBrand('All')}
                className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all", activeBrand === 'All' ? "bg-red-600 text-white shadow-lg" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
              >All Brands</button>
              {BRANDS.map(brand => (
                <button 
                  key={brand}
                  onClick={() => setActiveBrand(brand)}
                  className={cn("px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all", activeBrand === brand ? "bg-red-600 text-white shadow-lg" : "bg-slate-800 text-slate-400 hover:bg-slate-700")}
                >{brand}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-8 border-t border-slate-800 pt-8">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] w-full text-center">Select Screen Dimension</span>
            <button 
              onClick={() => setActiveSize('All')}
              className={cn("text-xs font-black uppercase transition-colors px-2 py-1", activeSize === 'All' ? "text-red-500" : "text-slate-400 hover:text-white")}
            >All Sizes</button>
            {PRODUCT_CATEGORIES.map(size => (
              <button 
                key={size}
                onClick={() => setActiveSize(size)}
                className={cn("text-xs font-black uppercase transition-colors px-2 py-1", activeSize === size ? "text-red-500" : "text-slate-400 hover:text-white")}
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
            <p className="text-slate-500 font-medium text-lg">Industrial grade visuals. Competitive retail pricing.</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
             <span className="bg-slate-100 px-5 py-2 rounded-xl border border-slate-200 shadow-sm">Showing {filteredProducts.length} Qualified Models</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredProducts.map(product => {
            const pImg = PlaceHolderImages.find(img => img.id === product.image);
            const discount = Math.round((1 - product.price/product.mrp) * 100);
            
            return (
              <Card key={product.id} className="group border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden flex flex-col h-full bg-white relative">
                <CardContent className="p-0 flex-1 flex flex-col">
                  {/* Visual Node */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 border-b border-slate-50">
                    {pImg?.imageUrl ? (
                      <Image 
                        src={pImg.imageUrl} 
                        alt={product.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                        data-ai-hint="smart tv"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                        <Tv className="w-16 h-16 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Asset Visual Loading</span>
                      </div>
                    )}
                    <div className="absolute top-5 left-5 flex flex-col gap-2 z-10">
                      <Badge className="bg-[#DC2626] text-white border-0 font-black px-3 py-1 shadow-xl">{discount}% OFF</Badge>
                      <Badge className="bg-white/95 backdrop-blur-sm text-[#0F172A] border-0 font-bold px-3 py-1 shadow-md uppercase text-[10px]">{product.size}</Badge>
                    </div>
                    <div className="absolute bottom-5 right-5 z-10">
                       <div className="p-2.5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
                          <div className="flex text-amber-400 gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-3.5 h-3.5 fill-current", i >= product.rating && "text-slate-200 fill-transparent")} />
                            ))}
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Metadata Node */}
                  <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-black text-red-600 tracking-[0.2em]">{product.brand}</span>
                        <Badge variant="outline" className="text-[9px] font-black border-slate-200 text-slate-500 uppercase h-5 px-1.5">{product.warranty}</Badge>
                      </div>
                      <h3 className="font-headline font-black text-xl text-[#0F172A] leading-tight group-hover:text-[#DC2626] transition-colors line-clamp-2 min-h-[3rem]">{product.name}</h3>
                    </div>

                    <div className="space-y-3">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Info className="w-3 h-3" /> Core Configurations</p>
                       <div className="flex flex-wrap gap-2">
                          {product.features.map(f => (
                            <span key={f} className="text-[9px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">{f}</span>
                          ))}
                       </div>
                    </div>

                    <div className="pt-4 mt-auto space-y-6 border-t border-slate-50">
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Offer Price</span>
                           <span className="text-3xl font-headline font-black text-blue-600">₹{product.price.toLocaleString()}</span>
                         </div>
                         <div className="text-right">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">MRP</span>
                           <span className="text-sm text-slate-400 line-through block font-medium">₹{product.mrp.toLocaleString()}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="border-slate-200 text-[#0F172A] hover:bg-slate-50 h-12 rounded-2xl text-[10px] font-black uppercase group/btn shadow-sm">
                           Details <ChevronRight className="ml-1 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button onClick={() => openWhatsApp(product.name)} variant="outline" className="h-12 rounded-2xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-center gap-2 text-[10px] font-black uppercase shadow-sm">
                          <MessageSquare className="w-4 h-4" /> Inquiry
                        </Button>
                      </div>
                      
                      <Button 
                        onClick={() => addToCart(product)}
                        className="w-full h-14 rounded-2xl bg-[#0066FF] hover:bg-blue-700 text-white font-black uppercase text-xs shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                         <ShoppingCart className="w-5 h-5" /> Add to Cart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 mt-12">
             <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 shadow-inner">
                <Tv className="w-12 h-12" />
             </div>
             <div className="space-y-3">
                <h3 className="text-3xl font-headline font-black text-[#0F172A]">No Matching Assets</h3>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">We are constantly updating our industrial inventory. Please adjust your brand or dimension filters, or contact our sales hub for custom order procurement.</p>
             </div>
             <Button onClick={() => {setActiveBrand('All'); setActiveSize('All');}} variant="outline" className="rounded-2xl font-black uppercase text-[10px] px-10 h-14 shadow-lg">Reset Discovery Console</Button>
          </div>
        )}
      </section>

      {/* Trust Protocol */}
      <section className="bg-slate-50 py-24 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-16">
          {[
            { icon: Truck, title: "Swift Dispatch", desc: "Local delivery network across Surat active within 24 hours of checkout inquiry." },
            { icon: ShieldCheck, title: "Verified Assets", desc: "100% genuine industrial visual nodes with official GJ5 PLUS calibration." },
            { icon: CheckCircle, title: "Expert Calibration", desc: "Free on-site installation and panel optimization by certified technicians." }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-6 group">
              <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center text-[#DC2626] group-hover:scale-110 transition-transform duration-500 border border-slate-50"><item.icon className="w-12 h-12" /></div>
              <div className="space-y-2">
                <h4 className="text-xl font-headline font-black text-[#0F172A] uppercase tracking-tight">{item.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Nodes */}
      <footer className="bg-[#0F172A] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-16 border-b border-slate-800 pb-24">
          <div className="col-span-1 md:col-span-2 space-y-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#DC2626] flex items-center justify-center text-white font-black italic text-2xl shadow-2xl shadow-red-600/30">G</div>
              <span className="text-3xl font-headline font-black tracking-tighter">GJ5 HOME SERVICE</span>
            </div>
            <p className="text-slate-400 text-lg max-w-md leading-relaxed">
              Surat's leading industrial-to-home TV distribution hub. Specializing in high-performance visual nodes with a focus on local integrity and professional service architecture.
            </p>
            <div className="flex gap-4">
              <Button size="icon" variant="ghost" className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-[#DC2626] transition-all shadow-lg"><Phone className="w-6 h-6" /></Button>
              <Button size="icon" variant="ghost" className="w-14 h-14 rounded-2xl bg-slate-800 hover:bg-emerald-600 transition-all shadow-lg"><MessageSquare className="w-6 h-6" /></Button>
            </div>
          </div>
          <div className="space-y-10">
            <h5 className="text-xs font-black uppercase tracking-[0.4em] text-red-500">Quick Links</h5>
            <ul className="space-y-5 text-slate-400 text-sm font-black uppercase tracking-wider">
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-3"><ArrowRight className="w-4 h-4 text-red-600" /> Asset Registry</li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-3"><ArrowRight className="w-4 h-4 text-red-600" /> Flash Offers</li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-3"><ArrowRight className="w-4 h-4 text-red-600" /> Service Node</li>
              <li className="hover:text-white cursor-pointer transition-colors flex items-center gap-3"><ArrowRight className="w-4 h-4 text-red-600" /> Support Desk</li>
            </ul>
          </div>
          <div className="space-y-10">
            <h5 className="text-xs font-black uppercase tracking-[0.4em] text-red-500">Contact Node</h5>
            <div className="space-y-8">
              <div className="flex gap-5 items-start">
                <div className="p-3 bg-slate-800 rounded-2xl text-slate-400 shadow-inner"><MapPin className="w-6 h-6" /></div>
                <p className="text-slate-400 text-sm leading-relaxed font-bold">Surat Distribution Hub<br />Gujarat, India<br /><span className="text-slate-600 font-code uppercase text-[10px]">Zone: 395006</span></p>
              </div>
              <div className="flex gap-5 items-start">
                <div className="p-3 bg-slate-800 rounded-2xl text-slate-400 shadow-inner"><Phone className="w-6 h-6" /></div>
                <div className="space-y-1.5">
                  <p className="text-slate-200 font-black text-base tracking-tight">+91 88669 83900</p>
                  <p className="text-slate-200 font-black text-base tracking-tight">+91 92652 55869</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
           <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">© 2024 GJ5 HOME SERVICE | Enterprise Console V2.8.4</p>
           <div className="flex gap-10">
              <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-slate-400 transition-colors">Privacy Node</span>
              <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-slate-400 transition-colors">Legal Framework</span>
           </div>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}


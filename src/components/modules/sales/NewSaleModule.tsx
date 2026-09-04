"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { User, Search, Package, CreditCard, Truck, Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { SalesOrder } from '@/lib/types';

const EMPTY: Partial<SalesOrder> = {
  customerId: '', customerName: '', mobile: '', email: '', address: '', pincode: '',
  productId: '', brand: '', model: '', screenSize: '', serialNumber: '', quantity: 1, unitPrice: 0,
  saleDate: format(new Date(), 'yyyy-MM-dd'), salesperson: '', storeLocation: 'SHOWROOM',
  paymentMethod: 'UPI', paymentStatus: 'Paid', deliveryRequired: false, deliveryStatus: 'Not Required',
  discount: 0, gstEnabled: false, amountPaid: 0
};

export function NewSaleModule({ store, editingOrder, onDone }: { store: any; editingOrder?: SalesOrder | null; onDone?: () => void }) {
  const { toast } = useToast();
  const isEditing = !!editingOrder;
  const [form, setForm] = useState<Partial<SalesOrder>>(editingOrder || EMPTY);
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');

  useEffect(() => {
    setForm(editingOrder || EMPTY);
  }, [editingOrder]);

  const gstRate = store.settings?.gstRate ?? 18;

  const customerMatches = useMemo(() => {
    if (!customerQuery) return [];
    const q = customerQuery.toLowerCase();
    const fromCalls = (store.calls || []).filter((c: any) => c.mobile?.includes(q) || c.customerName?.toLowerCase().includes(q));
    const fromSalesCustomers = (store.salesCustomers || []).filter((c: any) => c.mobile?.includes(q) || c.name?.toLowerCase().includes(q));
    const fromSalesOrders = (store.salesOrders || []).filter((o: any) => o.mobile?.includes(q) || o.customerName?.toLowerCase().includes(q));
    const merged = new Map<string, any>();
    fromCalls.forEach((c: any) => merged.set(c.customerId, { id: c.customerId, name: c.customerName, mobile: c.mobile, address: c.address, pincode: c.pincode }));
    fromSalesCustomers.forEach((c: any) => merged.set(c.id, { id: c.id, name: c.name, mobile: c.mobile, address: c.address, pincode: c.pincode, email: c.email }));
    fromSalesOrders.forEach((o: any) => merged.set(o.customerId, { id: o.customerId, name: o.customerName, mobile: o.mobile, address: o.address, pincode: o.pincode, email: o.email }));
    return Array.from(merged.values()).slice(0, 6);
  }, [customerQuery, store.calls, store.salesCustomers, store.salesOrders]);

  const productMatches = useMemo(() => {
    if (!productQuery) return [];
    const q = productQuery.toLowerCase();
    return (store.stock || []).filter((s: any) =>
      s.name?.toLowerCase().includes(q) || s.brand?.toLowerCase().includes(q) || s.barcode?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [productQuery, store.stock]);

  const selectedStock = useMemo(() => (store.stock || []).find((s: any) => s.id === form.productId), [store.stock, form.productId]);
  const availableStock = selectedStock ? selectedStock.quantity : null;

  const calc = useMemo(() => {
    const subtotal = (form.quantity || 0) * (form.unitPrice || 0);
    const taxable = Math.max(0, subtotal - (form.discount || 0));
    const gstAmount = form.gstEnabled ? taxable * (gstRate / 100) : 0;
    const grandTotal = taxable + gstAmount + 0;
    return { subtotal, gstAmount, grandTotal };
  }, [form.quantity, form.unitPrice, form.discount, form.gstEnabled, gstRate]);

  const deliveryCharge = 0;
  const grandTotal = calc.grandTotal + deliveryCharge;
  const balanceDue = Math.max(0, grandTotal - (form.amountPaid || 0));

  const selectCustomer = (c: any) => {
    setForm(prev => ({ ...prev, customerId: c.id, customerName: c.name, mobile: c.mobile, address: c.address, pincode: c.pincode, email: c.email || prev.email }));
    setCustomerQuery('');
  };

  const selectProduct = (s: any) => {
    setForm(prev => ({
      ...prev, productId: s.id, brand: s.brand, model: prev.model || s.name,
      unitPrice: s.sellingPrice || 0
    }));
    setProductQuery('');
  };

  const resetForm = () => {
    setForm(EMPTY);
    setCustomerQuery('');
    setProductQuery('');
  };

  const buildOrder = (): SalesOrder | null => {
    if ((form.quantity || 0) > 0 && availableStock !== null && (form.quantity || 0) > availableStock) {
      toast({ variant: 'destructive', title: 'Insufficient Stock', description: `Only ${availableStock} unit(s) available for this product.` });
      return null;
    }
    const id = isEditing && editingOrder ? editingOrder.id : `SO-${String((store.salesOrders || []).length + 1).padStart(6, '0')}`;
    const customerId = form.customerId || store.findOrCreateSalesCustomerId(form.mobile || '', form.customerId);
    const now = new Date().toISOString();
    return {
      id,
      customerId,
      customerName: form.customerName || '',
      mobile: form.mobile || '',
      email: form.email,
      address: form.address,
      pincode: form.pincode,
      productId: form.productId,
      brand: form.brand || '',
      model: form.model || '',
      screenSize: form.screenSize,
      serialNumber: form.serialNumber,
      quantity: Number(form.quantity) || 1,
      unitPrice: Number(form.unitPrice) || 0,
      saleDate: form.saleDate || format(new Date(), 'yyyy-MM-dd'),
      salesperson: form.salesperson,
      storeLocation: form.storeLocation,
      paymentMethod: form.paymentMethod || 'UPI',
      paymentStatus: form.paymentStatus || 'Paid',
      deliveryRequired: !!form.deliveryRequired,
      deliveryStatus: form.deliveryRequired ? (form.deliveryStatus === 'Not Required' ? 'Pending Pickup' : (form.deliveryStatus || 'Pending Pickup')) : 'Not Required',
      subtotal: calc.subtotal,
      discount: Number(form.discount) || 0,
      gstEnabled: !!form.gstEnabled,
      gstRate: form.gstEnabled ? gstRate : 0,
      gstAmount: calc.gstAmount,
      deliveryCharge,
      grandTotal,
      amountPaid: Number(form.amountPaid) || 0,
      balanceDue,
      orderStatus: isEditing && editingOrder ? editingOrder.orderStatus : 'New',
      invoiceId: isEditing && editingOrder ? editingOrder.invoiceId : undefined,
      createdAt: isEditing && editingOrder ? editingOrder.createdAt : now,
      updatedAt: now
    };
  };

  const handleSave = (generateInvoice: boolean) => {
    if (!form.customerName || !form.mobile) {
      toast({ variant: 'destructive', title: 'Missing Details', description: 'Customer name and mobile are required.' });
      return;
    }
    const order = buildOrder();
    if (!order) return;

    if (isEditing) {
      store.updateSalesOrder(order);
    } else {
      store.addSalesOrder(order);
    }

    if (generateInvoice) {
      store.generateSalesInvoice(order);
    }

    toast({ title: isEditing ? 'Sale Updated' : 'Sale Saved', description: `Order ${order.id} ${generateInvoice ? 'saved with invoice generated.' : 'saved successfully.'}` });
    resetForm();
    onDone?.();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-bold text-white tracking-tight">{isEditing ? 'Edit Sale' : 'New Sale'}</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Sales Module</p>
        </div>
        {isEditing && (
          <Button variant="ghost" onClick={() => onDone?.()} className="text-slate-500"><X className="w-4 h-4 mr-2" /> Close</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Customer Information</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <Input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="Search existing customer by name or mobile..." className="pl-10 h-11 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              {customerMatches.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                  {customerMatches.map((c: any) => (
                    <button key={c.id} type="button" onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex justify-between">
                      <span className="font-bold">{c.name}</span><span className="text-slate-500 font-code">{c.mobile}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Customer Name</Label>
                <Input value={form.customerName || ''} onChange={e => setForm({ ...form, customerName: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Customer ID</Label>
                <Input readOnly value={form.customerId || 'Auto-generated on save'} className="bg-slate-950 border-slate-800 font-code h-11 text-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Mobile</Label>
                <Input value={form.mobile || ''} onChange={e => setForm({ ...form, mobile: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Email</Label>
                <Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Address</Label>
                <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Pincode</Label>
                <Input value={form.pincode || ''} onChange={e => setForm({ ...form, pincode: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Product Information</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
              <Input value={productQuery} onChange={e => setProductQuery(e.target.value)} placeholder="Search Stock: TV, brand, barcode..." className="pl-10 h-11 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              {productMatches.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                  {productMatches.map((s: any) => (
                    <button key={s.id} type="button" onClick={() => selectProduct(s)} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex justify-between">
                      <span className="font-bold">{s.name} ({s.brand})</span><span className="text-slate-500 font-code">Stock: {s.quantity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Product ID</Label>
                <Input readOnly value={form.productId || 'Not linked to stock'} className="bg-slate-950 border-slate-800 font-code h-11 text-blue-400" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Brand</Label>
                <Input value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Model Number</Label>
                <Input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Screen Size</Label>
                <Input value={form.screenSize || ''} onChange={e => setForm({ ...form, screenSize: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Serial Number</Label>
                <Input value={form.serialNumber || ''} onChange={e => setForm({ ...form, serialNumber: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Quantity</Label>
                  <Input type="number" value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: Number(e.target.value) || 1 })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-slate-500">Unit Price</Label>
                  <Input type="number" value={form.unitPrice || 0} onChange={e => setForm({ ...form, unitPrice: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
                </div>
              </div>
            </div>
            {availableStock !== null && (
              <p className="text-[10px] text-slate-500">Available Stock: <span className={availableStock < (form.quantity || 0) ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{availableStock}</span></p>
            )}
          </div>

          {/* Sale Information */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Sale Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Sale Date</Label>
                <Input type="date" value={form.saleDate} onChange={e => setForm({ ...form, saleDate: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Salesperson</Label>
                <Input value={form.salesperson || ''} onChange={e => setForm({ ...form, salesperson: e.target.value })} className="bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Store Location</Label>
                <Select value={form.storeLocation} onValueChange={v => setForm({ ...form, storeLocation: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="SHOWROOM">SHOWROOM</SelectItem>
                    <SelectItem value="GODOWN">GODOWN</SelectItem>
                    <SelectItem value="ONLINE">ONLINE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-slate-500">Payment Status</Label>
                <Select value={form.paymentStatus} onValueChange={v => setForm({ ...form, paymentStatus: v as any })}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <Label className="text-xs font-bold text-slate-100">Delivery Required</Label>
                  <p className="text-[9px] text-slate-500">Auto-creates a Sales Logistics record.</p>
                </div>
                <Switch checked={!!form.deliveryRequired} onCheckedChange={v => setForm({ ...form, deliveryRequired: v })} />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing + Summary */}
        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 space-y-4 sticky top-4">
            <h4 className="text-[11px] font-black uppercase text-[#123C8C] tracking-tighter flex items-center gap-2"><Receipt className="w-3.5 h-3.5" /> Pricing</h4>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Discount</Label>
              <Input type="number" value={form.discount || 0} onChange={e => setForm({ ...form, discount: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <Label className="text-xs font-bold text-slate-100">GST</Label>
                <p className="text-[9px] text-slate-500">Applies {gstRate}% when enabled.</p>
              </div>
              <Switch checked={!!form.gstEnabled} onCheckedChange={v => setForm({ ...form, gstEnabled: v })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-slate-500">Amount Paid</Label>
              <Input type="number" value={form.amountPaid || 0} onChange={e => setForm({ ...form, amountPaid: Number(e.target.value) || 0 })} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Subtotal</span><span className="font-code font-bold text-slate-200">₹{calc.subtotal.toLocaleString()}</span></div>
              {form.gstEnabled && <div className="flex justify-between text-xs text-[#123C8C]"><span className="uppercase font-bold">GST ({gstRate}%)</span><span className="font-code font-bold">+₹{calc.gstAmount.toLocaleString()}</span></div>}
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Delivery Charge</span><span className="font-code font-bold text-slate-200">₹{deliveryCharge.toLocaleString()}</span></div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <span className="text-xs font-black uppercase text-slate-100">Grand Total</span>
                <span className="text-2xl font-headline font-black text-emerald-400">₹{grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Balance Due</span><span className="font-code font-bold text-rose-400">₹{balanceDue.toLocaleString()}</span></div>
            </div>

            <div className="pt-4 space-y-2">
              <Button onClick={() => handleSave(false)} className="w-full bg-[#0066FF] hover:bg-blue-600 h-11 font-bold uppercase text-xs">Save Sale</Button>
              <Button onClick={() => handleSave(true)} variant="outline" className="w-full border-slate-800 h-11 font-bold uppercase text-xs hover:bg-emerald-500/10 hover:text-emerald-400">Save &amp; Generate Invoice</Button>
              <Button onClick={() => { resetForm(); onDone?.(); }} variant="ghost" className="w-full h-11 font-bold uppercase text-xs text-slate-500">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

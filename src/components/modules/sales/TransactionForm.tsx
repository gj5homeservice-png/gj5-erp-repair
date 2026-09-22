"use client"

import React, { useMemo, useState } from 'react';
import { User, Package, Truck, Receipt, X, Loader2, AlertTriangle, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/client-api';
import {
  computeTotals, derivePaymentStatus, remaining, round2, validateSaleInput, validateOrderInput,
  PAYMENT_METHODS, PAYMENT_STATUS_BADGE, isActiveSale, normalizeSaleStatus,
} from '@/lib/sales-utils';
import { CustomerPicker, ProductPicker, useCustomerDirectory, money } from './shared';

// One form for both modules — New/Edit Sale and New/Edit Order share the same
// customer + product + pricing + payment fields, so they share the code and
// can never drift apart. Everything the form shows as a total is computed by
// the same computeTotals() the server uses to re-check and re-compute it.

type Mode = 'sale' | 'order';

const label = 'text-[10px] uppercase font-bold text-slate-500';
const input = 'bg-slate-900 border-slate-800 h-11 text-[#F8FAFC]';

export function TransactionForm({
  store, mode, editing, onClose, onSaved,
}: {
  store: any;
  mode: Mode;
  editing?: any | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = !!editing;
  const isSale = mode === 'sale';
  const directory = useCustomerDirectory();
  const stock: any[] = store.stock || [];

  const today = format(new Date(), 'yyyy-MM-dd');
  const [customer, setCustomer] = useState<{ id: string; name: string; mobile: string } | null>(
    editing ? { id: editing.customerId, name: editing.customerName, mobile: editing.mobile } : null
  );
  const [productId, setProductId] = useState<string>(editing?.productId || '');
  const [brand, setBrand] = useState<string>(editing?.brand || '');
  const [model, setModel] = useState<string>(editing?.model || '');
  const [quantity, setQuantity] = useState<string>(String(editing?.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState<string>(editing ? String(editing.unitPrice) : '');
  const [discount, setDiscount] = useState<string>(String(editing?.discount ?? 0));
  const [gstEnabled, setGstEnabled] = useState<boolean>(editing ? !!editing.gstEnabled : false);
  const [deliveryCharge, setDeliveryCharge] = useState<string>(String(editing?.deliveryCharge ?? 0));
  const [deliveryRequired, setDeliveryRequired] = useState<boolean>(editing ? !!editing.deliveryRequired : !isSale);
  const [date, setDate] = useState<string>((isSale ? editing?.saleDate : editing?.orderDate)?.slice(0, 10) || today);
  const [expectedDate, setExpectedDate] = useState<string>(editing?.expectedDeliveryDate?.slice(0, 10) || '');
  const [method, setMethod] = useState<string>(editing?.paymentMethod || 'Cash');
  const [notes, setNotes] = useState<string>(editing?.notes || '');
  const [saleStatus, setSaleStatus] = useState<string>(editing ? normalizeSaleStatus(editing.orderStatus) : 'Completed');
  // Create-mode payment inputs. (Editing never changes money received — that
  // lives in the payment history and is changed with the Payment action.)
  const [payStatus, setPayStatus] = useState<'Paid' | 'Partial' | 'Pending'>('Paid');
  const [partialPaid, setPartialPaid] = useState<string>('');
  const [advance, setAdvance] = useState<string>('0');

  const [busy, setBusy] = useState<null | 'save' | 'invoice'>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsRate = store.settings?.gstRate ?? 18;
  const gstRate = isEdit && editing.gstEnabled ? (editing.gstRate || settingsRate) : settingsRate;

  const pricing = useMemo(
    () => computeTotals({ quantity: Number(quantity), unitPrice: Number(unitPrice), discount: Number(discount), gstEnabled, gstRate, deliveryCharge: Number(deliveryCharge) }),
    [quantity, unitPrice, discount, gstEnabled, gstRate, deliveryCharge]
  );

  const paid = isEdit
    ? Number(editing.amountPaid ?? 0)
    : isSale
      ? (payStatus === 'Paid' ? pricing.grandTotal : payStatus === 'Pending' ? 0 : round2(Number(partialPaid) || 0))
      : round2(Number(advance) || 0);
  const balance = remaining(pricing.grandTotal, paid);
  const derivedPayment = derivePaymentStatus(pricing.grandTotal, paid);

  const stockItem = stock.find(s => s.id === productId) || null;
  // Units this sale already holds out of inventory are available to itself again.
  const ownHeld = isEdit && isSale && editing.stockDeducted && editing.productId === productId ? Number(editing.quantity) || 0 : 0;
  const available = stockItem ? Number(stockItem.quantity) + ownHeld : null;
  const wantsStock = isSale && isActiveSale(saleStatus as any);
  const insufficient = wantsStock && available !== null && Number(quantity) > available;

  const invoiceLocked = isEdit && isSale && !!editing.billingInvoiceId && (store.invoices || []).some((i: any) => i.id === editing.billingInvoiceId);

  const pickProduct = (s: any | null) => {
    if (!s) { setProductId(''); return; }
    setProductId(s.id);
    setBrand(s.brand || '');
    setModel(s.model || s.name || '');
    if (!unitPrice || Number(unitPrice) === 0) setUnitPrice(String(s.sellingPrice || ''));
  };

  const buildPayload = (generateInvoice: boolean) => {
    const base: any = {
      customerId: customer?.id, productId, brand, model,
      quantity: Number(quantity), unitPrice: Number(unitPrice), discount: Number(discount) || 0,
      gstEnabled, deliveryCharge: Number(deliveryCharge) || 0, deliveryRequired, notes,
    };
    if (isSale) {
      base.saleDate = date; base.paymentMethod = method; base.orderStatus = saleStatus;
      if (!isEdit) { base.paymentStatus = payStatus; base.amountPaid = paid; base.generateInvoice = generateInvoice; }
    } else {
      base.orderDate = date; base.expectedDeliveryDate = expectedDate || null; base.paymentMethod = method;
      if (!isEdit) base.amountPaid = paid;
    }
    return base;
  };

  const submit = async (generateInvoice: boolean) => {
    setError(null);
    const payload = buildPayload(generateInvoice);
    const problem = isSale
      ? validateSaleInput({ ...payload, amountPaid: paid, paymentStatus: isEdit ? undefined : payStatus }, pricing.grandTotal)
      : validateOrderInput({ ...payload, amountPaid: paid, expectedDeliveryDate: expectedDate || undefined }, pricing.grandTotal);
    if (problem) { setError(problem); return; }
    if (insufficient) { setError(`Not enough stock: only ${available} unit(s) of this product are available.`); return; }

    setBusy(generateInvoice ? 'invoice' : 'save');
    try {
      const base = isSale ? '/api/erp/sales-orders' : '/api/erp/customer-orders';
      const json = await apiFetch(isEdit ? `${base}/${editing.id}` : base, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      await store.refreshData();
      const id = json?.data?.id || editing?.id;
      onSaved(`${isSale ? 'Sale' : 'Order'} ${id} ${isEdit ? 'updated' : 'saved'}${generateInvoice ? ' and invoice generated' : ''}.`);
    } catch (e: any) {
      setError(e?.message || 'Could not save. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const title = `${isEdit ? 'Edit' : 'New'} ${isSale ? 'Sale' : 'Order'}`;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h2 className="text-3xl font-headline font-bold text-slate-100 tracking-tight">{title}</h2>
          <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">
            {isSale ? 'Sales' : 'Orders'} • {isEdit ? editing.id : `${isSale ? 'Sale' : 'Order'} ID is generated on save`}
          </p>
        </div>
        <Button variant="ghost" onClick={onClose} className="text-slate-500" disabled={!!busy}><X className="w-4 h-4 mr-2" /> Close</Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}
      {invoiceLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" /> <span>This sale already has an invoice, so its customer, product and amounts are locked. You can still change the delivery flag, method, status and notes.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Customer</h4>
            <CustomerPicker selected={customer} directory={directory} disabled={invoiceLocked}
              onSelect={(c) => setCustomer(c ? { id: c.id, name: c.name || '', mobile: c.mobile || '' } : null)} />
            {customer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label className={label}>Customer ID</Label><Input readOnly value={customer.id} className="bg-slate-950 border-slate-800 font-code h-11 text-blue-400" /></div>
                <div className="space-y-1"><Label className={label}>Customer Mobile</Label><Input readOnly value={customer.mobile} className="bg-slate-950 border-slate-800 font-code h-11 text-slate-200" /></div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="w-3.5 h-3.5" /> Product</h4>
            <ProductPicker stock={stock} selectedId={productId} onSelect={pickProduct} disabled={invoiceLocked} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1"><Label className={label}>Product ID</Label><Input readOnly value={productId || 'Select a product'} className="bg-slate-950 border-slate-800 font-code h-11 text-blue-400" /></div>
              <div className="space-y-1"><Label className={label}>Brand</Label><Input value={brand} onChange={e => setBrand(e.target.value)} disabled={invoiceLocked} className={input} /></div>
              <div className="space-y-1"><Label className={label}>Model</Label><Input value={model} onChange={e => setModel(e.target.value)} disabled={invoiceLocked} className={input} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className={label}>Quantity</Label><Input type="number" min={1} step={1} value={quantity} onChange={e => setQuantity(e.target.value)} disabled={invoiceLocked} className={input} /></div>
                <div className="space-y-1"><Label className={label}>Unit Price</Label><Input type="number" min={0} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} disabled={invoiceLocked} className={input} /></div>
              </div>
            </div>
            {available !== null && (
              <p className="text-[11px] text-slate-500">
                Available in stock: <span className={`font-bold ${insufficient ? 'text-rose-400' : 'text-emerald-400'}`}>{available}</span>
                {!isSale && ' — an order reserves nothing; stock is taken out when the order is delivered.'}
                {insufficient && <span className="text-rose-400"> — not enough for this quantity.</span>}
              </p>
            )}
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> {isSale ? 'Sale' : 'Order'} Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1"><Label className={label}>{isSale ? 'Sale' : 'Order'} Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></div>
              {!isSale && (
                <div className="space-y-1"><Label className={label}>Expected Delivery Date</Label><Input type="date" min={date} value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className={input} /></div>
              )}
              {isSale && (
                <div className="space-y-1">
                  <Label className={label}>Sale Status</Label>
                  <Select value={saleStatus} onValueChange={setSaleStatus}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {(isEdit ? ['Completed', 'Pending', 'Cancelled', 'Refunded'] : ['Completed', 'Pending']).map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className={label}>Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isSale && !isEdit && (
                <div className="space-y-1">
                  <Label className={label}>Payment Status</Label>
                  <Select value={payStatus} onValueChange={(v) => setPayStatus(v as any)}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Paid">PAID</SelectItem><SelectItem value="Partial">PARTIAL</SelectItem><SelectItem value="Pending">PENDING</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isSale && !isEdit && payStatus === 'Partial' && (
                <div className="space-y-1"><Label className={label}>Amount Paid</Label><Input type="number" min={0} value={partialPaid} onChange={e => setPartialPaid(e.target.value)} className={input} /></div>
              )}
              {!isSale && !isEdit && (
                <div className="space-y-1"><Label className={label}>Advance Payment</Label><Input type="number" min={0} value={advance} onChange={e => setAdvance(e.target.value)} className={input} /></div>
              )}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 sm:col-span-2">
                <div><Label className="text-xs font-bold text-slate-100">Delivery Required</Label><p className="text-[10px] text-slate-500">{isSale ? 'Creates a Sales delivery record for logistics.' : 'Turn off for a customer pick-up order.'}</p></div>
                <Switch checked={deliveryRequired} onCheckedChange={setDeliveryRequired} />
              </div>
              <div className="space-y-1 sm:col-span-2"><Label className={label}>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="bg-slate-900 border-slate-800 text-[#F8FAFC]" /></div>
            </div>
            {isEdit && <p className="text-[11px] text-slate-500">Money received is managed with the <b>Payment</b> action so its history stays accurate (paid so far: {money(paid)}).</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 space-y-4 lg:sticky lg:top-4">
            <h4 className="text-[11px] font-black uppercase text-[#123C8C] tracking-tighter flex items-center gap-2"><Receipt className="w-3.5 h-3.5" /> Pricing</h4>
            <div className="space-y-1"><Label className={label}>Discount</Label><Input type="number" min={0} value={discount} onChange={e => setDiscount(e.target.value)} disabled={invoiceLocked} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" /></div>
            <div className="space-y-1"><Label className={label}>Delivery Charge</Label><Input type="number" min={0} value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)} disabled={invoiceLocked} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" /></div>
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div><Label className="text-xs font-bold text-slate-100">Tax / GST</Label><p className="text-[10px] text-slate-500">Applies {gstRate}% when enabled.</p></div>
              <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} disabled={invoiceLocked} />
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Subtotal</span><span className="font-code font-bold text-slate-200">{money(pricing.subtotal)}</span></div>
              {pricing.discount > 0 && <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Discount</span><span className="font-code font-bold text-slate-200">- {money(pricing.discount)}</span></div>}
              {gstEnabled && <div className="flex justify-between text-xs text-[#123C8C]"><span className="uppercase font-bold">GST ({gstRate}%)</span><span className="font-code font-bold">+{money(pricing.gstAmount)}</span></div>}
              {pricing.deliveryCharge > 0 && <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Delivery</span><span className="font-code font-bold text-slate-200">+{money(pricing.deliveryCharge)}</span></div>}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <span className="text-xs font-black uppercase text-slate-100">{isSale ? 'Grand Total' : 'Total Amount'}</span>
                <span className="text-2xl font-headline font-black text-emerald-400">{money(pricing.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">{isSale ? 'Paid' : 'Advance Paid'}</span><span className="font-code font-bold text-emerald-400">{money(paid)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500 uppercase font-bold">Remaining</span><span className="font-code font-bold text-rose-400">{money(balance)}</span></div>
              <div className="flex justify-between items-center text-xs"><span className="text-slate-500 uppercase font-bold">Payment Status</span><Badge className={`${PAYMENT_STATUS_BADGE[derivedPayment]} text-[9px] uppercase`}>{derivedPayment}</Badge></div>
            </div>

            <div className="pt-4 space-y-2">
              <Button onClick={() => submit(false)} disabled={!!busy} className="w-full bg-[#0066FF] hover:bg-[#0052CC] h-11 font-bold uppercase text-xs">
                {busy === 'save' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {isEdit ? 'Save Changes' : `Save ${isSale ? 'Sale' : 'Order'}`}
              </Button>
              {isSale && !isEdit && (
                <Button onClick={() => submit(true)} disabled={!!busy} variant="outline" className="w-full border-slate-800 h-11 font-bold uppercase text-xs hover:bg-emerald-500/10 hover:text-emerald-400">
                  {busy === 'invoice' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save &amp; Generate Invoice
                </Button>
              )}
              <Button onClick={onClose} disabled={!!busy} variant="ghost" className="w-full h-11 font-bold uppercase text-xs text-slate-500">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

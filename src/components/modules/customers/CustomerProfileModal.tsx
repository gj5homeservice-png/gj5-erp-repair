"use client"

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone, MessageCircle, Mail, RefreshCw, AlertTriangle, Trash2, Pencil, Check, X as XIcon,
  Wrench, Globe, ShoppingBag, ClipboardList, Receipt, Wallet, StickyNote, History, Printer, UserCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RepairFormModule } from '../repair/RepairFormModule';
import { OnlineBookingDetailsModal } from '../onlineBookings/OnlineBookingDetailsModal';
import { CustomerFormModal } from './CustomerFormModal';
import { apiFetch } from '@/lib/client-api';
import { buildTelLink, buildWhatsAppLink, WHATSAPP_TEMPLATES } from '@/lib/customer-utils';
import { printHtmlDocument } from '@/lib/print-document';
import { remaining, PAYMENT_METHODS } from '@/lib/sales-utils';

function money(n: number) { return `₹${(n || 0).toLocaleString('en-IN')}`; }
function fmtDate(s?: string | null) { return s ? new Date(s).toLocaleDateString() : '—'; }
function fmtDateTime(s?: string | null) { return s ? new Date(s).toLocaleString() : '—'; }

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-xs border-b border-slate-800/60 py-1.5">
      <span className="text-slate-500 uppercase font-bold text-[10px]">{label}</span>
      <span className="text-slate-200 text-right">{value}</span>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, colorClass }: { label: string; value: React.ReactNode; icon: any; colorClass: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0">
        <p className="text-[8px] uppercase font-bold text-slate-500 tracking-wide truncate">{label}</p>
        <p className="text-sm font-headline font-black text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">{title}</p>
      </div>
      {children}
    </div>
  );
}

function ScrollTable({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="border border-slate-800 rounded-xl overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-800">
            {head.map(h => <th key={h} className="text-left px-2.5 py-2 text-slate-500 uppercase text-[9px] font-bold whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const TIMELINE_DOT: Record<string, string> = {
  customer_created: 'bg-slate-400', payment_received: 'bg-emerald-500', invoice_generated: 'bg-blue-500',
  sale_created: 'bg-cyan-500', order_created: 'bg-indigo-500', order_delivered: 'bg-emerald-500',
  job_status: 'bg-purple-500', job_created: 'bg-blue-500', booking_submitted: 'bg-amber-500', booking_status: 'bg-amber-500',
  technician_assigned: 'bg-purple-400',
};

export function CustomerProfileModal({
  customerId, onClose, store, onCreateSale, onCreateOrder, onCreateRepair,
}: {
  customerId: string | null;
  onClose: () => void;
  store: any;
  onCreateSale?: (c: { id: string; name: string; mobile: string }) => void;
  onCreateOrder?: (c: { id: string; name: string; mobile: string }) => void;
  onCreateRepair?: (c: { id: string; name: string; mobile: string }) => void;
}) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const perms = store.session?.permissions;
  const can = (action: 'edit' | 'delete') => !perms || !!perms['Customer Department']?.[action];

  const load = async (id: string) => {
    setLoading(true);
    setLoadError(false);
    try {
      const json = await apiFetch(`/api/erp/customers/${id}`);
      setProfile(json.data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) load(customerId);
    else { setProfile(null); setNewNote(''); }
  }, [customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !customerId) return;
    setSavingNote(true);
    try {
      await apiFetch(`/api/erp/customers/${customerId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: newNote, createdBy: store?.session?.email }),
      });
      setNewNote('');
      load(customerId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Save Note', description: err?.message || 'Please try again.' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveNoteEdit = async (noteId: string) => {
    if (!customerId) return;
    try {
      await apiFetch(`/api/erp/customers/${customerId}/notes/${noteId}`, { method: 'PUT', body: JSON.stringify({ note: editingNoteText }) });
      setEditingNoteId(null);
      load(customerId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Update Note', description: err?.message || 'Please try again.' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!customerId) return;
    try {
      await apiFetch(`/api/erp/customers/${customerId}/notes/${noteId}`, { method: 'DELETE' });
      load(customerId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Delete Note', description: err?.message || 'Please try again.' });
    }
  };

  const c = profile?.customer;
  const asMini = () => c ? { id: c.id, name: c.name || '', mobile: c.mobile || '' } : null;

  const handlePrint = () => {
    if (!c) return;
    const profileInfo = store.companyProfile || {};
    const rows: [string, string][] = [
      ['Customer ID', c.id], ['Name', c.name || '—'], ['Category', c.category || 'Customer'],
      ['Mobile', c.mobile || '—'], ['WhatsApp', c.whatsappNumber || c.mobile || '—'], ['Email', c.email || '—'],
      ['GSTIN', c.gstin || '—'], ['Address', [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') || '—'],
      ['Customer Since', fmtDate(c.createdAt)], ['Status', c.status],
    ];
    const html = `
      <div style="max-width:640px;margin:0 auto;padding:28px;font-family:Inter,Arial,sans-serif;color:#0f172a;">
        <div style="border-bottom:2px solid #0066ff;padding-bottom:12px;margin-bottom:16px;">
          <div style="font-size:20px;font-weight:800;color:#123c8c;text-transform:uppercase;">${profileInfo.companyName || 'GJ5 HOME SERVICE'}</div>
          <div style="font-size:16px;font-weight:800;color:#0066ff;text-transform:uppercase;margin-top:8px;">Customer Details</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${rows.map(([l, v]) => `<tr><td style="padding:6px 0;color:#64748b;font-size:11px;text-transform:uppercase;font-weight:700;width:40%;">${l}</td><td style="padding:6px 0;font-size:13px;">${v}</td></tr>`).join('')}
        </table>
        <table style="width:60%;margin:20px 0 0 auto;">
          <tr><td style="padding:4px 8px;">Total Sales</td><td style="padding:4px 8px;text-align:right;">${money(profile.summary.totalSales)}</td></tr>
          <tr><td style="padding:4px 8px;">Total Paid</td><td style="padding:4px 8px;text-align:right;">${money(profile.summary.totalPaid)}</td></tr>
          <tr style="font-weight:800;border-top:2px solid #0f172a;"><td style="padding:4px 8px;">Outstanding Balance</td><td style="padding:4px 8px;text-align:right;color:#b91c1c;">${money(profile.summary.outstandingBalance)}</td></tr>
        </table>
      </div>`;
    try {
      printHtmlDocument(`Customer ${c.id}`, html);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Print Failed', description: err?.message || 'Please try again.' });
    }
  };

  return (
    <>
      <Dialog open={!!customerId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          {loading && (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading customer profile...
            </div>
          )}
          {!loading && loadError && (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <p className="text-sm text-rose-300">Unable to load customer data. Please try again.</p>
              <Button size="sm" variant="outline" className="border-slate-800" onClick={() => customerId && load(customerId)}>Retry</Button>
            </div>
          )}
          {!loading && !loadError && c && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                      {c.photo ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" /> : <UserCircle2 className="w-7 h-7 text-slate-700" />}
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-headline font-bold flex items-center gap-2 flex-wrap">
                        <span className="font-code text-sm font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">{c.id}</span>
                        {c.name || 'Unnamed Customer'}
                      </DialogTitle>
                      {c.mergedInto && <p className="text-[10px] text-purple-400 font-bold mt-1">Merged into {c.mergedInto}</p>}
                    </div>
                  </div>
                  <Badge className={`text-[9px] uppercase ${c.status === 'Active' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : c.status === 'Merged' ? 'bg-purple-600/10 text-purple-400 border-purple-600/20' : 'bg-slate-600/10 text-slate-400 border-slate-600/20'}`}>{c.status}</Badge>
                </div>
              </DialogHeader>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pb-1">
                {buildTelLink(c.mobile) && <a href={buildTelLink(c.mobile)!}><Button size="sm" variant="outline" className="border-slate-800 text-emerald-400 h-9"><Phone className="w-3.5 h-3.5 mr-1.5" /> Call</Button></a>}
                {buildWhatsAppLink(c.whatsappNumber || c.mobile) && <Button size="sm" variant="outline" className="border-slate-800 text-lime-400 h-9" onClick={() => setShowWhatsApp(true)}><MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp</Button>}
                {c.email && <a href={`mailto:${c.email}`}><Button size="sm" variant="outline" className="border-slate-800 text-blue-400 h-9"><Mail className="w-3.5 h-3.5 mr-1.5" /> Email</Button></a>}
                {can('edit') && !c.mergedInto && <Button size="sm" variant="outline" className="border-slate-800 h-9" onClick={() => setShowEdit(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>}
                {onCreateSale && !c.mergedInto && <Button size="sm" variant="outline" className="border-slate-800 h-9" onClick={() => onCreateSale(asMini()!)}><ShoppingBag className="w-3.5 h-3.5 mr-1.5" /> Create Sale</Button>}
                {onCreateOrder && !c.mergedInto && <Button size="sm" variant="outline" className="border-slate-800 h-9" onClick={() => onCreateOrder(asMini()!)}><ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Create Order</Button>}
                {onCreateRepair && !c.mergedInto && <Button size="sm" variant="outline" className="border-slate-800 h-9" onClick={() => onCreateRepair(asMini()!)}><Wrench className="w-3.5 h-3.5 mr-1.5" /> Create Repair</Button>}
                {profile.summary.outstandingBalance > 0 && <Button size="sm" variant="outline" className="border-slate-800 text-amber-400 h-9" onClick={() => setShowPayment(true)}><Wallet className="w-3.5 h-3.5 mr-1.5" /> Add Payment</Button>}
                <Button size="sm" variant="outline" className="border-slate-800 h-9" onClick={handlePrint}><Printer className="w-3.5 h-3.5 mr-1.5" /> Print Details</Button>
              </div>

              <div className="space-y-6">
                <Section title="Customer Information" icon={StickyNote}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <InfoRow label="Category" value={<Badge variant="outline" className="text-[9px] uppercase border-slate-700 text-slate-300">{c.category || 'Customer'}</Badge>} />
                    <InfoRow label="Mobile" value={c.mobile || '—'} />
                    <InfoRow label="WhatsApp" value={c.whatsappNumber || c.mobile || '—'} />
                    <InfoRow label="Alternate Mobile" value={c.alternateMobile || '—'} />
                    <InfoRow label="Email" value={c.email || '—'} />
                    <InfoRow label="GSTIN" value={c.gstin || '—'} />
                    <InfoRow label="Pincode" value={c.pincode || '—'} />
                    <InfoRow label="Address" value={[c.address, c.city, c.state].filter(Boolean).join(', ') || '—'} />
                    <InfoRow label="Customer Since" value={fmtDate(c.createdAt)} />
                    <InfoRow label="Created By" value={c.createdBy || '—'} />
                  </div>
                </Section>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <StatCard label="Total Purchases" value={money(profile.summary.totalSales)} icon={ShoppingBag} colorClass="bg-cyan-600/10 text-cyan-400" />
                  <StatCard label="Total Paid" value={money(profile.summary.totalPaid)} icon={Wallet} colorClass="bg-emerald-600/10 text-emerald-400" />
                  <StatCard label="Outstanding Balance" value={money(profile.summary.outstandingBalance)} icon={Wallet} colorClass="bg-amber-600/10 text-amber-400" />
                  <StatCard label="Total Repairs" value={profile.summary.totalRepairs} icon={Wrench} colorClass="bg-blue-600/10 text-blue-400" />
                </div>

                <Section title="Repair History" icon={Wrench}>
                  <ScrollTable head={['Repair ID', 'Device', 'Problem', 'Technician', 'Received', 'Amount', 'Payment', 'Status']}>
                    {profile.repairJobs.length === 0 && <tr><td colSpan={8} className="px-2.5 py-4 text-center text-slate-600 italic">No repair jobs yet.</td></tr>}
                    {profile.repairJobs.map((j: any) => (
                      <tr key={j.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20 cursor-pointer" onClick={() => setSelectedJob(j)}>
                        <td className="px-2.5 py-2 font-code font-bold text-blue-400 whitespace-nowrap">{j.id}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{j.productType} {j.brand}</td>
                        <td className="px-2.5 py-2 max-w-[160px] truncate" title={j.problemDescription}>{j.problemDescription}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{j.technicianName || '—'}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(j.receivedDate)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(j.grandTotal)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(j.totalPaid)} / {money(j.grandTotal)}</td>
                        <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-slate-700">{j.status}</Badge></td>
                      </tr>
                    ))}
                  </ScrollTable>
                </Section>

                <Section title="Sales History" icon={ShoppingBag}>
                  <ScrollTable head={['Sale ID', 'Date', 'Product', 'Amount', 'Payment Status']}>
                    {profile.salesOrders.length === 0 && <tr><td colSpan={5} className="px-2.5 py-4 text-center text-slate-600 italic">No sales/purchases yet.</td></tr>}
                    {profile.salesOrders.map((o: any) => (
                      <tr key={o.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-2.5 py-2 font-code font-bold text-blue-400 whitespace-nowrap">{o.id}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(o.saleDate)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{o.brand} {o.model}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(o.grandTotal)}</td>
                        <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-slate-700">{o.paymentStatus}</Badge></td>
                      </tr>
                    ))}
                  </ScrollTable>
                </Section>

                <Section title="Orders History" icon={ClipboardList}>
                  <ScrollTable head={['Order ID', 'Date', 'Product', 'Amount', 'Status', 'Payment']}>
                    {(profile.orders || []).length === 0 && <tr><td colSpan={6} className="px-2.5 py-4 text-center text-slate-600 italic">No orders yet.</td></tr>}
                    {(profile.orders || []).map((o: any) => (
                      <tr key={o.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-2.5 py-2 font-code font-bold text-blue-400 whitespace-nowrap">{o.id}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(o.orderDate)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{o.brand} {o.model}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(o.totalAmount)}</td>
                        <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-slate-700">{o.orderStatus}</Badge></td>
                        <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-slate-700">{o.paymentStatus}</Badge></td>
                      </tr>
                    ))}
                  </ScrollTable>
                </Section>

                <Section title="Products Purchased" icon={ShoppingBag}>
                  <ScrollTable head={['Product', 'Quantity', 'Amount']}>
                    {(profile.productsPurchased || []).length === 0 && <tr><td colSpan={3} className="px-2.5 py-4 text-center text-slate-600 italic">No products purchased yet.</td></tr>}
                    {(profile.productsPurchased || []).map((p: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-2.5 py-2 whitespace-nowrap">{p.product}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{p.quantity}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(p.amount)}</td>
                      </tr>
                    ))}
                  </ScrollTable>
                </Section>

                <Section title="Online Booking History" icon={Globe}>
                  <ScrollTable head={['Booking ID', 'Date', 'Device', 'Brand', 'Problem', 'Status', 'Technician', 'Repair Job']}>
                    {profile.onlineBookings.length === 0 && <tr><td colSpan={8} className="px-2.5 py-4 text-center text-slate-600 italic">No online bookings yet.</td></tr>}
                    {profile.onlineBookings.map((b: any) => (
                      <tr key={b.id} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                        <td className="px-2.5 py-2 font-code font-bold text-blue-400 whitespace-nowrap">{b.id}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{b.deviceType}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{b.brand}</td>
                        <td className="px-2.5 py-2 max-w-[160px] truncate" title={b.problemDescription}>{b.problemDescription}</td>
                        <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-slate-700">{b.status}</Badge></td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{b.technicianName || '—'}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{b.repairJobId ? <span className="text-lime-400">Converted → {b.repairJobId}</span> : <span className="text-slate-500">Not Converted</span>}</td>
                      </tr>
                    ))}
                  </ScrollTable>
                </Section>

                <Section title="Invoice History" icon={Receipt}>
                  <ScrollTable head={['Invoice #', 'Date', 'Amount', 'GST', 'Discount', 'Paid', 'Due', 'Status', 'Actions']}>
                    {profile.invoices.length === 0 && <tr><td colSpan={9} className="px-2.5 py-4 text-center text-slate-600 italic">No invoices yet.</td></tr>}
                    {profile.invoices.map((inv: any) => {
                      const paid = inv.paymentStatus === 'Paid' ? inv.grandTotal : 0;
                      const due = Math.max(0, (inv.grandTotal || 0) - paid);
                      return (
                        <tr key={inv.id} className="border-b border-slate-800/60 last:border-0">
                          <td className="px-2.5 py-2 font-code font-bold text-blue-400 whitespace-nowrap">{inv.invoiceNumber || inv.id}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(inv.date)}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{money(inv.grandTotal)}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{money((inv.cgst || 0) + (inv.sgst || 0))}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{money(inv.totalDiscount)}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{money(paid)}</td>
                          <td className="px-2.5 py-2 whitespace-nowrap">{money(due)}</td>
                          <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-slate-700">{inv.paymentStatus}</Badge></td>
                          <td className="px-2.5 py-2 whitespace-nowrap">
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-blue-400" onClick={() => setViewingInvoice(inv)}>View</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </ScrollTable>
                </Section>

                <Section title="Payment / Due Summary" icon={Wallet}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                    <StatCard label="Total Billing" value={money(profile.summary.totalPaid + profile.summary.totalDue)} icon={Receipt} colorClass="bg-blue-600/10 text-blue-400" />
                    <StatCard label="Total Paid" value={money(profile.summary.totalPaid)} icon={Wallet} colorClass="bg-emerald-600/10 text-emerald-400" />
                    <StatCard label="Outstanding" value={money(profile.summary.outstandingBalance)} icon={Wallet} colorClass="bg-amber-600/10 text-amber-400" />
                    {/* Informational only — already included inside Total Paid above (this
                        system counts an intake advance as a real payment the moment it's
                        taken, never a separate liability); shown here as a breakdown, never
                        added on top of Total Paid or subtracted again from Total Due. */}
                    <StatCard label="Total Advance" value={money(profile.summary.totalAdvance || 0)} icon={Wallet} colorClass="bg-sky-600/10 text-sky-400" />
                  </div>
                  <ScrollTable head={['Date', 'Reference', 'Amount', 'Method', 'Account', 'Related Repair', 'Status']}>
                    {profile.repairJobs.every((j: any) => (j.payments || []).length === 0) && (
                      <tr><td colSpan={7} className="px-2.5 py-4 text-center text-slate-600 italic">No payments recorded yet.</td></tr>
                    )}
                    {profile.repairJobs.flatMap((j: any) => (j.payments || []).map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="px-2.5 py-2 font-code whitespace-nowrap">{p.id}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(p.amount)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{p.method}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{p.accountName || <span className="text-slate-600 italic">not tracked</span>}</td>
                        <td className="px-2.5 py-2 font-code text-blue-400 whitespace-nowrap">{j.id}</td>
                        <td className="px-2.5 py-2"><Badge variant="outline" className="text-[9px] uppercase border-emerald-700 text-emerald-400">Received</Badge></td>
                      </tr>
                    )))}
                  </ScrollTable>
                </Section>

                <Section title="Customer Notes" icon={StickyNote}>
                  <div className="space-y-2 mb-3">
                    {profile.notes.length === 0 && <p className="text-xs text-slate-600 italic">No notes yet.</p>}
                    {profile.notes.map((n: any) => (
                      <div key={n.id} className="flex items-start justify-between gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                        {editingNoteId === n.id ? (
                          <div className="flex-1 flex gap-2">
                            <Textarea value={editingNoteText} onChange={e => setEditingNoteText(e.target.value)} className="bg-slate-900 border-slate-800 text-xs text-[#F8FAFC]" rows={2} />
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400" onClick={() => handleSaveNoteEdit(n.id)}><Check className="w-3 h-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400" onClick={() => setEditingNoteId(null)}><XIcon className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <p className="text-xs text-slate-200 break-words">{n.note}</p>
                              <p className="text-[9px] text-slate-500 mt-1">{n.createdBy || 'Admin'} · {fmtDateTime(n.createdAt)}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {can('edit') && <Button size="icon" variant="ghost" className="h-6 w-6 text-amber-400" onClick={() => { setEditingNoteId(n.id); setEditingNoteText(n.note); }}><Pencil className="w-3 h-3" /></Button>}
                              {can('delete') && <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500" onClick={() => handleDeleteNote(n.id)}><Trash2 className="w-3 h-3" /></Button>}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note — preferred contact time, special instructions..." className="bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" rows={2} />
                    <Button size="sm" className="bg-[#0066FF] hover:bg-[#0052CC] shrink-0" onClick={handleAddNote} disabled={savingNote || !newNote.trim()}>Add</Button>
                  </div>
                </Section>

                <Section title="Activity Timeline" icon={History}>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {profile.timeline.length === 0 && <p className="text-xs text-slate-600 italic">No activity yet.</p>}
                    {profile.timeline.slice().reverse().map((t: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${TIMELINE_DOT[t.type] || 'bg-slate-500'}`} />
                        <div className="min-w-0">
                          <p className="text-slate-200 font-bold">{t.label}</p>
                          <p className="text-slate-500 text-[10px]">{fmtDateTime(t.at)}{t.note ? ` · ${t.note}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {selectedJob && (
        <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto p-0">
            <RepairFormModule store={store} editingJob={selectedJob} onDone={() => { setSelectedJob(null); if (customerId) load(customerId); }} />
          </DialogContent>
        </Dialog>
      )}

      <OnlineBookingDetailsModal
        isOpen={!!selectedBooking}
        onClose={() => { setSelectedBooking(null); if (customerId) load(customerId); }}
        booking={selectedBooking}
        store={store}
      />

      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
          {viewingInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-headline font-bold">Invoice {viewingInvoice.invoiceNumber || viewingInvoice.id}</DialogTitle>
              </DialogHeader>
              <div id="customer-invoice-print-area" className="space-y-1.5">
                <InfoRow label="Date" value={fmtDate(viewingInvoice.date)} />
                <InfoRow label="Customer" value={viewingInvoice.customerName || c?.name || '—'} />
                <InfoRow label="Subtotal" value={money(viewingInvoice.subtotal)} />
                <InfoRow label="Discount" value={money(viewingInvoice.totalDiscount)} />
                <InfoRow label="GST (CGST+SGST)" value={money((viewingInvoice.cgst || 0) + (viewingInvoice.sgst || 0))} />
                <InfoRow label="Grand Total" value={money(viewingInvoice.grandTotal)} />
                <InfoRow label="Payment Status" value={viewingInvoice.paymentStatus} />
                <InfoRow label="Payment Mode" value={viewingInvoice.paymentMode || '—'} />
                {(viewingInvoice.items || []).length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Items</p>
                    {viewingInvoice.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-300">{it.name} × {it.quantity}</span>
                        <span className="text-slate-200">{money(it.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="border-slate-800" onClick={() => setViewingInvoice(null)}>Close</Button>
                <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={() => window.print()}>Print</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {c && (
        <CustomerFormModal
          isOpen={showEdit}
          editingCustomer={c}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); if (customerId) load(customerId); }}
        />
      )}

      {c && <WhatsAppTemplateDialog open={showWhatsApp} onClose={() => setShowWhatsApp(false)} customer={c} companyName={store.companyProfile?.companyName || 'GJ5 HOME SERVICE'} />}
      {c && <AddPaymentDialog open={showPayment} onClose={() => setShowPayment(false)} profile={profile} onDone={() => { setShowPayment(false); if (customerId) load(customerId); }} />}
    </>
  );
}

// ------------------------------------------------------------ WhatsApp

function WhatsAppTemplateDialog({ open, onClose, customer, companyName }: { open: boolean; onClose: () => void; customer: any; companyName: string }) {
  const templates = useMemo(() => WHATSAPP_TEMPLATES(companyName, customer.name || 'Customer'), [companyName, customer.name]);
  const [message, setMessage] = useState(templates[0]?.text || '');
  useEffect(() => { if (open) setMessage(templates[0]?.text || ''); }, [open, templates]);
  const link = buildWhatsAppLink(customer.whatsappNumber || customer.mobile, message);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle className="text-lg font-headline font-bold">Send WhatsApp Message</DialogTitle></DialogHeader>
        <p className="text-xs text-slate-400">To: <span className="font-code text-slate-200">{customer.whatsappNumber || customer.mobile}</span></p>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-slate-500">Template</label>
          <Select value={message} onValueChange={setMessage}>
            <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue placeholder="Choose a template" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {templates.map(t => <SelectItem key={t.label} value={t.text}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="bg-slate-950 border-slate-800 text-xs text-[#F8FAFC]" />
        <p className="text-[10px] text-slate-500">Opens WhatsApp with this message pre-filled — nothing is sent automatically until you press send there.</p>
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose}>Cancel</Button>
          {link && <a href={link} target="_blank" rel="noopener noreferrer"><Button className="bg-lime-600 hover:bg-lime-700" onClick={onClose}><MessageCircle className="w-4 h-4 mr-1.5" /> Open WhatsApp</Button></a>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------ add payment

// A customer-level "Add Payment" has no single target by itself — this lets
// the admin pick which of the customer's own open (balance > 0) sales or
// orders the payment applies to, then posts it through that record's own
// existing payment endpoint (the same one its module's row-level "Payment"
// action uses), so the money is never recorded anywhere new or untracked.
function AddPaymentDialog({ open, onClose, profile, onDone }: { open: boolean; onClose: () => void; profile: any; onDone: () => void }) {
  const { toast } = useToast();
  const openItems = useMemo(() => {
    if (!profile) return [];
    const sales = (profile.salesOrders || []).filter((o: any) => remaining(o.grandTotal, o.amountPaid) > 0).map((o: any) => ({ kind: 'sale' as const, id: o.id, label: `Sale ${o.id}`, total: o.grandTotal, paid: o.amountPaid }));
    const orders = (profile.orders || []).filter((o: any) => remaining(o.totalAmount, o.amountPaid) > 0).map((o: any) => ({ kind: 'order' as const, id: o.id, label: `Order ${o.id}`, total: o.totalAmount, paid: o.amountPaid }));
    return [...sales, ...orders];
  }, [profile]);
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = openItems.find(i => `${i.kind}:${i.id}` === targetId) || null;

  useEffect(() => {
    if (open) {
      const first = openItems[0];
      setTargetId(first ? `${first.kind}:${first.id}` : '');
      setAmount(first ? String(remaining(first.total, first.paid)) : '');
      setMethod('Cash'); setError(null); setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!target) { setError('Choose which sale or order this payment is for.'); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Enter a valid amount.'); return; }
    setBusy(true); setError(null);
    try {
      const path = target.kind === 'sale' ? `/api/erp/sales-orders/${target.id}/payments` : `/api/erp/customer-orders/${target.id}/payments`;
      await apiFetch(path, { method: 'POST', body: JSON.stringify({ amount: amt, method, paidOn: new Date().toISOString().slice(0, 10) }) });
      toast({ title: 'Payment Recorded', description: `₹${amt.toLocaleString('en-IN')} added to ${target.label}.` });
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Could not record this payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-sm bg-[#0F172A] border-slate-800 text-slate-100">
        <DialogHeader><DialogTitle className="text-lg font-headline font-bold">Add Payment</DialogTitle></DialogHeader>
        {openItems.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing is currently outstanding for this customer.</p>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Apply to</label>
              <Select value={targetId} onValueChange={v => { setTargetId(v); const t = openItems.find(i => `${i.kind}:${i.id}` === v); if (t) setAmount(String(remaining(t.total, t.paid))); }}>
                <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {openItems.map(i => <SelectItem key={`${i.kind}:${i.id}`} value={`${i.kind}:${i.id}`}>{i.label} — due ₹{remaining(i.total, i.paid).toLocaleString('en-IN')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Amount</label>
                <Input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-900 border-slate-800 h-10 text-[#F8FAFC]" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Method</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="bg-slate-900 border-slate-800 h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-rose-400 bg-rose-900/20 border border-rose-800 rounded-lg p-2.5">{error}</p>}
        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={busy}>Close</Button>
          {openItems.length > 0 && <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={submit} disabled={busy}>Record Payment</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client"

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone, MessageCircle, Mail, RefreshCw, AlertTriangle, Trash2,
  Wrench, Globe, ShoppingBag, Receipt, Wallet, StickyNote, History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RepairFormModule } from '../repair/RepairFormModule';
import { OnlineBookingDetailsModal } from '../onlineBookings/OnlineBookingDetailsModal';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (!res.ok || (json && json.success === false)) throw new Error(json?.error || `Request to ${path} failed`);
  return json;
}

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

export function CustomerProfileModal({ customerId, onClose, store }: { customerId: string | null; onClose: () => void; store: any }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);

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
        body: JSON.stringify({ note: newNote, createdBy: store?.activeUser?.name || store?.activeUser?.email }),
      });
      setNewNote('');
      load(customerId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could Not Save Note', description: err?.message || 'Please try again.' });
    } finally {
      setSavingNote(false);
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
                  <div>
                    <DialogTitle className="text-xl font-headline font-bold">{c.name || 'Unnamed Customer'}</DialogTitle>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-1">{c.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] uppercase ${c.status === 'Active' ? 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' : 'bg-slate-600/10 text-slate-400 border-slate-600/20'}`}>{c.status}</Badge>
                    {c.mobile && (
                      <>
                        <a href={`tel:${c.mobile}`}><Button size="icon" variant="outline" className="h-8 w-8 border-slate-800 text-emerald-400" title="Call"><Phone className="w-3.5 h-3.5" /></Button></a>
                        <a href={`https://wa.me/91${c.mobile}`} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="outline" className="h-8 w-8 border-slate-800 text-lime-400" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></Button></a>
                      </>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`}><Button size="icon" variant="outline" className="h-8 w-8 border-slate-800 text-blue-400" title="Email"><Mail className="w-3.5 h-3.5" /></Button></a>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <Section title="Customer Information" icon={StickyNote}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                    <InfoRow label="Category" value={<Badge variant="outline" className="text-[9px] uppercase border-slate-700 text-slate-300">{c.category || 'Customer'}</Badge>} />
                    <InfoRow label="Mobile" value={c.mobile || '—'} />
                    <InfoRow label="Alternate Mobile" value={c.alternateMobile || '—'} />
                    <InfoRow label="Email" value={c.email || '—'} />
                    <InfoRow label="Pincode" value={c.pincode || '—'} />
                    <InfoRow label="Address" value={[c.address, c.city, c.state].filter(Boolean).join(', ') || '—'} />
                    <InfoRow label="Customer Since" value={fmtDate(c.createdAt)} />
                  </div>
                </Section>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <StatCard label="Total Repairs" value={profile.summary.totalRepairs} icon={Wrench} colorClass="bg-blue-600/10 text-blue-400" />
                  <StatCard label="Active Repairs" value={profile.summary.activeRepairs} icon={RefreshCw} colorClass="bg-purple-600/10 text-purple-400" />
                  <StatCard label="Completed" value={profile.summary.completedRepairs} icon={Wrench} colorClass="bg-emerald-600/10 text-emerald-400" />
                  <StatCard label="Total Sales" value={money(profile.summary.totalSales)} icon={ShoppingBag} colorClass="bg-cyan-600/10 text-cyan-400" />
                  <StatCard label="Total Paid" value={money(profile.summary.totalPaid)} icon={Wallet} colorClass="bg-lime-600/10 text-lime-400" />
                  <StatCard label="Total Due" value={money(profile.summary.totalDue)} icon={Wallet} colorClass="bg-amber-600/10 text-amber-400" />
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

                <Section title="Sales History" icon={ShoppingBag}>
                  <ScrollTable head={['Order ID', 'Date', 'Product', 'Amount', 'Payment Status']}>
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
                  <div className="grid grid-cols-3 gap-2.5 mb-3">
                    <StatCard label="Total Billing" value={money(profile.summary.totalPaid + profile.summary.totalDue)} icon={Receipt} colorClass="bg-blue-600/10 text-blue-400" />
                    <StatCard label="Total Paid" value={money(profile.summary.totalPaid)} icon={Wallet} colorClass="bg-emerald-600/10 text-emerald-400" />
                    <StatCard label="Total Due" value={money(profile.summary.totalDue)} icon={Wallet} colorClass="bg-amber-600/10 text-amber-400" />
                  </div>
                  <ScrollTable head={['Date', 'Reference', 'Amount', 'Method', 'Related Repair', 'Status']}>
                    {profile.repairJobs.every((j: any) => (j.payments || []).length === 0) && (
                      <tr><td colSpan={6} className="px-2.5 py-4 text-center text-slate-600 italic">No payments recorded yet.</td></tr>
                    )}
                    {profile.repairJobs.flatMap((j: any) => (j.payments || []).map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(p.date)}</td>
                        <td className="px-2.5 py-2 font-code whitespace-nowrap">{p.id}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{money(p.amount)}</td>
                        <td className="px-2.5 py-2 whitespace-nowrap">{p.method}</td>
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
                        <div className="min-w-0">
                          <p className="text-xs text-slate-200 break-words">{n.note}</p>
                          <p className="text-[9px] text-slate-500 mt-1">{n.createdBy || 'Admin'} · {fmtDateTime(n.createdAt)}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-rose-500 shrink-0" onClick={() => handleDeleteNote(n.id)}><Trash2 className="w-3 h-3" /></Button>
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
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
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
    </>
  );
}

"use client"

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Phone, MessageCircle, Mail, Printer, Trash2, RefreshCw, UserCheck, XCircle,
  CheckCircle2, Wrench, Ban, ArrowRightCircle, Loader2,
} from 'lucide-react';
import { OnlineBooking, OnlineBookingStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const ALL_STATUSES: OnlineBookingStatus[] = [
  'New', 'Pending Review', 'Confirmed', 'Assigned', 'Visit Scheduled',
  'In Progress', 'Completed', 'Rejected', 'Cancelled', 'Converted',
];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
  'Pending Review': 'bg-amber-600/10 text-amber-400 border-amber-600/20',
  Confirmed: 'bg-teal-600/10 text-teal-400 border-teal-600/20',
  Assigned: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
  'Visit Scheduled': 'bg-cyan-600/10 text-cyan-400 border-cyan-600/20',
  'In Progress': 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20',
  Completed: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
  Rejected: 'bg-rose-600/10 text-rose-400 border-rose-600/20',
  Cancelled: 'bg-slate-600/10 text-slate-400 border-slate-600/20',
  Converted: 'bg-lime-600/10 text-lime-400 border-lime-600/20',
};

const WHATSAPP_NUMBER_PREFIX = '91';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500 font-bold uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-slate-200 font-medium text-right break-words">{value}</span>
    </div>
  );
}

export function OnlineBookingDetailsModal({
  isOpen, onClose, booking, store, onConverted,
}: {
  isOpen: boolean;
  onClose: () => void;
  booking: OnlineBooking | null;
  store: any;
  onConverted?: (repairJobId: string) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [pickedTechnician, setPickedTechnician] = useState('');
  const [pickedStatus, setPickedStatus] = useState<OnlineBookingStatus>('New');
  const [statusNote, setStatusNote] = useState('');

  if (!booking) return null;
  const technicians = (store.employees || []).filter((e: any) => e.status === 'Active');

  const closeSubDialogs = () => {
    setShowReject(false); setShowCancel(false); setShowDelete(false); setShowAssign(false); setShowStatus(false);
    setReasonText(''); setPickedTechnician(''); setStatusNote('');
  };

  const handleConfirmBooking = () => {
    store.changeBookingStatus(booking.id, 'Confirmed', 'Booking confirmed by admin');
    toast({ title: 'Booking Confirmed', description: `${booking.id} has been confirmed.` });
  };

  const handleReject = () => {
    store.changeBookingStatus(booking.id, 'Rejected', reasonText || undefined, 'rejectionReason', reasonText);
    toast({ title: 'Booking Rejected', description: `${booking.id} has been rejected.` });
    closeSubDialogs();
  };

  const handleCancel = () => {
    store.changeBookingStatus(booking.id, 'Cancelled', reasonText || undefined, 'cancellationReason', reasonText);
    toast({ title: 'Booking Cancelled', description: `${booking.id} has been cancelled.` });
    closeSubDialogs();
  };

  const handleAssign = () => {
    const tech = technicians.find((t: any) => t.id === pickedTechnician);
    if (!tech) return;
    store.assignBookingTechnician(booking.id, tech.id, tech.name);
    toast({ title: 'Technician Assigned', description: `${tech.name} assigned to ${booking.id}.` });
    closeSubDialogs();
  };

  const handleChangeStatus = () => {
    store.changeBookingStatus(booking.id, pickedStatus, statusNote || undefined);
    toast({ title: 'Status Updated', description: `${booking.id} is now "${pickedStatus}".` });
    closeSubDialogs();
  };

  const handleDelete = () => {
    store.deleteOnlineBooking(booking.id);
    toast({ title: 'Booking Deleted', description: `${booking.id} has been removed.` });
    closeSubDialogs();
    onClose();
  };

  const handleConvert = async () => {
    setBusy(true);
    try {
      const result = await store.convertBookingToRepairJob(booking.id);
      if (result.alreadyConverted) {
        toast({ title: 'Repair Job Already Created', description: `Linked Repair Job: ${result.repairJobId}` });
      } else {
        toast({ title: 'Converted to Repair Job', description: `${booking.id} → ${result.repairJobId}` });
      }
      onConverted?.(result.repairJobId);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Conversion Failed', description: err?.message || 'Could not convert this booking.' });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const waMessage = encodeURIComponent(`Hello ${booking.customerName}, this is GJ5 HOME SERVICE regarding your repair booking ${booking.id}.`);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER_PREFIX}${booking.customerMobile}?text=${waMessage}`;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) { closeSubDialogs(); onClose(); } }}>
      <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="font-code text-blue-400">{booking.id}</DialogTitle>
            <Badge className={`${STATUS_COLORS[booking.status] || ''} text-[9px] uppercase`}>{booking.status}</Badge>
          </div>
        </DialogHeader>

        {booking.repairJobId && (
          <div className="flex items-center gap-2 bg-lime-600/10 border border-lime-600/30 text-lime-400 text-xs font-bold rounded-xl px-3.5 py-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Repair Job Already Created — <span className="font-code">{booking.repairJobId}</span>
          </div>
        )}

        <div id="ob-print-area" className="space-y-4">
          <Section title="Booking Information">
            <Row label="Booking ID" value={booking.id} />
            <Row label="Booking Date" value={new Date(booking.createdAt).toLocaleString()} />
            <Row label="Source" value={booking.source} />
            <Row label="Priority" value={booking.priority} />
          </Section>

          <Section title="Customer Information">
            <Row label="Name" value={booking.customerName} />
            <Row label="Mobile" value={booking.customerMobile} />
            <Row label="Email" value={booking.customerEmail} />
            <Row label="Address" value={booking.address} />
            <Row label="Pincode" value={booking.pincode} />
          </Section>

          <Section title="Device Information">
            <Row label="Device Type" value={booking.deviceType} />
            <Row label="Brand" value={booking.brand} />
            <Row label="Model" value={booking.model} />
          </Section>

          <Section title="Repair Information">
            <Row label="Problem" value={booking.problemDescription} />
            <Row label="Preferred Date" value={booking.preferredDate} />
            <Row label="Preferred Time" value={booking.preferredTime} />
            <Row label="Notes" value={booking.notes} />
          </Section>

          <Section title="Payment Information">
            <Row label="Estimated Amount" value={booking.estimatedAmount ? `₹${Number(booking.estimatedAmount).toLocaleString()}` : '—'} />
            <Row label="Payment Method" value={booking.paymentMethod} />
            <Row label="Payment Status" value={booking.paymentStatus} />
            <Row label="Reference" value={booking.paymentReference} />
          </Section>

          <Section title="Assignment">
            <Row label="Technician" value={booking.technicianName || 'Not yet assigned'} />
            <Row label="Repair Job" value={booking.repairJobId ? (
              <span className="text-lime-400 font-code">{booking.repairJobId}</span>
            ) : 'Not yet converted'} />
          </Section>

          {(booking.rejectionReason || booking.cancellationReason) && (
            <Section title={booking.rejectionReason ? 'Rejection Reason' : 'Cancellation Reason'}>
              <div className="col-span-2 text-slate-300">{booking.rejectionReason || booking.cancellationReason}</div>
            </Section>
          )}

          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Activity / Status History</h4>
            <div className="space-y-2.5">
              {[...(booking.statusHistory || [])].reverse().map(h => (
                <div key={h.id} className="flex items-start justify-between text-xs gap-3">
                  <div>
                    <Badge className={`${STATUS_COLORS[h.status] || ''} text-[9px] uppercase mr-2`}>{h.status}</Badge>
                    {h.note && <span className="text-slate-400">{h.note}</span>}
                  </div>
                  <span className="text-slate-600 shrink-0">{new Date(h.changedAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Communication */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <a href={`tel:${booking.customerMobile}`} className="inline-flex">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-700 text-xs"><Phone className="w-3.5 h-3.5" /> Call</Button>
          </a>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-700 text-xs text-emerald-400 hover:text-emerald-300"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</Button>
          </a>
          {booking.customerEmail && (
            <a href={`mailto:${booking.customerEmail}`} className="inline-flex">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-700 text-xs"><Mail className="w-3.5 h-3.5" /> Email</Button>
            </a>
          )}
          <Button variant="outline" size="sm" className="h-9 gap-1.5 border-slate-700 text-xs" onClick={handlePrint}><Printer className="w-3.5 h-3.5" /> Print</Button>
        </div>

        {/* Primary actions */}
        <DialogFooter className="flex-row flex-wrap gap-2 justify-start sm:justify-start pt-2 border-t border-slate-800">
          {booking.status !== 'Rejected' && booking.status !== 'Cancelled' && booking.status !== 'Converted' && (
            <>
              {(booking.status === 'New' || booking.status === 'Pending Review') && (
                <Button size="sm" className="h-9 gap-1.5 bg-teal-600 hover:bg-teal-700 text-xs" onClick={handleConfirmBooking}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-9 gap-1.5 border-slate-700 text-xs" onClick={() => setShowAssign(true)}>
                <UserCheck className="w-3.5 h-3.5" /> Assign Technician
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 border-slate-700 text-xs" onClick={() => { setPickedStatus(booking.status); setShowStatus(true); }}>
                <RefreshCw className="w-3.5 h-3.5" /> Change Status
              </Button>
              {booking.repairJobId ? (
                <Button size="sm" variant="outline" disabled className="h-9 gap-1.5 border-lime-700 text-lime-400 text-xs">
                  <ArrowRightCircle className="w-3.5 h-3.5" /> Repair Job Already Created ({booking.repairJobId})
                </Button>
              ) : (
                <Button size="sm" className="h-9 gap-1.5 bg-[#0066FF] hover:bg-blue-600 text-xs" onClick={handleConvert} disabled={busy}>
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />} Convert to Repair Job
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-9 gap-1.5 border-amber-700 text-amber-400 text-xs" onClick={() => setShowReject(true)}>
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 border-slate-700 text-xs" onClick={() => setShowCancel(true)}>
                <Ban className="w-3.5 h-3.5" /> Cancel Booking
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-rose-500 hover:text-rose-400 text-xs" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Reject reason */}
      <Dialog open={showReject} onOpenChange={(v) => !v && closeSubDialogs()}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Reject Booking — {booking.id}</DialogTitle></DialogHeader>
          <Textarea value={reasonText} onChange={e => setReasonText(e.target.value)} placeholder="Reason for rejection (shown internally)" className="bg-slate-950 border-slate-800 min-h-[90px]" />
          <DialogFooter>
            <Button variant="ghost" onClick={closeSubDialogs}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleReject}>Reject Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel reason */}
      <Dialog open={showCancel} onOpenChange={(v) => !v && closeSubDialogs()}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Cancel Booking — {booking.id}</DialogTitle></DialogHeader>
          <Textarea value={reasonText} onChange={e => setReasonText(e.target.value)} placeholder="Reason for cancellation" className="bg-slate-950 border-slate-800 min-h-[90px]" />
          <DialogFooter>
            <Button variant="ghost" onClick={closeSubDialogs}>Back</Button>
            <Button className="bg-slate-700 hover:bg-slate-600" onClick={handleCancel}>Cancel Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDelete} onOpenChange={(v) => !v && closeSubDialogs()}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Delete Booking {booking.id}?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-400">This permanently removes the booking record. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={closeSubDialogs}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete}>Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign technician */}
      <Dialog open={showAssign} onOpenChange={(v) => !v && closeSubDialogs()}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Assign Technician — {booking.id}</DialogTitle></DialogHeader>
          <Select value={pickedTechnician} onValueChange={setPickedTechnician}>
            <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue placeholder="Select Technician" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {technicians.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.designation})</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={closeSubDialogs}>Cancel</Button>
            <Button className="bg-[#0066FF] hover:bg-blue-600" onClick={handleAssign} disabled={!pickedTechnician}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change status */}
      <Dialog open={showStatus} onOpenChange={(v) => !v && closeSubDialogs()}>
        <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle>Change Status — {booking.id}</DialogTitle></DialogHeader>
          <Select value={pickedStatus} onValueChange={(v) => setPickedStatus(v as OnlineBookingStatus)}>
            <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {ALL_STATUSES.filter(s => s !== 'Converted').map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Note (optional)" className="bg-slate-950 border-slate-800" />
          <DialogFooter>
            <Button variant="ghost" onClick={closeSubDialogs}>Cancel</Button>
            <Button className="bg-[#0066FF] hover:bg-blue-600" onClick={handleChangeStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #ob-print-area, #ob-print-area * { visibility: visible; }
          #ob-print-area { position: fixed; left: 0; top: 0; width: 100%; background: white; color: black; padding: 20px; }
        }
      `}</style>
    </Dialog>
  );
}

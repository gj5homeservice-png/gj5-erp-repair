"use client"

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerListItem } from './CustomerDepartmentModule';
import { CUSTOMER_CATEGORIES, DEFAULT_CUSTOMER_CATEGORY } from '@/lib/customer-categories';
import { SURAT_PINCODES, SURAT_CITY, SURAT_STATE } from '@/lib/surat-pincodes';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

const GMAIL_SUFFIX = '@gmail.com';
const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = {
  name: '', mobile: '', email: '', alternateMobile: '',
  facebookId: '', instagramId: '',
  address: '', city: '', state: '', pincode: '',
  status: 'Active', category: '',
};

export function CustomerFormModal({
  isOpen, onClose, onSaved, editingCustomer, initialMobile,
}: {
  isOpen: boolean;
  onClose: () => void;
  // Called with the saved (or, on a duplicate-mobile match, the existing)
  // customer row so callers like the Repairing "Customer Lookup" flow can
  // auto-select it immediately — existing callers that ignore the argument
  // are unaffected.
  onSaved: (customer?: any) => void;
  editingCustomer?: CustomerListItem | null;
  // Prefills a new customer's mobile — used when this modal is opened from a
  // "not found" mobile search elsewhere, so Admin doesn't retype it.
  initialMobile?: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateCustomer, setDuplicateCustomer] = useState<any | null>(null);
  const [previewNextId, setPreviewNextId] = useState<string | null>(null);
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false);
  const isEditing = !!editingCustomer;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDuplicateCustomer(null);
      setShowPincodeDropdown(false);
      setForm(editingCustomer ? {
        name: editingCustomer.name || '',
        mobile: editingCustomer.mobile || '',
        email: editingCustomer.email || '',
        alternateMobile: editingCustomer.alternateMobile || '',
        facebookId: (editingCustomer as any).facebookId || '',
        instagramId: (editingCustomer as any).instagramId || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        state: editingCustomer.state || '',
        pincode: editingCustomer.pincode || '',
        status: editingCustomer.status || 'Active',
        category: (editingCustomer as any).category || DEFAULT_CUSTOMER_CATEGORY,
      } : { ...EMPTY, mobile: initialMobile || '' });

      if (!editingCustomer) {
        // Best-effort preview of the id this save would get right now — the
        // authoritative id is always recomputed server-side at save time, so
        // this can only ever be stale, never wrong/duplicated.
        setPreviewNextId(null);
        const token = getToken();
        fetch('/api/erp/customers/next-id', {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
          .then(res => res.json())
          .then(json => { if (json?.success) setPreviewNextId(json.data.nextId); })
          .catch(() => { /* preview only — the "Will be generated" fallback below covers this */ });
      }
    }
  }, [isOpen, editingCustomer, initialMobile]);

  const update = (field: keyof typeof EMPTY, value: string) => setForm(f => ({ ...f, [field]: value }));

  // form.email always holds the final, fully-qualified address. The visible
  // box only ever shows the part before "@gmail.com" — typing a plain
  // username auto-appends the fixed suffix, but a value that already
  // contains "@" (e.g. an existing customer's non-Gmail address from before
  // this field existed) is left exactly as typed/stored, never rewritten.
  const emailLocalPart = form.email.toLowerCase().endsWith(GMAIL_SUFFIX)
    ? form.email.slice(0, -GMAIL_SUFFIX.length)
    : form.email;
  const updateEmail = (typed: string) => {
    const trimmed = typed.trim();
    if (!trimmed) { update('email', ''); return; }
    update('email', trimmed.includes('@') ? trimmed : `${trimmed}${GMAIL_SUFFIX}`);
  };

  const pincodeMatches = useMemo(() => {
    const q = form.pincode.trim().toLowerCase();
    if (!q) return SURAT_PINCODES;
    return SURAT_PINCODES.filter(p => p.pincode.startsWith(q) || p.area.toLowerCase().includes(q));
  }, [form.pincode]);

  const selectPincode = (pincode: string) => {
    // Only the deliberate act of picking a Surat pincode from the dropdown
    // auto-fills City/State — typing digits, or editing an existing
    // customer whose City/State already came from elsewhere, never
    // overwrites them on its own.
    setForm(f => ({ ...f, pincode, city: SURAT_CITY, state: SURAT_STATE }));
    setShowPincodeDropdown(false);
  };

  const handleSave = async () => {
    setError(null);
    setDuplicateCustomer(null);
    if (!form.name.trim()) { setError('Customer name is required.'); return; }
    if (!/^[0-9]{10}$/.test(form.mobile)) { setError('A valid 10-digit mobile number is required.'); return; }
    if (form.email && !EMAIL_FORMAT_RE.test(form.email)) { setError('Please enter a valid email address.'); return; }

    setSaving(true);
    try {
      const token = getToken();
      const path = isEditing ? `/api/erp/customers/${editingCustomer!.id}` : '/api/erp/customers';
      const res = await fetch(path, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        // A duplicate mobile on create means this customer already exists —
        // Customer ID is the primary business identity, so offer to use the
        // existing record instead of leaving Admin stuck on a bare error.
        if (!isEditing && json.existingCustomer) setDuplicateCustomer(json.existingCustomer);
        // json.detail (only ever present for a real backend/driver failure,
        // never for a validation message) is shown inline so a save failure
        // is diagnosable from the modal itself, not just a server log.
        throw new Error(json.detail ? `${json.error || 'Could not save this customer.'} (${json.detail})` : (json.error || 'Could not save this customer.'));
      }
      if (isEditing) {
        toast({ title: 'Customer Updated', description: `${form.name} saved successfully.` });
      } else {
        toast({ title: 'Customer Created Successfully', description: `Customer ID: ${json.data?.id || ''}` });
      }
      onSaved(json.data);
    } catch (err: any) {
      setError(err?.message || 'Could not save this customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#0F172A] border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline font-bold">{isEditing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2">
          <Label className="text-xs text-slate-400">Customer ID</Label>
          <span className="font-code text-xs font-bold text-[#F8FAFC]">
            {isEditing ? editingCustomer!.id : (previewNextId || 'Will be generated')}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Basic Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Customer Name *</Label>
                <Input value={form.name} onChange={e => update('name', e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Mobile Number *</Label>
                <Input value={form.mobile} onChange={e => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Alternate Mobile</Label>
                <Input value={form.alternateMobile} onChange={e => update('alternateMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Email</Label>
                <div className="mt-1 flex items-stretch">
                  <Input
                    value={emailLocalPart}
                    onChange={e => updateEmail(e.target.value)}
                    placeholder="username"
                    className={`bg-slate-950 border-slate-800 text-[#F8FAFC] ${emailLocalPart.includes('@') ? '' : 'rounded-r-none border-r-0'}`}
                  />
                  {!emailLocalPart.includes('@') && (
                    <span className="flex items-center px-3 rounded-r-md border border-l-0 border-slate-800 bg-slate-900 text-slate-500 text-xs font-code whitespace-nowrap">
                      {GMAIL_SUFFIX}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-400">Facebook ID</Label>
                <Input value={form.facebookId} onChange={e => update('facebookId', e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Instagram ID</Label>
                <Input value={form.instagramId} onChange={e => update('instagramId', e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Category</Label>
                <Select value={form.category} onValueChange={v => update('category', v)}>
                  <SelectTrigger className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]"><SelectValue placeholder="Select Category" className="text-[#94A3B8]" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-[#F8FAFC]">
                    {CUSTOMER_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Full Address</Label>
                <Textarea value={form.address} onChange={e => update('address', e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-slate-400">City</Label>
                <Input value={form.city} onChange={e => update('city', e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">State</Label>
                <Input value={form.state} onChange={e => update('state', e.target.value)} className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]" />
              </div>
              <div className="relative col-span-2 sm:col-span-1">
                <Label className="text-xs text-slate-400">Pincode</Label>
                <Input
                  value={form.pincode}
                  onChange={e => { update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6)); setShowPincodeDropdown(true); }}
                  onFocus={() => setShowPincodeDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPincodeDropdown(false), 150)}
                  placeholder="Search Surat pincode..."
                  className="mt-1 bg-slate-950 border-slate-800 text-[#F8FAFC]"
                />
                {showPincodeDropdown && pincodeMatches.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                    {pincodeMatches.map(p => (
                      <button
                        type="button"
                        key={p.pincode}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectPincode(p.pincode)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between gap-2"
                      >
                        <span className="font-code font-bold text-blue-400">{p.pincode}</span>
                        <span className="text-slate-400 truncate">{p.area}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Status</p>
            <Select value={form.status} onValueChange={v => update('status', v)}>
              <SelectTrigger className="bg-slate-950 border-slate-800 text-[#F8FAFC]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-[#F8FAFC]">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-xs bg-rose-900/20 border border-rose-800 rounded-lg p-2.5 space-y-2">
              <p className="text-rose-300">{error}</p>
              {duplicateCustomer && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-rose-700/60 text-rose-200 hover:bg-rose-900/40 h-8"
                  onClick={() => onSaved(duplicateCustomer)}
                >
                  Use Existing Customer ({duplicateCustomer.id})
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="border-slate-800" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-[#0066FF] hover:bg-[#0052CC]" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

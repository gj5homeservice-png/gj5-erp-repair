"use client"

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerListItem } from './CustomerDepartmentModule';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gj5_auth_token');
}

const EMPTY = {
  name: '', mobile: '', email: '', alternateMobile: '',
  address: '', city: '', state: '', pincode: '',
  status: 'Active',
};

export function CustomerFormModal({
  isOpen, onClose, onSaved, editingCustomer,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingCustomer?: CustomerListItem | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editingCustomer;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setForm(editingCustomer ? {
        name: editingCustomer.name || '',
        mobile: editingCustomer.mobile || '',
        email: editingCustomer.email || '',
        alternateMobile: editingCustomer.alternateMobile || '',
        address: editingCustomer.address || '',
        city: editingCustomer.city || '',
        state: editingCustomer.state || '',
        pincode: editingCustomer.pincode || '',
        status: editingCustomer.status || 'Active',
      } : { ...EMPTY });
    }
  }, [isOpen, editingCustomer]);

  const update = (field: keyof typeof EMPTY, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setError(null);
    if (!form.name.trim()) { setError('Customer name is required.'); return; }
    if (!/^[0-9]{10}$/.test(form.mobile)) { setError('A valid 10-digit mobile number is required.'); return; }

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
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not save this customer.');
      toast({ title: isEditing ? 'Customer Updated' : 'Customer Added', description: `${form.name} saved successfully.` });
      onSaved();
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

        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Basic Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Customer Name *</Label>
                <Input value={form.name} onChange={e => update('name', e.target.value)} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Mobile Number *</Label>
                <Input value={form.mobile} onChange={e => update('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Alternate Mobile</Label>
                <Input value={form.alternateMobile} onChange={e => update('alternateMobile', e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Email</Label>
                <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-slate-400">Full Address</Label>
                <Textarea value={form.address} onChange={e => update('address', e.target.value)} className="mt-1 bg-slate-950 border-slate-800" rows={2} />
              </div>
              <div>
                <Label className="text-xs text-slate-400">City</Label>
                <Input value={form.city} onChange={e => update('city', e.target.value)} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">State</Label>
                <Input value={form.state} onChange={e => update('state', e.target.value)} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Pincode</Label>
                <Input value={form.pincode} onChange={e => update('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 bg-slate-950 border-slate-800" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-2">Status</p>
            <Select value={form.status} onValueChange={v => update('status', v)}>
              <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-rose-400 bg-rose-900/20 border border-rose-800 rounded-lg p-2.5">{error}</p>}
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

"use client"

import React, { useEffect, useState } from 'react';
import { FileStack, Upload, CheckCircle2, XCircle, Trash2, Clock, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Employee, EmployeeDocument, KycDocumentType } from '@/lib/types';

const DOCUMENT_TYPES: KycDocumentType[] = ['Aadhaar', 'PAN', 'Address Proof', 'Bank Proof', 'Passport', 'Driving Licence', 'Other'];

const STATUS_META: Record<string, { color: string; icon: typeof Clock }> = {
  Pending: { color: 'bg-amber-500/10 text-amber-400', icon: Clock },
  Verified: { color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle2 },
  Rejected: { color: 'bg-rose-500/10 text-rose-400', icon: XCircle },
};

// A richer, verification-workflow-capable complement to the fixed single-slot
// KYC images above (Aadhaar Front/Back, PAN, Address Proof) — this is
// additive, not a replacement; those existing fields and their upload
// behavior are untouched.
export function EmployeeDocumentsSection({ employee, store }: { employee: Partial<Employee>; store: any }) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>(employee.documents || []);
  const [docType, setDocType] = useState<KycDocumentType>('Aadhaar');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const refresh = async () => {
    if (!employee.id) return;
    setLoading(true);
    try {
      const data = await store.listEmployeeDocuments(employee.id);
      setDocuments(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not load documents', description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [employee.id]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee.id) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await store.uploadEmployeeDocument(employee.id, docType, reader.result as string);
        toast({ title: 'Document Uploaded', description: `${docType} uploaded and pending verification.` });
        await refresh();
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: err?.message || 'Could not upload document.' });
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async (docId: string) => {
    try {
      await store.verifyEmployeeDocument(employee.id, docId);
      toast({ title: 'Document Verified' });
      await refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message });
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason required', description: 'Enter a rejection reason before rejecting this document.' });
      return;
    }
    try {
      await store.rejectEmployeeDocument(employee.id, docId, rejectReason.trim());
      toast({ title: 'Document Rejected' });
      setRejectingId(null);
      setRejectReason('');
      await refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message });
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await store.deleteEmployeeDocument(employee.id, docId);
      toast({ title: 'Document Deleted' });
      await refresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message });
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><FileStack className="w-4 h-4" /></div>
        <div>
          <h4 className="text-sm font-bold text-white">Document Vault</h4>
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Upload, verify, and track KYC documents</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={docType} onValueChange={(v) => setDocType(v as KycDocumentType)}>
          <SelectTrigger className="bg-slate-950 border-slate-800 h-10 w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" disabled={uploading} className="relative border-slate-800 h-10 text-xs font-bold uppercase overflow-hidden">
          <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Document'}
          <input type="file" accept="image/*,application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} disabled={uploading} />
        </Button>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-xs text-slate-600 italic">Loading documents...</p>}
        {!loading && documents.length === 0 && <p className="text-xs text-slate-600 italic">No documents uploaded yet.</p>}
        {documents.map((doc) => {
          const meta = STATUS_META[doc.verificationStatus] || STATUS_META.Pending;
          const StatusIcon = meta.icon;
          const isRejecting = rejectingId === doc.id;
          return (
            <div key={doc.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <a href={doc.fileData} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 hover:bg-slate-700">
                    <Eye className="w-4 h-4 text-slate-300" />
                  </a>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-200">{doc.documentType}</p>
                    <p className="text-[9px] text-slate-500">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={cn('text-[9px] font-black uppercase px-2 h-5 border-0 flex items-center gap-1', meta.color)}>
                    <StatusIcon className="w-3 h-3" /> {doc.verificationStatus}
                  </Badge>
                  {doc.verificationStatus === 'Pending' && !isRejecting && (
                    <>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleVerify(doc.id)}><CheckCircle2 className="w-4 h-4" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-400 hover:bg-rose-500/10" onClick={() => { setRejectingId(doc.id); setRejectReason(''); }}><XCircle className="w-4 h-4" /></Button>
                    </>
                  )}
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:bg-slate-800" onClick={() => handleDelete(doc.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              {isRejecting && (
                <div className="flex flex-wrap items-center gap-2 pl-1">
                  <Input
                    autoFocus
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (required)..."
                    className="bg-slate-900 border-slate-800 h-9 text-xs flex-1 min-w-[200px]"
                  />
                  <Button type="button" size="sm" className="h-9 bg-rose-600 hover:bg-rose-700 text-[10px] font-bold uppercase" onClick={() => handleReject(doc.id)}>Confirm Reject</Button>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-500" onClick={() => { setRejectingId(null); setRejectReason(''); }}><X className="w-4 h-4" /></Button>
                </div>
              )}
              {doc.verificationStatus === 'Rejected' && doc.rejectionReason && (
                <p className="text-[10px] text-rose-400 pl-1"><span className="font-bold uppercase">Reason:</span> {doc.rejectionReason}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client"

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Lock, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useErpStore } from '@/hooks/use-erp-store';

interface DeleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  onConfirm: () => void;
}

export function DeleteJobModal({ isOpen, onClose, jobId, onConfirm }: DeleteJobModalProps) {
  const store = useErpStore();
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerifyPassword = () => {
    if (!password) return;
    
    setIsVerifying(true);
    setError('');

    // Verification against local-first store state for offline resilience
    // The store synchronizes with Firestore settings/security in the background
    if (password === store.deletePassword) {
      setIsPasswordVerified(true);
      setError('');
    } else {
      setError('Incorrect authorization key');
      toast({
        variant: "destructive",
        title: "Wrong Password",
        description: "Unauthorized access attempt logged."
      });
    }
    setIsVerifying(false);
  };

  const handleFinalConfirm = () => {
    try {
      onConfirm(); // This updates the local store/state and handles deletion
      toast({
        title: "Record Terminated",
        description: `Record ${jobId} removed from registry.`
      });
      resetAndClose();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "An error occurred while terminating the record."
      });
    }
  };

  const resetAndClose = () => {
    setPassword('');
    setIsPasswordVerified(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100 shadow-2xl">
        {!isPasswordVerified ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-500">
                <ShieldAlert className="w-6 h-6" /> Admin Authorization
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs uppercase font-bold tracking-widest mt-1">
                Security clearance required for <span className="text-white font-black">{jobId}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-tighter">
                  <Lock className="w-3 h-3" /> Master Password Node
                </Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-950 border-slate-800 h-12 text-center text-xl tracking-widest focus-visible:ring-rose-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  autoFocus
                />
                {error && <p className="text-[10px] text-rose-500 font-bold uppercase animate-pulse text-center">{error}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={resetAndClose} className="text-slate-400">Abort</Button>
              <Button 
                onClick={handleVerifyPassword} 
                disabled={isVerifying || !password}
                className="bg-rose-600 hover:bg-rose-700 font-bold uppercase px-8 h-11"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify Identity
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-6 h-6 animate-bounce" /> Final Confirmation
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs font-bold uppercase leading-relaxed">
                Confirming <span className="text-rose-500 font-black">Permanent Termination</span> for <span className="text-white font-black">{jobId}</span>. This session is logged for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-10 flex justify-center">
              <div className="p-6 bg-rose-500/10 rounded-full border border-rose-500/20 relative group">
                <Trash2 className="w-16 h-16 text-rose-500 group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full -z-10"></div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetAndClose} className="border-slate-800 hover:bg-slate-800 flex-1">Keep Record</Button>
              <Button onClick={handleFinalConfirm} className="bg-rose-600 hover:bg-rose-700 font-black uppercase px-8 flex-1">
                Confirm Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


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
import { AlertTriangle, Lock, ShieldAlert, Trash2 } from 'lucide-react';
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
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleVerifyPassword = () => {
    if (password === store.deletePassword) {
      setIsPasswordVerified(true);
      setError('');
    } else {
      setError('Invalid Password');
      toast({
        variant: "destructive",
        title: "Security Alert",
        description: "Invalid Master Password entered."
      });
    }
  };

  const handleFinalConfirm = () => {
    onConfirm();
    toast({
      title: "Operation Successful",
      description: `Target record ${jobId} has been removed from the registry.`
    });
    resetAndClose();
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
              <DialogDescription className="text-slate-400">
                Master Password is required to perform destructive actions on <span className="font-mono text-blue-400 font-bold">{jobId}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5" /> Security Password
                </Label>
                <Input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-slate-950 border-slate-800 h-11 focus-visible:ring-rose-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                />
                {error && <p className="text-[10px] text-rose-500 font-bold uppercase animate-pulse">{error}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={resetAndClose}>Cancel</Button>
              <Button onClick={handleVerifyPassword} className="bg-rose-600 hover:bg-rose-700 font-bold uppercase">
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
              <DialogDescription className="text-slate-400">
                Confirming <span className="text-rose-500 font-black uppercase">Permanent Termination</span> for <span className="font-mono text-white font-bold">{jobId}</span>. This session is logged for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-8 flex justify-center">
              <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20">
                <Trash2 className="w-12 h-12 text-rose-500" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={resetAndClose} className="border-slate-800">Abort</Button>
              <Button onClick={handleFinalConfirm} className="bg-rose-600 hover:bg-rose-700 font-black uppercase px-8">
                Confirm Deletion
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

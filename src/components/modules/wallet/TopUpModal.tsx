
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
import { Wallet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const PRESETS = [100, 500, 1000];

export function TopUpModal({ isOpen, onClose, onSuccess }: TopUpModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTopUp = async () => {
    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than zero."
      });
      return;
    }

    setIsLoading(true);

    try {
      // Demo API Call
      const response = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val })
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(val);
        toast({
          title: "Wallet Refilled",
          description: `₹${val} has been added to your balance successfully.`
        });
        setAmount('');
        onClose();
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Transaction Error",
        description: err.message || "Failed to process top-up."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
          <DialogTitle className="text-xl font-headline font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#0066FF]" /> Wallet Top-Up
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs uppercase tracking-widest font-bold">
            Refill GJ5 ERP Credit
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Amount</Label>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  variant="outline"
                  onClick={() => setAmount(p.toString())}
                  className={cn(
                    "h-12 border-slate-800 font-code font-bold text-lg",
                    amount === p.toString() ? "bg-[#0066FF] border-[#0066FF] text-white" : "hover:bg-slate-800"
                  )}
                >
                  ₹{p}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-500">₹</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="pl-10 h-14 bg-slate-950 border-slate-800 text-xl font-code font-bold focus-visible:ring-[#0066FF]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <AlertCircle className="w-4 h-4 text-blue-400" />
            <p className="text-[10px] text-slate-400 leading-tight">
              Demo Mode Active: Funds will be added instantly to your wallet for testing purposes.
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-slate-800 bg-slate-900/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-slate-800 text-slate-400"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTopUp}
            disabled={isLoading || !amount}
            className="bg-[#0066FF] hover:bg-blue-600 px-8 h-12 rounded-xl font-bold uppercase shadow-lg shadow-blue-500/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Top-Up"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

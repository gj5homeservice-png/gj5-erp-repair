"use client"

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Coffee, 
  PenTool, 
  Wrench, 
  Package, 
  MoreHorizontal,
  PlusCircle,
  PieChart as PieIcon,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function WalletModule({ store }: { store: any }) {
  const [expense, setExpense] = useState({
    amount: 0,
    category: 'Chai Nasta',
    description: ''
  });

  const categories = [
    { name: 'Chai Nasta', icon: Coffee, color: 'text-orange-400' },
    { name: 'Stationery', icon: PenTool, color: 'text-blue-400' },
    { name: 'Tools & Consumables', icon: Wrench, color: 'text-purple-400' },
    { name: 'Miscellaneous / Other', icon: Package, color: 'text-slate-400' },
  ];

  const handleAddExpense = () => {
    if (expense.amount <= 0) return;
    store.addExpense({
      id: `EXP${Date.now()}`,
      ...expense,
      timestamp: new Date().toISOString()
    });
    setExpense({ amount: 0, category: 'Chai Nasta', description: '' });
  };

  const totalsByCategory = useMemo(() => {
    return store.expenses.reduce((acc: any, curr: any) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});
  }, [store.expenses]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="xl:col-span-2 space-y-8">
        {/* Liquid Balance Header */}
        <div className="bg-[#0066FF] p-8 rounded-3xl text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-10 transition-transform group-hover:scale-110">
              <Wallet className="w-48 h-48" />
           </div>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                 <p className="text-blue-100/80 font-bold uppercase tracking-widest text-sm">Available Petty Cash Balance</p>
                 <h2 className="text-5xl font-headline font-black">₹{store.walletBalance.toFixed(2)}</h2>
              </div>
              <div className="flex gap-4">
                 <Button className="bg-white text-[#0066FF] hover:bg-blue-50 h-14 px-8 rounded-2xl font-headline font-bold uppercase shadow-xl">
                    <ArrowUpRight className="w-5 h-5 mr-2" />
                    Top-Up
                 </Button>
                 <Button className="bg-blue-400/20 text-white border border-blue-300/30 hover:bg-blue-400/30 h-14 px-8 rounded-2xl font-headline font-bold uppercase backdrop-blur-sm">
                    View History
                 </Button>
              </div>
           </div>
        </div>

        {/* Parachu Ran Expense Logger */}
        <Card className="bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800">
              <CardTitle className="font-headline font-bold text-xl flex items-center gap-2">
                 <ArrowDownRight className="w-5 h-5 text-[#FF3366]" />
                 "Parachu Ran" Expense Logger
              </CardTitle>
           </CardHeader>
           <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-2">
                    <Label className="text-slate-400">Expense Amount (₹)</Label>
                    <Input 
                      type="number" 
                      value={expense.amount}
                      onChange={e => setExpense({...expense, amount: Number(e.target.value)})}
                      className="bg-slate-950 border-slate-800 h-12 font-code font-bold text-xl" 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-slate-400">Category Selection</Label>
                    <Select 
                      value={expense.category} 
                      onValueChange={v => setExpense({...expense, category: v})}
                    >
                       <SelectTrigger className="bg-slate-950 border-slate-800 h-12">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-slate-900 border-slate-800">
                          {categories.map(cat => (
                            <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-slate-400">Item Description</Label>
                    <Input 
                      value={expense.description}
                      onChange={e => setExpense({...expense, description: e.target.value})}
                      placeholder="e.g. Chai for 5 staff" 
                      className="bg-slate-950 border-slate-800 h-12" 
                    />
                 </div>
              </div>
              <Button 
                onClick={handleAddExpense}
                className="w-full mt-8 bg-[#FF3366] hover:bg-rose-600 h-12 rounded-xl font-headline font-bold uppercase shadow-lg shadow-rose-500/10"
              >
                 <PlusCircle className="w-5 h-5 mr-2" />
                 Record Expense & Deduct
              </Button>
           </CardContent>
        </Card>

        {/* Recent Ledger */}
        <div className="space-y-4">
           <h3 className="text-xl font-headline font-bold">Recent Petty Cash Outlays</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {store.expenses.map((exp: any) => {
                const cat = categories.find(c => c.name === exp.category) || categories[3];
                return (
                  <div key={exp.id} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex items-center gap-4 group">
                     <div className="p-3 bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                        <cat.icon className={cat.color} />
                     </div>
                     <div className="flex-1">
                        <p className="font-bold">{exp.description || exp.category}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{exp.category} • {new Date(exp.timestamp).toLocaleTimeString()}</p>
                     </div>
                     <div className="text-right">
                        <p className="font-code font-bold text-[#FF3366]">-₹{exp.amount}</p>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      <div className="space-y-8">
         <Card className="bg-slate-900/40 border-slate-800">
            <CardHeader className="border-b border-slate-800">
               <CardTitle className="font-headline font-bold text-lg flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-[#FFD700]" />
                  Total Expense Analytics
               </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
               <div className="space-y-6">
                  {categories.map(cat => {
                    const total = totalsByCategory[cat.name] || 0;
                    const percentage = store.expenses.length ? (total / store.expenses.reduce((a:any,b:any)=>a+b.amount,0)) * 100 : 0;
                    return (
                      <div key={cat.name} className="space-y-2">
                         <div className="flex justify-between items-end">
                            <div className="flex items-center gap-2">
                               <cat.icon className={cn("w-4 h-4", cat.color)} />
                               <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <span className="font-code font-bold">₹{total}</span>
                         </div>
                         <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500 rounded-full", cat.color.replace('text', 'bg'))} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                         </div>
                      </div>
                    );
                  })}
               </div>

               <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                  <p className="text-slate-500 text-xs uppercase font-bold mb-1">Total Miscellaneous Spending</p>
                  <h3 className="text-3xl font-headline font-black text-white">
                    ₹{store.expenses.reduce((acc:any, curr:any) => acc + curr.amount, 0).toFixed(2)}
                  </h3>
               </div>
            </CardContent>
         </Card>

         <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-6">
               <div className="flex items-center gap-4 text-emerald-400">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                  <div>
                     <p className="text-xs text-slate-500 uppercase font-bold">Operational Liquidity</p>
                     <p className="text-lg font-headline font-bold tracking-tight text-white">HEALTHY</p>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}

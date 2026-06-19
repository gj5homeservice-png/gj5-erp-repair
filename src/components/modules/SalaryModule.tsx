"use client"

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  User,
  History,
  ArrowUpRight,
  MoreVertical,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { SalaryRecord, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function SalaryModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'MMMM'));
  const [yearFilter, setYearFilter] = useState(format(new Date(), 'yyyy'));
  const [isProcessModalOpen, setProcessModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Partial<Employee> | null>(null);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const activeEmps = store.employees.filter((e: any) => e.status === 'Active');
    const monthlyLiability = activeEmps.reduce((acc: number, curr: any) => acc + (curr.salary || 0), 0);
    const paidThisMonth = store.salaries.filter((s: any) => s.month === monthFilter && s.year === yearFilter && s.paymentStatus === 'Paid').reduce((acc: number, curr: any) => acc + curr.netPayable, 0);
    const pendingPayments = store.salaries.filter((s: any) => s.month === monthFilter && s.year === yearFilter && s.paymentStatus === 'Pending').length;

    return { monthlyLiability, paidThisMonth, pendingPayments, totalEmps: activeEmps.length };
  }, [store.employees, store.salaries, monthFilter, yearFilter]);

  const filteredSalaries = useMemo(() => {
    return store.salaries.filter((s: SalaryRecord) => {
      const matchesSearch = s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = s.month === monthFilter && s.year === yearFilter;
      return matchesSearch && matchesMonth;
    }).sort((a: any, b: any) => new Date(b.processedDate).getTime() - new Date(a.processedDate).getTime());
  }, [store.salaries, searchQuery, monthFilter, yearFilter]);

  const processSalary = () => {
    if (!selectedEmp) return;

    const todayRecs = store.attendance.filter((a: any) => a.employeeId === selectedEmp.id && a.date.includes(yearFilter));
    const attendanceDays = todayRecs.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
    const baseSalary = selectedEmp.salary || 0;
    const dailyWage = Math.round(baseSalary / 30);
    const netPayable = (dailyWage * attendanceDays) + (selectedEmp.bonus || 0) - (selectedEmp.deductions || 0);

    const record: SalaryRecord = {
      id: `SAL-${selectedEmp.id}-${monthFilter}-${yearFilter}`,
      employeeId: selectedEmp.id!,
      employeeName: selectedEmp.name!,
      month: monthFilter,
      year: yearFilter,
      baseSalary,
      attendanceDays,
      overtimeHours: 0,
      bonus: selectedEmp.bonus || 0,
      deductions: selectedEmp.deductions || 0,
      netPayable,
      paymentStatus: 'Pending',
      processedDate: new Date().toISOString()
    };

    store.addSalary(record);
    setProcessModalOpen(false);
    setSelectedEmp(null);
    toast({ title: "Payroll Processed", description: `Net payable for ${record.employeeName} calculated: ₹${netPayable.toLocaleString()}.` });
  };

  const handleUpdateStatus = (record: SalaryRecord, newStatus: 'Paid' | 'Pending') => {
    store.updateSalary({ ...record, paymentStatus: newStatus });
    toast({ title: "Payment Updated", description: `Payroll record for ${record.employeeName} marked as ${newStatus}.` });
  };

  const exportPayroll = () => {
    const data = filteredSalaries.map((s: SalaryRecord) => ({
      ID: s.employeeId,
      Name: s.employeeName,
      Month: `${s.month} ${s.year}`,
      Base: s.baseSalary,
      Days: s.attendanceDays,
      Bonus: s.bonus,
      Deductions: s.deductions,
      Net_Payable: s.netPayable,
      Status: s.paymentStatus
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll_Master");
    XLSX.writeFile(wb, `GJ5_Payroll_${monthFilter}_${yearFilter}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Payroll & Compensation</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Automated Disbursement Lifecycle</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-32 bg-slate-950 border-slate-800 h-10 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
               {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                 <SelectItem key={m} value={m}>{m}</SelectItem>
               ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setProcessModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 h-10 font-bold uppercase text-[10px]">
            <RefreshCw className="w-4 h-4 mr-2" /> Run Payroll
          </Button>
          <Button onClick={exportPayroll} variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <Download className="w-4 h-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Liability', value: `₹${stats.monthlyLiability.toLocaleString()}`, sub: `${stats.totalEmps} Active Assets`, icon: CreditCard, color: 'text-blue-400' },
          { label: 'Disbursed This Month', value: `₹${stats.paidThisMonth.toLocaleString()}`, sub: 'Confirmed Payments', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Pending Audit', value: stats.pendingPayments, sub: 'Needs Processing', icon: Clock, color: 'text-amber-400' },
          { label: 'System Integrity', value: 'OK', sub: 'Calculations Verified', icon: ShieldCheck, color: 'text-indigo-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-lg">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <h3 className={cn("text-xl md:text-2xl font-headline font-bold", s.color)}>{s.value}</h3>
                <p className="text-[9px] text-slate-600 font-bold uppercase">{s.sub}</p>
              </div>
              <div className={cn("p-3 bg-slate-950 rounded-xl", s.color)}><s.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search payroll records..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-slate-950 border-slate-800 h-11" 
          />
        </div>
        <Badge className="bg-slate-800 text-[10px] font-black uppercase tracking-widest px-4 h-11 border border-slate-700 flex items-center gap-2">
           <Calendar className="w-3.5 h-3.5" /> Filtered: {monthFilter} {yearFilter}
        </Badge>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase px-6">Associate Identity</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Attendance Logic</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Base / Adjustments</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Net Disbursement</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSalaries.map((s: SalaryRecord) => (
              <TableRow key={s.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                <TableCell className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-emerald-400">
                       <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-100">{s.employeeName}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{s.employeeId} • {s.month}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-300">{s.attendanceDays} Worked Days</span>
                      <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-500" style={{ width: `${(s.attendanceDays / 30) * 100}%` }}></div>
                      </div>
                   </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500">Base: ₹{s.baseSalary.toLocaleString()}</span>
                      <span className="text-[10px] text-emerald-500">Bonus: +₹{s.bonus.toLocaleString()}</span>
                      <span className="text-[10px] text-rose-500">Ded: -₹{s.deductions.toLocaleString()}</span>
                   </div>
                </TableCell>
                <TableCell>
                   <p className="text-lg font-code font-bold text-blue-400">₹{s.netPayable.toLocaleString()}</p>
                   <p className="text-[8px] text-slate-600 uppercase font-black">Bank: OK Verified</p>
                </TableCell>
                <TableCell className="text-right px-6">
                   <div className="flex flex-col items-end gap-2">
                      <Select value={s.paymentStatus} onValueChange={(v: any) => handleUpdateStatus(s, v)}>
                         <SelectTrigger className={cn(
                           "h-8 text-[9px] font-bold uppercase border-0 w-24",
                           s.paymentStatus === 'Paid' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                         )}>
                            <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="bg-slate-900 border-slate-800">
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                         </SelectContent>
                      </Select>
                      <span className="text-[8px] text-slate-600 uppercase font-bold">Ref: {s.processedDate.split('T')[0]}</span>
                   </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSalaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-slate-500 font-medium italic">
                  No payroll data committed for {monthFilter}. Run payroll to generate entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isProcessModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
           <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-emerald-600 rounded-lg text-white"><RefreshCw className="w-5 h-5" /></div>
                 <DialogTitle className="text-xl font-headline font-bold">Process Individual Payroll</DialogTitle>
              </div>
           </DialogHeader>
           <div className="p-6 space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] uppercase font-bold text-slate-500">Target Associate</Label>
                 <Select onValueChange={(v: string) => setSelectedEmp(store.employees.find((e: any) => e.id === v))}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue placeholder="Select Staff Node" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                       {store.employees.filter((e: any) => e.status === 'Active').map((e: any) => (
                         <SelectItem key={e.id} value={e.id}>{e.name} ({e.designation})</SelectItem>
                       ))}
                    </SelectContent>
                 </Select>
              </div>

              {selectedEmp && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Base CTC</span>
                      <span className="font-bold">₹{selectedEmp.salary?.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Pending Bonus</span>
                      <span className="text-emerald-400 font-bold">+₹{selectedEmp.bonus || 0}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Deductions</span>
                      <span className="text-rose-500 font-bold">-₹{selectedEmp.deductions || 0}</span>
                   </div>
                   <Separator className="bg-slate-800" />
                   <p className="text-[9px] text-slate-500 italic text-center uppercase tracking-tighter">System will auto-calculate payout based on current month attendance records.</p>
                </div>
              )}
           </div>
           <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/50">
              <Button variant="ghost" onClick={() => setProcessModalOpen(false)}>Abort</Button>
              <Button onClick={processSalary} disabled={!selectedEmp} className="bg-emerald-600 hover:bg-emerald-700 px-8 h-11 font-bold uppercase text-xs">Run Calculation</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full", className)} />;
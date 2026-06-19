"use client"

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Download, 
  History,
  Briefcase,
  TrendingUp,
  CreditCard,
  Clock,
  RefreshCw,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { SalaryRecord, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function SalaryModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'MMMM'));
  const [yearFilter, setYearFilter] = useState(format(new Date(), 'yyyy'));
  const { toast } = useToast();

  const filteredSalaries = useMemo(() => {
    return (store.salaries || []).filter((s: SalaryRecord) => {
      const matchesSearch = s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           s.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMonth = s.month === monthFilter && s.year === yearFilter;
      return matchesSearch && matchesMonth;
    }).sort((a: any, b: any) => new Date(b.processedDate).getTime() - new Date(a.processedDate).getTime());
  }, [store.salaries, searchQuery, monthFilter, yearFilter]);

  const stats = useMemo(() => {
    const monthlyTotal = filteredSalaries.reduce((acc, curr) => acc + curr.netPayable, 0);
    const paidCount = filteredSalaries.filter(s => s.paymentStatus === 'Paid').length;
    const pendingCount = filteredSalaries.filter(s => s.paymentStatus === 'Pending').length;
    return { monthlyTotal, paidCount, pendingCount };
  }, [filteredSalaries]);

  const processMonthlySalary = (emp: Employee) => {
    const attendanceDays = store.attendance.filter((a: any) => 
      a.employeeId === emp.employeeId && 
      format(parseISO(a.checkIn), 'MMMM') === monthFilter &&
      ['Present', 'Late', 'Checked Out'].includes(a.status)
    ).length;

    const baseSalary = emp.salary || 0;
    const dailyWage = baseSalary / 30;
    const netPayable = Math.round(dailyWage * attendanceDays);

    const newSalary: SalaryRecord = {
      id: `SAL-${emp.employeeId}-${monthFilter}-${yearFilter}`,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      month: monthFilter,
      year: yearFilter,
      baseSalary,
      attendanceDays,
      overtimeHours: 0,
      bonus: 0,
      deductions: 0,
      netPayable,
      paymentStatus: 'Pending',
      processedDate: new Date().toISOString()
    };

    store.addSalary(newSalary);
    toast({ title: "Payroll Processed", description: `Net payable for ${emp.name} calculated: ₹${netPayable.toLocaleString()}.` });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredSalaries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `Payroll_${monthFilter}_${yearFilter}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Payroll & Compensation</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Attendance-Based Disbursement Lifecycle</p>
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
          <Button onClick={exportExcel} variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <Download className="w-4 h-4 mr-2" /> Excel Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Liability', value: `₹${stats.monthlyTotal.toLocaleString()}`, sub: 'Calculated Net', icon: CreditCard, color: 'text-blue-400' },
          { label: 'Payments Disbursed', value: stats.paidCount, sub: 'Confirmed Paid', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Pending Audit', value: stats.pendingCount, sub: 'Needs Disbursement', icon: Clock, color: 'text-amber-400' },
          { label: 'System Integrity', value: 'OK', sub: 'Verified Audit', icon: TrendingUp, color: 'text-indigo-400' },
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase px-6">Associate Identity</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Worked Days</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Net Payout</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-6">Disbursement</TableHead>
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
                   <span className="text-xs font-bold text-slate-300">{s.attendanceDays} Days</span>
                </TableCell>
                <TableCell>
                   <p className="text-lg font-code font-bold text-blue-400">₹{s.netPayable.toLocaleString()}</p>
                </TableCell>
                <TableCell className="text-right px-6">
                   <div className="flex flex-col items-end gap-2">
                      <Select value={s.paymentStatus} onValueChange={(v: any) => store.updateSalary({ ...s, paymentStatus: v })}>
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
                   </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSalaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center text-slate-500 font-medium italic">
                  No payroll data found. Use HR registry to process disbursements.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 border-dashed">
         <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-400"><History className="w-6 h-6" /></div>
               <div>
                  <h4 className="font-bold text-slate-100 uppercase text-xs tracking-widest">Process Monthly Run</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Select an employee from the registry to auto-calculate payout based on attendance.</p>
               </div>
            </div>
            <div className="flex gap-2">
               {store.employees.filter((e: any) => e.status === 'Active').slice(0, 3).map((e: any) => (
                 <Button key={e.id} onClick={() => processMonthlySalary(e)} size="sm" variant="outline" className="h-9 text-[9px] uppercase border-slate-700">
                    Run for {e.name.split(' ')[0]}
                 </Button>
               ))}
               <Button size="sm" className="bg-blue-600 h-9 text-[9px] uppercase"><Plus className="w-3 h-3 mr-1.5" /> Batch Process</Button>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}

function parseISO(dateString: string): Date {
  return new Date(dateString);
}

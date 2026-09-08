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
  Plus,
  CheckCircle2,
  FileDown,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertCircle
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
import { format, parseISO, isSameMonth } from 'date-fns';
import { SalaryRecord, Employee, AttendanceRecord } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { addLogoToPdf } from '@/lib/branding';

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
    const monthRecs = store.attendance.filter((a: AttendanceRecord) => 
      a.employeeId === emp.employeeId && 
      format(parseISO(a.createdAt), 'MMMM') === monthFilter &&
      ['Checked Out', 'Present', 'Late'].includes(a.status)
    );

    const attendanceDays = monthRecs.length;
    const baseSalary = emp.salary || 0;
    const dailyWage = baseSalary / 30;
    const netPayable = Math.round(dailyWage * attendanceDays);

    const recordId = `SAL-${emp.employeeId}-${monthFilter}-${yearFilter}`;
    const existing = store.salaries.find((s: any) => s.id === recordId);

    if (existing) {
       toast({ variant: "destructive", title: "Already Processed", description: `Payroll node for ${emp.name} in ${monthFilter} already exists.` });
       return;
    }

    const newSalary: SalaryRecord = {
      id: recordId,
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
    toast({ title: "Payroll Committed", description: `Disbursement calculated for ${emp.name}: ₹${netPayable.toLocaleString()}.` });
  };

  const handlePrintSlip = (record: SalaryRecord) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const accent = [18, 60, 140]; // GJ5 ERP Blue #123C8C

    // Header
    const profile = store.companyProfile || {};
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 148, 25, 'F');
    const hasLogo = addLogoToPdf(doc, profile.logoUrl, 8, 4, 16, 16);
    const headerTextX = hasLogo ? 27 : 10;
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.companyName?.toUpperCase() || 'GJ5 HOME SERVICE', headerTextX, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('GOOD JOB 5 ERP - INDUSTRIAL PAYROLL', headerTextX, 18);
    doc.text(`DATE: ${format(new Date(), 'dd/MM/yyyy')}`, 138, 15, { align: 'right' });

    // Employee Info
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EARNINGS SLIP', 10, 35);
    doc.text(`${record.month.toUpperCase()} ${record.year}`, 138, 35, { align: 'right' });
    doc.line(10, 37, 138, 37);

    let y = 45;
    const drawRow = (l: string, v: string) => {
       doc.setFont('helvetica', 'bold');
       doc.text(`${l}:`, 10, y);
       doc.setFont('helvetica', 'normal');
       doc.text(v, 50, y);
       y += 7;
    }

    drawRow('Associate Name', record.employeeName);
    drawRow('Employee ID', record.employeeId);
    drawRow('Base Rate', `INR ${record.baseSalary.toLocaleString()}`);
    drawRow('Verified Days', `${record.attendanceDays} Days`);
    
    y += 5;
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y, 128, 25, 'F');
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('NET DISBURSEMENT', 15, y);
    doc.setFontSize(14);
    doc.text(`INR ${record.netPayable.toLocaleString()}`, 133, y, { align: 'right' });
    doc.setFontSize(10);
    
    y += 10;
    doc.setFont('helvetica', 'italic');
    doc.text(`Status: ${record.paymentStatus}`, 15, y);

    // Footer
    y += 35;
    doc.line(10, y, 60, y);
    doc.line(88, y, 138, y);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Auth. Signatory', 10, y + 5);
    doc.text('Associate Signature', 88, y + 5);

    doc.save(`Salary_Slip_${record.employeeId}_${record.month}.pdf`);
    toast({ title: "PDF Rendered", description: "Earnings slip downloaded for dispatch." });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#123C8C] rounded-xl text-white shadow-lg shadow-blue-900/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Payroll Hub</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">GJ5 ERP Industrial Ledger</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-32 bg-slate-950 border-slate-800 h-10 text-[10px] font-black uppercase"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
               {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                 <SelectItem key={m} value={m}>{m}</SelectItem>
               ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <FileDown className="w-4 h-4 mr-2" /> Master Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Liability', value: `₹${stats.monthlyTotal.toLocaleString()}`, sub: 'Verified Net', icon: CreditCard, color: 'text-blue-400' },
          { label: 'Payments Disbursed', value: stats.paidCount, sub: 'Confirmed Paid', icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Pending Audit', value: stats.pendingCount, sub: 'Awaiting Settlement', icon: Clock, color: 'text-amber-400' },
          { label: 'Fiscal Integrity', value: 'OK', sub: 'Calculated Node', icon: ShieldCheck, color: 'text-indigo-400' },
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
              <TableHead className="text-[10px] font-black uppercase px-6">Associate Node</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Session Yield</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Net Payable</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase px-6">Settlement Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSalaries.map((s: SalaryRecord) => (
              <TableRow key={s.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                <TableCell className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 border border-slate-700">
                       <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-100">{s.employeeName}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">{s.employeeId} • {s.month}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">{s.attendanceDays} Worked Days</span>
                      <span className="text-[8px] text-slate-600 uppercase font-black">Base: ₹{s.baseSalary.toLocaleString()}</span>
                   </div>
                </TableCell>
                <TableCell>
                   <p className="text-lg font-code font-bold text-blue-400">₹{s.netPayable.toLocaleString()}</p>
                </TableCell>
                <TableCell className="text-right px-6">
                   <div className="flex items-center justify-end gap-3">
                      <Button variant="ghost" size="icon" onClick={() => handlePrintSlip(s)} className="h-8 w-8 text-slate-400 hover:text-white"><Printer className="w-4 h-4" /></Button>
                      <Select value={s.paymentStatus} onValueChange={(v: any) => store.updateSalary({ ...s, paymentStatus: v })}>
                         <SelectTrigger className={cn(
                           "h-9 text-[9px] font-black uppercase border-0 w-28",
                           s.paymentStatus === 'Paid' ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                         )}>
                            <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="bg-slate-900 border-slate-800">
                            <SelectItem value="Pending">Pending Audit</SelectItem>
                            <SelectItem value="Paid">Confirmed Paid</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSalaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center text-slate-700 font-medium italic">
                  No records found. Run the calculation matrix for active associates.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center gap-2 p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
         <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
         <p className="text-[10px] text-slate-500 italic">GJ5 ERP Payroll Logic: 30-day base cycle is used for all calculations. Manual adjustments can be made via the Wallet Module if required.</p>
      </div>
    </div>
  );
}

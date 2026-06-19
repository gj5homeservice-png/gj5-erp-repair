"use client"

import React, { useState, useMemo } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Download, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  LogIn,
  LogOut,
  History,
  FileText,
  UserCheck,
  AlertCircle,
  Filter,
  Trash2
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
import { format, parseISO, differenceInMinutes, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceRecord, Employee, AttendanceStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DeleteJobModal } from './repairing/DeleteJobModal';

export function AttendanceModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [monthFilter, setMonthFilter] = useState(format(new Date(), 'MMMM'));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const activeEmployees = useMemo(() => store.employees.filter((e: Employee) => e.status === 'Active'), [store.employees]);

  const filteredAttendance = useMemo(() => {
    return (store.attendance || []).filter((a: AttendanceRecord) => {
      const matchesSearch = a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = a.date === dateFilter;
      return matchesSearch && matchesDate;
    }).sort((a: any, b: any) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [store.attendance, searchQuery, dateFilter]);

  const stats = useMemo(() => {
    const todayRecs = store.attendance.filter((a: any) => a.date === dateFilter);
    const present = todayRecs.filter((a: any) => ['Present', 'Checked In', 'Checked Out', 'Late'].includes(a.status)).length;
    const late = todayRecs.filter((a: any) => a.status === 'Late').length;
    const absent = Math.max(0, activeEmployees.length - present);
    return { total: activeEmployees.length, present, late, absent };
  }, [store.attendance, dateFilter, activeEmployees]);

  const handleCheckIn = (emp: Employee) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const existing = store.attendance.find((a: any) => a.employeeId === emp.employeeId && a.date === today);
    
    if (existing) {
      toast({ variant: "destructive", title: "Already Checked In", description: `${emp.name} has already logged entry for today.` });
      return;
    }

    const now = new Date();
    const shiftStart = new Date();
    shiftStart.setHours(10, 0, 0); // 10:00 AM shift start

    const status: AttendanceStatus = now > shiftStart ? 'Late' : 'Checked In';

    const newRecord: AttendanceRecord = {
      id: `ATT-${emp.employeeId}-${Date.now()}`,
      employeeId: emp.employeeId,
      employeeName: emp.name,
      mobile: emp.mobile,
      checkIn: now.toISOString(),
      date: today,
      workHours: '--',
      status: status
    };

    store.addAttendance(newRecord);
    toast({ title: "Checked In", description: `${emp.name} marked as ${status} at ${format(now, 'hh:mm a')}.` });
  };

  const handleCheckOut = (emp: Employee) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const record = store.attendance.find((a: any) => a.employeeId === emp.employeeId && a.date === today && !a.checkOut);

    if (!record) {
      toast({ variant: "destructive", title: "No Entry", description: `No active check-in session found for ${emp.name}.` });
      return;
    }

    const now = new Date();
    const inTime = parseISO(record.checkIn);
    const diffMinutes = differenceInMinutes(now, inTime);
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const workHours = `${hours}h ${mins}m`;

    const updatedRecord: AttendanceRecord = {
      ...record,
      checkOut: now.toISOString(),
      workHours,
      status: record.status === 'Late' ? 'Late' : 'Present'
    };

    store.updateAttendance(updatedRecord);
    toast({ title: "Checked Out", description: `${emp.name} logged out. Total Work: ${workHours}.` });
  };

  const exportExcel = () => {
    const data = filteredAttendance.map((a: AttendanceRecord) => ({
      Date: a.date,
      ID: a.employeeId,
      Name: a.employeeName,
      Mobile: a.mobile,
      'Check In': a.checkIn ? format(parseISO(a.checkIn), 'hh:mm a') : '--',
      'Check Out': a.checkOut ? format(parseISO(a.checkOut), 'hh:mm a') : '--',
      'Work Hours': a.workHours,
      Status: a.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_Report_${dateFilter}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Daily Attendance Report: ${dateFilter}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Present: ${stats.present} | Absent: ${stats.absent} | Late: ${stats.late}`, 14, 30);
    
    let y = 45;
    doc.setFontSize(10);
    doc.text("ID", 14, y);
    doc.text("Name", 40, y);
    doc.text("In", 100, y);
    doc.text("Out", 130, y);
    doc.text("Status", 160, y);
    doc.line(14, y + 2, 200, y + 2);
    
    y += 10;
    filteredAttendance.forEach(a => {
      doc.text(a.employeeId, 14, y);
      doc.text(a.employeeName, 40, y);
      doc.text(a.checkIn ? format(parseISO(a.checkIn), 'hh:mm a') : '--', 100, y);
      doc.text(a.checkOut ? format(parseISO(a.checkOut), 'hh:mm a') : '--', 130, y);
      doc.text(a.status, 160, y);
      y += 8;
    });
    
    doc.save(`Attendance_${dateFilter}.pdf`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-500/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Attendance Monitoring</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Workforce Reconciliation Node</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="bg-slate-950 border-slate-800 h-10 w-40 text-xs font-bold" 
          />
          <Button onClick={exportPDF} variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button onClick={exportExcel} variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <FileText className="w-4 h-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Roster', value: stats.total, sub: 'Total Employees', icon: History, color: 'text-blue-400' },
          { label: 'Present Today', value: stats.present, sub: 'Confirmed Shift', icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Absent Count', value: stats.absent, sub: 'Registry Variance', icon: XCircle, color: 'text-rose-400' },
          { label: 'Late Entries', value: stats.late, sub: 'Needs Audit', icon: AlertCircle, color: 'text-amber-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-lg">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <h3 className={cn("text-2xl font-headline font-bold", s.color)}>{s.value}</h3>
                <p className="text-[9px] text-slate-600 font-bold uppercase">{s.sub}</p>
              </div>
              <div className={cn("p-3 bg-slate-950 rounded-xl", s.color)}><s.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
           <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                 <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-emerald-400" /> Active Shift Console
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
                 <div className="divide-y divide-slate-800">
                    {activeEmployees.map(emp => {
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const att = store.attendance.find((a: any) => a.employeeId === emp.employeeId && a.date === todayStr);
                      const isCheckedIn = att && !att.checkOut;
                      const isCheckedOut = att && att.checkOut;

                      return (
                        <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-blue-400">
                                 {emp.name[0]}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold">{emp.name}</span>
                                 <span className="text-[9px] text-slate-500 uppercase">{emp.designation}</span>
                              </div>
                           </div>
                           <div className="flex gap-1.5">
                              {!isCheckedIn && !isCheckedOut && (
                                <Button size="sm" onClick={() => handleCheckIn(emp)} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-[9px] uppercase font-bold">In</Button>
                              )}
                              {isCheckedIn && (
                                <Button size="sm" onClick={() => handleCheckOut(emp)} className="bg-rose-600 hover:bg-rose-700 h-8 text-[9px] uppercase font-bold">Out</Button>
                              )}
                              {isCheckedOut && (
                                <Badge className="bg-slate-800 text-[8px] uppercase border-0 h-8 px-2 flex items-center">Done</Badge>
                              )}
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
              <div className="relative w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                 <Input 
                   placeholder="Search ID, Name..." 
                   value={searchQuery} 
                   onChange={e => setSearchQuery(e.target.value)} 
                   className="pl-10 bg-slate-950 border-slate-800 h-10" 
                 />
              </div>
           </div>

           <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-slate-900/60">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-[10px] font-bold uppercase px-4">Employee</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Time Logs</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Work Hours</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase px-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((rec: AttendanceRecord) => (
                    <TableRow key={rec.id} className="border-slate-800/50 hover:bg-slate-800/20">
                      <TableCell className="px-4">
                        <div className="flex flex-col">
                           <span className="font-bold text-xs">{rec.employeeName}</span>
                           <span className="text-[9px] text-slate-500 font-code">{rec.employeeId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-emerald-400 font-bold uppercase">IN: {rec.checkIn ? format(parseISO(rec.checkIn), 'hh:mm a') : '--'}</span>
                            {rec.checkOut && <span className="text-[9px] text-rose-400 font-bold uppercase">OUT: {format(parseISO(rec.checkOut), 'hh:mm a')}</span>}
                         </div>
                      </TableCell>
                      <TableCell>
                         <span className="font-code font-bold text-xs text-blue-400">{rec.workHours}</span>
                      </TableCell>
                      <TableCell className="text-right px-4">
                         <Badge className={cn("text-[8px] uppercase px-1.5", 
                           rec.status === 'Present' ? "bg-emerald-500/10 text-emerald-400" : 
                           rec.status === 'Late' ? "bg-amber-500/10 text-amber-400" : 
                           rec.status === 'Checked In' ? "bg-blue-500/10 text-blue-400 animate-pulse" : 
                           "bg-rose-500/10 text-rose-400"
                         )}>
                            {rec.status}
                         </Badge>
                         <Button variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)} className="h-7 w-7 text-rose-500 ml-2"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAttendance.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-600 text-xs italic">No logs committed for this date.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
           </div>
        </div>
      </div>

      <DeleteJobModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        jobId={store.attendance.find((a: any) => a.id === deleteId)?.employeeName || ''} 
        onConfirm={() => { if (deleteId) store.deleteAttendance(deleteId); setDeleteId(null); }} 
      />
    </div>
  );
}

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
  Trash2,
  MapPin,
  QrCode,
  ShieldCheck,
  MessageSquare,
  Share2
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
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceRecord, Employee, AttendanceStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DeleteJobModal } from './repairing/DeleteJobModal';

export function AttendanceModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const activeEmployees = useMemo(() => store.employees.filter((e: Employee) => e.status === 'Active'), [store.employees]);

  const filteredAttendance = useMemo(() => {
    return (store.attendance || []).filter((a: AttendanceRecord) => {
      const matchesSearch = a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = a.date === dateFilter;
      return matchesSearch && matchesDate;
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      toast({ variant: "destructive", title: "Already Logged", description: `${emp.name} has already logged for today.` });
      return;
    }

    // GPS CAPTURE
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const now = new Date();
      const shiftStart = new Date();
      shiftStart.setHours(10, 0, 0); 

      const status: AttendanceStatus = now > shiftStart ? 'Late' : 'Checked In';

      const newRecord: AttendanceRecord = {
        id: `ATT-${emp.employeeId}-${Date.now()}`,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        mobile: emp.mobile,
        checkIn: now.toISOString(),
        date: today,
        workHours: '--',
        overtime: '0h',
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        status: status,
        createdAt: new Date().toISOString(),
        attendanceType: 'Manual'
      };

      store.addAttendance(newRecord);
      toast({ title: "Check-In Success", description: `${emp.name} marked ${status} at ${format(now, 'hh:mm a')}. GPS Captured.` });
    }, () => {
      toast({ variant: "destructive", title: "GPS Error", description: "Identity verification requires location access." });
    });
  };

  const handleCheckOut = (emp: Employee) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const record = store.attendance.find((a: any) => a.employeeId === emp.employeeId && a.date === today && !a.checkOut);

    if (!record) {
      toast({ variant: "destructive", title: "No Entry", description: `No active check-in found for ${emp.name}.` });
      return;
    }

    const now = new Date();
    const inTime = parseISO(record.checkIn!);
    const diffMinutes = differenceInMinutes(now, inTime);
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const workHours = `${hours}h ${mins}m`;

    const updatedRecord: AttendanceRecord = {
      ...record,
      checkOut: now.toISOString(),
      workHours,
      status: 'Checked Out'
    };

    store.updateAttendance(updatedRecord);
    toast({ title: "Check-Out Success", description: `${emp.name} session closed. Work Hours: ${workHours}.` });
  };

  const handleSendWhatsAppLink = (emp: Employee) => {
    const token = store.generateAttendanceLink(emp);
    const origin = window.location.origin;
    const attendanceUrl = `${origin}/attendance/${token}`;
    
    const msg = `🔐 *GJ5 Secure Attendance Access*\n\nHello ${emp.name},\n\nUse the link below to mark your Check-In/Out. \n\n🔗 ${attendanceUrl}\n\n⚠️ *Expires in 30 seconds.* One-time use only.\n📍 GPS verification active.`;
    
    const whatsappUrl = `https://web.whatsapp.com/send?phone=91${emp.mobile}&text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({ title: "Secure Link Dispatched", description: `Attendance token sent to ${emp.name}'s WhatsApp.` });
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
      Status: a.status,
      Type: a.attendanceType || 'Manual',
      Location: `${a.latitude},${a.longitude}`,
      IP: a.ipAddress || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `GJ5_Attendance_${dateFilter}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Daily Attendance Audit: ${dateFilter}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Verified Nodes: ${stats.present} | Absentees: ${stats.absent} | Late Flag: ${stats.late}`, 14, 30);
    
    let y = 45;
    doc.text("Name", 14, y);
    doc.text("In", 80, y);
    doc.text("Out", 120, y);
    doc.text("Status", 160, y);
    doc.line(14, y + 2, 200, y + 2);
    
    y += 10;
    filteredAttendance.forEach(a => {
      doc.text(a.employeeName, 14, y);
      doc.text(a.checkIn ? format(parseISO(a.checkIn), 'hh:mm a') : '--', 80, y);
      doc.text(a.checkOut ? format(parseISO(a.checkOut), 'hh:mm a') : '--', 120, y);
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
            <h2 className="text-xl md:text-2xl font-headline font-bold">Attendance Reconciliation</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Industrial Workforce Sync V3.2</p>
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
          { label: 'Active Roster', value: stats.total, sub: 'Total Staff', icon: History, color: 'text-blue-400' },
          { label: 'Verified In', value: stats.present, sub: 'Present Today', icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Registry Gap', value: stats.absent, sub: 'Absentees', icon: XCircle, color: 'text-rose-400' },
          { label: 'Late Trigger', value: stats.late, sub: 'After 10:00 AM', icon: AlertCircle, color: 'text-amber-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-lg">
            <CardContent className="p-5 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <h3 className={cn("text-2xl font-headline font-bold", s.color)}>{s.value}</h3>
                <p className="text-[9px] text-slate-600 font-bold uppercase">{s.sub}</p>
              </div>
              <div className={cn("p-3 bg-slate-950 rounded-xl shadow-inner", s.color)}><s.icon className="w-5 h-5" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
           <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                 <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-emerald-400" /> Biometric Shift Console
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
                              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-blue-500 overflow-hidden border border-slate-700">
                                 {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} /> : emp.name[0]}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold text-slate-100">{emp.name}</span>
                                 <span className="text-[9px] text-slate-500 uppercase font-black">{emp.designation}</span>
                              </div>
                           </div>
                           <div className="flex gap-1.5">
                              {!att && (
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => handleSendWhatsAppLink(emp)} className="h-9 w-9 text-blue-400 hover:bg-blue-500/10" title="Send WhatsApp Access Link"><Share2 className="w-4 h-4" /></Button>
                                  <Button size="sm" onClick={() => handleCheckIn(emp)} className="bg-emerald-600 hover:bg-emerald-700 h-9 px-4 text-[10px] font-black uppercase shadow-lg shadow-emerald-500/10">IN</Button>
                                </div>
                              )}
                              {isCheckedIn && (
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => handleSendWhatsAppLink(emp)} className="h-9 w-9 text-blue-400 hover:bg-blue-500/10" title="Send WhatsApp Access Link"><Share2 className="w-4 h-4" /></Button>
                                  <Button size="sm" onClick={() => handleCheckOut(emp)} className="bg-rose-600 hover:bg-rose-700 h-9 px-4 text-[10px] font-black uppercase shadow-lg shadow-rose-500/10">OUT</Button>
                                </div>
                              )}
                              {isCheckedOut && (
                                <Badge className="bg-slate-800 text-slate-500 text-[9px] uppercase border-0 h-9 px-3 flex items-center">SHIFT DONE</Badge>
                              )}
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </CardContent>
           </Card>
           
           <Card className="bg-blue-600/5 border-blue-600/20 border-dashed">
              <CardContent className="p-5 flex items-start gap-4">
                 <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
                 <p className="text-[10px] text-slate-400 italic leading-relaxed">Identity Integrity Protocol Active. GPS Geolocation and Secure Tokens are required for all check-in nodes. All metadata is committed to the Master Audit Ledger.</p>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
              <div className="relative w-full">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                 <Input 
                   placeholder="Search ID, Associate Name..." 
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
                    <TableHead className="text-[10px] font-black uppercase px-6">Associate Node</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Session Timeline</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Yield (Hours)</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase px-6">Identity Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((rec: AttendanceRecord) => (
                    <TableRow key={rec.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                      <TableCell className="px-6">
                        <div className="flex flex-col">
                           <span className="font-bold text-sm text-slate-100">{rec.employeeName}</span>
                           <div className="flex items-center gap-2">
                             <span className="text-[9px] text-slate-500 font-code font-bold uppercase">{rec.employeeId}</span>
                             <Badge variant="outline" className="text-[7px] uppercase h-3 px-1 border-slate-800">{rec.attendanceType || 'Manual'}</Badge>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">IN: {rec.checkIn ? format(parseISO(rec.checkIn), 'hh:mm a') : '--'}</span>
                            {rec.checkOut && <span className="text-[10px] text-rose-400 font-bold uppercase">OUT: {format(parseISO(rec.checkOut), 'hh:mm a')}</span>}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span className="font-code font-bold text-sm text-blue-400">{rec.workHours}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                         <div className="flex items-center justify-end gap-3">
                            {rec.latitude && (
                               <a href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`} target="_blank" className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                  <MapPin className="w-3.5 h-3.5" />
                               </a>
                            )}
                            <Badge className={cn("text-[9px] font-black uppercase px-2 h-5 border-0", 
                              rec.status === 'Checked Out' ? "bg-emerald-500/10 text-emerald-400" : 
                              rec.status === 'Late' ? "bg-amber-500/10 text-amber-500" : 
                              rec.status === 'Checked In' ? "bg-blue-500/10 text-blue-400 animate-pulse" : 
                              "bg-rose-500/10 text-rose-400"
                            )}>
                               {rec.status}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(rec.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAttendance.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-700 text-xs italic">No session logs committed for this temporal node.</TableCell></TableRow>
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

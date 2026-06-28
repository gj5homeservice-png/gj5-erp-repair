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
  UserCheck,
  AlertCircle,
  Trash2,
  MapPin,
  ShieldCheck,
  Share2,
  Eye,
  Camera,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceRecord, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { DeleteJobModal } from './repairing/DeleteJobModal';

// Replace with your production domain for external links
const PRODUCTION_URL = "https://gj5-erp.web.app"; 

export function AttendanceModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<AttendanceRecord | null>(null);
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
    const present = todayRecs.filter((a: any) => ['Checked In', 'Checked Out', 'Late', 'Half Day'].includes(a.status)).length;
    const late = todayRecs.filter((a: any) => a.status === 'Late').length;
    const checkedInCount = todayRecs.filter((a: any) => a.status !== 'Checked Out' && !!a.checkIn).length;
    const checkOutPending = todayRecs.filter((a: any) => !a.checkOut && !!a.checkIn).length;
    const absent = Math.max(0, activeEmployees.length - present);
    return { total: activeEmployees.length, present, late, absent, checkedInCount, checkOutPending };
  }, [store.attendance, dateFilter, activeEmployees]);

  const handleSendWhatsAppLink = (emp: Employee) => {
    const token = store.generateAttendanceLink(emp);
    
    const isMobileApp = typeof window !== 'undefined' && (window as any).Capacitor;
    const baseUrl = isMobileApp ? PRODUCTION_URL : window.location.origin;
    
    const attendanceUrl = `${baseUrl}/attendance?token=${token}`;
    
    const msg = `🔐 *GJ5 ERP Secure Attendance Access*\n\nHello ${emp.name},\n\nIdentity verification required for shift entry. Click below for GPS + Selfie proof.\n\n🔗 ${attendanceUrl}\n\n⚠️ *Expires in 2 minutes.* Powered by GJ5 ERP.`;
    
    const whatsappUrl = `https://wa.me/91${emp.mobile}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    
    toast({ title: "Smart Link Dispatched", description: `Secure token sent to ${emp.name}.` });
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
      Address: a.address || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `GJ5_ERP_Attendance_${dateFilter}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#123C8C] rounded-xl text-white shadow-lg shadow-blue-900/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Secure Attendance Matrix</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">GJ5 ERP ID PROTOCOL V4.0</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="bg-slate-950 border-slate-800 h-10 w-40 text-xs font-bold" 
          />
          <Button onClick={exportExcel} variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <Download className="w-4 h-4 mr-2" /> Export Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Active Roster', value: stats.total, sub: 'Total Staff', icon: History, color: 'text-blue-400' },
          { label: 'Verified Presence', value: stats.present, sub: 'Today Active', icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Unlogged Nodes', value: stats.absent, sub: 'Absentees', icon: XCircle, color: 'text-rose-400' },
          { label: 'Late Flags', value: stats.late, sub: 'Post 10:00 AM', icon: AlertCircle, color: 'text-amber-400' },
          { label: 'On Shift', value: stats.checkedInCount, sub: 'Check-In Active', icon: Navigation, color: 'text-indigo-400' },
          { label: 'Pending End', value: stats.checkOutPending, sub: 'Wait Check-Out', icon: Clock, color: 'text-orange-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-lg group hover:border-blue-900/30 transition-all">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-bold text-slate-500 uppercase">{s.label}</p>
                <div className={cn("p-1.5 rounded-lg bg-slate-950", s.color)}><s.icon className="w-3.5 h-3.5" /></div>
              </div>
              <div>
                <h3 className={cn("text-xl font-headline font-bold", s.color)}>{s.value}</h3>
                <p className="text-[8px] text-slate-600 font-bold uppercase">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
           <Card className="bg-slate-900/40 border-slate-800">
              <CardHeader className="p-5 border-b border-slate-800">
                 <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#123C8C]" /> Link Dispatch
                 </CardTitle>
                 <CardDescription className="text-[10px] text-slate-500 uppercase font-bold">GOOD JOB 5 ERP PROTOCOL</CardDescription>
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
                              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-[#123C8C] overflow-hidden border border-slate-700">
                                 {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} /> : emp.name[0]}
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-xs font-bold text-slate-100">{emp.name}</span>
                                 <span className="text-[9px] text-slate-500 uppercase font-black">{emp.designation}</span>
                              </div>
                           </div>
                           <div className="flex gap-1.5">
                              {!att && (
                                <Button size="sm" onClick={() => handleSendWhatsAppLink(emp)} className="bg-[#123C8C] hover:bg-[#0D2E63] h-9 px-4 text-[10px] font-black uppercase shadow-lg">
                                   <Share2 className="w-3.5 h-3.5 mr-2" /> SEND LINK
                                </Button>
                              )}
                              {isCheckedIn && (
                                <Button size="sm" onClick={() => handleSendWhatsAppLink(emp)} variant="outline" className="border-orange-500/30 text-orange-500 h-9 px-4 text-[10px] font-black uppercase">
                                   <Clock className="w-3.5 h-3.5 mr-2" /> RE-AUTH
                                </Button>
                              )}
                              {isCheckedOut && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 text-[8px] uppercase border-0 h-9 px-3 flex items-center">SHIFT DONE</Badge>
                              )}
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </CardContent>
           </Card>
           
           <Card className="bg-[#123C8C]/5 border-[#123C8C]/20 border-dashed">
              <CardContent className="p-5 space-y-4">
                 <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#123C8C] shrink-0" />
                    <h4 className="text-xs font-bold uppercase text-[#123C8C]">GJ5 ERP Integrity</h4>
                 </div>
                 <p className="text-[10px] text-slate-400 italic leading-relaxed">Identity Integrity Protocol Active. Remote biometric proofs (Selfie) and Geospatial node verification are mandatory. Attempts to share links are logged as security breaches.</p>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
           <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-slate-900/60">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase px-6">Associate Node</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Timeline</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Proof</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase px-6">Audit Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.map((rec: AttendanceRecord) => (
                    <TableRow key={rec.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                      <TableCell className="px-6">
                        <div className="flex flex-col">
                           <span className="font-bold text-sm text-slate-100">{rec.employeeName}</span>
                           <span className="text-[9px] text-slate-500 font-code font-bold uppercase">{rec.employeeId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">IN: {rec.checkIn ? format(parseISO(rec.checkIn), 'hh:mm a') : '--'}</span>
                            {rec.checkOut && <span className="text-[10px] text-rose-400 font-bold uppercase">OUT: {format(parseISO(rec.checkOut), 'hh:mm a')}</span>}
                         </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex gap-2">
                            {rec.selfieCheckIn && (
                               <button onClick={() => setViewingRecord(rec)} className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden border border-slate-700 hover:scale-110 transition-transform">
                                  <img src={rec.selfieCheckIn} className="w-full h-full object-cover" alt="Proof" />
                               </button>
                            )}
                            <div className="flex items-center gap-1 text-blue-400">
                               <Clock className="w-3.5 h-3.5" />
                               <span className="font-code font-bold text-xs">{rec.workHours}</span>
                            </div>
                         </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                         <div className="flex items-center justify-end gap-3">
                            <Badge className={cn("text-[9px] font-black uppercase px-2 h-5 border-0", 
                              rec.status === 'Checked Out' ? "bg-emerald-500/10 text-emerald-400" : 
                              rec.status === 'Late' ? "bg-amber-500/10 text-amber-500" : 
                              rec.status === 'Checked In' ? "bg-blue-500/10 text-blue-400 animate-pulse" : 
                              "bg-rose-500/10 text-rose-400"
                            )}>
                               {rec.status}
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => setViewingRecord(rec)} className="h-8 w-8 text-blue-400"><Eye className="w-4 h-4" /></Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </div>
        </div>
      </div>

      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(null)}>
         <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#123C8C] flex items-center justify-center text-white shadow-lg">
                     <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                     <DialogTitle className="text-xl font-headline font-bold">Manifest Audit Node</DialogTitle>
                     <DialogDescription className="text-[10px] text-slate-500 uppercase font-black tracking-widest">GOOD JOB 5 ERP FORENSICS</DialogDescription>
                  </div>
               </div>
            </DialogHeader>

            {viewingRecord && (
               <div className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-black text-slate-500">Check-In Biometric</Label>
                           <div className="aspect-[4/3] rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden">
                              <img src={viewingRecord.selfieCheckIn} className="w-full h-full object-cover scale-x-[-1]" alt="Check In Selfie" />
                           </div>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <div className="space-y-1">
                           <Label className="text-[10px] uppercase font-black text-slate-500">Associate Authority</Label>
                           <h4 className="text-lg font-bold">{viewingRecord.employeeName}</h4>
                           <p className="text-xs text-[#123C8C] font-code">{viewingRecord.employeeId}</p>
                        </div>
                        <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                           <span className="text-[9px] font-black uppercase text-slate-600">Location Node</span>
                           <p className="text-[11px] text-slate-300 leading-relaxed">{viewingRecord.address}</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}
            
            <DialogFooter className="p-6 border-t border-slate-800 bg-slate-900/50">
               <Button variant="ghost" onClick={() => setViewingRecord(null)} className="px-8 font-bold uppercase text-[10px]">Close Node</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}

"use client"

import React, { useState, useMemo } from 'react';
import { 
  CalendarCheck, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User,
  MapPin,
  Camera,
  ChevronRight,
  TrendingUp,
  History
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
import { format, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceRecord, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function AttendanceModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();

  const stats = useMemo(() => {
    const todayRecs = store.attendance.filter((a: any) => a.date === dateFilter);
    const present = todayRecs.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
    const late = todayRecs.filter((a: any) => a.status === 'Late').length;
    const activeEmps = store.employees.filter((e: any) => e.status === 'Active').length;
    const absent = Math.max(0, activeEmps - present);
    const attPct = activeEmps > 0 ? Math.round((present / activeEmps) * 100) : 0;

    return { present, late, absent, attPct, activeEmps };
  }, [store.attendance, store.employees, dateFilter]);

  const filteredAttendance = useMemo(() => {
    return store.attendance.filter((a: AttendanceRecord) => {
      const matchesSearch = a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchesDate = a.date === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [store.attendance, searchQuery, statusFilter, dateFilter]);

  const exportReport = () => {
    const data = store.attendance.map((a: AttendanceRecord) => ({
      Date: a.date,
      ID: a.employeeId,
      Name: a.employeeName,
      Status: a.status,
      In_Time: a.clockInTime,
      Out_Time: a.clockOutTime || '--',
      Hours: a.totalHours || 0,
      Location: a.location || 'Surat HQ'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance_Master");
    XLSX.writeFile(wb, `GJ5_Attendance_Report_${format(new Date(), 'dd_MMM')}.xlsx`);
    toast({ title: "Report Exported", description: "Attendance master ledger saved to Excel." });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Attendance Monitoring</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Smart Shift Reconciliation Node</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input 
            type="date" 
            value={dateFilter} 
            onChange={e => setDateFilter(e.target.value)} 
            className="bg-slate-950 border-slate-800 h-10 w-40 text-xs font-bold" 
          />
          <Button onClick={exportReport} variant="outline" className="border-slate-800 h-10 text-[10px] uppercase font-bold">
            <Download className="w-4 h-4 mr-2" /> Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Today', value: stats.present, sub: `${stats.attPct}% Participation`, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Late Entries', value: stats.late, sub: 'Needs Audit', icon: Clock, color: 'text-amber-400' },
          { label: 'Absent Count', value: stats.absent, sub: 'Registry Variance', icon: AlertCircle, color: 'text-rose-400' },
          { label: 'Active Roster', value: stats.activeEmps, sub: 'Billable Assets', icon: User, color: 'text-blue-400' },
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

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search by Associate Name or ID..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-slate-950 border-slate-800 h-11" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-slate-950 border-slate-800 h-11 text-xs font-bold uppercase">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="Present">Present Only</SelectItem>
            <SelectItem value="Late">Late Only</SelectItem>
            <SelectItem value="Absent">Absent Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase px-6">Associate Node</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Shift Timeline</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Visual Auth</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Location Audit</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttendance.map((rec: AttendanceRecord) => (
              <TableRow key={rec.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                <TableCell className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-blue-500 border border-slate-700">
                      {rec.employeeName[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-100">{rec.employeeName}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{rec.employeeId}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase">IN: {rec.clockInTime}</span>
                    </div>
                    {rec.clockOutTime ? (
                      <div className="flex items-center gap-2 text-rose-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase">OUT: {rec.clockOutTime}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[8px] uppercase border-slate-800 text-amber-500 animate-pulse w-fit">Active Shift</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                      {rec.clockInPhoto ? <img src={rec.clockInPhoto} className="w-full h-full object-cover" /> : <Camera className="w-3 h-3 text-slate-700" />}
                    </div>
                    {rec.clockOutTime && (
                      <div className="w-8 h-8 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                        {rec.clockOutPhoto ? <img src={rec.clockOutPhoto} className="w-full h-full object-cover" /> : <Camera className="w-3 h-3 text-slate-700" />}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span className="text-[10px] truncate max-w-[120px]">{rec.location || 'Surat Enterprise HQ'}</span>
                   </div>
                </TableCell>
                <TableCell className="text-right px-6">
                  <Badge className={cn("text-[9px] uppercase font-black px-2 py-0.5", 
                    rec.status === 'Present' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                    rec.status === 'Late' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                    "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  )}>
                    {rec.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filteredAttendance.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center text-slate-500 font-medium italic">
                  No attendance data committed for selected parameters.
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
                  <h4 className="font-bold text-slate-100">Monthly Attendance Lifecycle</h4>
                  <p className="text-xs text-slate-500">Full audit trail of check-ins, location captures, and visual identity verification.</p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className="text-center px-6 border-r border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Avg. Present</p>
                  <p className="text-xl font-headline font-bold text-emerald-400">22.4 Days</p>
               </div>
               <div className="text-center px-6">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Avg. Late</p>
                  <p className="text-xl font-headline font-bold text-amber-400">1.2 Shifts</p>
               </div>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
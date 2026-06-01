"use client"

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Camera, 
  Clock, 
  ChevronRight, 
  LogOut, 
  LogIn,
  MoreVertical,
  UserPlus,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function EmployeesModule({ store }: { store: any }) {
  const [isCameraActive, setCameraActive] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [attendanceType, setAttendanceType] = useState<'IN' | 'OUT' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const startCamera = async (type: 'IN' | 'OUT') => {
    if (!selectedStaff) return;
    setAttendanceType(type);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Denied", description: "Allow camera permissions." });
    }
  };

  const capturePhoto = () => {
    const employee = store.employees.find((e:any) => e.id === selectedStaff);
    store.updateAttendance({
      id: `ATT-${selectedStaff}-${Date.now()}`,
      employeeId: selectedStaff!,
      employeeName: employee?.name || '',
      date: new Date().toLocaleDateString(),
      clockInTime: attendanceType === 'IN' ? new Date().toLocaleTimeString() : '',
      clockInPhoto: 'https://picsum.photos/seed/face1/100/100',
      clockOutTime: attendanceType === 'OUT' ? new Date().toLocaleTimeString() : null,
      clockOutPhoto: attendanceType === 'OUT' ? 'https://picsum.photos/seed/face2/100/100' : null
    });
    stopCamera();
  };

  const stopCamera = () => {
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-1 bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800 p-4 md:p-6">
             <CardTitle className="flex items-center gap-2 font-headline text-base md:text-lg">
                <Camera className="w-5 h-5 text-[#0066FF]" />
                Face-Sync Verification
             </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-6">
             {!isCameraActive ? (
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Profile</label>
                     <select 
                       className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 outline-none focus:ring-1 ring-[#0066FF]"
                       onChange={e => setSelectedStaff(e.target.value)}
                       value={selectedStaff || ''}
                     >
                        <option value="">Choose Technician...</option>
                        {store.employees.map((emp:any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                     <Button 
                       disabled={!selectedStaff}
                       onClick={() => startCamera('IN')}
                       className="h-16 md:h-20 rounded-2xl bg-[#0066FF] hover:bg-blue-600 flex flex-col gap-1"
                     >
                        <LogIn className="w-4 h-4 md:w-5 h-5" />
                        <span className="text-[9px] md:text-xs font-bold uppercase">Clock-In</span>
                     </Button>
                     <Button 
                       disabled={!selectedStaff}
                       onClick={() => startCamera('OUT')}
                       className="h-16 md:h-20 rounded-2xl bg-[#FF3366] hover:bg-rose-600 flex flex-col gap-1"
                     >
                        <LogOut className="w-4 h-4 md:w-5 h-5" />
                        <span className="text-[9px] md:text-xs font-bold uppercase">Clock-Out</span>
                     </Button>
                  </div>
               </div>
             ) : (
               <div className="space-y-4">
                  <div className="aspect-square bg-black rounded-2xl overflow-hidden border-2 border-[#0066FF] relative">
                     <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                  <Button onClick={capturePhoto} className="w-full h-11 bg-[#0066FF] font-bold uppercase">Verify & Punch</Button>
                  <Button variant="ghost" onClick={stopCamera} className="w-full text-xs text-slate-500">Cancel</Button>
               </div>
             )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800 p-4 md:p-6 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-headline text-base md:text-lg">
                 <Users className="w-5 h-5 text-[#FFD700]" />
                 Registry
              </CardTitle>
              <Button size="sm" className="bg-[#0066FF] h-8 md:h-9 text-xs">
                 <UserPlus className="w-4 h-4 md:mr-2" /> <span className="hidden sm:inline">New Hire</span>
              </Button>
           </CardHeader>
           <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                   <TableHeader className="bg-slate-900/60">
                      <TableRow className="border-slate-800">
                         <TableHead className="text-slate-400 text-xs">Employee</TableHead>
                         <TableHead className="text-slate-400 text-xs">Salary</TableHead>
                         <TableHead className="text-right text-slate-400 text-xs">Action</TableHead>
                      </TableRow>
                   </TableHeader>
                   <TableBody>
                      {store.employees.map((emp:any) => (
                        <TableRow key={emp.id} className="border-slate-800/50">
                           <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                 <div className="hidden sm:flex w-9 h-9 rounded-xl bg-slate-800 items-center justify-center font-bold text-[#0066FF] border border-slate-700">
                                    {emp.name[0]}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="font-bold text-slate-100 text-sm truncate">{emp.name}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell className="font-code text-sm">₹{emp.salary}</TableCell>
                           <TableCell className="text-right"><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                   </TableBody>
                </Table>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
         <h3 className="text-lg md:text-xl font-headline font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF3366]" />
            Attendance Ledger
         </h3>
         <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader className="bg-slate-900/60">
                    <TableRow className="border-slate-800">
                       <TableHead className="text-slate-400 text-[10px] md:text-xs">Date</TableHead>
                       <TableHead className="text-slate-400 text-[10px] md:text-xs">Staff</TableHead>
                       <TableHead className="text-slate-400 text-[10px] md:text-xs">Punch-In</TableHead>
                       <TableHead className="text-slate-400 text-[10px] md:text-xs">Punch-Out</TableHead>
                       <TableHead className="text-slate-400 text-[10px] md:text-xs">Status</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {store.attendance.map((att:any) => (
                      <TableRow key={att.id} className="border-slate-800/50">
                         <TableCell className="font-code text-[10px] md:text-xs text-slate-400">{att.date}</TableCell>
                         <TableCell className="font-bold text-xs md:text-sm whitespace-nowrap">{att.employeeName}</TableCell>
                         <TableCell><span className="text-[11px] md:text-sm text-emerald-400 whitespace-nowrap">{att.clockInTime}</span></TableCell>
                         <TableCell>
                            {att.clockOutTime ? (
                               <span className="text-[11px] md:text-sm text-rose-400 whitespace-nowrap">{att.clockOutTime}</span>
                            ) : (
                               <span className="text-[9px] text-slate-600 font-bold uppercase animate-pulse">On Shift</span>
                            )}
                         </TableCell>
                         <TableCell><Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[8px] md:text-[9px]">Present</Badge></TableCell>
                      </TableRow>
                    ))}
                    {store.attendance.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500 text-xs">No records today.</TableCell></TableRow>}
                 </TableBody>
              </Table>
            </div>
         </div>
      </div>
    </div>
  );
}
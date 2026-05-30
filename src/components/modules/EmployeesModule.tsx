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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Camera access denied or unavailable", err.name);
      setCameraActive(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please allow camera permissions in your browser settings to use Face-Sync."
      });
    }
  };

  const capturePhoto = () => {
    const employee = store.employees.find((e:any) => e.id === selectedStaff);
    const dateStr = new Date().toLocaleDateString();
    
    const record = {
      id: `ATT-${selectedStaff}-${Date.now()}`,
      employeeId: selectedStaff!,
      employeeName: employee?.name || '',
      date: dateStr,
      clockInTime: attendanceType === 'IN' ? new Date().toLocaleTimeString() : '',
      clockInPhoto: attendanceType === 'IN' ? 'https://picsum.photos/seed/face1/100/100' : null,
      clockOutTime: attendanceType === 'OUT' ? new Date().toLocaleTimeString() : null,
      clockOutPhoto: attendanceType === 'OUT' ? 'https://picsum.photos/seed/face2/100/100' : null
    };

    store.updateAttendance(record);
    stopCamera();
  };

  const stopCamera = () => {
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800">
             <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <Camera className="w-5 h-5 text-[#0066FF]" />
                Face-Sync Verification
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             {!isCameraActive ? (
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Technician Profile</label>
                     <select 
                       className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                       onChange={e => setSelectedStaff(e.target.value)}
                       value={selectedStaff || ''}
                     >
                        <option value="">Select Name...</option>
                        {store.employees.map((emp:any) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <Button 
                       disabled={!selectedStaff}
                       onClick={() => startCamera('IN')}
                       className="h-20 rounded-2xl bg-[#0066FF] hover:bg-blue-600 flex flex-col gap-1 shadow-lg shadow-blue-500/10"
                     >
                        <LogIn className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-tighter">Clock-In</span>
                     </Button>
                     <Button 
                       disabled={!selectedStaff}
                       onClick={() => startCamera('OUT')}
                       className="h-20 rounded-2xl bg-[#FF3366] hover:bg-rose-600 flex flex-col gap-1 shadow-lg shadow-rose-500/10"
                     >
                        <LogOut className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-tighter">Clock-Out</span>
                     </Button>
                  </div>
               </div>
             ) : (
               <div className="space-y-4 animate-in zoom-in-95">
                  <div className="aspect-square bg-black rounded-2xl overflow-hidden border-2 border-[#0066FF] relative">
                     <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                     <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-64 border-2 border-dashed border-[#FFD700] rounded-3xl"></div>
                     </div>
                     <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-[10px] font-bold uppercase rounded-full">
                        Scan Face...
                     </div>
                  </div>
                  <Button onClick={capturePhoto} className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] rounded-xl font-headline font-bold uppercase">
                     Verify & Punch
                  </Button>
                  <Button variant="ghost" onClick={stopCamera} className="w-full text-slate-500">Cancel</Button>
               </div>
             )}

             <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                   <span className="text-slate-500 font-bold uppercase tracking-widest">Operational Strength</span>
                   <span className="text-emerald-400 font-bold">85% Active</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[85%]"></div>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                 <Users className="w-5 h-5 text-[#FFD700]" />
                 Technician Master Registry
              </CardTitle>
              <Button size="sm" className="bg-[#0066FF] h-9">
                 <UserPlus className="w-4 h-4 mr-2" /> New Hire
              </Button>
           </CardHeader>
           <CardContent className="p-0 overflow-hidden">
              <Table>
                 <TableHeader className="bg-slate-900/60">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                       <TableHead className="font-headline text-slate-400">Employee</TableHead>
                       <TableHead className="font-headline text-slate-400">Designation</TableHead>
                       <TableHead className="font-headline text-slate-400">Salary (Pagar)</TableHead>
                       <TableHead className="font-headline text-slate-400">Daily Base</TableHead>
                       <TableHead className="text-right font-headline text-slate-400">Actions</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {store.employees.map((emp:any) => (
                      <TableRow key={emp.id} className="border-slate-800/50 hover:bg-slate-800/20">
                         <TableCell>
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-[#0066FF] border border-slate-700">
                                  {emp.name.split(' ').map((n:any) => n[0]).join('')}
                               </div>
                               <div>
                                  <p className="font-bold text-slate-100">{emp.name}</p>
                                  <p className="text-[10px] text-slate-500 font-code tracking-tighter">{emp.id} • {emp.mobile}</p>
                               </div>
                            </div>
                         </TableCell>
                         <TableCell>
                            <Badge variant="outline" className="border-slate-700 bg-slate-800/30 text-slate-300">
                               {emp.role}
                            </Badge>
                         </TableCell>
                         <TableCell className="font-code font-bold">₹{emp.salary}</TableCell>
                         <TableCell className="font-code text-slate-400">₹{emp.dailyWage}</TableCell>
                         <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-slate-800"><MoreVertical className="w-4 h-4" /></Button>
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="text-xl font-headline font-bold flex items-center gap-2">
               <Clock className="w-5 h-5 text-[#FF3366]" />
               Daily Attendance Ledger
            </h3>
            <Button variant="ghost" size="sm" className="text-slate-500"><RefreshCw className="w-4 h-4 mr-2" /> Sync Records</Button>
         </div>
         <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
            <Table>
               <TableHeader className="bg-slate-900/60">
                  <TableRow className="border-slate-800 hover:bg-transparent">
                     <TableHead className="font-headline text-slate-400">Date</TableHead>
                     <TableHead className="font-headline text-slate-400">Staff Member</TableHead>
                     <TableHead className="font-headline text-slate-400">Punch-In (Photo)</TableHead>
                     <TableHead className="font-headline text-slate-400">Punch-Out (Photo)</TableHead>
                     <TableHead className="font-headline text-slate-400">Net Shift</TableHead>
                     <TableHead className="font-headline text-slate-400">Status</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {store.attendance.map((att:any) => (
                    <TableRow key={att.id} className="border-slate-800/50">
                       <TableCell className="font-code text-slate-400">{att.date}</TableCell>
                       <TableCell className="font-bold">{att.employeeName}</TableCell>
                       <TableCell>
                          <div className="flex items-center gap-3">
                             {att.clockInPhoto && <img src={att.clockInPhoto} className="w-10 h-10 rounded-lg object-cover border border-slate-700" alt="IN" />}
                             <span className="text-sm font-medium text-emerald-400">{att.clockInTime}</span>
                          </div>
                       </TableCell>
                       <TableCell>
                          <div className="flex items-center gap-3">
                             {att.clockOutPhoto ? (
                               <>
                                 <img src={att.clockOutPhoto} className="w-10 h-10 rounded-lg object-cover border border-slate-700" alt="OUT" />
                                 <span className="text-sm font-medium text-rose-400">{att.clockOutTime}</span>
                               </>
                             ) : (
                               <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest animate-pulse">On Shift...</span>
                             )}
                          </div>
                       </TableCell>
                       <TableCell className="font-code text-slate-300">
                          {att.clockOutTime ? '8h 30m' : '--:--'}
                       </TableCell>
                       <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase text-[9px]">Present</Badge>
                       </TableCell>
                    </TableRow>
                  ))}
                  {store.attendance.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={6} className="h-24 text-center text-slate-500">No punch records found for today.</TableCell>
                    </TableRow>
                  )}
               </TableBody>
            </Table>
         </div>
      </div>
    </div>
  );
}

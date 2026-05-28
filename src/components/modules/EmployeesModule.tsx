"use client"

import React, { useState, useRef } from 'react';
import { 
  Users, 
  Camera, 
  Clock, 
  Calendar, 
  ChevronRight, 
  LogOut, 
  LogIn,
  MoreVertical,
  UserPlus
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

export function EmployeesModule({ store }: { store: any }) {
  const [isCameraActive, setCameraActive] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [attendanceType, setAttendanceType] = useState<'IN' | 'OUT' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async (type: 'IN' | 'OUT') => {
    if (!selectedStaff) return;
    setAttendanceType(type);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
    }
  };

  const capturePhoto = () => {
    // In a real app, capture frame from videoRef
    const newRecord = {
      id: `ATT${Date.now()}`,
      employeeId: selectedStaff!,
      employeeName: store.employees.find((e:any) => e.id === selectedStaff)?.name || '',
      date: new Date().toLocaleDateString(),
      clockInTime: attendanceType === 'IN' ? new Date().toLocaleTimeString() : '09:00 AM',
      clockInPhoto: 'https://picsum.photos/seed/face1/100/100',
      clockOutTime: attendanceType === 'OUT' ? new Date().toLocaleTimeString() : null,
      clockOutPhoto: attendanceType === 'OUT' ? 'https://picsum.photos/seed/face2/100/100' : null
    };

    if (attendanceType === 'IN') {
      store.addAttendance(newRecord);
    } else {
      // Find today's record and update
      store.updateAttendance(newRecord);
    }

    setCameraActive(false);
    // Stop stream
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Controls */}
        <Card className="lg:col-span-1 bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800">
             <CardTitle className="flex items-center gap-2 font-headline">
                <Camera className="w-5 h-5 text-[#0066FF]" />
                Face-Sync Attendance
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             {!isCameraActive ? (
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">Select Employee</label>
                     <select 
                       className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100"
                       onChange={e => setSelectedStaff(e.target.value)}
                       value={selectedStaff || ''}
                     >
                        <option value="">Choose technician...</option>
                        {store.employees.map((emp:any) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <Button 
                       disabled={!selectedStaff}
                       onClick={() => startCamera('IN')}
                       className="h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex flex-col gap-1"
                     >
                        <LogIn className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase">Clock-In</span>
                     </Button>
                     <Button 
                       disabled={!selectedStaff}
                       onClick={() => startCamera('OUT')}
                       className="h-16 rounded-2xl bg-[#FF3366] hover:bg-rose-600 flex flex-col gap-1"
                     >
                        <LogOut className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase">Clock-Out</span>
                     </Button>
                  </div>
               </div>
             ) : (
               <div className="space-y-4 animate-in zoom-in-95">
                  <div className="aspect-square bg-black rounded-2xl overflow-hidden border-2 border-[#0066FF] relative">
                     <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                     <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-64 border-2 border-dashed border-[#FFD700] rounded-full"></div>
                     </div>
                  </div>
                  <Button onClick={capturePhoto} className="w-full h-12 bg-[#0066FF] hover:bg-[#0052CC] rounded-xl font-headline font-bold uppercase">
                     Capture & Verify
                  </Button>
                  <Button variant="ghost" onClick={() => setCameraActive(false)} className="w-full">Cancel</Button>
               </div>
             )}

             <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                   <span className="text-slate-500 font-bold uppercase tracking-widest">Active Shift</span>
                   <span className="text-[#10B981] font-bold">1/2 On Field</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full bg-[#10B981] w-1/2"></div>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-headline">
                 <Users className="w-5 h-5 text-[#FFD700]" />
                 Staff Master Registry
              </CardTitle>
              <Button size="sm" className="bg-[#0066FF] h-9">
                 <UserPlus className="w-4 h-4 mr-2" /> Add Staff
              </Button>
           </CardHeader>
           <CardContent className="p-0 overflow-hidden">
              <Table>
                 <TableHeader className="bg-slate-900/60">
                    <TableRow className="border-slate-800">
                       <TableHead>Employee</TableHead>
                       <TableHead>Role</TableHead>
                       <TableHead>Base Salary</TableHead>
                       <TableHead>Attendance Score</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                    {store.employees.map((emp:any) => (
                      <TableRow key={emp.id} className="border-slate-800/50 hover:bg-slate-800/20">
                         <TableCell>
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[#0066FF]">
                                  {emp.name.split(' ').map((n:any) => n[0]).join('')}
                               </div>
                               <div>
                                  <p className="font-bold">{emp.name}</p>
                                  <p className="text-xs text-slate-500 font-code">{emp.id}</p>
                               </div>
                            </div>
                         </TableCell>
                         <TableCell>
                            <Badge variant="outline" className="border-slate-700 bg-slate-800/30 text-slate-300">
                               {emp.role}
                            </Badge>
                         </TableCell>
                         <TableCell>
                            <div className="font-code">₹{emp.salary}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Daily: ₹{emp.dailyWage}</div>
                         </TableCell>
                         <TableCell>
                            <div className="flex items-center gap-2">
                               <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden w-24">
                                  <div className="h-full bg-[#FFD700] w-[95%]"></div>
                               </div>
                               <span className="text-[10px] font-bold">95%</span>
                            </div>
                         </TableCell>
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
         <h3 className="text-xl font-headline font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF3366]" />
            Attendance Ledger Table
         </h3>
         <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
            <Table>
               <TableHeader className="bg-slate-900/60">
                  <TableRow className="border-slate-800">
                     <TableHead>Date</TableHead>
                     <TableHead>Employee</TableHead>
                     <TableHead>Punch-In</TableHead>
                     <TableHead>Punch-Out</TableHead>
                     <TableHead>Shift Duration</TableHead>
                     <TableHead>Status</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {store.attendance.map((att:any) => (
                    <TableRow key={att.id} className="border-slate-800/50">
                       <TableCell className="font-code text-slate-400">{att.date}</TableCell>
                       <TableCell className="font-bold">{att.employeeName}</TableCell>
                       <TableCell>
                          <div className="flex items-center gap-3">
                             <img src={att.clockInPhoto} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                             <span className="text-sm font-medium">{att.clockInTime}</span>
                          </div>
                       </TableCell>
                       <TableCell>
                          <div className="flex items-center gap-3">
                             {att.clockOutPhoto ? (
                               <>
                                 <img src={att.clockOutPhoto} className="w-10 h-10 rounded-lg object-cover border border-slate-800" />
                                 <span className="text-sm font-medium">{att.clockOutTime}</span>
                               </>
                             ) : (
                               <span className="text-xs text-slate-600 uppercase font-bold tracking-widest animate-pulse">On Shift...</span>
                             )}
                          </div>
                       </TableCell>
                       <TableCell className="font-code text-slate-300">
                          {att.clockOutTime ? '8h 12m' : '--:--'}
                       </TableCell>
                       <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Present</Badge>
                       </TableCell>
                    </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
      </div>
    </div>
  );
}

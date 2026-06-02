"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Users, 
  Camera, 
  Clock, 
  ChevronRight, 
  LogOut, 
  LogIn,
  MoreVertical,
  UserPlus,
  RefreshCw,
  LayoutDashboard,
  ShieldCheck,
  QrCode,
  Keyboard,
  UserCircle,
  Eye,
  Trash2,
  Edit,
  Download,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Search,
  ArrowLeft,
  X,
  MapPin,
  Lock,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Employee, AttendanceRecord, AttendanceStatus } from '@/lib/types';

type ModuleView = 'ADMIN' | 'KIOSK';
type KioskAuth = 'PIN' | 'QR' | 'FACE' | null;

export function EmployeesModule({ store }: { store: any }) {
  const [viewMode, setViewMode] = useState<ModuleView>('ADMIN');
  const [kioskAuth, setKioskAuth] = useState<KioskAuth>(null);
  const [activeTab, setActiveTab] = useState('registry');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Forms & Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  
  // Kiosk States
  const [pinInput, setPinInput] = useState('');
  const [isCameraActive, setCameraActive] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [punchingStaff, setPunchingStaff] = useState<Employee | null>(null);
  const [punchType, setPunchType] = useState<'IN' | 'OUT' | null>(null);
  const [attendanceStep, setAttendanceStep] = useState<'AUTH' | 'VERIFY' | 'SUCCESS'>('AUTH');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Stats Logic
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAttendance = store.attendance.filter((a: AttendanceRecord) => a.date === today);
    const presentToday = todayAttendance.length;
    const activeEmployees = store.employees.filter((e: Employee) => e.status === 'active');
    const absentToday = Math.max(0, activeEmployees.length - presentToday);
    const totalSalaryLiability = activeEmployees.reduce((acc: number, curr: Employee) => acc + curr.salary, 0);
    
    return { presentToday, absentToday, totalEmployees: activeEmployees.length, totalSalaryLiability };
  }, [store.attendance, store.employees]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Kiosk Handlers ---
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ variant: "destructive", title: "Camera Denied", description: "Hardware access required for verification." });
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  const handlePinSubmit = () => {
    const emp = store.employees.find((e: Employee) => e.pin === pinInput && e.status === 'active');
    if (emp) {
      setPunchingStaff(emp);
      setAttendanceStep('VERIFY');
      startCamera();
    } else {
      toast({ variant: "destructive", title: "Invalid PIN", description: "Access verification failed." });
      setPinInput('');
    }
  };

  const completeAttendance = (type: 'IN' | 'OUT') => {
    if (!punchingStaff) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nowStr = format(new Date(), 'hh:mm:ss a');
    
    let status: AttendanceStatus = 'Present';
    const shiftStart = new Date();
    shiftStart.setHours(9, 30, 0); // 9:30 AM expected start
    
    if (type === 'IN' && new Date() > shiftStart) {
      status = 'Late';
    }

    const record: AttendanceRecord = {
      id: `ATT-${punchingStaff.id}-${Date.now()}`,
      employeeId: punchingStaff.id,
      employeeName: punchingStaff.name,
      date: todayStr,
      clockInTime: type === 'IN' ? nowStr : (store.attendance.find((a: any) => a.employeeId === punchingStaff.id && a.date === todayStr)?.clockInTime || ''),
      clockInPhoto: type === 'IN' ? 'https://picsum.photos/seed/face1/100/100' : null,
      clockOutTime: type === 'OUT' ? nowStr : null,
      clockOutPhoto: type === 'OUT' ? 'https://picsum.photos/seed/face2/100/100' : null,
      totalHours: type === 'OUT' ? 8 : 0, // Simplified for MVP
      status: status
    };

    store.updateAttendance(record);
    setAttendanceStep('SUCCESS');
    stopCamera();
    
    setTimeout(() => {
      resetKiosk();
    }, 3000);
  };

  const resetKiosk = () => {
    setKioskAuth(null);
    setPinInput('');
    setPunchingStaff(null);
    setAttendanceStep('AUTH');
    setScanResult(null);
    stopCamera();
  };

  // --- Admin Handlers ---

  const handleSaveEmployee = () => {
    if (!editingEmployee?.name || !editingEmployee?.pin) return;
    
    const empData: Employee = {
      id: editingEmployee.id || `EMP${100 + store.employees.length + 1}`,
      name: editingEmployee.name,
      role: editingEmployee.role || 'Staff',
      designation: editingEmployee.designation || 'Technician',
      mobile: editingEmployee.mobile || '',
      address: editingEmployee.address || '',
      salary: editingEmployee.salary || 0,
      dailyWage: Math.round((editingEmployee.salary || 0) / 30),
      joiningDate: editingEmployee.joiningDate || format(new Date(), 'yyyy-MM-dd'),
      pin: editingEmployee.pin,
      status: editingEmployee.status || 'active'
    };

    if (editingEmployee.id) {
      store.updateEmployee(empData);
    } else {
      store.addEmployee(empData);
    }
    
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
    toast({ title: "Registry Updated", description: `${empData.name} saved successfully.` });
  };

  const confirmDelete = () => {
    if (adminPassword === 'Avi.2310') {
      if (empToDelete) store.deleteEmployee(empToDelete);
      setIsDeleteModalOpen(false);
      setEmpToDelete(null);
      setAdminPassword('');
      toast({ title: "Employee Deleted", description: "Record removed and audited." });
    } else {
      toast({ variant: "destructive", title: "Auth Failed", description: "Invalid admin password." });
    }
  };

  const exportAttendance = () => {
    const ws = XLSX.utils.json_to_sheet(store.attendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `Attendance_${format(new Date(), 'MMM_yyyy')}.xlsx`);
  };

  // --- Components ---

  const AttendanceKiosk = () => (
    <div className="fixed inset-0 z-[100] bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in zoom-in-95 duration-300">
      {/* Kiosk Header */}
      <div className="absolute top-12 left-12 flex items-center gap-4">
         <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center font-black text-2xl">G</div>
         <div>
            <h1 className="text-xl font-headline font-bold">GJ5 HOME SERVICE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Smart Attendance Terminal</p>
         </div>
      </div>

      <button 
        onClick={() => setViewMode('ADMIN')} 
        className="absolute top-12 right-12 p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 text-slate-400"
      >
        <Lock className="w-5 h-5" />
      </button>

      {attendanceStep === 'AUTH' && (
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-center lg:text-left">
             <div className="space-y-2">
                <h2 className="text-6xl md:text-8xl font-headline font-black tracking-tight text-blue-500">{format(currentTime, 'hh:mm')}</h2>
                <p className="text-xl md:text-2xl text-slate-400 font-medium uppercase tracking-tighter">{format(currentTime, 'EEEE, dd MMMM yyyy')}</p>
             </div>
             <div className="space-y-4">
                <h3 className="text-3xl font-headline font-bold">Welcome, Associate</h3>
                <p className="text-slate-500 text-lg">Please choose a verification method to punch your shift.</p>
             </div>
             <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Button onClick={() => setKioskAuth('PIN')} variant="outline" className="h-16 px-8 rounded-2xl border-slate-800 bg-slate-900/50 text-lg font-bold hover:bg-blue-600 hover:text-white transition-all">
                  <Keyboard className="w-6 h-6 mr-3" /> Secure PIN
                </Button>
                <Button onClick={() => setKioskAuth('QR')} variant="outline" className="h-16 px-8 rounded-2xl border-slate-800 bg-slate-900/50 text-lg font-bold hover:bg-blue-600 hover:text-white transition-all">
                  <QrCode className="w-6 h-6 mr-3" /> QR Scan
                </Button>
             </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
             {kioskAuth === 'PIN' ? (
               <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Enter Employee PIN</Label>
                    <div className="flex justify-center gap-4 h-16 items-center">
                       {[0, 1, 2, 3].map(i => (
                         <div key={i} className={cn("w-4 h-4 rounded-full transition-all duration-300", pinInput.length > i ? "bg-blue-500 scale-125" : "bg-slate-800")} />
                       ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                       <button key={n} onClick={() => pinInput.length < 4 && setPinInput(pinInput + n)} className="h-16 rounded-2xl bg-slate-800/50 hover:bg-blue-600 text-2xl font-bold transition-all">{n}</button>
                     ))}
                     <button onClick={() => setPinInput('')} className="h-16 rounded-2xl bg-rose-500/20 text-rose-500 font-bold">CLEAR</button>
                     <button onClick={() => pinInput.length < 4 && setPinInput(pinInput + '0')} className="h-16 rounded-2xl bg-slate-800/50 hover:bg-blue-600 text-2xl font-bold">0</button>
                     <button onClick={handlePinSubmit} className="h-16 rounded-2xl bg-blue-600 text-white font-bold uppercase text-xs">Enter</button>
                  </div>
                  <Button variant="ghost" onClick={() => resetKiosk()} className="w-full text-slate-500">Cancel</Button>
               </div>
             ) : kioskAuth === 'QR' ? (
               <div className="space-y-6 flex flex-col items-center">
                  <div className="w-64 h-64 bg-black rounded-3xl border-2 border-dashed border-blue-500 flex items-center justify-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                     <QrCode className="w-12 h-12 text-blue-500 opacity-50" />
                  </div>
                  <p className="text-center text-slate-400">Position your QR ID within the frame</p>
                  <Button variant="ghost" onClick={() => resetKiosk()} className="w-full text-slate-500">Cancel</Button>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center space-y-6 h-[400px]">
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <UserCircle className="w-12 h-12 text-blue-500" />
                  </div>
                  <h4 className="text-xl font-bold uppercase tracking-widest text-slate-400">Waiting for Auth</h4>
               </div>
             )}
          </div>
        </div>
      )}

      {attendanceStep === 'VERIFY' && (
        <div className="max-w-md w-full space-y-8 animate-in slide-in-from-bottom-4">
           <div className="text-center space-y-4">
              <h2 className="text-4xl font-headline font-bold">Verify Identity</h2>
              <p className="text-slate-400">Step 2: Face-Sync Identification</p>
           </div>
           <div className="aspect-square bg-black rounded-[40px] border-4 border-blue-600 overflow-hidden relative shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute inset-0 border-[40px] border-transparent pointer-events-none box-content shadow-[inset_0_0_100px_rgba(0,102,255,0.4)]"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/30 rounded-full"></div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => completeAttendance('IN')} className="h-16 bg-blue-600 hover:bg-blue-700 rounded-2xl text-lg font-bold shadow-lg shadow-blue-500/20">PUNCH IN</Button>
              <Button onClick={() => completeAttendance('OUT')} className="h-16 bg-rose-600 hover:bg-rose-700 rounded-2xl text-lg font-bold shadow-lg shadow-rose-500/20">PUNCH OUT</Button>
           </div>
           <p className="text-center text-[10px] text-slate-600 uppercase font-black tracking-widest">Biometric scan active • GPS Verified</p>
        </div>
      )}

      {attendanceStep === 'SUCCESS' && (
        <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-500">
           <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="w-16 h-16 text-white" />
           </div>
           <div className="text-center space-y-2">
              <h2 className="text-5xl font-headline font-black uppercase italic">PUNCH SUCCESS</h2>
              <p className="text-xl text-slate-400">Have a productive shift, {punchingStaff?.name}!</p>
           </div>
           <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-center w-64">
              <p className="text-xs text-slate-500 uppercase font-bold">Current Log</p>
              <h4 className="text-2xl font-headline font-bold text-blue-400">{format(new Date(), 'hh:mm:ss a')}</h4>
           </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      {viewMode === 'KIOSK' ? <AttendanceKiosk /> : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-headline font-bold">HR & Payroll Suite</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Enterprise Workforce Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setViewMode('KIOSK')} variant="outline" className="border-slate-800 h-10 font-bold uppercase text-[10px]">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Launch Kiosk Mode
              </Button>
              <Button onClick={() => { setEditingEmployee(null); setIsEmployeeModalOpen(true); }} className="bg-[#0066FF] h-10 font-bold uppercase text-[10px]">
                <UserPlus className="w-4 h-4 mr-2" /> New Hire
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Present Today', value: stats.presentToday, sub: 'Technicians', icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Absent Today', value: stats.absentToday, sub: 'On Leave', icon: AlertCircle, color: 'text-rose-400' },
              { label: 'Total Registry', value: stats.totalEmployees, sub: 'Active Contracts', icon: ShieldCheck, color: 'text-blue-400' },
              { label: 'Salary Liability', value: `₹${stats.totalSalaryLiability.toLocaleString()}`, sub: 'Monthly Gross', icon: DollarSign, color: 'text-amber-400' },
            ].map((s, i) => (
              <Card key={i} className="bg-slate-900/40 border-slate-800">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
             <TabsList className="bg-slate-900 border border-slate-800 h-12 p-1 gap-1">
                <TabsTrigger value="registry" className="data-[state=active]:bg-blue-600 rounded-lg">Staff Directory</TabsTrigger>
                <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-600 rounded-lg">Attendance Ledger</TabsTrigger>
                <TabsTrigger value="payroll" className="data-[state=active]:bg-blue-600 rounded-lg">Payroll Analysis</TabsTrigger>
             </TabsList>

             <TabsContent value="registry" className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold uppercase">Profile</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Designation</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Daily Wage</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">PIN Code</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Actions</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {store.employees.map((emp: Employee) => (
                           <TableRow key={emp.id} className="border-slate-800/50 hover:bg-slate-800/20">
                              <TableCell>
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-blue-500 border border-slate-700">
                                       {emp.name[0]}
                                    </div>
                                    <div>
                                       <p className="font-bold text-sm">{emp.name}</p>
                                       <p className="text-[10px] text-slate-500 font-code">{emp.id}</p>
                                    </div>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <Badge variant="outline" className="text-[10px] uppercase border-slate-800">{emp.designation}</Badge>
                              </TableCell>
                              <TableCell className="font-code font-bold">₹{emp.dailyWage}</TableCell>
                              <TableCell className="font-code text-slate-500">****</TableCell>
                              <TableCell className="text-right">
                                 <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingEmployee(emp); setIsEmployeeModalOpen(true); }} className="h-8 w-8 text-blue-400"><Edit className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => { setEmpToDelete(emp.id); setIsDeleteModalOpen(true); }} className="h-8 w-8 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                                 </div>
                              </TableCell>
                           </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             </TabsContent>

             <TabsContent value="attendance" className="space-y-4">
                <div className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                   <div className="flex items-center gap-4">
                      <Search className="w-4 h-4 text-slate-500" />
                      <Input placeholder="Filter records..." className="bg-transparent border-0 h-8 text-sm focus-visible:ring-0 w-64" />
                   </div>
                   <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-slate-800 h-8" onClick={exportAttendance}>
                         <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Export (.xlsx)
                      </Button>
                   </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Employee</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">In / Out</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Duration</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Status</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {store.attendance.map((rec: AttendanceRecord) => (
                           <TableRow key={rec.id} className="border-slate-800/50">
                              <TableCell className="text-[10px] font-bold text-slate-400">{rec.date}</TableCell>
                              <TableCell className="font-bold text-sm">{rec.employeeName}</TableCell>
                              <TableCell>
                                 <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-emerald-400 font-bold">IN: {rec.clockInTime}</span>
                                    {rec.clockOutTime && <span className="text-[10px] text-rose-400 font-bold">OUT: {rec.clockOutTime}</span>}
                                 </div>
                              </TableCell>
                              <TableCell className="font-code text-[10px]">{rec.totalHours || '--'} HRS</TableCell>
                              <TableCell className="text-right">
                                 <Badge className={cn("text-[9px] uppercase", 
                                   rec.status === 'Present' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                 )}>{rec.status}</Badge>
                              </TableCell>
                           </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             </TabsContent>

             <TabsContent value="payroll" className="space-y-4">
                <Card className="bg-slate-900/40 border-slate-800">
                   <CardHeader>
                      <CardTitle className="text-lg">Payroll Liability Sheet</CardTitle>
                      <CardDescription>Estimated totals based on active contracts</CardDescription>
                   </CardHeader>
                   <CardContent>
                      <div className="space-y-4">
                         {store.employees.map((emp: Employee) => (
                           <div key={emp.id} className="flex justify-between items-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">{emp.name[0]}</div>
                                 <div>
                                    <p className="font-bold text-sm">{emp.name}</p>
                                    <p className="text-[10px] text-slate-500">{emp.designation}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-sm font-bold text-emerald-400">₹{emp.salary.toLocaleString()}</p>
                                 <p className="text-[10px] text-slate-500 uppercase font-bold">Payable Monthly</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </CardContent>
                </Card>
             </TabsContent>
          </Tabs>
        </>
      )}

      {/* Employee Registry Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="max-w-xl bg-[#0F172A] border-slate-800 text-slate-100 shadow-2xl">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                 <UserPlus className="w-5 h-5 text-blue-500" /> {editingEmployee ? 'Modify Profile' : 'Register New Employee'}
              </DialogTitle>
           </DialogHeader>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1">
                 <Label>Full Name</Label>
                 <Input value={editingEmployee?.name || ''} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label>Mobile Number</Label>
                 <Input value={editingEmployee?.mobile || ''} onChange={e => setEditingEmployee({...editingEmployee, mobile: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label>Designation</Label>
                 <Input value={editingEmployee?.designation || ''} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label>Monthly Salary (₹)</Label>
                 <Input type="number" value={editingEmployee?.salary || ''} onChange={e => setEditingEmployee({...editingEmployee, salary: Number(e.target.value)})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label>Join Date</Label>
                 <Input type="date" value={editingEmployee?.joiningDate || ''} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label>Access PIN (4-Digits)</Label>
                 <Input maxLength={4} value={editingEmployee?.pin || ''} onChange={e => setEditingEmployee({...editingEmployee, pin: e.target.value})} className="bg-slate-950 border-slate-800 font-code tracking-widest" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                 <Label>Home Address</Label>
                 <Input value={editingEmployee?.address || ''} onChange={e => setEditingEmployee({...editingEmployee, address: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
           </div>
           <DialogFooter>
              <Button variant="ghost" onClick={() => setIsEmployeeModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEmployee} className="bg-blue-600 px-8">Commit Record</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-500">
                 <ShieldCheck className="w-6 h-6" /> Admin Authorization
              </DialogTitle>
              <DialogDescription>Entering the master override password is required to terminate this contract record.</DialogDescription>
           </DialogHeader>
           <div className="py-4 space-y-4">
              <div className="space-y-1">
                 <Label className="text-[10px] font-bold uppercase text-slate-500">Admin Identity Key</Label>
                 <Input 
                   type="password" 
                   value={adminPassword} 
                   onChange={e => setAdminPassword(e.target.value)} 
                   className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500" 
                   placeholder="••••••••"
                 />
              </div>
           </div>
           <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 px-8">Confirm Deletion</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

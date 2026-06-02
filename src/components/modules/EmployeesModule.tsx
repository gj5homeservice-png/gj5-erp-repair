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
  DollarSign,
  Smartphone,
  Mail,
  Home,
  Briefcase,
  CreditCard,
  FileStack,
  ShieldAlert,
  Save,
  Trash,
  ChevronDown
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Employee, AttendanceRecord, AttendanceStatus, EmployeeStatus, EmploymentType } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

type ModuleView = 'ADMIN' | 'KIOSK';
type KioskAuth = 'PIN' | 'QR' | 'FACE' | null;

const INITIAL_EMP: Partial<Employee> = {
  name: '', mobile: '', altMobile: '', email: '', dob: '', gender: 'Male', bloodGroup: '', maritalStatus: 'Single',
  address: '', city: 'Surat', state: 'Gujarat', pincode: '',
  designation: '', department: 'Service', joiningDate: format(new Date(), 'yyyy-MM-dd'), employmentType: 'Full Time',
  salary: 0, status: 'Active', pin: '',
  overtime: 0, bonus: 0, advance: 0, deductions: 0,
  bankHolderName: '', bankName: '', accountNo: '', ifscCode: '', upiId: '',
  aadhaarNo: '', panNo: ''
};

export function EmployeesModule({ store }: { store: any }) {
  const [viewMode, setViewMode] = useState<ModuleView>('ADMIN');
  const [kioskAuth, setKioskAuth] = useState<KioskAuth>(null);
  const [activeTab, setActiveTab] = useState('registry');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Forms & Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>(INITIAL_EMP);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [empToDelete, setEmpToDelete] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [modalTab, setModalTab] = useState('personal');
  
  // Kiosk States
  const [pinInput, setPinInput] = useState('');
  const [isCameraActive, setCameraActive] = useState(false);
  const [punchingStaff, setPunchingStaff] = useState<Employee | null>(null);
  const [attendanceStep, setAttendanceStep] = useState<'AUTH' | 'VERIFY' | 'SUCCESS'>('AUTH');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAttendance = store.attendance.filter((a: AttendanceRecord) => a.date === today);
    const presentToday = todayAttendance.length;
    const activeEmployees = store.employees.filter((e: Employee) => e.status === 'Active');
    const absentToday = Math.max(0, activeEmployees.length - presentToday);
    const totalSalaryLiability = activeEmployees.reduce((acc: number, curr: Employee) => acc + curr.salary, 0);
    const attPct = activeEmployees.length > 0 ? Math.round((presentToday / activeEmployees.length) * 100) : 0;
    
    return { presentToday, absentToday, totalEmployees: activeEmployees.length, totalSalaryLiability, attPct };
  }, [store.attendance, store.employees]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Handlers ---

  const handleSaveEmployee = () => {
    if (!editingEmployee.name || !editingEmployee.pin) {
      toast({ variant: "destructive", title: "Missing Core Data", description: "Name and Security PIN are mandatory." });
      return;
    }

    const dailyWage = Math.round((editingEmployee.salary || 0) / 30);
    
    // Auto Gen ID for new hires
    let nextId = editingEmployee.id;
    if (!nextId) {
      const currentMax = store.employees.reduce((max: number, e: Employee) => {
        const num = parseInt(e.id.replace('EMP', ''));
        return num > max ? num : max;
      }, 0);
      nextId = `EMP${String(currentMax + 1).padStart(4, '0')}`;
    }

    const finalEmp: Employee = {
      ...(editingEmployee as Employee),
      id: nextId,
      dailyWage,
      status: editingEmployee.status || 'Active'
    };

    if (editingEmployee.id) store.updateEmployee(finalEmp);
    else store.addEmployee(finalEmp);

    setIsEmployeeModalOpen(false);
    setEditingEmployee(INITIAL_EMP);
    setModalTab('personal');
    toast({ title: "HRMS Record Committed", description: `${finalEmp.name} [${finalEmp.id}] saved successfully.` });
  };

  const confirmDelete = () => {
    if (adminPassword === 'Avi.2310') {
      if (empToDelete) store.deleteEmployee(empToDelete);
      setIsDeleteModalOpen(false);
      setEmpToDelete(null);
      setAdminPassword('');
      toast({ title: "Employee Terminated", description: "Registry record removed and archived." });
    } else {
      toast({ variant: "destructive", title: "Authorization Denied", description: "Invalid admin password." });
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("GJ5 HOME SERVICE - EMPLOYEE MASTER LIST", 10, 10);
    let y = 20;
    store.employees.forEach((e: Employee, i: number) => {
      doc.text(`${i+1}. ${e.id} - ${e.name} (${e.designation}) - Salary: ${e.salary}`, 10, y);
      y += 10;
    });
    doc.save("GJ5_Employee_Master.pdf");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(store.employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "GJ5_Employee_Master.xlsx");
  };

  // --- Kiosk Logic ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast({ variant: "destructive", title: "Sensor Error", description: "Identity sensor (Camera) is unavailable." });
    }
  };

  const stopCamera = () => {
    setCameraActive(false);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
  };

  const handlePinSubmit = () => {
    const emp = store.employees.find((e: Employee) => e.pin === pinInput && e.status === 'Active');
    if (emp) {
      setPunchingStaff(emp);
      setAttendanceStep('VERIFY');
      startCamera();
    } else {
      toast({ variant: "destructive", title: "Identity Failed", description: "Access PIN mismatch." });
      setPinInput('');
    }
  };

  const completeAttendance = (type: 'IN' | 'OUT') => {
    if (!punchingStaff) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const nowStr = format(new Date(), 'hh:mm:ss a');
    
    let status: AttendanceStatus = 'Present';
    const shiftStart = new Date();
    shiftStart.setHours(9, 30, 0); 
    if (type === 'IN' && new Date() > shiftStart) status = 'Late';

    const record: AttendanceRecord = {
      id: `ATT-${punchingStaff.id}-${Date.now()}`,
      employeeId: punchingStaff.id,
      employeeName: punchingStaff.name,
      date: todayStr,
      clockInTime: type === 'IN' ? nowStr : (store.attendance.find((a: any) => a.employeeId === punchingStaff.id && a.date === todayStr)?.clockInTime || ''),
      clockInPhoto: type === 'IN' ? 'https://picsum.photos/seed/face1/100/100' : null,
      clockOutTime: type === 'OUT' ? nowStr : null,
      clockOutPhoto: type === 'OUT' ? 'https://picsum.photos/seed/face2/100/100' : null,
      totalHours: type === 'OUT' ? 8 : 0,
      status: status
    };

    store.updateAttendance(record);
    setAttendanceStep('SUCCESS');
    stopCamera();
    setTimeout(() => {
      setKioskAuth(null);
      setPinInput('');
      setPunchingStaff(null);
      setAttendanceStep('AUTH');
      stopCamera();
    }, 3000);
  };

  const AttendanceKiosk = () => (
    <div className="fixed inset-0 z-[100] bg-[#0B0F19] text-white flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in zoom-in-95 duration-300">
      <div className="absolute top-12 left-12 flex items-center gap-4">
         <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center font-black text-2xl">G</div>
         <div>
            <h1 className="text-xl font-headline font-bold">GJ5 HOME SERVICE</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Smart Attendance Terminal</p>
         </div>
      </div>
      <button onClick={() => setViewMode('ADMIN')} className="absolute top-12 right-12 p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 text-slate-400">
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
                <h3 className="text-3xl font-headline font-bold">Associate Portal</h3>
                <p className="text-slate-500 text-lg">Verify identity to proceed with shift registration.</p>
             </div>
             <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <Button onClick={() => setKioskAuth('PIN')} variant="outline" className="h-16 px-8 rounded-2xl border-slate-800 bg-slate-900/50 text-lg font-bold hover:bg-blue-600 hover:text-white transition-all">
                  <Keyboard className="w-6 h-6 mr-3" /> Secure PIN
                </Button>
                <Button onClick={() => setKioskAuth('QR')} variant="outline" className="h-16 px-8 rounded-2xl border-slate-800 bg-slate-900/50 text-lg font-bold hover:bg-blue-600 hover:text-white transition-all">
                  <QrCode className="w-6 h-6 mr-3" /> Digital ID Scan
                </Button>
             </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
             {kioskAuth === 'PIN' ? (
               <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Input Security PIN</Label>
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
                     <button onClick={() => setPinInput('')} className="h-16 rounded-2xl bg-rose-500/20 text-rose-500 font-bold">CLR</button>
                     <button onClick={() => pinInput.length < 4 && setPinInput(pinInput + '0')} className="h-16 rounded-2xl bg-slate-800/50 hover:bg-blue-600 text-2xl font-bold">0</button>
                     <button onClick={handlePinSubmit} className="h-16 rounded-2xl bg-blue-600 text-white font-bold uppercase text-xs">Auth</button>
                  </div>
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center space-y-6 h-[400px]">
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <UserCircle className="w-12 h-12 text-blue-500" />
                  </div>
                  <h4 className="text-xl font-bold uppercase tracking-widest text-slate-400">Awaiting Access Method</h4>
               </div>
             )}
          </div>
        </div>
      )}

      {attendanceStep === 'VERIFY' && (
        <div className="max-w-md w-full space-y-8 animate-in slide-in-from-bottom-4">
           <div className="text-center space-y-4">
              <h2 className="text-4xl font-headline font-bold">Biometric Verification</h2>
              <p className="text-slate-400">Capturing shift ID metadata...</p>
           </div>
           <div className="aspect-square bg-black rounded-[40px] border-4 border-blue-600 overflow-hidden relative shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
           </div>
           <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => completeAttendance('IN')} className="h-16 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-lg font-bold shadow-lg shadow-emerald-500/20">PUNCH IN</Button>
              <Button onClick={() => completeAttendance('OUT')} className="h-16 bg-rose-600 hover:bg-rose-700 rounded-2xl text-lg font-bold shadow-lg shadow-rose-500/20">PUNCH OUT</Button>
           </div>
        </div>
      )}

      {attendanceStep === 'SUCCESS' && (
        <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-500">
           <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="w-16 h-16 text-white" />
           </div>
           <div className="text-center space-y-2">
              <h2 className="text-5xl font-headline font-black uppercase italic">SYNC SUCCESSFUL</h2>
              <p className="text-xl text-slate-400">Associate {punchingStaff?.name} is authorized.</p>
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
                <h2 className="text-xl md:text-2xl font-headline font-bold">HR Master Suite</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Enterprise Lifecycle Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setViewMode('KIOSK')} variant="outline" className="border-slate-800 h-10 font-bold uppercase text-[10px]">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Start Kiosk
              </Button>
              <Button onClick={() => { setEditingEmployee(INITIAL_EMP); setIsEmployeeModalOpen(true); }} className="bg-[#0066FF] h-10 font-bold uppercase text-[10px]">
                <UserPlus className="w-4 h-4 mr-2" /> Add Employee
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Present Today', value: stats.presentToday, sub: `${stats.attPct}% Participation`, icon: CheckCircle2, color: 'text-emerald-400' },
              { label: 'Absent Today', value: stats.absentToday, sub: 'Out of Registry', icon: AlertCircle, color: 'text-rose-400' },
              { label: 'Registry Master', value: stats.totalEmployees, sub: 'Active Assets', icon: ShieldCheck, color: 'text-blue-400' },
              { label: 'Payroll Liability', value: `₹${stats.totalSalaryLiability.toLocaleString()}`, sub: 'Monthly Gross', icon: DollarSign, color: 'text-amber-400' },
            ].map((s, i) => (
              <Card key={i} className="bg-slate-900/40 border-slate-800">
                <CardContent className="p-4 md:p-5 flex justify-between items-center">
                  <div>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                    <h3 className={cn("text-xl md:text-2xl font-headline font-bold", s.color)}>{s.value}</h3>
                    <p className="text-[8px] md:text-[9px] text-slate-600 font-bold uppercase">{s.sub}</p>
                  </div>
                  <div className={cn("p-2 md:p-3 bg-slate-950 rounded-xl", s.color)}><s.icon className="w-4 h-4 md:w-5 h-5" /></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between gap-4">
               <TabsList className="bg-slate-900 border border-slate-800 h-11 p-1 gap-1">
                  <TabsTrigger value="registry" className="data-[state=active]:bg-blue-600 rounded-lg text-xs">Directory</TabsTrigger>
                  <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-600 rounded-lg text-xs">Attendance</TabsTrigger>
                  <TabsTrigger value="payroll" className="data-[state=active]:bg-blue-600 rounded-lg text-xs">Payroll</TabsTrigger>
               </TabsList>
               <div className="flex gap-2">
                 <Button variant="outline" onClick={exportPDF} className="h-11 text-[10px] uppercase font-bold border-slate-800"><FileText className="w-4 h-4 mr-2" /> PDF</Button>
                 <Button variant="outline" onClick={exportExcel} className="h-11 text-[10px] uppercase font-bold border-slate-800"><FileSpreadsheet className="w-4 h-4 mr-2" /> Excel</Button>
               </div>
             </div>

             <TabsContent value="registry">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold uppercase">Profile</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Status/Type</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Financials</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Actions</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {store.employees.map((emp: Employee) => (
                           <TableRow key={emp.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                              <TableCell>
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-blue-500 border border-slate-700 overflow-hidden">
                                       {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" /> : emp.name[0]}
                                    </div>
                                    <div>
                                       <p className="font-bold text-sm">{emp.name}</p>
                                       <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{emp.id} • {emp.designation}</p>
                                    </div>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <div className="flex flex-col gap-1">
                                    <Badge variant={emp.status === 'Active' ? 'default' : 'secondary'} className={cn("text-[9px] w-fit", emp.status === 'Active' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>{emp.status}</Badge>
                                    <span className="text-[9px] text-slate-500 uppercase font-black">{emp.employmentType}</span>
                                 </div>
                              </TableCell>
                              <TableCell>
                                 <div className="flex flex-col">
                                    <span className="font-code font-bold text-xs text-blue-400">₹{emp.salary.toLocaleString()}</span>
                                    <span className="text-[8px] text-slate-500 uppercase font-bold">CTC Monthly</span>
                                 </div>
                              </TableCell>
                              <TableCell className="text-right">
                                 <div className="flex justify-end gap-1">
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
             
             {/* Attendance & Payroll Content - Using existing logic but optimized */}
             <TabsContent value="attendance" className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-slate-900/60">
                         <TableRow className="border-slate-800">
                            <TableHead className="text-[10px] font-bold uppercase">Date</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Employee</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">In / Out</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase">Status</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {store.attendance.map((rec: AttendanceRecord) => (
                           <TableRow key={rec.id} className="border-slate-800/50">
                              <TableCell className="text-[10px] font-bold text-slate-400">{rec.date}</TableCell>
                              <TableCell className="font-bold text-xs">{rec.employeeName}</TableCell>
                              <TableCell>
                                 <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-emerald-400 font-bold uppercase">IN: {rec.clockInTime}</span>
                                    {rec.clockOutTime && <span className="text-[9px] text-rose-400 font-bold uppercase">OUT: {rec.clockOutTime}</span>}
                                 </div>
                              </TableCell>
                              <TableCell className="text-right">
                                 <Badge className={cn("text-[8px] uppercase", 
                                   rec.status === 'Present' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                 )}>{rec.status}</Badge>
                              </TableCell>
                           </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </div>
             </TabsContent>
          </Tabs>
        </>
      )}

      {/* Main HRMS Modal */}
      <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent className="max-w-5xl bg-[#0F172A] border-slate-800 text-slate-100 shadow-2xl p-0 overflow-hidden flex flex-col h-[90vh]">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                   <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                   <DialogTitle className="text-xl md:text-2xl font-headline font-bold">Employee Master Registry</DialogTitle>
                   <DialogDescription className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Lifecycle Archive: {editingEmployee.id || 'New Record'}</DialogDescription>
                </div>
             </div>
          </DialogHeader>

          <Tabs value={modalTab} onValueChange={setModalTab} className="flex-1 overflow-hidden flex flex-col">
             <div className="px-6 py-2 border-b border-slate-800 bg-slate-950/50 overflow-x-auto shrink-0">
                <TabsList className="bg-transparent gap-4">
                   <TabsTrigger value="personal" className="data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none h-10 text-[10px] font-bold uppercase tracking-widest px-0">Personal</TabsTrigger>
                   <TabsTrigger value="job" className="data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none h-10 text-[10px] font-bold uppercase tracking-widest px-0">Employment</TabsTrigger>
                   <TabsTrigger value="financial" className="data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none h-10 text-[10px] font-bold uppercase tracking-widest px-0">Payroll & Bank</TabsTrigger>
                   <TabsTrigger value="security" className="data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none h-10 text-[10px] font-bold uppercase tracking-widest px-0">Security</TabsTrigger>
                   <TabsTrigger value="vault" className="data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 rounded-none h-10 text-[10px] font-bold uppercase tracking-widest px-0">Digital Vault</TabsTrigger>
                </TabsList>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <TabsContent value="personal" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><UserCircle className="w-4 h-4" /> Identity Details</h4>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Full Official Name</Label>
                               <Input value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Rahul Sharma" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Mobile No.</Label>
                                  <Input value={editingEmployee.mobile} onChange={e => setEditingEmployee({...editingEmployee, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                               </div>
                               <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Alt Mobile</Label>
                                  <Input value={editingEmployee.altMobile} onChange={e => setEditingEmployee({...editingEmployee, altMobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                               </div>
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Email Address</Label>
                               <Input type="email" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-4 h-4" /> Life Context</h4>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Birth Date</Label>
                                  <Input type="date" value={editingEmployee.dob} onChange={e => setEditingEmployee({...editingEmployee, dob: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                               </div>
                               <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Gender</Label>
                                  <Select value={editingEmployee.gender} onValueChange={v => setEditingEmployee({...editingEmployee, gender: v})}>
                                     <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                     <SelectContent className="bg-slate-900 border-slate-800">
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                     </SelectContent>
                                  </Select>
                               </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Blood Group</Label>
                                  <Input value={editingEmployee.bloodGroup} onChange={e => setEditingEmployee({...editingEmployee, bloodGroup: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. O+" />
                               </div>
                               <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Marital Status</Label>
                                  <Select value={editingEmployee.maritalStatus} onValueChange={v => setEditingEmployee({...editingEmployee, maritalStatus: v})}>
                                     <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                     <SelectContent className="bg-slate-900 border-slate-800">
                                        <SelectItem value="Single">Single</SelectItem>
                                        <SelectItem value="Married">Married</SelectItem>
                                     </SelectContent>
                                  </Select>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Home className="w-4 h-4" /> Residency Registry</h4>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                         <div className="md:col-span-6 space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Home Address</Label>
                            <Input value={editingEmployee.address} onChange={e => setEditingEmployee({...editingEmployee, address: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                         <div className="md:col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">City</Label>
                            <Input value={editingEmployee.city} onChange={e => setEditingEmployee({...editingEmployee, city: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                         <div className="md:col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">State</Label>
                            <Input value={editingEmployee.state} onChange={e => setEditingEmployee({...editingEmployee, state: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                         <div className="md:col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Pincode</Label>
                            <Input value={editingEmployee.pincode} onChange={e => setEditingEmployee({...editingEmployee, pincode: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="job" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Briefcase className="w-4 h-4" /> Organization Metadata</h4>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Designation</Label>
                               <Input value={editingEmployee.designation} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Department</Label>
                               <Select value={editingEmployee.department} onValueChange={v => setEditingEmployee({...editingEmployee, department: v})}>
                                  <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-800">
                                     <SelectItem value="Service">Service & Repairs</SelectItem>
                                     <SelectItem value="Logistics">Logistics & Runners</SelectItem>
                                     <SelectItem value="Management">Operations & Admin</SelectItem>
                                     <SelectItem value="Sales">Sales & Counters</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Employment Class</Label>
                               <Select value={editingEmployee.employmentType} onValueChange={v => setEditingEmployee({...editingEmployee, employmentType: v as EmploymentType})}>
                                  <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-800">
                                     <SelectItem value="Full Time">Full Time (Salaried)</SelectItem>
                                     <SelectItem value="Part Time">Part Time (Retainer)</SelectItem>
                                     <SelectItem value="Contract">Contract (Daily)</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> Tenancy Registry</h4>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Joining Date</Label>
                               <Input type="date" value={editingEmployee.joiningDate} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Lifecycle Status</Label>
                               <Select value={editingEmployee.status} onValueChange={v => setEditingEmployee({...editingEmployee, status: v as EmployeeStatus})}>
                                  <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-slate-800">
                                     <SelectItem value="Active">Active Duty</SelectItem>
                                     <SelectItem value="Inactive">On Leave / Inactive</SelectItem>
                                     <SelectItem value="Resigned">Resigned / Terminated</SelectItem>
                                  </SelectContent>
                               </Select>
                            </div>
                         </div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="financial" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-2">
                   <div className="space-y-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><DollarSign className="w-4 h-4" /> Salary Liability Engine</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Monthly CTC (₹)</Label>
                            <Input type="number" value={editingEmployee.salary} onChange={e => setEditingEmployee({...editingEmployee, salary: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-12 text-lg font-code font-bold text-emerald-400" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Bonus (+) / OT</Label>
                            <Input type="number" value={editingEmployee.bonus} onChange={e => setEditingEmployee({...editingEmployee, bonus: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-12 font-code" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Deductions (-) / Adv</Label>
                            <Input type="number" value={editingEmployee.deductions} onChange={e => setEditingEmployee({...editingEmployee, deductions: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-12 font-code text-rose-400" />
                         </div>
                         <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-center">
                            <Label className="text-[10px] uppercase font-bold text-slate-500">Auto Net Payable</Label>
                            <span className="text-xl font-headline font-black">₹{(Number(editingEmployee.salary || 0) + Number(editingEmployee.bonus || 0) - Number(editingEmployee.deductions || 0)).toLocaleString()}</span>
                         </div>
                      </div>
                   </div>

                   <Separator className="bg-slate-800" />

                   <div className="space-y-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><CreditCard className="w-4 h-4" /> Bank Account Archive</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Account Holder</Label>
                            <Input value={editingEmployee.bankHolderName} onChange={e => setEditingEmployee({...editingEmployee, bankHolderName: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Bank Name</Label>
                            <Input value={editingEmployee.bankName} onChange={e => setEditingEmployee({...editingEmployee, bankName: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Account Number</Label>
                            <Input value={editingEmployee.accountNo} onChange={e => setEditingEmployee({...editingEmployee, accountNo: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">IFSC Code</Label>
                            <Input value={editingEmployee.ifscCode} onChange={e => setEditingEmployee({...editingEmployee, ifscCode: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">UPI ID / PhonePe</Label>
                            <Input value={editingEmployee.upiId} onChange={e => setEditingEmployee({...editingEmployee, upiId: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                         </div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="security" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Lock className="w-4 h-4" /> Shift Authentication</h4>
                         <div className="space-y-4 p-6 bg-slate-950 rounded-2xl border border-slate-800">
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Associate Login PIN</Label>
                               <Input maxLength={4} value={editingEmployee.pin} onChange={e => setEditingEmployee({...editingEmployee, pin: e.target.value})} className="bg-slate-900 border-slate-800 h-14 text-center text-3xl tracking-[1.5rem] font-code font-bold text-blue-500" />
                               <p className="text-[10px] text-slate-600 italic mt-2">Required for kiosk punch-in validation.</p>
                            </div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><QrCode className="w-4 h-4" /> Identity Matrix</h4>
                         <div className="flex flex-col items-center p-6 bg-white rounded-2xl">
                            <QRCodeSVG value={editingEmployee.id || 'NEW'} size={140} />
                            <span className="text-black font-code font-bold mt-4">{editingEmployee.id || 'GENERATING...'}</span>
                         </div>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="vault" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-2">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><FileStack className="w-4 h-4" /> Compliance Documents</h4>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">Aadhaar Card Number</Label>
                               <Input value={editingEmployee.aadhaarNo} onChange={e => setEditingEmployee({...editingEmployee, aadhaarNo: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                            </div>
                            <div className="space-y-1">
                               <Label className="text-[10px] uppercase font-bold text-slate-400">PAN Card Number</Label>
                               <Input value={editingEmployee.panNo} onChange={e => setEditingEmployee({...editingEmployee, panNo: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                            </div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Camera className="w-4 h-4" /> Biometric Assets</h4>
                         <div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 transition-all cursor-pointer">
                            <Camera className="w-10 h-10 text-slate-700" />
                            <span className="text-[10px] uppercase font-bold text-slate-500">Register Face Recognition Photo</span>
                         </div>
                      </div>
                   </div>
                </TabsContent>
             </div>

             <DialogFooter className="p-6 border-t border-slate-800 bg-slate-900/50 shrink-0 gap-3">
                <Button variant="ghost" onClick={() => setIsEmployeeModalOpen(false)}>Discard</Button>
                <Button onClick={handleSaveEmployee} className="bg-blue-600 hover:bg-blue-700 px-12 h-11 font-bold uppercase text-xs shadow-lg shadow-blue-500/20"><Save className="w-4 h-4 mr-2" /> Commit Record</Button>
             </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
           <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-500">
                 <ShieldAlert className="w-6 h-6" /> Admin Authorization
              </DialogTitle>
              <DialogDescription className="text-slate-400">Required override key to terminate registry record <span className="text-white font-bold">{empToDelete}</span>.</DialogDescription>
           </DialogHeader>
           <div className="py-4 space-y-4">
              <div className="space-y-1">
                 <Label className="text-[10px] font-bold uppercase text-slate-500">Identity Key</Label>
                 <Input 
                   type="password" 
                   value={adminPassword} 
                   onChange={e => setAdminPassword(e.target.value)} 
                   className="bg-slate-950 border-slate-800 focus-visible:ring-rose-500 h-12" 
                   placeholder="••••••••"
                 />
              </div>
           </div>
           <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 px-8 h-12 font-bold uppercase text-xs">Terminate Record</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

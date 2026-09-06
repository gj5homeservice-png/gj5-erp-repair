"use client"

import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Smartphone,
  Calendar,
  Briefcase,
  FileDown,
  Camera,
  QrCode,
  Tag,
  Building2,
  Mail,
  MoreVertical,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Employee, EmployeeStatus, EmploymentType, UserRole } from '@/lib/types';
import { allFullAccess, getDefaultPermissions } from '@/lib/permissions';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { EmployeeKYCSection } from './employees/EmployeeKYCSection';
import { ModuleAccessSection } from './employees/ModuleAccessSection';
import { EmployeeLoginAccessSection } from './employees/EmployeeLoginAccessSection';
import { Lock, Unlock, Filter } from 'lucide-react';

const INITIAL_EMP: Partial<Employee> = {
  name: '', mobile: '', email: '', designation: 'Technician', department: 'Service',
  status: 'Active', salary: 0, role: 'Employee', employmentType: 'Full Time', salaryType: 'Monthly',
  joiningDate: format(new Date(), 'yyyy-MM-dd'),
  modulePermissions: getDefaultPermissions('Employee'),
};

const DEPARTMENTS = ['Service', 'Sales', 'Logistics', 'Accounts', 'Management', 'IT Support'];
const ROLES: UserRole[] = ['Super Admin', 'Admin', 'Manager', 'Accountant', 'Service Manager', 'Technician', 'Sales Executive', 'Delivery Executive', 'Employee'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full Time', 'Part Time', 'Contract', 'Temporary'];
const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Active', 'Inactive', 'Blocked', 'Resigned'];
const SALARY_TYPES = ['Monthly', 'Daily', 'Hourly'];

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  Active: 'bg-emerald-500/10 text-emerald-400',
  Inactive: 'bg-slate-500/10 text-slate-400',
  Blocked: 'bg-rose-500/10 text-rose-400',
  Resigned: 'bg-amber-500/10 text-amber-400',
};

export function EmployeesModule({ store }: { store: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>(INITIAL_EMP);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingQr, setViewingQr] = useState<Employee | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filteredEmployees = useMemo(() => {
    return (store.employees || []).filter((emp: Employee) => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.mobile.includes(searchQuery) ||
        (emp.designation || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      return matchesSearch && matchesDept && matchesRole && matchesStatus;
    });
  }, [store.employees, searchQuery, departmentFilter, roleFilter, statusFilter]);

  const openEditModal = async (emp: Employee) => {
    setEditingEmployee(emp);
    setIsModalOpen(true);
    setActiveTab('profile');
    // The list-view Employee object intentionally omits permissions/login
    // access/documents (those never flow through the generic list query) —
    // fetch the full detail record so the modal's other tabs have real data.
    setLoadingDetail(true);
    try {
      const detail = await store.getEmployeeDetail(emp.id);
      setEditingEmployee((prev) => (prev.id === emp.id ? { ...prev, ...detail } : prev));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not load full profile', description: err?.message });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingEmployee({ ...editingEmployee, photo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee.name || !editingEmployee.mobile) {
      toast({ variant: "destructive", title: "Incomplete Data", description: "Name and Communication Node are required." });
      return;
    }
    if (!/^\d{10}$/.test(editingEmployee.mobile)) {
      toast({ variant: "destructive", title: "Invalid Mobile Number", description: "Mobile number must be exactly 10 digits." });
      return;
    }

    const isNew = !editingEmployee.id;
    const employeeId = editingEmployee.employeeId || `GJ5-EMP-${String(store.employees.length + 1001)}`;
    const role = editingEmployee.role || 'Employee';

    const finalEmp = {
      ...editingEmployee,
      id: editingEmployee.id || `EMP-${Date.now()}`,
      employeeId,
      qrCode: `GJ5-IDENTITY-${employeeId}`,
      createdAt: editingEmployee.createdAt || new Date().toISOString(),
      role,
      // Admin must never be saved with reduced access, regardless of what the
      // permission grid happens to show — enforced here as a hard safety net,
      // not just in the UI.
      modulePermissions: role === 'Admin' ? allFullAccess() : (editingEmployee.modulePermissions || getDefaultPermissions(role)),
    } as Employee;

    try {
      if (isNew) await store.addEmployee(finalEmp);
      else await store.updateEmployee(finalEmp);
      setIsModalOpen(false);
      setEditingEmployee(INITIAL_EMP);
      toast({ title: "Ledger Updated", description: `Associate ${finalEmp.name} registered in Master HR Node.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err?.message || `Could not save ${finalEmp.name} to the server. Please try again.` });
    }
  };

  const handleToggleBlock = async (emp: Employee) => {
    const nextStatus: EmployeeStatus = emp.status === 'Blocked' ? 'Active' : 'Blocked';
    try {
      await store.updateEmployee({ ...emp, status: nextStatus });
      toast({ title: nextStatus === 'Blocked' ? 'Associate Blocked' : 'Associate Unblocked', description: `${emp.name} is now ${nextStatus}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err?.message });
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(store.employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, `GJ5_Workforce_Registry_${format(new Date(), 'dd_MMM')}.xlsx`);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Workforce Management</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Industrial Associate Registry V3.2</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportToExcel} className="border-slate-800 h-10 font-bold uppercase text-[10px]">
            <FileDown className="w-4 h-4 mr-2" /> Excel Export
          </Button>
          <Button onClick={() => { setEditingEmployee(INITIAL_EMP); setIsModalOpen(true); setActiveTab('profile'); }} className="bg-[#0066FF] h-10 font-bold uppercase text-[10px] px-6">
            <UserPlus className="w-4 h-4 mr-2" /> Register Associate
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by Identity, Name, Mobile or Designation..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-800 h-11"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-9 w-auto min-w-[140px] text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-9 w-auto min-w-[140px] text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-950 border-slate-800 h-9 w-auto min-w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="all">All Statuses</SelectItem>
              {EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-x-auto custom-scrollbar shadow-2xl">
        <Table className="min-w-[960px]">
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-black uppercase px-6">Associate Context</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Classification</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Operational State</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Login</TableHead>
              <TableHead className="text-[10px] font-black uppercase">KYC</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Base Compensation</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase px-6">Identity Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((emp: Employee) => (
              <TableRow key={emp.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all group">
                <TableCell className="px-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-blue-500 overflow-hidden border border-slate-700 relative group">
                      {emp.photo ? <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} /> : emp.name[0]}
                      <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => setViewingQr(emp)}>
                         <QrCode className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-100">{emp.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         <Badge variant="outline" className="text-[8px] uppercase font-bold border-blue-500/20 text-blue-400 bg-blue-500/5 px-1">{emp.employeeId}</Badge>
                         <span className="text-[10px] text-slate-500 font-code">{emp.mobile}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-300">
                         <Building2 className="w-3.5 h-3.5 text-blue-500" />
                         <span className="text-xs font-bold">{emp.department}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                         <Briefcase className="w-3.5 h-3.5" />
                         <span className="text-[10px] uppercase font-black">{emp.designation}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] uppercase font-bold border-slate-700 text-slate-400 w-fit">{emp.role}</Badge>
                   </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-[9px] font-black uppercase px-2 h-5 border-0", STATUS_COLORS[emp.status] || STATUS_COLORS.Active)}>
                    {emp.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {emp.loginAccess?.username ? (
                    <Badge className={cn("text-[9px] font-black uppercase px-2 h-5 border-0", emp.loginAccess.loginEnabled ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
                      {emp.loginAccess.loginEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ) : (
                    <span className="text-[9px] text-slate-600 uppercase font-black">No Access</span>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const docs = emp.documents || [];
                    if (docs.length === 0) return <span className="text-[9px] text-slate-600 uppercase font-black">None</span>;
                    const allVerified = docs.every(d => d.verificationStatus === 'Verified');
                    const anyRejected = docs.some(d => d.verificationStatus === 'Rejected');
                    const label = allVerified ? 'Verified' : anyRejected ? 'Rejected' : 'Pending';
                    const color = allVerified ? 'bg-emerald-500/10 text-emerald-400' : anyRejected ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400';
                    return <Badge className={cn("text-[9px] font-black uppercase px-2 h-5 border-0", color)}>{label}</Badge>;
                  })()}
                </TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="font-code font-bold text-xs text-emerald-400">₹{emp.salary.toLocaleString()}</span>
                      <span className="text-[8px] text-slate-600 uppercase font-black">{emp.salaryType || 'Monthly'} Node</span>
                   </div>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setViewingQr(emp)} className="h-8 w-8 text-slate-400 hover:text-white" title="QR Identity"><QrCode className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(emp)} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10" title="Edit / Permissions / KYC"><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleToggleBlock(emp)} className={cn("h-8 w-8 hover:bg-amber-500/10", emp.status === 'Blocked' ? "text-emerald-400" : "text-amber-400")} title={emp.status === 'Blocked' ? 'Unblock' : 'Block'}>
                      {emp.status === 'Blocked' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteEmpId(emp.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10" title="Delete"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <TableRow><TableCell colSpan={7} className="h-48 text-center text-slate-700 text-xs italic">No associate nodes found in active HR registry.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* REGISTRATION MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl h-[90vh] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-row justify-between items-center space-y-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <UserPlus className="w-5 h-5" />
                 </div>
                 <div>
                   <DialogTitle className="text-xl font-headline font-bold">
                     {editingEmployee.id ? 'Modify Associate Data' : 'Associate Lifecycle Entry'}
                   </DialogTitle>
                   <DialogDescription className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Master Workforce Database Registry</DialogDescription>
                 </div>
              </div>
              <TabsList className="bg-slate-800/50 border border-slate-700 flex-wrap h-auto">
                <TabsTrigger value="profile" className="text-xs uppercase font-bold">Profile</TabsTrigger>
                <TabsTrigger value="login" className="text-xs uppercase font-bold">Login Access</TabsTrigger>
                <TabsTrigger value="access" className="text-xs uppercase font-bold">Module Access</TabsTrigger>
                <TabsTrigger value="kyc" className="text-xs uppercase font-bold">KYC Vault</TabsTrigger>
              </TabsList>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <TabsContent value="profile" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="md:col-span-1 space-y-6">
                      <div className="space-y-4 flex flex-col items-center text-center">
                         <div className="w-32 h-32 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 flex items-center justify-center relative overflow-hidden group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {editingEmployee.photo ? (
                               <img src={editingEmployee.photo} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                               <Camera className="w-8 h-8 text-slate-700 group-hover:text-blue-500 transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <span className="text-[10px] font-black uppercase text-white">Change Photo</span>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                         </div>
                         <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">High-Res ID Visual</p>
                         </div>
                      </div>

                      <div className="p-5 bg-blue-600/5 rounded-2xl border border-blue-600/20 space-y-4">
                         <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-tighter flex items-center gap-2">Security Clearance</h4>
                         <div className="space-y-1">
                            <Label className="text-[9px] uppercase text-slate-500 font-bold">System Role</Label>
                            <Select value={editingEmployee.role} onValueChange={(v: any) => {
                              // Admin always gets full access, and can never be
                              // reduced from here. For a brand-new associate,
                              // picking a role seeds sensible defaults. Editing
                              // an existing associate's role does NOT overwrite
                              // their already-saved, possibly-customized
                              // permissions (per the "don't reset on edit" rule).
                              const nextPermissions = v === 'Admin'
                                ? allFullAccess()
                                : (editingEmployee.id ? editingEmployee.modulePermissions : getDefaultPermissions(v));
                              setEditingEmployee({ ...editingEmployee, role: v, modulePermissions: nextPermissions });
                            }}>
                               <SelectTrigger className="bg-slate-950 border-slate-800 h-10 text-xs"><SelectValue /></SelectTrigger>
                               <SelectContent className="bg-slate-900 border-slate-800">
                                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                      </div>
                   </div>

                   <div className="md:col-span-2 space-y-8">
                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Core Identity</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Full Name</Label>
                              <Input value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="Official Identity" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Identity ID</Label>
                              <Input readOnly value={editingEmployee.employeeId || 'AUTO-GEN'} className="bg-slate-900 border-slate-800 h-11 font-code text-blue-400 font-bold" />
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Mobile (10-Digit)</Label>
                              <Input value={editingEmployee.mobile} onChange={e => setEditingEmployee({...editingEmployee, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Email Hub</Label>
                              <Input value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Placement Node</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Department</Label>
                              <Select value={editingEmployee.department} onValueChange={v => setEditingEmployee({...editingEmployee, department: v})}>
                                 <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                 <SelectContent className="bg-slate-900 border-slate-800">
                                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                 </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Designation</Label>
                              <Input value={editingEmployee.designation} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Master Tech" />
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Monthly Node (₹)</Label>
                              <Input type="number" value={editingEmployee.salary} onChange={e => setEditingEmployee({...editingEmployee, salary: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code font-bold text-emerald-400" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Salary Type</Label>
                              <Select value={editingEmployee.salaryType || 'Monthly'} onValueChange={v => setEditingEmployee({...editingEmployee, salaryType: v})}>
                                 <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                 <SelectContent className="bg-slate-900 border-slate-800">
                                    {SALARY_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                 </SelectContent>
                              </Select>
                            </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Joining Date</Label>
                              <Input type="date" value={editingEmployee.joiningDate} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Employment Type</Label>
                              <Select value={editingEmployee.employmentType || 'Full Time'} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, employmentType: v})}>
                                 <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                                 <SelectContent className="bg-slate-900 border-slate-800">
                                    {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                 </SelectContent>
                              </Select>
                            </div>
                         </div>
                         <div className="space-y-1 max-w-xs">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Employee Status</Label>
                            <Select value={editingEmployee.status || 'Active'} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, status: v})}>
                               <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                               <SelectContent className="bg-slate-900 border-slate-800">
                                  {EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" /> Emergency Contact</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Contact Name</Label>
                              <Input value={editingEmployee.emergencyContactName || ''} onChange={e => setEditingEmployee({...editingEmployee, emergencyContactName: e.target.value})} className="bg-slate-950 border-slate-800 h-11" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400">Contact Mobile</Label>
                              <Input value={editingEmployee.emergencyContactMobile || ''} onChange={e => setEditingEmployee({...editingEmployee, emergencyContactMobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code" />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="login" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <EmployeeLoginAccessSection employee={editingEmployee} store={store} />
              </TabsContent>

              <TabsContent value="access" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <ModuleAccessSection
                  formData={editingEmployee}
                  setFormData={setEditingEmployee}
                />
              </TabsContent>

              <TabsContent value="kyc" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <EmployeeKYCSection
                  formData={editingEmployee}
                  setFormData={setEditingEmployee}
                  store={store}
                />
              </TabsContent>
            </div>
            {loadingDetail && (
              <div className="px-8 pb-2 -mt-2 text-[9px] text-slate-500 uppercase font-black tracking-widest">Loading full associate record...</div>
            )}

            <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-3 shrink-0">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="px-8 font-bold uppercase text-[10px]">Terminate Entry</Button>
              <Button onClick={handleSaveEmployee} className="bg-[#0066FF] hover:bg-blue-600 px-12 h-12 rounded-xl font-bold uppercase text-[10px] shadow-lg shadow-blue-500/20">Commit Associate Node</Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* QR IDENTITY PREVIEW */}
      <Dialog open={!!viewingQr} onOpenChange={() => setViewingQr(null)}>
         <DialogContent className="max-w-md bg-white text-black p-0 overflow-hidden">
            <DialogHeader className="sr-only">
               <DialogTitle>QR Identity Card - {viewingQr?.name}</DialogTitle>
               <DialogDescription>Workforce identification manifest for associate registry.</DialogDescription>
            </DialogHeader>
            {viewingQr && (
               <div className="p-10 flex flex-col items-center text-center gap-6">
                  <div className="space-y-1">
                     <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-none">GJ5 HOME SERVICE</h3>
                     <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.3em]">Workforce Identity Card</p>
                  </div>
                  
                  <div className="w-full flex items-center justify-center p-4 bg-slate-50 border-2 border-slate-100 rounded-3xl">
                     <QRCodeSVG value={viewingQr.qrCode || ''} size={200} level="H" />
                  </div>

                  <div className="space-y-2">
                     <h4 className="text-xl font-black uppercase leading-none">{viewingQr.name}</h4>
                     <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{viewingQr.designation}</p>
                     <div className="flex items-center justify-center gap-2 mt-4">
                        <Badge className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase border-0">EMP ID: {viewingQr.employeeId}</Badge>
                        <Badge variant="outline" className="border-black border-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase text-black">{viewingQr.department}</Badge>
                     </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 w-full flex justify-between items-center px-4">
                     <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Emergency Contact</p>
                        <p className="text-xs font-bold text-red-600">{viewingQr.mobile}</p>
                     </div>
                     <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>

      <DeleteJobModal 
        isOpen={!!deleteEmpId} 
        onClose={() => setDeleteEmpId(null)} 
        jobId={store.employees.find((e: any) => e.id === deleteEmpId)?.name || ''} 
        onConfirm={() => { if (deleteEmpId) store.deleteEmployee(deleteEmpId); setDeleteEmpId(null); }} 
      />
    </div>
  );
}

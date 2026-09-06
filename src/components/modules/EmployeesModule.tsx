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
  Briefcase,
  FileDown,
  Camera,
  QrCode,
  Building2,
  MoreVertical,
  CheckCircle2,
  Lock,
  Unlock,
  Filter,
  KeyRound,
  History,
  Ban,
  RotateCcw,
  Eye,
  MapPin,
  Contact,
  IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Employee, EmployeeStatus, EmploymentType, UserRole } from '@/lib/types';
import { allFullAccess, getDefaultPermissions, PRESET_ROLES } from '@/lib/permissions';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { EmployeeKYCSection } from './employees/EmployeeKYCSection';
import { ModuleAccessSection } from './employees/ModuleAccessSection';
import { EmployeeLoginAccessSection } from './employees/EmployeeLoginAccessSection';
import { EmployeeActivitySection } from './employees/EmployeeActivitySection';

const INITIAL_EMP: Partial<Employee> = {
  name: '', mobile: '', email: '', designation: 'Technician', department: 'Service',
  status: 'Active', salary: 0, role: 'Employee', employmentType: 'Full Time', salaryType: 'Monthly',
  joiningDate: format(new Date(), 'yyyy-MM-dd'),
  modulePermissions: getDefaultPermissions('Employee'),
};

const DEPARTMENTS = ['Service', 'Sales', 'Repair', 'Delivery', 'Accounts', 'HR', 'Stock', 'Admin', 'Other'];
const DESIGNATIONS = [
  'Technician', 'Senior Technician', 'Service Manager', 'Sales Executive', 'Delivery Executive',
  'Accountant', 'HR Executive', 'Store Manager', 'Admin', 'Other',
];
const ROLES: UserRole[] = [...PRESET_ROLES];
const CUSTOM_ROLE = '__custom__';
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['Full Time', 'Part Time', 'Contract', 'Temporary'];
const EMPLOYEE_STATUSES: EmployeeStatus[] = ['Active', 'Inactive', 'Suspended', 'Resigned', 'Terminated'];
const SALARY_TYPES = ['Monthly', 'Daily', 'Hourly', 'Commission'];

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  Active: 'bg-emerald-500/10 text-emerald-400',
  Inactive: 'bg-slate-500/10 text-slate-300',
  Suspended: 'bg-amber-500/10 text-amber-400',
  Resigned: 'bg-orange-500/10 text-orange-400',
  Terminated: 'bg-rose-500/10 text-rose-400',
};

// Every distinct card inside the Profile tab (Basic Information, Employment
// Information, Emergency Contact) uses this exact header shape — the same
// icon-badge + title + subtitle pattern already established by the Login &
// Security / Permissions / KYC Vault / Activity tabs — so the whole modal
// reads as one consistent, professional form rather than a flat list of
// inputs with ad-hoc <h4> labels.
function ProfileSectionCard({
  icon: Icon,
  color,
  title,
  subtitle,
  children,
}: {
  icon: typeof Building2;
  color: 'blue' | 'violet' | 'rose';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    violet: 'bg-violet-500/10 text-violet-400',
    rose: 'bg-rose-500/10 text-rose-400',
  }[color];
  return (
    <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className={cn('p-2 rounded-lg', colorClasses)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-headline font-bold text-white">{title}</h3>
          <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function EmployeesModule({ store }: { store: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>(INITIAL_EMP);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null);
  const [terminateEmpId, setTerminateEmpId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingQr, setViewingQr] = useState<Employee | null>(null);
  const [customRoleDraft, setCustomRoleDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // KYC Vault and Audit Logs are their own permission modules, separate from
  // the generic Employees grid — these tabs are hidden here as a UI
  // convenience for whoever is currently logged in, but the real boundary is
  // server-side: every /api/erp/employees/:id/documents* and .../audit route
  // independently checks its own permission and 403s regardless of what
  // these tabs show.
  const canAccessKyc = !store.session?.permissions || !!store.session.permissions['KYC Vault']?.view;
  const canAccessAuditLogs = !store.session?.permissions || !!store.session.permissions['Audit Logs']?.view;

  const roleOptions = useMemo(() => {
    const known = new Set<string>(ROLES);
    (store.employees || []).forEach((e: Employee) => { if (e.role) known.add(e.role); });
    return Array.from(known);
  }, [store.employees]);

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
    setCustomRoleDraft(ROLES.includes(emp.role) ? '' : (emp.role || ''));
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
    const employeeId = editingEmployee.employeeId || `EMP${String(store.employees.length + 1001)}`;
    const role = editingEmployee.role || 'Employee';

    const finalEmp = {
      ...editingEmployee,
      id: editingEmployee.id || `EMP-${Date.now()}`,
      employeeId,
      qrCode: `GJ5-IDENTITY-${employeeId}`,
      createdAt: editingEmployee.createdAt || new Date().toISOString(),
      role,
      // Admin/Super Admin must never be saved with reduced access, regardless
      // of what the permission grid happens to show — enforced here as a
      // hard safety net (the server enforces this again independently in
      // enforceRolePermissions()), not just in the UI.
      modulePermissions: (role === 'Admin' || role === 'Super Admin') ? allFullAccess() : (editingEmployee.modulePermissions || getDefaultPermissions(role)),
    } as Employee;

    try {
      if (isNew) {
        // createEmployee() persists modulePermissions inline as part of the
        // same insert transaction — nothing further needed for a brand-new
        // associate.
        await store.addEmployee(finalEmp);
      } else {
        // updateEmployee() only ever touches the `employees` row itself — it
        // deliberately does not know about the separate `employee_permissions`
        // table, so any edits made in the Permissions tab (including Enable
        // All/Disable All/Reset to Role Defaults) must be persisted through
        // their own dedicated endpoint or they would silently vanish on save.
        await store.updateEmployee(finalEmp);
        await store.saveEmployeePermissions(finalEmp.id, finalEmp.modulePermissions);
      }
      setIsModalOpen(false);
      setEditingEmployee(INITIAL_EMP);
      toast({ title: "Ledger Updated", description: `Associate ${finalEmp.name} registered in Master HR Node.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err?.message || `Could not save ${finalEmp.name} to the server. Please try again.` });
    }
  };

  // Shared by the Profile tab's "System Role" picker and the Login &
  // Security tab's "Role" picker — both edit the exact same
  // editingEmployee.role field, so they always stay in sync no matter which
  // tab the Admin used.
  const handleRoleChange = (v: string) => {
    if (v === CUSTOM_ROLE) {
      setEditingEmployee({ ...editingEmployee, role: customRoleDraft || '' });
      return;
    }
    // Admin/Super Admin always get full access, and can never be reduced
    // from here. For a brand-new associate, picking a role seeds sensible
    // defaults. Editing an existing associate's role does NOT overwrite
    // their already-saved, possibly-customized permissions (per the
    // "don't reset on edit" rule).
    const nextPermissions = (v === 'Admin' || v === 'Super Admin')
      ? allFullAccess()
      : (editingEmployee.id ? editingEmployee.modulePermissions : getDefaultPermissions(v));
    setEditingEmployee({ ...editingEmployee, role: v, modulePermissions: nextPermissions });
  };

  const handleCustomRoleChange = (v: string) => {
    setCustomRoleDraft(v);
    setEditingEmployee({ ...editingEmployee, role: v, modulePermissions: editingEmployee.id ? editingEmployee.modulePermissions : getDefaultPermissions(v) });
  };

  const handleChangeStatus = async (emp: Employee, nextStatus: EmployeeStatus) => {
    try {
      await store.changeEmployeeStatus(emp.id, nextStatus);
      toast({ title: `Associate ${nextStatus}`, description: `${emp.name} is now ${nextStatus}.` });
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
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Industrial Associate Registry V3.2</p>
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
              {roleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
              <TableHead className="text-[10px] font-black uppercase">Last Login</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase px-6">Actions</TableHead>
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
                         <span className="text-[10px] text-slate-400 font-code">{emp.mobile}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-200">
                         <Building2 className="w-3.5 h-3.5 text-blue-500" />
                         <span className="text-xs font-bold">{emp.department}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                         <Briefcase className="w-3.5 h-3.5" />
                         <span className="text-[10px] uppercase font-black">{emp.designation}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] uppercase font-bold border-slate-700 text-slate-300 w-fit">{emp.role}</Badge>
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
                    <span className="text-[9px] text-slate-400 uppercase font-black">No Access</span>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const docs = emp.documents || [];
                    if (docs.length === 0) return <span className="text-[9px] text-slate-400 uppercase font-black">None</span>;
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
                      <span className="text-[8px] text-slate-400 uppercase font-black">{emp.salaryType || 'Monthly'} Node</span>
                   </div>
                </TableCell>
                <TableCell>
                  <span className="text-[10px] text-slate-300 font-code">
                    {emp.loginAccess?.lastLoginAt ? new Date(emp.loginAccess.lastLoginAt).toLocaleString() : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(emp)} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10" title="View / Edit"><Eye className="w-4 h-4" /></Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:bg-slate-800 hover:text-white" title="More Actions">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-100 w-56">
                        <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => openEditModal(emp)}>
                          <Edit className="w-3.5 h-3.5" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => { openEditModal(emp); setActiveTab('login'); }}>
                          <KeyRound className="w-3.5 h-3.5" /> Login Account
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => { openEditModal(emp); setActiveTab('login'); }}>
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => { openEditModal(emp); setActiveTab('access'); }}>
                          <ShieldCheck className="w-3.5 h-3.5" /> Permissions
                        </DropdownMenuItem>
                        {canAccessKyc && (
                          <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => { openEditModal(emp); setActiveTab('kyc'); }}>
                            <ShieldCheck className="w-3.5 h-3.5" /> KYC Vault
                          </DropdownMenuItem>
                        )}
                        {canAccessAuditLogs && (
                          <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => { openEditModal(emp); setActiveTab('activity'); }}>
                            <History className="w-3.5 h-3.5" /> Activity Log
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-xs gap-2 focus:bg-slate-800 focus:text-white" onClick={() => setViewingQr(emp)}>
                          <QrCode className="w-3.5 h-3.5" /> QR Identity Card
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        {emp.status === 'Active' ? (
                          <DropdownMenuItem className="text-xs gap-2 text-amber-400 focus:bg-amber-500/10 focus:text-amber-400" onClick={() => handleChangeStatus(emp, 'Inactive')}>
                            <Lock className="w-3.5 h-3.5" /> Disable
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-xs gap-2 text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-400" onClick={() => handleChangeStatus(emp, 'Active')}>
                            <Unlock className="w-3.5 h-3.5" /> Enable
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-xs gap-2 text-orange-400 focus:bg-orange-500/10 focus:text-orange-400" onClick={() => setTerminateEmpId(emp.id)}>
                          <Ban className="w-3.5 h-3.5" /> Terminate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-800" />
                        <DropdownMenuItem className="text-xs gap-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-400" onClick={() => setDeleteEmpId(emp.id)}>
                          <Trash2 className="w-3.5 h-3.5" /> Delete Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <TableRow><TableCell colSpan={8} className="h-48 text-center text-slate-500 text-xs italic">No associate nodes found in active HR registry.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* REGISTRATION MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl w-[calc(100%-1.5rem)] sm:w-full bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl h-[92vh] sm:h-[90vh] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <DialogHeader className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 space-y-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                    <UserPlus className="w-5 h-5" />
                 </div>
                 <div className="min-w-0">
                   <DialogTitle className="text-lg sm:text-xl font-headline font-bold text-white truncate">
                     {editingEmployee.id ? 'Modify Associate Data' : 'Associate Lifecycle Entry'}
                   </DialogTitle>
                   <DialogDescription className="text-[10px] text-slate-300 uppercase font-black tracking-widest">Master Workforce Database Registry</DialogDescription>
                 </div>
              </div>
              <TabsList className="bg-slate-800/50 border border-slate-700 flex-wrap h-auto justify-start w-full lg:w-auto">
                <TabsTrigger value="profile" className="text-xs uppercase font-bold text-slate-300 data-[state=active]:text-white">Profile</TabsTrigger>
                <TabsTrigger value="login" className="text-xs uppercase font-bold text-slate-300 data-[state=active]:text-white">Login &amp; Security</TabsTrigger>
                <TabsTrigger value="access" className="text-xs uppercase font-bold text-slate-300 data-[state=active]:text-white">Permissions</TabsTrigger>
                {canAccessKyc && <TabsTrigger value="kyc" className="text-xs uppercase font-bold text-slate-300 data-[state=active]:text-white">KYC Vault</TabsTrigger>}
                {canAccessAuditLogs && <TabsTrigger value="activity" className="text-xs uppercase font-bold text-slate-300 data-[state=active]:text-white">Activity</TabsTrigger>}
              </TabsList>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
              <TabsContent value="profile" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <ProfileSectionCard icon={Contact} color="blue" title="Basic Information" subtitle="Identity, contact & address">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1 space-y-4 flex flex-col items-center text-center">
                         <div className="w-32 h-32 rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 flex items-center justify-center relative overflow-hidden group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {editingEmployee.photo ? (
                               <img src={editingEmployee.photo} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                               <Camera className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                               <span className="text-[10px] font-black uppercase text-white">Change Photo</span>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                         </div>
                         <div className="w-full space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-slate-300 flex items-center justify-center gap-1"><IdCard className="w-3 h-3" /> Employee ID</Label>
                            <Input readOnly value={editingEmployee.employeeId || 'EMP1001 (Auto-Generated)'} className="bg-slate-900 border-slate-800 h-10 font-code text-blue-400 font-bold text-center text-xs" />
                         </div>
                      </div>

                      <div className="md:col-span-2 space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">Full Name</Label>
                              <Input value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-slate-100 placeholder:text-slate-500" placeholder="Official Identity" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">Mobile (10-Digit)</Label>
                              <Input value={editingEmployee.mobile} onChange={e => setEditingEmployee({...editingEmployee, mobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code text-slate-100" maxLength={10} />
                            </div>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">Email Address</Label>
                              <Input type="email" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs text-slate-100" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">Date of Birth</Label>
                              <Input type="date" value={editingEmployee.dateOfBirth || ''} onChange={e => setEditingEmployee({...editingEmployee, dateOfBirth: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs text-slate-100" />
                            </div>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">Gender</Label>
                              <Select value={editingEmployee.gender || ''} onValueChange={v => setEditingEmployee({...editingEmployee, gender: v})}>
                                 <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue placeholder="Select" /></SelectTrigger>
                                 <SelectContent className="bg-slate-900 border-slate-800">
                                    {GENDERS.map(g => <SelectItem key={g} value={g} className="text-slate-100 focus:bg-slate-800 focus:text-white">{g}</SelectItem>)}
                                 </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1"><MapPin className="w-3 h-3" /> Pincode</Label>
                              <Input value={editingEmployee.pincode || ''} onChange={e => setEditingEmployee({...editingEmployee, pincode: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code text-slate-100" maxLength={6} />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-300">Address</Label>
                            <Input value={editingEmployee.currentAddress || ''} onChange={e => setEditingEmployee({...editingEmployee, currentAddress: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-slate-100 placeholder:text-slate-500" placeholder="House/Street, Area" />
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">City</Label>
                              <Input value={editingEmployee.city || ''} onChange={e => setEditingEmployee({...editingEmployee, city: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-slate-100" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-300">State</Label>
                              <Input value={editingEmployee.state || ''} onChange={e => setEditingEmployee({...editingEmployee, state: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-slate-100" />
                            </div>
                         </div>
                      </div>
                   </div>
                </ProfileSectionCard>

                <ProfileSectionCard icon={Briefcase} color="violet" title="Employment Information" subtitle="Role, placement & compensation">
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Department</Label>
                        <Select value={editingEmployee.department} onValueChange={v => setEditingEmployee({...editingEmployee, department: v})}>
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="text-slate-100 focus:bg-slate-800 focus:text-white">{d}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Designation</Label>
                        <Select
                          value={DESIGNATIONS.includes(editingEmployee.designation || '') ? editingEmployee.designation : 'Other'}
                          onValueChange={v => setEditingEmployee({...editingEmployee, designation: v === 'Other' ? '' : v})}
                        >
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {DESIGNATIONS.map(d => <SelectItem key={d} value={d} className="text-slate-100 focus:bg-slate-800 focus:text-white">{d}</SelectItem>)}
                           </SelectContent>
                        </Select>
                        {!DESIGNATIONS.includes(editingEmployee.designation || '') && (
                          <Input
                            value={editingEmployee.designation || ''}
                            onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})}
                            placeholder="Enter custom designation"
                            className="bg-slate-950 border-slate-800 h-9 text-xs mt-2 text-slate-100 placeholder:text-slate-500"
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Employee Role</Label>
                        <Select
                          value={ROLES.includes(editingEmployee.role || '') ? editingEmployee.role : CUSTOM_ROLE}
                          onValueChange={handleRoleChange}
                        >
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {ROLES.map(r => <SelectItem key={r} value={r} className="text-slate-100 focus:bg-slate-800 focus:text-white">{r}</SelectItem>)}
                              <SelectItem value={CUSTOM_ROLE} className="text-slate-100 focus:bg-slate-800 focus:text-white">Custom Role...</SelectItem>
                           </SelectContent>
                        </Select>
                        {!ROLES.includes(editingEmployee.role || '') && (
                          <Input
                            value={customRoleDraft}
                            onChange={(e) => handleCustomRoleChange(e.target.value)}
                            placeholder="Enter custom role name"
                            className="bg-slate-950 border-slate-800 h-9 text-xs mt-2 text-slate-100 placeholder:text-slate-500"
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Employment Type</Label>
                        <Select value={editingEmployee.employmentType || 'Full Time'} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, employmentType: v})}>
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-slate-100 focus:bg-slate-800 focus:text-white">{t}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Salary Type</Label>
                        <Select value={editingEmployee.salaryType || 'Monthly'} onValueChange={v => setEditingEmployee({...editingEmployee, salaryType: v})}>
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {SALARY_TYPES.map(s => <SelectItem key={s} value={s} className="text-slate-100 focus:bg-slate-800 focus:text-white">{s}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Salary (₹)</Label>
                        <Input type="number" value={editingEmployee.salary} onChange={e => setEditingEmployee({...editingEmployee, salary: Number(e.target.value)})} className="bg-slate-950 border-slate-800 h-11 font-code font-bold text-emerald-400" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Joining Date</Label>
                        <Input type="date" value={editingEmployee.joiningDate} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs text-slate-100" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Employee Status</Label>
                        <Select value={editingEmployee.status || 'Active'} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, status: v})}>
                           <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-slate-100"><SelectValue /></SelectTrigger>
                           <SelectContent className="bg-slate-900 border-slate-800">
                              {EMPLOYEE_STATUSES.map(s => <SelectItem key={s} value={s} className="text-slate-100 focus:bg-slate-800 focus:text-white">{s}</SelectItem>)}
                           </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Login Status</Label>
                        <div className="h-11 flex items-center px-3 bg-slate-950 border border-slate-800 rounded-md">
                           {editingEmployee.loginAccess?.username ? (
                             <Badge className={cn('text-[10px] font-black uppercase px-2 h-5 border-0', editingEmployee.loginAccess.loginEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                               {editingEmployee.loginAccess.loginEnabled ? 'Enabled' : 'Disabled'}
                             </Badge>
                           ) : (
                             <span className="text-xs text-slate-400 italic">No login account — see Login &amp; Security tab</span>
                           )}
                        </div>
                      </div>
                   </div>
                </ProfileSectionCard>

                <ProfileSectionCard icon={Smartphone} color="rose" title="Emergency Contact" subtitle="Who to reach in a workplace emergency">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Contact Name</Label>
                        <Input value={editingEmployee.emergencyContactName || ''} onChange={e => setEditingEmployee({...editingEmployee, emergencyContactName: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-slate-100" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-300">Contact Mobile</Label>
                        <Input value={editingEmployee.emergencyContactMobile || ''} onChange={e => setEditingEmployee({...editingEmployee, emergencyContactMobile: e.target.value})} className="bg-slate-950 border-slate-800 h-11 font-code text-slate-100" />
                      </div>
                   </div>
                </ProfileSectionCard>
              </TabsContent>

              <TabsContent value="login" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <EmployeeLoginAccessSection
                  employee={editingEmployee}
                  store={store}
                  onRoleChange={handleRoleChange}
                  onCustomRoleChange={handleCustomRoleChange}
                  customRoleDraft={customRoleDraft}
                />
              </TabsContent>

              <TabsContent value="access" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                <ModuleAccessSection
                  formData={editingEmployee}
                  setFormData={setEditingEmployee}
                />
              </TabsContent>

              {canAccessKyc && (
                <TabsContent value="kyc" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                  <EmployeeKYCSection
                    formData={editingEmployee}
                    setFormData={setEditingEmployee}
                    store={store}
                  />
                </TabsContent>
              )}

              {canAccessAuditLogs && (
                <TabsContent value="activity" className="mt-0 animate-in fade-in slide-in-from-bottom-2">
                  <EmployeeActivitySection employee={editingEmployee} store={store} />
                </TabsContent>
              )}
            </div>
            {loadingDetail && (
              <div className="px-8 pb-2 -mt-2 text-[9px] text-slate-400 uppercase font-black tracking-widest">Loading full associate record...</div>
            )}

            <DialogFooter className="p-4 sm:p-6 md:p-8 border-t border-slate-800 bg-slate-900/50 flex flex-row gap-3 shrink-0">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none px-8 font-bold uppercase text-[10px] text-slate-300 hover:text-white">Cancel</Button>
              <Button onClick={handleSaveEmployee} className="flex-1 sm:flex-none bg-[#0066FF] hover:bg-blue-600 px-12 h-12 rounded-xl font-bold uppercase text-[10px] text-white shadow-lg shadow-blue-500/20">Save Associate</Button>
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

      {/* Terminate is a soft, reversible status change (unlike Delete, which
          removes the DB row entirely) — still routed through the same
          master-password confirmation gate since it's a serious HR action. */}
      <DeleteJobModal
        isOpen={!!terminateEmpId}
        onClose={() => setTerminateEmpId(null)}
        jobId={store.employees.find((e: any) => e.id === terminateEmpId)?.name || ''}
        onConfirm={() => {
          const emp = store.employees.find((e: any) => e.id === terminateEmpId);
          if (emp) handleChangeStatus(emp, 'Terminated');
          setTerminateEmpId(null);
        }}
      />
    </div>
  );
}

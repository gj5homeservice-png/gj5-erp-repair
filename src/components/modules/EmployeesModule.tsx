"use client"

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  DollarSign, 
  Smartphone,
  Calendar,
  Briefcase,
  UserCheck,
  XCircle,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import { format } from 'date-fns';
import { Employee } from '@/lib/types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { DeleteJobModal } from './repairing/DeleteJobModal';

const INITIAL_EMP: Partial<Employee> = {
  name: '', mobile: '', designation: 'Technician', status: 'Active', salary: 0, joiningDate: format(new Date(), 'yyyy-MM-dd')
};

export function EmployeesModule({ store }: { store: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>(INITIAL_EMP);
  const [deleteEmpId, setDeleteEmpId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const filteredEmployees = useMemo(() => {
    return (store.employees || []).filter((emp: Employee) => 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.mobile.includes(searchQuery)
    );
  }, [store.employees, searchQuery]);

  const handleSaveEmployee = () => {
    if (!editingEmployee.name || !editingEmployee.mobile) {
      toast({ variant: "destructive", title: "Validation Error", description: "Name and Mobile are mandatory." });
      return;
    }

    const isNew = !editingEmployee.id;
    const employeeId = editingEmployee.employeeId || `EMP${String(store.employees.length + 1001)}`;
    const finalEmp = {
      ...editingEmployee,
      id: editingEmployee.id || `EMP-${Date.now()}`,
      employeeId,
      status: editingEmployee.status || 'Active'
    } as Employee;

    if (isNew) store.addEmployee(finalEmp);
    else store.updateEmployee(finalEmp);

    setIsModalOpen(false);
    setEditingEmployee(INITIAL_EMP);
    toast({ title: "Success", description: `Employee ${finalEmp.name} ${isNew ? 'registered' : 'updated'}.` });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(store.employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "GJ5_Employee_Registry.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("GJ5 HOME SERVICE - EMPLOYEE REGISTRY", 10, 10);
    let y = 20;
    store.employees.forEach((emp: Employee, i: number) => {
      doc.text(`${i+1}. ${emp.employeeId} - ${emp.name} (${emp.designation})`, 10, y);
      y += 10;
    });
    doc.save("GJ5_Employee_Registry.pdf");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Workforce Registry</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">HR Life-cycle Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel} className="border-slate-800 h-10 font-bold uppercase text-[10px]">
            <FileDown className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => { setEditingEmployee(INITIAL_EMP); setIsModalOpen(true); }} className="bg-[#0066FF] h-10 font-bold uppercase text-[10px]">
            <UserPlus className="w-4 h-4 mr-2" /> Register Employee
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search by Name, ID or Mobile..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-slate-950 border-slate-800 h-11" 
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="border-slate-800">
              <TableHead className="text-[10px] font-bold uppercase px-6">Associate Node</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Designation</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
              <TableHead className="text-[10px] font-bold uppercase">Financials</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((emp: Employee) => (
              <TableRow key={emp.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all">
                <TableCell className="px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-blue-500">
                      {emp.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{emp.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{emp.employeeId} • {emp.mobile}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                   <div className="flex items-center gap-2 text-slate-300">
                      <Briefcase className="w-3 h-3 text-blue-400" />
                      <span className="text-xs">{emp.designation}</span>
                   </div>
                </TableCell>
                <TableCell>
                  <Badge variant={emp.status === 'Active' ? 'default' : 'secondary'} className={cn("text-[9px] uppercase font-black", emp.status === 'Active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                    {emp.status}
                  </Badge>
                </TableCell>
                <TableCell>
                   <div className="flex flex-col">
                      <span className="font-code font-bold text-xs text-emerald-400">₹{emp.salary.toLocaleString()}</span>
                      <span className="text-[8px] text-slate-600 uppercase font-black">Base Salary</span>
                   </div>
                </TableCell>
                <TableCell className="text-right px-6">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }} className="h-8 w-8 text-blue-400"><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteEmpId(emp.id)} className="h-8 w-8 text-rose-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500 italic">No employees found in registry.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingEmployee.id ? 'Edit Employee Details' : 'Register New Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} className="bg-slate-900 border-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Mobile</Label>
                <Input value={editingEmployee.mobile} onChange={e => setEditingEmployee({...editingEmployee, mobile: e.target.value})} className="bg-slate-900 border-slate-800" />
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Input value={editingEmployee.designation} onChange={e => setEditingEmployee({...editingEmployee, designation: e.target.value})} className="bg-slate-900 border-slate-800" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Monthly Salary (₹)</Label>
                <Input type="number" value={editingEmployee.salary} onChange={e => setEditingEmployee({...editingEmployee, salary: Number(e.target.value)})} className="bg-slate-900 border-slate-800" />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editingEmployee.status} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, status: v})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Joining Date</Label>
              <Input type="date" value={editingEmployee.joiningDate} onChange={e => setEditingEmployee({...editingEmployee, joiningDate: e.target.value})} className="bg-slate-900 border-slate-800 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEmployee} className="bg-blue-600 hover:bg-blue-700">Commit Record</Button>
          </DialogFooter>
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
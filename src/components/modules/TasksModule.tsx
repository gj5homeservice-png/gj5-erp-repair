"use client"

import React, { useState, useMemo } from 'react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  User,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  Package,
  MapPin,
  Tag,
  ArrowRight,
  ShieldCheck
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, isPast, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmployeeTask, TaskStatus, TaskPriority, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const STATUS_OPTIONS: { value: TaskStatus; color: string; bg: string }[] = [
  { value: 'Pending', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { value: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { value: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { value: 'Cancelled', color: 'text-rose-400', bg: 'bg-rose-400/10' }
];

const PRIORITY_OPTIONS: { value: TaskPriority; color: string }[] = [
  { value: 'Low', color: 'text-slate-400' },
  { value: 'Medium', color: 'text-blue-400' },
  { value: 'High', color: 'text-amber-500' },
  { value: 'Critical', color: 'text-rose-600' }
];

const INITIAL_TASK: Partial<EmployeeTask> = {
  title: '', description: '', customerName: '', customerMobile: '', address: '',
  category: 'TV Repair', assignedToId: '', priority: 'Medium', status: 'Pending',
  dueDate: format(new Date(), 'yyyy-MM-dd'),
};

export function TasksModule({ store }: { store: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<EmployeeTask> | null>(null);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const all = store.tasks || [];
    const total = all.length;
    const completed = all.filter((t: any) => t.status === 'Completed').length;
    const inProgress = all.filter((t: any) => t.status === 'In Progress').length;
    const pending = all.filter((t: any) => t.status === 'Pending').length;
    const performance = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, pending, performance };
  }, [store.tasks]);

  const filteredTasks = useMemo(() => {
    return (store.tasks || []).filter((t: EmployeeTask) => {
      const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (t.assignedToName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [store.tasks, searchQuery, statusFilter]);

  const handleSaveTask = () => {
    if (!editingTask?.title || !editingTask?.assignedToId) {
      toast({ variant: "destructive", title: "Validation Error", description: "Task title and assignee are required." });
      return;
    }

    const assignee = store.employees.find((e: any) => e.id === editingTask.assignedToId);
    const finalTask = {
      ...editingTask,
      id: editingTask.id || `TSK-${Date.now().toString().slice(-6)}`,
      assignedToName: assignee?.name || 'Unknown',
      createdAt: editingTask.createdAt || new Date().toISOString(),
    } as EmployeeTask;

    if (editingTask.id) store.updateTask(finalTask);
    else store.addTask(finalTask);

    setModalOpen(false);
    setEditingTask(null);
    toast({ title: "Mission Assigned", description: `Task ${finalTask.id} has been dispatched to ${finalTask.assignedToName}.` });
  };

  const handleStatusChange = (task: EmployeeTask, newStatus: TaskStatus) => {
    store.updateTask({ ...task, status: newStatus, completedAt: newStatus === 'Completed' ? new Date().toISOString() : undefined });
    toast({ title: "Status Updated", description: `Task ${task.id} is now ${newStatus}.` });
  };

  const handleWhatsApp = (task: EmployeeTask) => {
    const msg = `Mission Alert: Task ${task.id} assigned. Customer: ${task.customerName}, Address: ${task.address}. Status: ${task.status}. Priority: ${task.priority}.`;
    const url = `https://web.whatsapp.com/send?phone=91${task.customerMobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0066FF] rounded-xl text-white shadow-lg shadow-blue-500/20">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-headline font-bold">Workforce Task Board</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Mission-Critical Deployment & Sync</p>
          </div>
        </div>
        <Button onClick={() => { setEditingTask(INITIAL_TASK); setModalOpen(true); }} className="bg-[#0066FF] hover:bg-blue-600 h-11 px-8 rounded-xl font-bold uppercase text-[10px]">
          <Plus className="w-4 h-4 mr-2" /> Assign New Mission
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Total Missions', value: stats.total, icon: ClipboardList, color: 'text-blue-400' },
          { label: 'Active Tasks', value: stats.inProgress, icon: TrendingUp, color: 'text-indigo-400' },
          { label: 'Pending Start', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Success Rate', value: `${stats.performance}%`, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Deployment OK', value: stats.total > 0 ? 'Active' : 'Idle', icon: ShieldCheck, color: 'text-slate-500' },
        ].map((s, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-lg">
            <CardContent className="p-4 md:p-5 flex flex-col justify-between h-full gap-2">
              <div className="flex justify-between items-start">
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
                <div className={cn("p-1.5 rounded-lg bg-slate-950", s.color)}><s.icon className="w-3.5 h-3.5" /></div>
              </div>
              <h3 className={cn("text-lg md:text-xl font-headline font-bold", s.color)}>{s.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input 
            placeholder="Search missions, assignees, customers..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="pl-10 bg-slate-950 border-slate-800 h-11" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-slate-950 border-slate-800 h-11 text-xs font-bold uppercase">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task: EmployeeTask) => {
          const statusConfig = STATUS_OPTIONS.find(s => s.value === task.status);
          const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === task.priority);
          
          return (
            <Card key={task.id} className="bg-slate-900/40 border-slate-800 hover:border-slate-700 transition-all overflow-hidden group">
              <CardHeader className="p-5 border-b border-slate-800 bg-slate-900/60">
                 <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="font-code text-[10px] text-blue-400 border-blue-400/20">{task.id}</Badge>
                    <div className="flex items-center gap-1.5">
                       <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusConfig?.color.replace('text-', 'bg-'))}></span>
                       <Badge className={cn("text-[9px] uppercase font-black", statusConfig?.bg, statusConfig?.color)}>{task.status}</Badge>
                    </div>
                 </div>
                 <CardTitle className="text-base font-bold text-slate-100 line-clamp-1 group-hover:text-blue-400 transition-colors">{task.title}</CardTitle>
                 <CardDescription className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <User className="w-3 h-3" /> Assigned: <span className="text-slate-300 font-bold">{task.assignedToName}</span>
                 </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                 <div className="space-y-2">
                    <div className="flex items-start gap-2.5 text-xs text-slate-400">
                       <Package className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                       <span className="font-bold text-slate-200">{task.customerName}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-[11px] text-slate-500">
                       <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                       <span className="line-clamp-1">{task.address}</span>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                    <div className="flex flex-col">
                       <span className="text-[9px] text-slate-600 uppercase font-black">Deadline</span>
                       <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-300">{format(parseISO(task.dueDate), 'dd MMM yyyy')}</span>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] text-slate-600 uppercase font-black">Priority</span>
                       <span className={cn("text-[10px] font-black uppercase", priorityConfig?.color)}>{task.priority}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 pt-2">
                    <Select value={task.status} onValueChange={(v: TaskStatus) => handleStatusChange(task, v)}>
                       <SelectTrigger className="h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue /></SelectTrigger>
                       <SelectContent className="bg-slate-900 border-slate-800">
                          {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value} className="text-[10px] uppercase font-bold">{s.value}</SelectItem>)}
                       </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                       <Button size="icon" variant="ghost" onClick={() => handleWhatsApp(task)} className="h-9 w-9 text-emerald-500 hover:bg-emerald-500/10"><MessageSquare className="w-4 h-4" /></Button>
                       <Button size="icon" variant="ghost" onClick={() => { setEditingTask(task); setModalOpen(true); }} className="h-9 w-9 text-blue-400 hover:bg-blue-500/10"><Edit className="w-4 h-4" /></Button>
                       <Button size="icon" variant="ghost" onClick={() => store.deleteTask(task.id)} className="h-9 w-9 text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                 </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredTasks.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-500 gap-4 border-2 border-dashed border-slate-800 rounded-3xl">
             <ClipboardList className="w-12 h-12 opacity-20" />
             <p className="italic">No mission deployment active for selected filters.</p>
          </div>
        )}
      </div>

      {/* Task Assignment Modal */}
      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
           <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <ClipboardList className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <DialogTitle className="text-xl font-headline font-bold">Task Assignment Matrix</DialogTitle>
                    <DialogDescription className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Enterprise Mission Registry</DialogDescription>
                 </div>
              </div>
           </DialogHeader>

           <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Mission Core</h4>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Task Objective (Title)</Label>
                       <Input value={editingTask?.title || ''} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Backlight Panel Replacement" />
                    </div>
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Mission Description</Label>
                       <Textarea value={editingTask?.description || ''} onChange={e => setEditingTask({...editingTask, description: e.target.value})} className="bg-slate-950 border-slate-800 min-h-[100px] text-sm" placeholder="Detailed technical instructions..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Service Category</Label>
                          <Select value={editingTask?.category} onValueChange={v => setEditingTask({...editingTask, category: v})}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                {['TV Repair', 'CCTV Install', 'Networking', 'Laptop Service', 'Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Mission Priority</Label>
                          <Select value={editingTask?.priority} onValueChange={v => setEditingTask({...editingTask, priority: v as TaskPriority})}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.value}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Deployment Node</h4>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <Label className="text-[10px] uppercase font-bold text-slate-400">Assign To Associate</Label>
                       <Select value={editingTask?.assignedToId} onValueChange={v => setEditingTask({...editingTask, assignedToId: v})}>
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue placeholder="Select Technician" /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                             {store.employees.filter((e: any) => e.status === 'Active').map((e: any) => (
                               <SelectItem key={e.id} value={e.id}>{e.name} ({e.designation})</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Target Deadline</Label>
                          <Input type="date" value={editingTask?.dueDate} onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})} className="bg-slate-950 border-slate-800 h-11 text-xs" />
                       </div>
                       <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Initial Status</Label>
                          <Select value={editingTask?.status} onValueChange={v => setEditingTask({...editingTask, status: v as TaskStatus})}>
                             <SelectTrigger className="bg-slate-950 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-slate-900 border-slate-800">
                                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.value}</SelectItem>)}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                       <h5 className="text-[10px] font-black uppercase text-blue-500 tracking-tighter flex items-center gap-2">Client Context</h5>
                       <div className="grid grid-cols-2 gap-3">
                          <Input value={editingTask?.customerName || ''} onChange={e => setEditingTask({...editingTask, customerName: e.target.value})} className="bg-slate-900 border-slate-800 h-10 text-xs" placeholder="Customer Name" />
                          <Input value={editingTask?.customerMobile || ''} onChange={e => setEditingTask({...editingTask, customerMobile: e.target.value})} className="bg-slate-900 border-slate-800 h-10 text-xs" placeholder="Mobile" />
                       </div>
                       <Input value={editingTask?.address || ''} onChange={e => setEditingTask({...editingTask, address: e.target.value})} className="bg-slate-900 border-slate-800 h-10 text-xs" placeholder="Full Address Node" />
                    </div>
                 </div>
              </div>
           </div>

           <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50 gap-3">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="px-8 font-bold uppercase text-xs">Discard</Button>
              <Button onClick={handleSaveTask} className="bg-blue-600 hover:bg-blue-700 px-12 h-12 rounded-xl font-bold uppercase text-xs shadow-lg shadow-blue-500/20 flex gap-2">
                 Commit Mission <ChevronRight className="w-4 h-4" />
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Search, 
  TrendingUp,
  Navigation,
  Package,
  Calendar,
  CheckCircle as CheckCircleIcon,
  User,
  FileDown,
  MessageSquare,
  FileStack,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TransportationLog, LogisticsStatus } from '@/lib/types';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { DeleteJobModal } from './repairing/DeleteJobModal';
import { addLogoToPdf } from '@/lib/branding';

export function TransportationModule({ store }: { store: any }) {
  const [formData, setFormData] = useState({ runnerName: '', runnerMobile: '', jobId: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewingLog, setViewingLog] = useState<TransportationLog | null>(null);
  const [editingLog, setEditingLog] = useState<TransportationLog | null>(null);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const logs = store.transportationLogs || [];
    const deliveredToday = logs.filter((l: any) => l.status === 'OK Delivery' && isToday(parseISO(l.dispatchTime))).length;
    const activeRunners = new Set(logs.map((l: any) => l.runnerName)).size;
    
    return { 
      total: logs.length,
      pPickup: logs.filter((l: any) => l.status === 'Pending Pickup').length,
      pDelivery: logs.filter((l: any) => l.status === 'Pending Delivery').length,
      deliveredToday,
      activeRunners
    };
  }, [store.transportationLogs]);

  const filteredLogs = useMemo(() => {
    return (store.transportationLogs || []).filter((log: any) => {
      const matchesSearch = 
        log.runnerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        log.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    }).sort((a: any, b: any) => new Date(b.dispatchTime).getTime() - new Date(a.dispatchTime).getTime());
  }, [store.transportationLogs, searchQuery, statusFilter]);

  const handleWhatsApp = (log: TransportationLog, type: 'PICKUP' | 'DELIVERY' | 'COMPLETED') => {
    const mobile = log.customerMobile || log.runnerMobile;
    let msg = "";
    
    if (type === 'PICKUP') {
      msg = `Hello ${log.customerName}, your product pickup has been scheduled. Job ID: ${log.jobId}. Runner: ${log.runnerName}.`;
    } else if (type === 'DELIVERY') {
      msg = `Hello ${log.customerName}, your product is ready for delivery. Job ID: ${log.jobId}. Runner: ${log.runnerName}.`;
    } else {
      msg = `Hello ${log.customerName}, your service has been completed successfully. Thank you for choosing GJ5 HOME SERVICE.`;
    }

    const url = `https://web.whatsapp.com/send?phone=91${mobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const generatePDF = (log: TransportationLog, type: string) => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const accentColor = [0, 102, 255]; // GJ5 Blue
    
    // Header
    const profile = store.companyProfile || {};
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 148, 20, 'F');
    const hasLogo = addLogoToPdf(doc, profile.logoUrl, 8, 3, 14, 14);
    const headerTextX = hasLogo ? 25 : 10;
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.companyName?.toUpperCase() || 'GJ5 HOME SERVICE', headerTextX, 13);
    doc.setFontSize(10);
    doc.text(type.toUpperCase(), 138, 13, { align: 'right' });

    // Content
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGISTICS MANIFEST', 10, 30);
    doc.line(10, 32, 138, 32);

    let y = 40;
    const drawRow = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 10, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value || '--'), 45, y);
      y += 8;
    };

    drawRow('Job ID', log.jobId);
    drawRow('Runner', log.runnerName);
    drawRow('Customer', log.customerName || '--');
    drawRow('Contact', log.customerMobile || '--');
    drawRow('Address', log.address || '--');
    drawRow('Date', format(parseISO(log.dispatchTime), 'dd/MM/yyyy HH:mm'));
    drawRow('Status', log.status);

    // Footer / Signature
    y += 20;
    doc.line(10, y, 60, y);
    doc.line(88, y, 138, y);
    doc.setFontSize(8);
    doc.text('Runner Signature', 10, y + 5);
    doc.text('Customer Signature', 88, y + 5);

    doc.save(`GJ5_Logistics_${log.jobId}_${type}.pdf`);
    toast({ title: "PDF Generated", description: `${type} Slip has been downloaded.` });
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(store.transportationLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logistics");
    XLSX.writeFile(wb, `GJ5_Logistics_Master_${format(new Date(), 'dd_MMM')}.xlsx`);
  };

  const handleAssignRunner = () => {
    const job = store.calls.find((c: any) => c.id === formData.jobId);
    const log: TransportationLog = {
      id: `LOG${Date.now()}`,
      runnerName: formData.runnerName,
      runnerMobile: formData.runnerMobile || '8866983900',
      jobId: formData.jobId,
      customerName: job?.customerName || 'N/A',
      customerMobile: job?.mobile || '',
      address: job?.address || '',
      dispatchTime: new Date().toISOString(),
      status: 'Pending Pickup'
    };
    store.addTransportLog(log);
    setFormData({ runnerName: '', runnerMobile: '', jobId: '' });
    toast({ title: "Runner Assigned", description: `${log.runnerName} is linked to Job ${log.jobId}.` });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Total Logs', value: stats.total, icon: Package, color: 'bg-blue-600' },
          { label: 'Pending Pickup', value: stats.pPickup, icon: Clock, color: 'bg-amber-600' },
          { label: 'Pending Delivery', value: stats.pDelivery, icon: Navigation, color: 'bg-indigo-600' },
          { label: 'Delivered Today', value: stats.deliveredToday, icon: CheckCircle2, color: 'bg-emerald-600' },
          { label: 'Active Runners', value: stats.activeRunners, icon: User, color: 'bg-purple-600' },
        ].map((k, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex flex-col justify-between h-full gap-2">
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <div className={cn("p-1.5 rounded-lg text-white", k.color)}><k.icon className="w-3.5 h-3.5" /></div>
              </div>
              <h3 className="text-xl font-headline font-bold">{k.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 font-headline text-base md:text-xl">
              <Truck className="w-5 h-5 md:w-6 h-6 text-[#0066FF]" /> Runner Dispatch Hub
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Runner Identity</Label>
                <Input value={formData.runnerName} onChange={e => setFormData({...formData, runnerName: e.target.value})} className="bg-slate-950 border-slate-800 h-10 md:h-11" placeholder="Enter runner name..." />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Link Active Service Job</Label>
                <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 h-10 md:h-11"><SelectValue placeholder="Select Job Card" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 max-h-[250px]">
                    {store.calls.filter((c: any) => c.status !== 'Completed').map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.id} - {c.customerName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleAssignRunner} 
              disabled={!formData.runnerName || !formData.jobId}
              className="w-full h-11 bg-[#0066FF] hover:bg-blue-600 font-bold uppercase text-xs shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4 mr-2" /> Initialize Runner Dispatch
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 font-headline text-base md:text-lg">
                 <FileStack className="w-5 h-5 text-emerald-500" /> Manifest Control
              </CardTitle>
           </CardHeader>
           <CardContent className="p-4 md:p-6 space-y-4">
              <p className="text-[10px] text-slate-500 uppercase font-black">Export Operations</p>
              <div className="grid grid-cols-1 gap-2">
                 <Button variant="outline" onClick={handleExportExcel} className="h-10 text-[10px] uppercase font-bold border-slate-800 justify-start hover:bg-emerald-500/10 hover:text-emerald-400">
                   <FileDown className="w-4 h-4 mr-2" /> Export Excel Registry
                 </Button>
                 <Button variant="outline" onClick={() => window.print()} className="h-10 text-[10px] uppercase font-bold border-slate-800 justify-start hover:bg-blue-500/10 hover:text-blue-400">
                   <Download className="w-4 h-4 mr-2" /> Download Master PDF
                 </Button>
              </div>
              <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                 <p className="text-[10px] text-slate-400 italic leading-relaxed">System logs all movement chronologically. Use Excel export for monthly logistics reconciliation.</p>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-lg md:text-xl font-headline font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" /> Transit Log Directory
          </h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input 
                placeholder="Search Job, Runner, Customer..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-9 h-9 bg-slate-950 border-slate-800 text-xs" 
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-9 bg-slate-950 border-slate-800 text-[10px] font-bold uppercase"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                <SelectItem value="OK Pickup">OK Pickup</SelectItem>
                <SelectItem value="Pending Delivery">Pending Delivery</SelectItem>
                <SelectItem value="OK Delivery">OK Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-[10px] font-bold uppercase px-4">Runner & Time</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Job Context</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Destination</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Transit State</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: TransportationLog) => (
                  <TableRow key={log.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <TableCell className="px-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400">
                             <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-xs">{log.runnerName}</span>
                             <span className="text-[9px] text-slate-500 uppercase font-black">{format(parseISO(log.dispatchTime), 'dd MMM | hh:mm a')}</span>
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col">
                          <Badge variant="outline" className="font-code text-[10px] w-fit border-slate-800 text-blue-400 mb-1">{log.jobId}</Badge>
                          <span className="text-[10px] font-bold text-slate-300">{log.customerName}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2 max-w-[200px] text-[10px] text-slate-400">
                          <MapPin className="w-3 h-3 shrink-0 text-rose-500" />
                          <span className="truncate">{log.address || 'N/A'}</span>
                       </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={log.status} 
                        onValueChange={v => store.updateTransportLogStatus(log.id, v as LogisticsStatus)}
                      >
                        <SelectTrigger className={cn(
                          "h-8 text-[9px] font-bold uppercase border-0 w-32",
                          log.status.includes('OK') ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-500"
                        )}>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800">
                          <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                          <SelectItem value="OK Pickup">OK Pickup</SelectItem>
                          <SelectItem value="Pending Delivery">Pending Delivery</SelectItem>
                          <SelectItem value="OK Delivery">OK Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right px-4">
                       <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setViewingLog(log)} className="h-8 w-8 text-blue-400 hover:bg-blue-500/10" title="View Details"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingLog(log)} className="h-8 w-8 text-amber-400 hover:bg-amber-500/10" title="Edit Log"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleWhatsApp(log, 'PICKUP')} className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10" title="WhatsApp Pickup"><MessageSquare className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => generatePDF(log, 'Pickup')} className="h-8 w-8 text-slate-400 hover:bg-slate-400/10" title="Download Slip"><Download className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteLogId(log.id)} className="h-8 w-8 text-rose-500 hover:bg-rose-500/10" title="Terminate Log"><Trash2 className="w-3.5 h-3.5" /></Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-700 text-xs italic">No logistics records found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" /> Logistics Audit View
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Job Node: {viewingLog?.jobId}</DialogDescription>
          </DialogHeader>
          {viewingLog && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-slate-500 font-black">Runner Authority</Label>
                    <p className="text-sm font-bold">{viewingLog.runnerName}</p>
                    <p className="text-[10px] text-blue-400 font-code">{viewingLog.runnerMobile}</p>
                 </div>
                 <div className="space-y-1 text-right">
                    <Label className="text-[9px] uppercase text-slate-500 font-black">Dispatch Identity</Label>
                    <p className="text-sm font-bold text-emerald-400">{viewingLog.status}</p>
                    <p className="text-[9px] text-slate-600">{format(parseISO(viewingLog.dispatchTime), 'PPP p')}</p>
                 </div>
              </div>
              <Separator className="bg-slate-800" />
              <div className="space-y-1">
                 <Label className="text-[9px] uppercase text-slate-500 font-black">Customer Destination</Label>
                 <p className="text-sm font-bold">{viewingLog.customerName}</p>
                 <p className="text-[10px] text-slate-400">{viewingLog.customerMobile}</p>
                 <p className="text-xs text-slate-500 mt-2 italic flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {viewingLog.address}</p>
              </div>
            </div>
          )}
          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
             <Button variant="ghost" onClick={() => setViewingLog(null)} className="flex-1">Close</Button>
             <Button onClick={() => viewingLog && generatePDF(viewingLog, 'Summary')} className="flex-1 bg-blue-600"><Download className="w-4 h-4 mr-2" /> PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent className="max-w-md bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 border-b border-slate-800 bg-slate-900/50">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-400" /> Edit Transit Log
            </DialogTitle>
          </DialogHeader>
          {editingLog && (
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold text-slate-500">Runner Name</Label>
                 <Input value={editingLog.runnerName} onChange={e => setEditingLog({...editingLog, runnerName: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold text-slate-500">Runner Mobile</Label>
                 <Input value={editingLog.runnerMobile} onChange={e => setEditingLog({...editingLog, runnerMobile: e.target.value})} className="bg-slate-950 border-slate-800" />
              </div>
              <div className="space-y-1">
                 <Label className="text-[10px] uppercase font-bold text-slate-500">Transit Status</Label>
                 <Select value={editingLog.status} onValueChange={v => setEditingLog({...editingLog, status: v as LogisticsStatus})}>
                   <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                   <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                      <SelectItem value="OK Pickup">OK Pickup</SelectItem>
                      <SelectItem value="Pending Delivery">Pending Delivery</SelectItem>
                      <SelectItem value="OK Delivery">OK Delivery</SelectItem>
                   </SelectContent>
                 </Select>
              </div>
            </div>
          )}
          <DialogFooter className="p-4 border-t border-slate-800 bg-slate-900/50">
             <Button variant="ghost" onClick={() => setEditingLog(null)}>Cancel</Button>
             <Button onClick={() => { if (editingLog) { store.updateTransportLog(editingLog); setEditingLog(null); toast({title: "Log Updated"}); } }} className="bg-blue-600">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteJobModal 
        isOpen={!!deleteLogId} 
        onClose={() => setDeleteLogId(null)} 
        jobId={store.transportationLogs.find((l: any) => l.id === deleteLogId)?.jobId || ''} 
        onConfirm={() => { if (deleteLogId) store.deleteTransportLog(deleteLogId); setDeleteLogId(null); }} 
      />
    </div>
  );
}

const Separator = ({ className }: { className?: string }) => <div className={cn("h-px w-full", className)} />;

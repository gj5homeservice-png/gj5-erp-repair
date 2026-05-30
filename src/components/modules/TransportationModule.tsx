"use client"

import React, { useState, useMemo } from 'react';
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
  ChevronRight
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import { LogisticsStatus } from '@/lib/types';

export function TransportationModule({ store }: { store: any }) {
  const [formData, setFormData] = useState({ runnerName: '', runnerMobile: '', jobId: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const stats = useMemo(() => {
    const total = store.transportationLogs?.length || 0;
    const pendingPickup = store.transportationLogs?.filter((l: any) => l.status === 'Pending Pickup').length || 0;
    const inTransit = store.transportationLogs?.filter((l: any) => l.status === 'In Transit').length || 0;
    const delivered = store.transportationLogs?.filter((l: any) => l.status === 'Delivered To Shop').length || 0;
    const readyForDelivery = store.transportationLogs?.filter((l: any) => l.status === 'Ready For Delivery').length || 0;
    
    return { 
      total, 
      pendingPickup, 
      inTransit, 
      delivered,
      readyForDelivery,
      activeFleet: '100%'
    };
  }, [store.transportationLogs]);

  const filteredLogs = useMemo(() => {
    return (store.transportationLogs || []).filter((log: any) => {
      const matchesSearch = 
        log.runnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.jobId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [store.transportationLogs, searchQuery]);

  const handleAssignRunner = () => {
    if (!formData.runnerName || !formData.jobId) return;
    const job = store.calls.find((c: any) => c.id === formData.jobId);
    
    store.addTransportLog({
      id: `LOG${Date.now()}`,
      runnerName: formData.runnerName,
      runnerMobile: formData.runnerMobile,
      jobId: formData.jobId,
      customerName: job?.customerName || 'Unknown',
      customerMobile: job?.mobile || '',
      address: job?.address || 'N/A',
      dispatchTime: new Date().toISOString(),
      status: 'Pending Pickup'
    });
    
    setFormData({ runnerName: '', runnerMobile: '', jobId: '' });
  };

  const generateSheet = (type: 'PICKUP' | 'DELIVERY') => {
    const statusFilter = type === 'PICKUP' ? 'Pending Pickup' : 'Ready For Delivery';
    const jobs = store.transportationLogs?.filter((l: any) => l.status === statusFilter) || [];
    
    if (jobs.length === 0) {
      alert(`No jobs found with status: ${statusFilter}`);
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 102, 255);
    doc.text('GJ5 PLUS', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Enterprise Logistics & Service Management', 105, 26, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    const title = type === 'PICKUP' ? 'DAILY CONSOLIDATED PICKUP SHEET' : 'DAILY CONSOLIDATED DELIVERY SHEET';
    doc.text(title, 105, 40, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`DATE: ${format(new Date(), 'dd MMM yyyy')}`, 105, 46, { align: 'center' });

    doc.setDrawColor(200);
    doc.line(20, 52, 190, 52);

    let y = 65;
    jobs.forEach((log: any, index: number) => {
      const job = store.calls.find((c: any) => c.id === log.jobId);
      
      // Page Break Check
      if (y > 250) {
        doc.addPage();
        y = 30;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${index + 1}. JOB ID: ${log.jobId} - ${log.customerName}`, 25, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      y += 6;
      doc.text(`Mobile: ${log.customerMobile} | Address: ${log.address}`, 30, y);
      
      if (type === 'PICKUP' && job) {
        y += 6;
        doc.text(`Device: ${job.brand} ${job.model} (${job.screenSize}") | Issue: ${job.problemDescription || 'N/A'}`, 30, y);
      } else if (type === 'DELIVERY' && job) {
        y += 6;
        doc.text(`Device: ${job.brand} ${job.model} (${job.screenSize}") | Status: READY`, 30, y);
      }

      y += 10;
      doc.setDrawColor(240);
      doc.line(25, y - 5, 185, y - 5);
      y += 5;
    });

    // Footer Summary
    const totalY = Math.min(y + 10, 270);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL ${type} TVs: ${jobs.length}`, 105, totalY, { align: 'center' });

    doc.save(`${type}_Sheet_${format(new Date(), 'ddMMyy')}.pdf`);
  };

  const sendWhatsAppManifest = (type: 'PICKUP' | 'DELIVERY') => {
    const statusFilter = type === 'PICKUP' ? 'Pending Pickup' : 'Ready For Delivery';
    const jobs = store.transportationLogs?.filter((l: any) => l.status === statusFilter) || [];
    
    if (jobs.length === 0) return;

    // Use the first runner's mobile or prompt (simplified)
    const runnerMobile = jobs[0].runnerMobile || '';

    let message = `*DAILY ${type} MANIFEST - GJ5 PLUS*%0A`;
    message += `Date: ${format(new Date(), 'dd/MM/yyyy')}%0A%0A`;

    jobs.forEach((job: any, i: number) => {
      message += `${i+1}. *${job.jobId}* - ${job.customerName}%0A`;
      message += `📍 ${job.address}%0A`;
      message += `📞 ${job.customerMobile}%0A`;
      if (type === 'PICKUP') {
        const fullJob = store.calls.find((c: any) => c.id === job.jobId);
        message += `🛠️ Issue: ${fullJob?.problemDescription || 'N/A'}%0A`;
      }
      message += `---------------------------%0A`;
    });

    message += `%0A*Total ${type} TVs:* ${jobs.length}`;

    const url = `https://web.whatsapp.com/send?phone=91${runnerMobile}&text=${message}`;
    window.open(url, '_blank');
  };

  const kpis = [
    { id: 'total', label: 'Total Logs', value: stats.total, icon: Package, color: 'bg-blue-600' },
    { id: 'pending', label: 'Pending Pickup', value: stats.pendingPickup, icon: Clock, color: 'bg-amber-600' },
    { id: 'transit', label: 'In Transit', value: stats.inTransit, icon: Navigation, color: 'bg-blue-500' },
    { id: 'ready', label: 'Ready Delivery', value: stats.readyForDelivery, icon: CheckCircleIcon, color: 'bg-emerald-600' },
    { id: 'delivered', label: 'Delivered', value: stats.delivered, icon: CheckCircleIcon, color: 'bg-slate-600' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpis.map((k) => (
          <Card key={`kpi-${k.id}`} className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{k.label}</p>
                <h3 className="text-xl font-headline font-bold">{k.value}</h3>
              </div>
              <div className={cn("p-2 rounded-xl text-white", k.color)}><k.icon className="w-4 h-4" /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Truck className="w-6 h-6 text-[#0066FF]" /> Runner Assignment Console
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Runner Details</Label>
                <div className="space-y-2">
                  <Label>Runner Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      value={formData.runnerName} 
                      onChange={e => setFormData({...formData, runnerName: e.target.value})} 
                      className="pl-10 bg-slate-950 border-slate-800 h-11" 
                      placeholder="Enter Runner Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Runner Mobile Number</Label>
                  <Input 
                    value={formData.runnerMobile} 
                    onChange={e => setFormData({...formData, runnerMobile: e.target.value})} 
                    className="bg-slate-950 border-slate-800 h-11" 
                    placeholder="10-Digit Mobile"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Job Association</Label>
                <div className="space-y-2">
                  <Label>Link Active Service Job</Label>
                  <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 h-11">
                      <SelectValue placeholder="Select Job..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      {store.calls.filter((c: any) => c.status !== 'Completed' && c.status !== 'Rejected').map((c: any) => (
                        <SelectItem key={`job-${c.id}`} value={c.id}>{c.id} - {c.customerName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-6">
                  <Button onClick={handleAssignRunner} className="w-full h-11 bg-[#0066FF] hover:bg-blue-600 rounded-xl font-bold uppercase shadow-lg shadow-blue-500/20">
                    Assign Runner
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
           <CardHeader className="border-b border-slate-800">
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                 <FileStack className="w-5 h-5 text-emerald-500" />
                 Bulk Manifest Control
              </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase">Pickup Operations</Label>
                 <Button onClick={() => generateSheet('PICKUP')} variant="outline" className="w-full justify-start border-slate-800 bg-slate-950 hover:bg-slate-800 h-12">
                    <FileDown className="w-4 h-4 mr-3 text-blue-400" /> Generate Pickup Sheet
                 </Button>
                 <Button onClick={() => sendWhatsAppManifest('PICKUP')} variant="outline" className="w-full justify-start border-slate-800 bg-slate-950 hover:bg-slate-800 h-12">
                    <MessageSquare className="w-4 h-4 mr-3 text-emerald-400" /> Send Pickup WhatsApp
                 </Button>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-bold text-slate-500 uppercase">Delivery Operations</Label>
                 <Button onClick={() => generateSheet('DELIVERY')} variant="outline" className="w-full justify-start border-slate-800 bg-slate-950 hover:bg-slate-800 h-12">
                    <FileDown className="w-4 h-4 mr-3 text-purple-400" /> Generate Delivery Sheet
                 </Button>
                 <Button onClick={() => sendWhatsAppManifest('DELIVERY')} variant="outline" className="w-full justify-start border-slate-800 bg-slate-950 hover:bg-slate-800 h-12">
                    <MessageSquare className="w-4 h-4 mr-3 text-emerald-400" /> Send Delivery WhatsApp
                 </Button>
              </div>
           </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-headline font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-emerald-500" /> Active Assignment Log
          </h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Filter Assignments..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="pl-10 h-10 bg-slate-950 border-slate-800" 
            />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead>Runner Info</TableHead>
                <TableHead>Job ID</TableHead>
                <TableHead>Customer Profile</TableHead>
                <TableHead>Dispatch Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log: any) => (
                <TableRow key={log.id} className="border-slate-800/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{log.runnerName}</span>
                      <span className="text-xs text-slate-500">{log.runnerMobile || 'No Mobile'}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-code">{log.jobId}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{log.customerName}</span>
                      <span className="text-[10px] text-blue-400">{log.customerMobile}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                       <Calendar className="w-3 h-3" />
                       {log.dispatchTime ? format(new Date(log.dispatchTime), 'dd/MM HH:mm') : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={log.status} onValueChange={v => store.updateTransportLogStatus(log.id, v)}>
                      <SelectTrigger className="h-8 text-[10px] bg-slate-950 border-slate-800 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                        <SelectItem value="Picked Up">Picked Up</SelectItem>
                        <SelectItem value="In Transit">In Transit</SelectItem>
                        <SelectItem value="Delivered To Shop">Delivered To Shop</SelectItem>
                        <SelectItem value="Ready For Delivery">Ready For Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-slate-500"><ChevronRight className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">No runner assignments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

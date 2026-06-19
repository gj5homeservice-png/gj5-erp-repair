"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Package, 
  MessageSquare, 
  Paperclip, 
  Send,
  MapPin,
  Clock,
  Search,
  CheckCircle,
  BadgeCheck,
  TrendingUp
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
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
import { format, isToday, parseISO } from 'date-fns';

export function LogisticsModule({ store }: { store: any }) {
  const [formData, setFormData] = useState({
    runnerName: '',
    runnerMobile: '',
    selectedJobId: ''
  });

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [templates, setTemplates] = useState<string[]>([
    "Transportation Dispatch: Dear [RunnerName], please collect device [JobID] from [CustomerName] at [Address]. Issue: [Issue]. Timestamp: [Timestamp].",
    "Transit Alert: Dear Customer, your device [JobID] is currently in transit with our runner [RunnerName].",
    "Delivery Complete: Dear [CustomerName], runner [RunnerName] has successfully arrived for the delivery of [JobID]."
  ]);
  const [attachments, setAttachments] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    const savedTemplates = localStorage.getItem('gj5_transportation_templates');
    if (savedTemplates) {
      try { setTemplates(JSON.parse(savedTemplates)); } catch (e) { console.error(e); }
    }
  }, []);

  const activeJobs = store.calls.filter((c: any) => c.status !== 'Completed' && c.status !== 'Rejected');

  const stats = useMemo(() => {
    const logs = store.transportationLogs || [];
    
    const getStatsForStatus = (status: string) => {
      const filtered = logs.filter((l: any) => l.status === status);
      const todayCount = filtered.filter((l: any) => l.dispatchTime && isToday(parseISO(l.dispatchTime))).length;
      return { count: filtered.length, today: todayCount };
    };

    return {
      pendingPickup: getStatsForStatus('Pending Pickup'),
      okPickup: getStatsForStatus('OK Pickup'),
      pendingDelivery: getStatsForStatus('Pending Delivery'),
      okDelivery: getStatsForStatus('OK Delivery'),
    };
  }, [store.transportationLogs]);

  const handleTemplateChange = (index: number, value: string) => {
    const newTemplates = [...templates];
    newTemplates[index] = value;
    setTemplates(newTemplates);
    localStorage.setItem('gj5_transportation_templates', JSON.stringify(newTemplates));
  };

  const handleAttachment = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newAttachments = [...attachments];
        newAttachments[index] = reader.result as string;
        setAttachments(newAttachments);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDispatch = () => {
    const job = activeJobs.find((j: any) => j.id === formData.selectedJobId);
    if (!job || !formData.runnerName || !formData.runnerMobile) return;

    const newLog = {
      id: `LOG${Date.now()}`,
      runnerName: formData.runnerName,
      runnerMobile: formData.runnerMobile,
      jobId: job.id,
      customerName: job.customerName,
      customerMobile: job.mobile,
      address: job.address,
      dispatchTime: new Date().toISOString(),
      status: 'Pending Pickup' as const
    };

    store.addTransportLog(newLog);

    // WhatsApp Dispatch
    let msg = templates[selectedTemplateIndex];
    msg = msg.replace('[RunnerName]', formData.runnerName)
             .replace('[JobID]', job.id)
             .replace('[CustomerName]', job.customerName)
             .replace('[Address]', job.address)
             .replace('[Issue]', job.visitHistory?.[job.visitHistory.length - 1]?.issue || 'N/A')
             .replace('[Timestamp]', format(new Date(), 'dd/MM/yyyy HH:mm'));

    const url = `https://web.whatsapp.com/send?phone=91${formData.runnerMobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    setFormData({ runnerName: '', runnerMobile: '', selectedJobId: '' });
  };

  const summaryCards = [
    { 
      title: "Pending Pickup", 
      count: stats.pendingPickup.count, 
      today: stats.pendingPickup.today,
      icon: Package, 
      color: "text-orange-400", 
      bg: "bg-orange-400/10" 
    },
    { 
      title: "OK Pickup", 
      count: stats.okPickup.count, 
      today: stats.okPickup.today,
      icon: CheckCircle, 
      color: "text-emerald-400", 
      bg: "bg-emerald-400/10" 
    },
    { 
      title: "Pending Delivery", 
      count: stats.pendingDelivery.count, 
      today: stats.pendingDelivery.today,
      icon: Truck, 
      color: "text-amber-400", 
      bg: "bg-amber-400/10" 
    },
    { 
      title: "OK Delivery", 
      count: stats.okDelivery.count, 
      today: stats.okDelivery.today,
      icon: BadgeCheck, 
      color: "text-blue-400", 
      bg: "bg-blue-400/10" 
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            <Truck className="w-6 h-6 text-[#0066FF]" />
            Runner Dispatch Initializer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Runner Name</Label>
                  <Input value={formData.runnerName} onChange={e => setFormData({...formData, runnerName: e.target.value})} placeholder="e.g. Rahul Patel" className="bg-slate-950 border-slate-800 h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Runner Mobile (10-Digit)</Label>
                  <Input value={formData.runnerMobile} onChange={e => setFormData({...formData, runnerMobile: e.target.value})} placeholder="9988776655" className="bg-slate-950 border-slate-800 h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Job Linker</Label>
                <Select value={formData.selectedJobId} onValueChange={v => setFormData({...formData, selectedJobId: v})}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 h-11 text-left">
                    <SelectValue placeholder="Select active job..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    {activeJobs.map((job: any) => (
                      <SelectItem key={job.id} value={job.id}>{job.id} - {job.customerName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleDispatch} disabled={!formData.runnerName || !formData.runnerMobile || !formData.selectedJobId} className="w-full h-12 bg-[#0066FF] hover:bg-blue-600 rounded-xl font-bold uppercase">
                <Send className="w-5 h-5 mr-2" /> 🚀 Dispatch & Send to Runner
              </Button>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" /> WhatsApp Template Suite
              </h3>
              <div className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                    <RadioGroup value={selectedTemplateIndex.toString()} onValueChange={(v) => setSelectedTemplateIndex(parseInt(v))}>
                      <RadioGroupItem value={idx.toString()} id={`trans-tpl-${idx}`} />
                    </RadioGroup>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] text-slate-500 font-bold uppercase">Option {idx + 1}</Label>
                        <div className="flex items-center gap-2">
                          <input type="file" id={`trans-attach-${idx}`} className="hidden" onChange={(e) => handleAttachment(idx, e)} />
                          <button onClick={() => document.getElementById(`trans-attach-${idx}`)?.click()} className={cn("px-2 py-1 rounded-md text-[9px] font-bold uppercase", attachments[idx] ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500")}>
                            <Paperclip className="w-3 h-3 mr-1" /> {attachments[idx] ? "Attached" : "Attach Image"}
                          </button>
                        </div>
                      </div>
                      <Textarea value={templates[idx]} onChange={e => handleTemplateChange(idx, e.target.value)} className="bg-transparent border-0 p-0 text-xs min-h-[50px] focus-visible:ring-0 resize-none leading-relaxed" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 group hover:border-slate-700 transition-colors">
            <CardContent className="p-5 flex justify-between items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter", card.bg, card.color)}>
                    {card.title}
                  </div>
                </div>
                <h3 className="text-3xl font-headline font-black text-white">{card.count}</h3>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Today's activity: {card.today}</span>
                </div>
              </div>
              <div className={cn("p-4 rounded-2xl bg-slate-950 shadow-inner group-hover:scale-110 transition-transform duration-300", card.color)}>
                <card.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-headline font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-[#FFD700]" /> Live Transit Log Directory
        </h3>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="font-headline text-slate-400">Runner Info</TableHead>
                <TableHead className="font-headline text-slate-400">Job Tracking ID</TableHead>
                <TableHead className="font-headline text-slate-400">Customer Profile</TableHead>
                <TableHead className="font-headline text-slate-400">Target Destination</TableHead>
                <TableHead className="font-headline text-slate-400">Dispatch Time</TableHead>
                <TableHead className="font-headline text-slate-400">Transit Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.transportationLogs.map((log: any) => (
                <TableRow key={log.id} className="border-slate-800/50 hover:bg-slate-800/20">
                  <TableCell><div className="flex flex-col"><span className="font-bold">{log.runnerName}</span><span className="text-[10px] text-slate-500 font-code">{log.runnerMobile}</span></div></TableCell>
                  <TableCell><Badge variant="outline" className="font-code">{log.jobId}</Badge></TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-bold">{log.customerName}</span><span className="text-[10px] text-slate-500">{log.customerMobile}</span></div></TableCell>
                  <TableCell><div className="flex items-center gap-2 max-w-[200px] text-xs text-slate-400"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{log.address}</span></div></TableCell>
                  <TableCell><div className="flex items-center gap-2 text-xs text-slate-500"><Clock className="w-3 h-3" />{format(new Date(log.dispatchTime), 'hh:mm a')}</div></TableCell>
                  <TableCell>
                    <Select value={log.status} onValueChange={(v: any) => store.updateTransportLogStatus(log.id, v)}>
                      <SelectTrigger className="h-8 text-[10px] bg-slate-950 border-slate-800 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="Pending Pickup">Pending Pickup</SelectItem>
                        <SelectItem value="OK Pickup">OK Pickup</SelectItem>
                        <SelectItem value="Pending Delivery">Pending Delivery</SelectItem>
                        <SelectItem value="OK Delivery">OK Delivery</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {store.transportationLogs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500">No active transportation transits.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

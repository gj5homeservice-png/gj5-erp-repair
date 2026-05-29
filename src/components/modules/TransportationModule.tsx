"use client"

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  MessageSquare, 
  Paperclip, 
  Send,
  MapPin,
  Clock,
  Car,
  CheckCircle,
  Activity,
  Wrench,
  Plus,
  Trash2,
  FileText,
  Smartphone,
  User,
  Fuel,
  Weight
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Vehicle, VehicleStatus } from '@/lib/types';

export function TransportationModule({ store }: { store: any }) {
  const [isVehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [dispatchData, setDispatchData] = useState({
    runnerName: '',
    runnerMobile: '',
    selectedJobId: ''
  });

  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    vehicleNumber: '',
    vehicleType: 'Tempo',
    driverName: '',
    driverMobile: '',
    fuelType: 'Diesel',
    capacity: '',
    insuranceExpiry: '',
    status: 'Available'
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

  const stats = {
    totalVehicles: store.vehicles.length,
    available: store.vehicles.filter((v: any) => v.status === 'Available').length,
    onRoute: store.vehicles.filter((v: any) => v.status === 'On Route').length,
    maintenance: store.vehicles.filter((v: any) => v.status === 'Maintenance').length
  };

  const handleDispatch = () => {
    const job = activeJobs.find((j: any) => j.id === dispatchData.selectedJobId);
    if (!job || !dispatchData.runnerName || !dispatchData.runnerMobile) return;

    const newLog = {
      id: `LOG${Date.now()}`,
      runnerName: dispatchData.runnerName,
      runnerMobile: dispatchData.runnerMobile,
      jobId: job.id,
      customerName: job.customerName,
      customerMobile: job.mobile,
      address: job.address,
      dispatchTime: new Date().toISOString(),
      status: 'In-Transit' as const
    };

    store.addTransportationLog(newLog);

    let msg = templates[selectedTemplateIndex];
    msg = msg.replace('[RunnerName]', dispatchData.runnerName)
             .replace('[JobID]', job.id)
             .replace('[CustomerName]', job.customerName)
             .replace('[Address]', job.address)
             .replace('[Issue]', job.visitHistory?.[0]?.issue || 'N/A')
             .replace('[Timestamp]', format(new Date(), 'dd/MM/yyyy HH:mm'));

    const url = `https://web.whatsapp.com/send?phone=91${dispatchData.runnerMobile}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    setDispatchData({ runnerName: '', runnerMobile: '', selectedJobId: '' });
  };

  const handleAddVehicle = () => {
    if (!newVehicle.vehicleNumber || !newVehicle.driverName) return;
    
    const vehicle: Vehicle = {
      id: `VEH${Date.now()}`,
      vehicleNumber: newVehicle.vehicleNumber!,
      vehicleType: newVehicle.vehicleType!,
      driverName: newVehicle.driverName!,
      driverMobile: newVehicle.driverMobile!,
      fuelType: newVehicle.fuelType!,
      capacity: newVehicle.capacity!,
      insuranceExpiry: newVehicle.insuranceExpiry!,
      status: newVehicle.status as VehicleStatus
    };

    store.addVehicle(vehicle);
    setVehicleModalOpen(false);
    setNewVehicle({
      vehicleNumber: '',
      vehicleType: 'Tempo',
      driverName: '',
      driverMobile: '',
      fuelType: 'Diesel',
      capacity: '',
      insuranceExpiry: '',
      status: 'Available'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Vehicles" value={stats.totalVehicles} icon={Car} color="bg-blue-500" description="Fleet size" />
        <StatCard title="Available" value={stats.available} icon={CheckCircle} color="bg-emerald-500" description="Ready for dispatch" />
        <StatCard title="On Route" value={stats.onRoute} icon={Activity} color="bg-amber-500" description="Active deliveries" />
        <StatCard title="Maintenance" value={stats.maintenance} icon={Wrench} color="bg-rose-500" description="In service center" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Truck className="w-6 h-6 text-[#0066FF]" />
              Dispatch Control
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Runner Name</Label>
                <Input 
                  value={dispatchData.runnerName} 
                  onChange={e => setDispatchData({...dispatchData, runnerName: e.target.value})} 
                  placeholder="e.g. Rahul Patel" 
                  className="bg-slate-950 border-slate-800 h-11" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Runner Mobile</Label>
                <Input 
                  value={dispatchData.runnerMobile} 
                  onChange={e => setDispatchData({...dispatchData, runnerMobile: e.target.value})} 
                  placeholder="9988776655" 
                  className="bg-slate-950 border-slate-800 h-11" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Job Linker</Label>
              <Select value={dispatchData.selectedJobId} onValueChange={v => setDispatchData({...dispatchData, selectedJobId: v})}>
                <SelectTrigger className="bg-slate-950 border-slate-800 h-11">
                  <SelectValue placeholder="Select active job..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {activeJobs.map((job: any) => (
                    <SelectItem key={job.id} value={job.id}>{job.id} - {job.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleDispatch} disabled={!dispatchData.runnerName || !dispatchData.selectedJobId} className="w-full h-12 bg-[#0066FF] hover:bg-blue-600 rounded-xl font-bold uppercase">
              <Send className="w-5 h-5 mr-2" /> Dispatch & Send to Runner
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Car className="w-6 h-6 text-[#FFD700]" />
              Fleet Management
            </CardTitle>
            <Dialog open={isVehicleModalOpen} onOpenChange={setVehicleModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#0066FF] h-9">
                  <Plus className="w-4 h-4 mr-2" /> Register Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0F172A] border-slate-800 text-slate-100 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-2">
                    <Car className="w-6 h-6 text-[#0066FF]" /> Vehicle Registration
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Vehicle Number</Label>
                    <Input 
                      value={newVehicle.vehicleNumber} 
                      onChange={e => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})}
                      placeholder="GJ-05-XX-1234"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Truck className="w-4 h-4" /> Vehicle Type</Label>
                    <Select value={newVehicle.vehicleType} onValueChange={v => setNewVehicle({...newVehicle, vehicleType: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="Bike">Bike</SelectItem>
                        <SelectItem value="Car">Car</SelectItem>
                        <SelectItem value="Tempo">Tempo</SelectItem>
                        <SelectItem value="Truck">Truck</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><User className="w-4 h-4" /> Driver Name</Label>
                    <Input 
                      value={newVehicle.driverName} 
                      onChange={e => setNewVehicle({...newVehicle, driverName: e.target.value})}
                      placeholder="Enter driver name"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Driver Mobile</Label>
                    <Input 
                      value={newVehicle.driverMobile} 
                      onChange={e => setNewVehicle({...newVehicle, driverMobile: e.target.value})}
                      placeholder="10-digit number"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Fuel className="w-4 h-4" /> Fuel Type</Label>
                    <Select value={newVehicle.fuelType} onValueChange={v => setNewVehicle({...newVehicle, fuelType: v})}>
                      <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="CNG">CNG</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Weight className="w-4 h-4" /> Capacity (Kg/Litres)</Label>
                    <Input 
                      value={newVehicle.capacity} 
                      onChange={e => setNewVehicle({...newVehicle, capacity: e.target.value})}
                      placeholder="e.g. 500kg"
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Insurance Expiry</Label>
                    <Input 
                      type="date"
                      value={newVehicle.insuranceExpiry} 
                      onChange={e => setNewVehicle({...newVehicle, insuranceExpiry: e.target.value})}
                      className="bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Activity className="w-4 h-4" /> Status</Label>
                    <Select value={newVehicle.status} onValueChange={v => setNewVehicle({...newVehicle, status: v as VehicleStatus})}>
                      <SelectTrigger className="bg-slate-950 border-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="On Route">On Route</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setVehicleModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddVehicle} className="bg-[#0066FF] hover:bg-blue-600 px-8">Register Vehicle</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/60">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="font-headline text-slate-400">Vehicle</TableHead>
                  <TableHead className="font-headline text-slate-400">Driver</TableHead>
                  <TableHead className="font-headline text-slate-400">Status</TableHead>
                  <TableHead className="text-right font-headline text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.vehicles.map((v: Vehicle) => (
                  <TableRow key={v.id} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{v.vehicleNumber}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{v.vehicleType} • {v.fuelType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{v.driverName}</span>
                        <span className="text-[10px] text-slate-500">{v.driverMobile}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[9px] uppercase font-bold",
                        v.status === 'Available' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        v.status === 'On Route' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => store.deleteVehicle(v.id)} className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {store.vehicles.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500 italic">No vehicles registered.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-headline font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-[#FFD700]" /> Transit Log Directory
        </h3>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="font-headline text-slate-400">Runner Info</TableHead>
                <TableHead className="font-headline text-slate-400">Job ID</TableHead>
                <TableHead className="font-headline text-slate-400">Customer</TableHead>
                <TableHead className="font-headline text-slate-400">Destination</TableHead>
                <TableHead className="font-headline text-slate-400">Time</TableHead>
                <TableHead className="font-headline text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.transportation.map((log: any) => (
                <TableRow key={log.id} className="border-slate-800/50 hover:bg-slate-800/20">
                  <TableCell><div className="flex flex-col"><span className="font-bold">{log.runnerName}</span><span className="text-[10px] text-slate-500 font-code">{log.runnerMobile}</span></div></TableCell>
                  <TableCell><Badge variant="outline" className="font-code">{log.jobId}</Badge></TableCell>
                  <TableCell><div className="flex flex-col"><span className="font-bold">{log.customerName}</span><span className="text-[10px] text-slate-500">{log.customerMobile}</span></div></TableCell>
                  <TableCell><div className="flex items-center gap-2 max-w-[200px] text-xs text-slate-400"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{log.address}</span></div></TableCell>
                  <TableCell><div className="flex items-center gap-2 text-xs text-slate-500"><Clock className="w-3 h-3" />{format(new Date(log.dispatchTime), 'hh:mm a')}</div></TableCell>
                  <TableCell>
                    <Select value={log.status} onValueChange={(v: any) => store.updateTransportationLog(log.id, v)}>
                      <SelectTrigger className="h-8 text-[10px] bg-slate-950 border-slate-800 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="In-Transit">In-Transit</SelectItem>
                        <SelectItem value="Collected">Collected</SelectItem>
                        <SelectItem value="Arrived at Workshop">Arrived at Workshop</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {store.transportation.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500">No active transits.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, description }: any) {
  return (
    <Card className="bg-slate-900/40 border-slate-800 overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
            <h3 className="text-3xl font-headline font-bold text-white">{value}</h3>
            <p className="text-[10px] text-slate-500 font-medium">{description}</p>
          </div>
          <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", color, "bg-opacity-10 text-white")}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client"

import React, { useState } from 'react';
import { 
  Truck, 
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
  Weight,
  Clock,
  Package,
  MapPin,
  Send
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Vehicle, VehicleStatus } from '@/lib/types';

export function TransportationModule({ store }: { store: any }) {
  const [isVehicleModalOpen, setVehicleModalOpen] = useState(false);
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

  const stats = {
    totalVehicles: store.vehicles.length,
    available: store.vehicles.filter((v: any) => v.status === 'Available').length,
    onRoute: store.vehicles.filter((v: any) => v.status === 'On Route').length,
    maintenance: store.vehicles.filter((v: any) => v.status === 'Maintenance').length
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
      {/* Dashboard KPI Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Vehicles" value={stats.totalVehicles} icon={Car} color="bg-blue-500" description="Fleet size" />
        <StatCard title="Available" value={stats.available} icon={CheckCircle} color="bg-emerald-500" description="Ready for dispatch" />
        <StatCard title="On Route" value={stats.onRoute} icon={Activity} color="bg-amber-500" description="Active deliveries" />
        <StatCard title="Maintenance" value={stats.maintenance} icon={Wrench} color="bg-rose-500" description="In service center" />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="bg-slate-900/40 border-slate-800">
          <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline text-xl">
              <Car className="w-6 h-6 text-[#FFD700]" />
              Fleet Registry & Management
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
                  <TableHead className="font-headline text-slate-400">Vehicle Info</TableHead>
                  <TableHead className="font-headline text-slate-400">Driver Profile</TableHead>
                  <TableHead className="font-headline text-slate-400">Operational Status</TableHead>
                  <TableHead className="text-right font-headline text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.vehicles.map((v: Vehicle) => (
                  <TableRow key={v.id} className="border-slate-800/50 hover:bg-slate-800/20">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{v.vehicleNumber}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{v.vehicleType} • {v.fuelType} • {v.capacity}</span>
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
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500 italic">No vehicles registered in fleet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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

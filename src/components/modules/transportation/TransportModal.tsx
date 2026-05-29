"use client"

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { TransportEntry, VehicleStatus } from '@/lib/types';
import { 
  PlusCircle, 
  ChevronRight,
  Truck,
  User,
  Navigation,
  Calendar
} from 'lucide-react';

interface TransportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingEntry: TransportEntry | null;
  onSave: (data: TransportEntry) => void;
  store: any;
}

export function TransportModal({ isOpen, onClose, editingEntry, onSave, store }: TransportModalProps) {
  const [activeTab, setActiveTab] = useState('New Entry');
  const [formData, setFormData] = useState<Partial<TransportEntry>>({
    vehicleNumber: '',
    driverName: '',
    vehicleType: 'Tempo',
    route: '',
    departureDate: new Date().toISOString().split('T')[0],
    arrivalDate: '',
    fuelCost: 0,
    status: 'On Route'
  });

  useEffect(() => {
    if (editingEntry) {
      setFormData(editingEntry);
      setActiveTab('New Entry');
    } else if (isOpen) {
      setFormData({
        vehicleNumber: '',
        driverName: '',
        vehicleType: 'Tempo',
        route: '',
        departureDate: new Date().toISOString().split('T')[0],
        arrivalDate: '',
        fuelCost: 0,
        status: 'On Route'
      });
    }
  }, [editingEntry, isOpen]);

  const handleSave = () => {
    const finalData = {
      ...formData,
      id: editingEntry?.id || `TRANS${Date.now()}`,
      createdAt: editingEntry?.createdAt || new Date().toISOString()
    } as TransportEntry;
    onSave(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0F172A] border-slate-800 text-slate-100 p-0 overflow-hidden shadow-2xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-8 pt-8 pb-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center">
                  <Truck className="w-6 h-6" />
               </div>
               <DialogTitle className="text-2xl font-headline font-bold">
                 {editingEntry ? 'Update Transport Log' : 'Log New Transport Entry'}
               </DialogTitle>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Truck className="w-4 h-4 text-blue-400" /> Vehicle Number</Label>
                  <Input 
                    value={formData.vehicleNumber} 
                    onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
                    placeholder="GJ-05-XX-1234"
                    className="bg-slate-900 border-slate-800 h-11"
                  />
               </div>
               <div className="space-y-2">
                  <Label className="flex items-center gap-2"><User className="w-4 h-4 text-emerald-400" /> Driver Name</Label>
                  <Input 
                    value={formData.driverName} 
                    onChange={e => setFormData({...formData, driverName: e.target.value})}
                    placeholder="Enter driver name"
                    className="bg-slate-900 border-slate-800 h-11"
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select value={formData.vehicleType} onValueChange={v => setFormData({...formData, vehicleType: v})}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Bike">Bike</SelectItem>
                      <SelectItem value="Car">Car</SelectItem>
                      <SelectItem value="Tempo">Tempo</SelectItem>
                      <SelectItem value="Truck">Truck</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Navigation className="w-4 h-4 text-yellow-400" /> Route</Label>
                  <Input 
                    value={formData.route} 
                    onChange={e => setFormData({...formData, route: e.target.value})}
                    placeholder="Surat -> Ahmedabad"
                    className="bg-slate-900 border-slate-800 h-11"
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" /> Departure Date</Label>
                  <Input 
                    type="date"
                    value={formData.departureDate} 
                    onChange={e => setFormData({...formData, departureDate: e.target.value})}
                    className="bg-slate-900 border-slate-800 h-11"
                  />
               </div>
               <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Calendar className="w-4 h-4 text-cyan-400" /> Arrival Date (Optional)</Label>
                  <Input 
                    type="date"
                    value={formData.arrivalDate} 
                    onChange={e => setFormData({...formData, arrivalDate: e.target.value})}
                    className="bg-slate-900 border-slate-800 h-11"
                  />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label>Fuel Cost (₹)</Label>
                  <Input 
                    type="number"
                    value={formData.fuelCost} 
                    onChange={e => setFormData({...formData, fuelCost: Number(e.target.value)})}
                    className="bg-slate-900 border-slate-800 h-11 font-code"
                  />
               </div>
               <div className="space-y-2">
                  <Label>Current Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as VehicleStatus})}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="On Route">On Route</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>
          </div>

          <DialogFooter className="p-8 border-t border-slate-800 bg-slate-900/50">
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button 
               onClick={handleSave} 
               className="bg-[#0066FF] hover:bg-blue-700 px-12 h-12 rounded-xl font-bold flex gap-2"
             >
                {editingEntry ? 'Update Entry' : 'Create Entry'}
                <ChevronRight className="w-4 h-4" />
             </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

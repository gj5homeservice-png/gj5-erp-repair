"use client"

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Truck, 
  User, 
  Navigation, 
  Calendar, 
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  MoreVertical,
  Printer,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { TransportEntry, VehicleStatus } from '@/lib/types';
import { TransportModal } from './transportation/TransportModal';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function TransportationModule({ store }: { store: any }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TransportEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<VehicleStatus | 'All'>('All');

  const stats = useMemo(() => {
    const totalVehicles = store.vehicles.length;
    const available = store.vehicles.filter((v: any) => v.status === 'Available').length;
    const onRoute = store.vehicles.filter((v: any) => v.status === 'On Route').length;
    const maintenance = store.vehicles.filter((v: any) => v.status === 'Maintenance').length;
    const totalFuelCost = store.transportEntries.reduce((sum: number, e: any) => sum + e.fuelCost, 0);

    return { totalVehicles, available, onRoute, maintenance, totalFuelCost };
  }, [store.vehicles, store.transportEntries]);

  const filteredEntries = useMemo(() => {
    return store.transportEntries.filter((entry: TransportEntry) => {
      const matchesSearch = 
        entry.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.route.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = activeFilter === 'All' || entry.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [store.transportEntries, searchQuery, activeFilter]);

  const handleStatusChange = (id: string, status: VehicleStatus) => {
    const entry = store.transportEntries.find((e: any) => e.id === id);
    if (entry) {
      store.updateTransportEntry({ ...entry, status });
    }
  };

  const kpis = [
    { id: 'total', title: 'Total Vehicles', value: stats.totalVehicles, icon: Truck, color: 'bg-[#0066FF]', active: activeFilter === 'All', filter: 'All' },
    { id: 'available', title: 'Available', value: stats.available, icon: CheckCircle2, color: 'bg-emerald-500', active: activeFilter === 'Available', filter: 'Available' },
    { id: 'onroute', title: 'On Route', value: stats.onRoute, icon: Navigation, color: 'bg-[#FFD700]', textColor: 'text-black', active: activeFilter === 'On Route', filter: 'On Route' },
    { id: 'maintenance', title: 'Maintenance', value: stats.maintenance, icon: Clock, color: 'bg-[#FF3366]', active: activeFilter === 'Maintenance', filter: 'Maintenance' },
    { id: 'cost', title: 'Total Transport Cost', value: `₹${stats.totalFuelCost}`, icon: CreditCard, color: 'bg-cyan-500', active: false, filter: 'All' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <StatCard 
            key={kpi.id}
            title={kpi.title} 
            value={kpi.value} 
            icon={kpi.icon} 
            color={kpi.color} 
            textColor={kpi.textColor}
            active={kpi.active}
            onClick={() => setActiveFilter(kpi.filter as any)}
          />
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
        <div className="flex-1 w-full md:max-w-md relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
           <Input 
             placeholder="Search Vehicle Number, Driver, Route..." 
             value={searchQuery} 
             onChange={e => setSearchQuery(e.target.value)} 
             className="pl-10 bg-slate-950 border-slate-800 h-11" 
           />
        </div>
        <Button 
          className="flex-1 md:flex-none rounded-xl bg-[#0066FF] hover:bg-[#0052CC] h-11 px-6 shadow-lg shadow-blue-500/20" 
          onClick={() => { setEditingEntry(null); setModalOpen(true); }}
        >
          <Plus className="w-5 h-5 mr-2" /> Log New Transport Entry
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/60">
            <TableRow className="hover:bg-transparent border-slate-800">
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Vehicle Number</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Driver Name</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Vehicle Type</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Route</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Dep. Date</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Arr. Date</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider text-right">Fuel Cost</TableHead>
              <TableHead className="font-headline text-slate-400 uppercase text-[11px] tracking-wider">Status</TableHead>
              <TableHead className="text-right font-headline text-slate-400 uppercase text-[11px] tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry: TransportEntry) => (
              <TableRow key={entry.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-colors group">
                <TableCell className="font-code font-bold text-blue-400">{entry.vehicleNumber}</TableCell>
                <TableCell className="font-semibold text-slate-100">{entry.driverName}</TableCell>
                <TableCell className="text-sm text-slate-400">{entry.vehicleType}</TableCell>
                <TableCell className="text-sm">{entry.route}</TableCell>
                <TableCell className="text-xs text-slate-500">{format(new Date(entry.departureDate), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-xs text-slate-500">
                  {entry.arrivalDate ? format(new Date(entry.arrivalDate), 'dd/MM/yyyy') : '--'}
                </TableCell>
                <TableCell className="text-right font-code font-bold">₹{entry.fuelCost}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all", 
                        entry.status === 'Available' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                        entry.status === 'On Route' ? "bg-yellow-500/10 text-[#FFD700] border border-yellow-500/20" : 
                        entry.status === 'Maintenance' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : 
                        "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20")}>
                        {entry.status}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-slate-800">
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'Available')}>Available</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'On Route')}>On Route</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'Maintenance')}>Maintenance</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'Completed')}>Completed</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setEditingEntry(entry)}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => store.deleteTransportEntry(entry.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-slate-500 italic">No transport entries found matching your criteria.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TransportModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        editingEntry={editingEntry}
        onSave={(data) => {
          if (editingEntry) store.updateTransportEntry(data);
          else store.addTransportEntry(data);
          setModalOpen(false);
        }}
        store={store}
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, textColor = "text-white", active, onClick }: any) {
  return (
    <Card onClick={onClick} className={cn("bg-slate-900/40 border-slate-800 overflow-hidden group cursor-pointer transition-all", active ? "ring-2 ring-blue-500 scale-[1.02]" : "hover:bg-slate-800/60")}>
      <CardContent className="p-4"><div className="flex justify-between items-start"><div><p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mb-1">{title}</p><h3 className="text-xl font-headline font-bold">{value}</h3></div><div className={cn("p-2 rounded-xl", color, textColor)}><Icon className="w-4 h-4" /></div></div></CardContent>
    </Card>
  );
}

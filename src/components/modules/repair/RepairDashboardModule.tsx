"use client"

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ClipboardList, PlusCircle, Clock, Wrench, PackageCheck, CheckCircle2, XCircle, Wallet, CalendarDays
} from 'lucide-react';
import { RepairJob } from '@/lib/types';
import { grandTotal } from '@/lib/repair-utils';
import { format } from 'date-fns';

export function RepairDashboardModule({ store }: { store: any }) {
  const jobs: RepairJob[] = store.repairJobs || [];

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      total: jobs.length,
      newRepairs: jobs.filter(j => j.status === 'Received').length,
      pending: jobs.filter(j => ['Inspection', 'Estimate Sent', 'Approved'].includes(j.status)).length,
      inProgress: jobs.filter(j => ['In Progress', 'Waiting for Parts'].includes(j.status)).length,
      readyForDelivery: jobs.filter(j => j.status === 'Ready').length,
      delivered: jobs.filter(j => j.status === 'Delivered').length,
      cancelled: jobs.filter(j => j.status === 'Cancelled').length,
      totalRevenue: jobs.reduce((sum, j) => sum + grandTotal(j), 0),
      todayRepairs: jobs.filter(j => j.receivedDate === today).length,
    };
  }, [jobs]);

  const kpis = [
    { id: 'total', title: 'Total Repair Jobs', value: stats.total, icon: ClipboardList, color: 'bg-[#0066FF]' },
    { id: 'new', title: 'New Repairs', value: stats.newRepairs, icon: PlusCircle, color: 'bg-cyan-500' },
    { id: 'pending', title: 'Pending Repairs', value: stats.pending, icon: Clock, color: 'bg-[#FFD700]', textColor: 'text-black' },
    { id: 'inProgress', title: 'In Progress', value: stats.inProgress, icon: Wrench, color: 'bg-purple-500' },
    { id: 'ready', title: 'Ready for Delivery', value: stats.readyForDelivery, icon: PackageCheck, color: 'bg-lime-500', textColor: 'text-black' },
    { id: 'delivered', title: 'Delivered', value: stats.delivered, icon: CheckCircle2, color: 'bg-emerald-500' },
    { id: 'cancelled', title: 'Cancelled', value: stats.cancelled, icon: XCircle, color: 'bg-[#FF3366]' },
    { id: 'revenue', title: 'Total Repair Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: Wallet, color: 'bg-amber-600' },
    { id: 'today', title: "Today's Repairs", value: stats.todayRepairs, icon: CalendarDays, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-headline font-bold text-white tracking-tight">Repair Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1 uppercase tracking-[0.2em] font-black">Repair Module Overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.id} className="bg-slate-900/40 border-slate-800 h-full">
            <CardContent className="p-3 md:p-4 flex flex-col items-center text-center gap-1 md:gap-2">
              <div className={`p-1.5 md:p-2 rounded-xl ${kpi.color} ${kpi.textColor || 'text-white'}`}><kpi.icon className="w-3.5 h-3.5 md:w-4 md:h-4" /></div>
              <div>
                <p className="text-slate-400 text-[9px] md:text-[10px] uppercase font-bold truncate">{kpi.title}</p>
                <h3 className="text-lg md:text-xl font-headline font-bold">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-10 text-center text-slate-500 text-sm">
          No repair jobs recorded yet. Create your first one from "New Repair".
        </div>
      )}
    </div>
  );
}

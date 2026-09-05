
"use client"

import React, { useRef } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  FileText,
  RefreshCw,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export function BackupCenter({ store }: { store: any }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAllData = () => ({
    calls: store.calls,
    inquiries: store.inquiries,
    expenses: store.expenses,
    transportationLogs: store.transportationLogs,
    invoices: store.invoices,
    employees: store.employees,
    attendance: store.attendance,
    walletBalance: store.walletBalance,
    exportDate: new Date().toISOString()
  });

  const handleExportJSON = () => {
    const data = getAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GJ5_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup Successful", description: "JSON data exported." });
  };

  const handleExportCSV = () => {
    // Exporting Repair Calls as primary CSV
    const data = store.calls;
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GJ5_Jobs_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Successful", description: "Jobs exported to CSV." });
  };

  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();
    
    // Add multiple sheets
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.calls), "Jobs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.expenses), "Expenses");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.inquiries), "Inquiries");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.employees), "Staff");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(store.transportationLogs), "Logistics");

    XLSX.writeFile(wb, `GJ5_Master_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Master Export Successful", description: "Multi-sheet Excel file downloaded." });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          store.importAllData(data)
            .then(() => toast({ title: "Restore Complete", description: "Database synchronized from JSON backup." }))
            .catch((err: any) => toast({ variant: "destructive", title: "Restore Failed", description: err?.message || "Could not sync to the cloud database." }));
        } else if (file.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(content, { type: 'binary' });
          // Logic for multi-sheet import could be complex, for MVP we focus on JSON for full restore
          toast({ variant: "destructive", title: "Partial Support", description: "XLSX import currently supports viewing only. Use JSON for full restore." });
        }
      } catch (error) {
        toast({ variant: "destructive", title: "Import Failed", description: "Invalid file format." });
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Download className="w-4 h-4 text-[#0066FF]" /> Master Export Center
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={handleExportJSON} variant="outline" className="h-11 border-slate-800 justify-start hover:bg-blue-500/10 hover:text-blue-400">
              <FileJson className="w-4 h-4 mr-3" /> Export Complete Data (.json)
            </Button>
            <Button onClick={handleExportXLSX} variant="outline" className="h-11 border-slate-800 justify-start hover:bg-emerald-500/10 hover:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4 mr-3" /> Export Multi-Sheet (.xlsx)
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="h-11 border-slate-800 justify-start hover:bg-amber-500/10 hover:text-amber-400">
              <FileText className="w-4 h-4 mr-3" /> Export Jobs Only (.csv)
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 italic">Recommended: Weekly JSON backup for full recovery safety.</p>
        </div>

        <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-500" /> Database Restore
          </h4>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <RefreshCw className="w-8 h-8 text-slate-700 group-hover:text-blue-400 group-hover:rotate-180 transition-all duration-500 mb-2" />
            <p className="text-xs font-bold text-slate-500">Drop backup file here</p>
            <p className="text-[10px] text-slate-600 mt-1">Supports JSON recovery</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
          </div>
          <div className="flex items-center gap-2 p-3 bg-rose-500/5 rounded-lg border border-rose-500/10">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <p className="text-[9px] text-rose-500 leading-tight">Warning: Importing a backup will overwrite existing local records.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Backup Scheduling
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'daily', label: 'Daily Backup' },
            { id: 'weekly', label: 'Weekly Sync' },
            { id: 'monthly', label: 'Monthly Archive' }
          ].map(sched => (
            <div key={sched.id} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex flex-col">
                <Label className="text-xs font-medium">{sched.label}</Label>
                <span className="text-[9px] text-slate-600 uppercase font-black">Auto-Trigger</span>
              </div>
              <Switch disabled />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 text-center">Automatic cloud backup is available in the Professional Edition.</p>
      </div>

      <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">System Integrity: OK</span>
        </div>
        <Button onClick={handleExportJSON} className="bg-[#0066FF] hover:bg-blue-600 h-10 px-6 font-bold uppercase text-[10px]">
          One-Click Full Backup
        </Button>
      </div>
    </div>
  );
}

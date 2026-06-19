"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useErpStore } from '@/hooks/use-erp-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  User, 
  LogIn, 
  LogOut, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Smartphone
} from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { AttendanceStatus, AttendanceRecord } from '@/lib/types';

export default function MobileAttendancePortal() {
  const params = useParams();
  const router = useRouter();
  const store = useErpStore();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{lat: string, lng: string} | null>(null);
  const [ip, setIp] = useState<string>('Detecting...');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      // Small delay to allow local store to initialize
      await new Promise(r => setTimeout(r, 1000));
      
      const link = store.attendanceLinks.find(l => l.token === token);
      
      if (!link) {
        setError("Invalid attendance token. Access Denied.");
        setLoading(false);
        return;
      }

      if (link.used) {
        setError("This secure link has already been used.");
        setLoading(false);
        return;
      }

      if (isAfter(new Date(), parseISO(link.expiresAt))) {
        setError("Attendance window expired (30s timeout). Generate a new link.");
        setLoading(false);
        return;
      }

      setLinkData(link);
      
      // Capture Meta
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        setIp(ipData.ip);
      } catch (e) { console.error("IP capture failed"); }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude.toString(),
            lng: pos.coords.longitude.toString()
          });
          setLoading(false);
        },
        () => {
          setError("GPS Location access is mandatory for identity verification.");
          setLoading(false);
        }
      );
    };

    validateToken();
  }, [token, store.attendanceLinks]);

  const handleAttendance = async (type: 'IN' | 'OUT') => {
    if (!linkData || !location) return;
    setIsSubmitting(true);

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const emp = store.employees.find((e: any) => e.employeeId === linkData.employeeId);

    if (type === 'IN') {
      const shiftStart = new Date();
      shiftStart.setHours(10, 0, 0);
      const status: AttendanceStatus = now > shiftStart ? 'Late' : 'Checked In';

      const newRecord: AttendanceRecord = {
        id: `ATT-${linkData.employeeId}-${Date.now()}`,
        employeeId: linkData.employeeId,
        employeeName: linkData.employeeName,
        mobile: linkData.mobile,
        checkIn: now.toISOString(),
        date: today,
        workHours: '--',
        overtime: '0h',
        latitude: location.lat,
        longitude: location.lng,
        status: status,
        createdAt: now.toISOString(),
        deviceInfo: navigator.userAgent,
        ipAddress: ip,
        attendanceType: 'WhatsAppLink'
      };
      store.addAttendance(newRecord);
    } else {
      const record = store.attendance.find((a: any) => a.employeeId === linkData.employeeId && a.date === today && !a.checkOut);
      if (!record) {
        setError("No active check-in found for today. Session invalid.");
        setIsSubmitting(false);
        return;
      }
      
      const inTime = parseISO(record.checkIn!);
      const diffMinutes = Math.floor((now.getTime() - inTime.getTime()) / 60000);
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const workHours = `${hours}h ${mins}m`;

      store.updateAttendance({
        ...record,
        checkOut: now.toISOString(),
        workHours,
        status: 'Checked Out'
      });
    }

    store.useAttendanceLink(token);
    setCompleted(true);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 gap-6">
        <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-headline font-bold text-white">Verifying Identity...</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Syncing GPS & Security Token</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-8 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-white mb-2">Registry Committed</h1>
        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
          Your shift data has been securely recorded in the Master ERP Ledger. Link terminated.
        </p>
        <p className="mt-8 text-[10px] text-slate-600 font-bold uppercase tracking-widest">GJ5 PLUS • Secure Access 2.8</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-rose-600/20 flex items-center justify-center mb-8 border-2 border-rose-600/50">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-headline font-bold text-white mb-4">Access Restricted</h2>
        <p className="text-slate-400 text-sm mb-10 max-w-xs">{error}</p>
        <Button onClick={() => router.push('/')} variant="outline" className="border-slate-800 text-slate-500 h-11 px-8 rounded-xl font-bold uppercase text-[10px]">Return to Terminal</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex items-center justify-center p-4">
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#0066FF]/10 to-transparent"></div>
      
      <Card className="w-full max-w-md bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-headline font-bold text-white">GJ5 SECURE ACCESS</CardTitle>
            <CardDescription className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1">Identity Verified Module</CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <div className="p-6 bg-slate-950/80 rounded-3xl border border-slate-800 space-y-4 relative group">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                   <User className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase">Associate</p>
                   <h3 className="text-lg font-bold text-slate-100">{linkData.employeeName}</h3>
                   <p className="text-[11px] text-blue-400 font-code font-bold uppercase">{linkData.employeeId}</p>
                </div>
             </div>
             <div className="pt-4 border-t border-slate-900 flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                   <Clock className="w-3.5 h-3.5" />
                   <span className="text-xs font-bold">{format(new Date(), 'hh:mm a')}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500">
                   <MapPin className="w-3.5 h-3.5" />
                   <span className="text-[10px] font-black uppercase">GPS Lock OK</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <Button 
               disabled={isSubmitting}
               onClick={() => handleAttendance('IN')}
               className="h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-headline font-black text-xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
             >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogIn className="w-6 h-6 mb-1" /> START SHIFT</>}
             </Button>
             
             <Button 
               disabled={isSubmitting}
               onClick={() => handleAttendance('OUT')}
               variant="outline"
               className="h-20 border-rose-600/30 bg-rose-600/5 hover:bg-rose-600/10 text-rose-500 rounded-[2rem] font-headline font-black text-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
             >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogOut className="w-6 h-6 mb-1" /> END SHIFT</>}
             </Button>
          </div>

          <div className="space-y-4 pt-4">
             <div className="flex items-center gap-3 text-slate-600">
                <Smartphone className="w-3.5 h-3.5" />
                <p className="text-[9px] font-bold uppercase truncate max-w-[300px]">Node: {navigator.userAgent.split(')')[0]})</p>
             </div>
             <div className="flex items-center gap-3 text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                <p className="text-[9px] font-bold uppercase">Public IP: {ip}</p>
             </div>
             <p className="text-[8px] text-slate-700 italic text-center leading-relaxed">
                By submitting, you authorize the capture of geospatial and device metadata for industrial audit compliance. Access is valid for a single session only.
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

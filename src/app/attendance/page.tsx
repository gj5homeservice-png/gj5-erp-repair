"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  MapPin, 
  User, 
  LogIn, 
  LogOut, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Smartphone,
  Camera,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceStatus, AttendanceRecord } from '@/lib/types';

function AttendancePortalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [location, setLocation] = useState<{lat: string, lng: string, address: string} | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [ip, setIp] = useState<string>('Detecting...');
  const [completed, setCompleted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Attendance token missing from request.");
        setLoading(false);
        return;
      }

      // Real server-side lookup — works from any device, not just the admin's
      // own browser, since the token and its expiry now live in MySQL.
      let link: any = null;
      try {
        const res = await fetch(`/api/erp/attendance-links/${token}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Invalid attendance token. Access Denied.");
          setLoading(false);
          return;
        }
        link = json.data;
      } catch (e) {
        setError("Could not reach the server. Check your connection and try again.");
        setLoading(false);
        return;
      }

      setLinkData(link);
      
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        setIp(ipData.ip);
      } catch (e) { console.error("IP capture failed"); }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let address = `${lat}, ${lng}`;
          try {
            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const revData = await revRes.json();
            address = revData.display_name || address;
          } catch (e) { console.error("Geocoding failed"); }

          setLocation({ lat: lat.toString(), lng: lng.toString(), address });
          setLoading(false);
        },
        () => {
          setError("GPS Location access is mandatory for verification.");
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
    };

    validateToken();
  }, [token]);

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied. Selfie verification required.");
    }
  };

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setSelfie(data);
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
      }
    }
  };

  const handleAttendance = async (type: 'IN' | 'OUT') => {
    if (!linkData || !location || !selfie) return;
    setIsSubmitting(true);

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    if (type === 'IN') {
      const shiftStart = new Date();
      shiftStart.setHours(10, 0, 0);
      const halfDayLimit = new Date();
      halfDayLimit.setHours(12, 0, 0);

      let status: AttendanceStatus = 'Checked In';
      if (now > halfDayLimit) status = 'Half Day';
      else if (now > shiftStart) status = 'Late';

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
        address: location.address,
        selfieCheckIn: selfie,
        status: status,
        createdAt: now.toISOString(),
        deviceInfo: navigator.userAgent,
        browserInfo: `${navigator.appName} | ${navigator.platform}`,
        ipAddress: ip,
        attendanceType: 'WhatsAppLink'
      };
      try {
        const res = await fetch(`/api/erp/attendance-links/${token}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecord),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Check-in failed');
      } catch (e: any) {
        setError(e?.message || "Check-in failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
    } else {
      try {
        const res = await fetch(`/api/erp/attendance-links/${token}/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, selfieCheckOut: selfie }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'No active check-in session found for today.');
      } catch (e: any) {
        setError(e?.message || "Check-out failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    setCompleted(true);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 gap-6">
        <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-headline font-bold text-white">Initializing Biometric Handshake...</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Syncing GPS & Visual Engine</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-8 border-2 border-emerald-500/50 shadow-lg">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-headline font-bold text-white mb-2">Shift Committed</h1>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">Your biometric data and GPS node have been recorded. Access link burned.</p>
        <p className="mt-8 text-[10px] text-slate-600 font-bold uppercase tracking-widest">GJ5 PLUS • SMART ACCESS 4.2</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-[2rem] bg-rose-600/20 flex items-center justify-center mb-8 border-2 border-rose-600/50">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-headline font-bold text-white mb-4">Verification Failure</h2>
        <p className="text-slate-400 text-sm mb-10 max-w-xs">{error}</p>
        <Button onClick={() => router.push('/')} variant="outline" className="border-slate-800 text-slate-500">Return to Console</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center p-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-headline font-black text-white uppercase italic">GJ5 Smart Access</h1>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.3em]">Secure Biometric Entry Node</p>
        </div>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4 border-b border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-none">{linkData.employeeName}</h3>
                <p className="text-[10px] text-slate-500 uppercase mt-1 font-bold">{linkData.employeeId}</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[9px] text-slate-600 font-black uppercase">Current Time</span>
                  <p className="text-sm font-bold text-blue-400">{format(new Date(), 'hh:mm a')}</p>
               </div>
               <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[9px] text-slate-600 font-black uppercase">Current Date</span>
                  <p className="text-sm font-bold text-slate-300">{format(new Date(), 'dd MMM yyyy')}</p>
               </div>
            </div>

            <div className="space-y-4">
               <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                     <Camera className="w-3.5 h-3.5" /> Biometric Proof
                  </h4>
                  {selfie && <Badge className="bg-emerald-500/10 text-emerald-400 text-[8px] uppercase">Captured</Badge>}
               </div>

               <div className="aspect-[4/3] rounded-3xl bg-slate-950 border-2 border-dashed border-slate-800 flex items-center justify-center overflow-hidden relative group">
                  {isCameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                  ) : selfie ? (
                    <img src={selfie} className="w-full h-full object-cover scale-x-[-1]" alt="Selfie" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-700">
                       <Camera className="w-10 h-10" />
                       <p className="text-xs font-bold uppercase tracking-tighter">Awaiting Lens Trigger</p>
                    </div>
                  )}
                  
                  {isCameraActive && (
                    <Button onClick={captureSelfie} className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full h-14 w-14 bg-white text-black">
                       <div className="w-10 h-10 rounded-full border-2 border-black" />
                    </Button>
                  )}
               </div>

               {!selfie && !isCameraActive && (
                 <Button onClick={startCamera} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold uppercase text-xs rounded-xl">
                    Initialize Verification Camera
                 </Button>
               )}
               {selfie && !isCameraActive && (
                 <Button variant="ghost" onClick={startCamera} className="w-full h-10 text-[10px] uppercase font-bold text-slate-500">
                    <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retake Selfie
                 </Button>
               )}
            </div>

            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/20 flex gap-4">
               <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shrink-0">
                  <MapPin className="w-5 h-5" />
               </div>
               <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-blue-500">Verified Location Node</p>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed truncate">{location?.address || "Analyzing satellites..."}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
               <Button 
                 disabled={isSubmitting || !selfie || !location}
                 onClick={() => handleAttendance('IN')}
                 className="h-20 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-headline font-black text-xl shadow-xl transition-all active:scale-95 disabled:opacity-30"
               >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogIn className="w-6 h-6 mr-2 inline" /> START SHIFT</>}
               </Button>
               
               <Button 
                 disabled={isSubmitting || !selfie || !location}
                 onClick={() => handleAttendance('OUT')}
                 variant="outline"
                 className="h-20 border-rose-600/30 bg-rose-600/5 hover:bg-rose-600/10 text-rose-500 rounded-[2rem] font-headline font-black text-xl transition-all active:scale-95 disabled:opacity-30"
               >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <><LogOut className="w-6 h-6 mr-2 inline" /> END SHIFT</>}
               </Button>
            </div>

            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-3 text-slate-600">
                  <Smartphone className="w-3.5 h-3.5" />
                  <p className="text-[8px] font-bold uppercase tracking-widest">Auth Node IP: {ip}</p>
               </div>
               <p className="text-[7px] text-slate-700 italic text-center leading-relaxed font-bold uppercase">
                  Audit Protocol 4.2 Active. Metadata capture mandatory for compliance. Access burned after commitment.
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default function SmartAttendancePortal() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6 gap-6">
        <Loader2 className="w-16 h-16 text-[#0066FF] animate-spin" />
      </div>
    }>
      <AttendancePortalContent />
    </Suspense>
  );
}

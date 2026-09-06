"use client"

import React from "react";
import { Upload, FileText, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeDocumentsSection } from "./EmployeeDocumentsSection";

interface EmployeeKYCSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  // Optional — only present when this modal has access to the ERP store,
  // used solely by the Documents Vault sub-section below (upload/verify/
  // reject/delete are real API calls, unlike the plain formData fields
  // above which just stage local state until the whole modal saves).
  store?: any;
}

export function EmployeeKYCSection({ formData, setFormData, store }: EmployeeKYCSectionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-white">KYC & Identity Verification</h2>
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Secure Associate Documentation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-slate-400">Aadhar Card Number</Label>
          <Input
            type="text"
            maxLength={12}
            name="aadharNumber"
            value={formData.aadharNumber || ""}
            onChange={handleChange}
            className="bg-slate-950 border-slate-800 h-11 font-code"
            placeholder="1234 5678 9012"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase font-bold text-slate-400">PAN Card Number</Label>
          <Input
            type="text"
            name="panNumber"
            value={formData.panNumber || ""}
            onChange={handleChange}
            className="bg-slate-950 border-slate-800 h-11 font-code uppercase"
            placeholder="ABCDE1234F"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] uppercase font-bold text-slate-400">Address Proof Class</Label>
        <Select
          value={formData.addressProofType || ""}
          onValueChange={(v) => setFormData({ ...formData, addressProofType: v })}
        >
          <SelectTrigger className="bg-slate-950 border-slate-800 h-11">
            <SelectValue placeholder="Select Document Type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
            <SelectItem value="Driving License">Driving License</SelectItem>
            <SelectItem value="Voter ID">Voter ID</SelectItem>
            <SelectItem value="Passport">Passport</SelectItem>
            <SelectItem value="Electricity Bill">Electricity Bill</SelectItem>
            <SelectItem value="Bank Passbook">Bank Passbook</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Aadhar Front", field: "aadharFront", icon: Upload, color: "text-blue-500" },
          { label: "Aadhar Back", field: "aadharBack", icon: Upload, color: "text-blue-500" },
          { label: "PAN Card", field: "panCard", icon: FileText, color: "text-emerald-500" },
          { label: "Address Proof", field: "addressProof", icon: FileText, color: "text-amber-500" },
        ].map((item) => (
          <div key={item.field} className="relative group aspect-square rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/50 flex flex-col items-center justify-center text-center gap-2 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden">
            {formData[item.field] ? (
              <img src={formData[item.field]} className="w-full h-full object-cover" alt={item.label} />
            ) : (
              <>
                <item.icon className={`w-6 h-6 ${item.color}`} />
                <p className="text-[10px] font-bold text-slate-400 px-2 uppercase">{item.label}</p>
              </>
            )}
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => handleFileUpload(e, item.field)}
              accept="image/*"
            />
          </div>
        ))}
      </div>

      {/* Address / City / State / Pincode now live on the Profile tab (see
          EmployeesModule.tsx) so an associate's contact address is edited in
          one place — this tab keeps only the KYC-specific permanent/domicile
          address used for address-proof verification. */}
      <div className="space-y-6">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Address Proof Reference</h4>
        <div className="space-y-1.5 max-w-lg">
          <Label className="text-[10px] uppercase font-bold text-slate-300">Permanent / Domicile Address</Label>
          <Input
            name="permanentAddress"
            value={formData.permanentAddress || ""}
            onChange={handleChange}
            className="bg-slate-950 border-slate-800 h-11 text-slate-100 placeholder:text-slate-500"
            placeholder="Full hometown / permanent address, as per address proof"
          />
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Other Identification</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">Other ID Type</Label>
            <Input name="otherIdType" value={formData.otherIdType || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11" placeholder="e.g. Voter ID" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">Other ID Number</Label>
            <Input name="otherIdNumber" value={formData.otherIdNumber || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11 font-code" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase font-bold text-slate-400">Address Proof Number</Label>
          <Input name="addressProofNumber" value={formData.addressProofNumber || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11 font-code max-w-xs" />
        </div>
      </div>

      <div className="space-y-6">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Bank Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">Bank Name</Label>
            <Input name="bankName" value={formData.bankName || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">Account Holder Name</Label>
            <Input name="accountHolderName" value={formData.accountHolderName || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">Account Number</Label>
            <Input name="accountNumber" value={formData.accountNumber || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11 font-code" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">IFSC</Label>
            <Input name="ifsc" value={formData.ifsc || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11 font-code uppercase" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold text-slate-400">Branch</Label>
            <Input name="branch" value={formData.branch || ""} onChange={handleChange} className="bg-slate-950 border-slate-800 h-11" />
          </div>
        </div>
      </div>

      {store && formData.id && (
        <EmployeeDocumentsSection employee={formData} store={store} />
      )}
    </div>
  );
}

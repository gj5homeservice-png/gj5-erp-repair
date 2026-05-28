export type RepairStatus = 'Pending' | 'Completed' | 'Rejected' | 'Exchange' | 'Purchase';

export interface RepairHistoryEntry {
  timestamp: string;
  issue: string;
  technician: string;
  notes: string;
  statusAtTime: RepairStatus;
  visitNumber: number;
}

export interface RepairCall {
  id: string; // Job ID e.g. TV1001
  customerId: string; // GJ51001
  customerName: string;
  mobile: string;
  address: string;
  pincode: string;
  category: string;
  brand: string;
  model: string;
  screenSize: string;
  technician: string;
  pickupRequired: boolean;
  intakeMode: 'Customer Walk-In' | 'Logistics Dispatch';
  runnerName: string | null;
  runnerMobile: string | null;
  createdAt: string;
  updatedAt: string;
  status: RepairStatus;
  visitHistory: RepairHistoryEntry[];
  takePrice?: number;
  warrantyDuration?: string; // e.g. "3 Months", "6 Months", "Custom Duration"
  warrantyCustomValue?: string; // e.g. "45 Days"
  warrantyExpiry?: string;
}

export interface Inquiry {
  id: string;
  customerName: string;
  address: string;
  pincode: string;
  mobile: string;
  notes: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  mobile: string;
  salary: number;
  dailyWage: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockInPhoto: string | null;
  clockOutTime: string | null;
  clockOutPhoto: string | null;
}

export interface Expense {
  id: string;
  amount: number;
  category: 'Chai Nasta' | 'Stationery' | 'Tools & Consumables' | 'Miscellaneous / Other';
  description: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  callId: string;
  customerName: string;
  category: string;
  hardwareCost: number;
  laborCost: number;
  taxEnabled: boolean;
  cgst: number;
  sgst: number;
  total: number;
  date: string;
  notes: string;
}

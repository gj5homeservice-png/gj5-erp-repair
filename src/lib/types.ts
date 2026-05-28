export type RepairStatus = 'Pending' | 'Completed' | 'Rejected';

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
  technician: string; // Latest technician from history
  pickupRequired: boolean;
  pickupBy: 'Customer' | 'Amaro Boy' | null;
  runnerName: string | null;
  createdAt: string; // Original creation
  updatedAt: string; // Latest visit timestamp for Aging reset
  status: RepairStatus; // Latest status
  visitHistory: RepairHistoryEntry[];
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

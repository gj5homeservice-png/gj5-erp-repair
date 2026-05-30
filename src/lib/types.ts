export type RepairStatus = 'Pending' | 'Completed' | 'Rejected' | 'Exchange' | 'Purchase';

export interface VisitHistoryEntry {
  id: string;
  date: string;
  time: string;
  complaintDescription: string;
  technicianNotes: string;
  status: RepairStatus;
  resolutionNotes?: string;
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
  techTags: string[];
  intakeMode: 'Customer Visit' | 'Pickup Required';
  createdAt: string;
  updatedAt: string;
  status: RepairStatus;
  warrantyDuration?: string;
  warrantyExpiry?: string;
  storeLocation?: string;
  problemDescription: string;
  visitHistory: VisitHistoryEntry[];
  repeatCount: number;
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

export type LogisticsStatus = 'Pending Pickup' | 'OK Pickup' | 'Pending Delivery' | 'OK Delivery';

export interface TransportationLog {
  id: string;
  runnerName: string;
  runnerMobile: string;
  jobId: string;
  customerName: string;
  customerMobile: string;
  address: string;
  dispatchTime: string;
  status: LogisticsStatus;
}

export interface TransportEntry {
  id: string;
  vehicleNumber: string;
  driverName: string;
  vehicleType: string;
  route: string;
  departureDate: string;
  arrivalDate?: string;
  fuelCost: number;
  status: 'Available' | 'On Route' | 'Maintenance' | 'Completed';
  createdAt: string;
}

export interface Invoice {
  id: string;
  jobId: string;
  customerId: string;
  customerName: string;
  mobile: string;
  address: string;
  brand: string;
  model: string;
  hardwareCost: number;
  laborCost: number;
  additionalCharges: number;
  taxEnabled: boolean;
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  notes: string;
  timestamp: string;
}

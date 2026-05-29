export type RepairStatus = 'Pending' | 'Completed' | 'Rejected' | 'Exchange' | 'Purchase';

export interface RepairHistoryEntry {
  timestamp: string;
  issue: string;
  technician?: string;
  techTags?: string[];
  notes: string;
  statusAtTime: RepairStatus;
  visitNumber: number;
  resolution?: string;
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
  techTags?: string[];
  intakeMode: 'Customer Walk-In' | 'Logistics Dispatch';
  createdAt: string;
  updatedAt: string;
  status: RepairStatus;
  visitHistory: RepairHistoryEntry[];
  warrantyDuration?: string;
  warrantyCustomValue?: string;
  warrantyExpiry?: string;
  storeLocation?: string;
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

export type LogisticsStatus = 'In-Transit' | 'Collected' | 'Arrived at Workshop';

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

export type VehicleStatus = 'Available' | 'On Route' | 'Maintenance' | 'Completed';

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  fuelType: string;
  capacity: string;
  insuranceExpiry: string;
  status: VehicleStatus;
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
  status: VehicleStatus;
  createdAt: string;
}

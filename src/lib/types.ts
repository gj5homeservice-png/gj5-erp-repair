export type RepairStatus = 'Pending' | 'Completed' | 'Rejected' | 'Exchange' | 'Purchase';

export interface VisitHistoryEntry {
  id: string;
  date: string;
  time: string;
  complaintDescription: string;
  technicianNotes: string;
  status: RepairStatus;
}

export interface RepairCall {
  id: string;
  customerId: string;
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  mobile: string;
  items: any[];
  total: number;
  timestamp: string;
}

export interface StockItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number;
  barcode: string;
  images: string[];
  lastUpdated: string;
  history: any[];
}

export interface WalletTransaction {
  id: string;
  amount: number;
  date: string;
  time: string;
  type: string;
  description: string;
}

export interface VisibilitySettings {
  tabs: Record<string, boolean>;
  kpis: Record<string, boolean>;
}

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  pin: string;
  salary: number;
  status: string;
  designation: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: string;
}

export interface TransportationLog {
  id: string;
  runnerName: string;
  jobId: string;
  customerName: string;
  status: string;
  dispatchTime: string;
}
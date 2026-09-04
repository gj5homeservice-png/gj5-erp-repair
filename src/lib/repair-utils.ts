import { RepairJob } from '@/lib/types';

export function generateRepairJobId(existingJobs: RepairJob[]): string {
  return `RJ${1001 + existingJobs.length}`;
}

export function partsTotal(job: Pick<RepairJob, 'parts'>): number {
  return job.parts.reduce((sum, p) => sum + p.total, 0);
}

export function grandTotal(job: Pick<RepairJob, 'parts' | 'labourCharges' | 'otherCharges' | 'discount'>): number {
  return partsTotal(job) + job.labourCharges + job.otherCharges - job.discount;
}

export function totalPaid(job: Pick<RepairJob, 'payments'>): number {
  return job.payments.reduce((sum, p) => sum + p.amount, 0);
}

export function balanceDue(job: Pick<RepairJob, 'parts' | 'labourCharges' | 'otherCharges' | 'discount' | 'payments'>): number {
  return grandTotal(job) - totalPaid(job);
}

// Before any parts/labour/other charges are billed, show the quoted estimate instead of a misleading ₹0.
export function displayAmount(job: Pick<RepairJob, 'parts' | 'labourCharges' | 'otherCharges' | 'discount' | 'estimatedCost'>): number {
  const billingStarted = job.parts.length > 0 || job.labourCharges > 0 || job.otherCharges > 0 || job.discount > 0;
  return billingStarted ? grandTotal(job) : job.estimatedCost;
}

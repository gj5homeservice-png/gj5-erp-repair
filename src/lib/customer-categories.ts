// Single source of truth for Customer Department's Category field — used by
// the Add/Edit form dropdown, the list filter dropdown, and server-side
// validation (src/lib/erp/customers.ts), so all three can never drift out
// of sync.
//
// To add a future category: add one string to this array. Nothing else
// needs to change — the dropdown, the filter, and the server-side
// acceptance list all read from here. There is no separate admin UI for
// managing this list yet (a full Settings → Customer Categories page with
// add/edit/enable-disable and safe reassignment-before-delete would need
// its own table, migration and API routes — deliberately not built in this
// pass to avoid touching the existing Settings module's architecture for a
// feature that isn't needed yet); this file is the intended extension point
// until that's built.
export const CUSTOMER_CATEGORIES = [
  'Customer',
  'Technician',
  'CCTV',
  'Hotel',
  'Gym',
  'Salon',
  'Retail',
  'Corporate',
  'Wholesale',
  'Service',
  'Dealer',
  'Other',
] as const;

export type CustomerCategory = typeof CUSTOMER_CATEGORIES[number];

export const DEFAULT_CUSTOMER_CATEGORY: CustomerCategory = 'Customer';

export function isValidCustomerCategory(value: unknown): value is CustomerCategory {
  return typeof value === 'string' && (CUSTOMER_CATEGORIES as readonly string[]).includes(value);
}

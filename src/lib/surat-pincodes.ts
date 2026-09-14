// Surat, Gujarat postal (PIN) codes for the Customer Department's Pincode
// search/select field. This is the set of well-established, commonly used
// Surat CITY pincodes — not a claim of every pincode in Surat district
// (which also covers outlying towns like Bardoli, Kamrej, Olpad with their
// own separate codes). Extensible the same way customer-categories.ts is:
// add another { pincode, area } entry here and it shows up everywhere this
// list is used, no other changes needed.
export interface SuratPincode {
  pincode: string;
  area: string;
}

export const SURAT_PINCODES: SuratPincode[] = [
  { pincode: '395001', area: 'Nanpura / Surat GPO' },
  { pincode: '395002', area: 'Gopipura' },
  { pincode: '395003', area: 'Rampura' },
  { pincode: '395004', area: 'Katargam' },
  { pincode: '395005', area: 'Athwalines / Ghod Dod Road' },
  { pincode: '395006', area: 'Varachha Road' },
  { pincode: '395007', area: 'Adajan' },
  { pincode: '395008', area: 'Udhna' },
  { pincode: '395009', area: 'Pal' },
  { pincode: '395010', area: 'Rander' },
  { pincode: '395017', area: 'Vesu' },
  { pincode: '395023', area: 'Bhatar / Dumas Road' },
];

export const SURAT_CITY = 'Surat';
export const SURAT_STATE = 'Gujarat';

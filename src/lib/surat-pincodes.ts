// Searchable Gujarat pincode/locality dataset for the Customer Department's
// Pincode selector — Surat city areas plus the surrounding district towns
// and the other major Gujarat cities an out-of-Surat customer might be in.
// Not a claim of exhaustive postal coverage — meant as a convenient,
// extensible starting set (same spirit as customer-categories.ts): add
// another entry here and it's searchable everywhere this list is used, no
// other code changes needed.
//
// Two entries are allowed to share the same pincode (e.g. Bamroli/Vadod and
// Pandesara both use 394221) — `id` is what's unique, not `pincode`, so
// each stays a distinct, separately selectable result instead of collapsing
// into one.
export interface GujaratLocation {
  id: string;
  pincode: string;
  area: string;
  city: string;
}

export const GUJARAT_STATE = 'Gujarat';

export const GUJARAT_LOCATIONS: GujaratLocation[] = [
  // Surat city
  { id: 'surat-395001', pincode: '395001', area: 'Athwalines / Majura Gate', city: 'Surat' },
  { id: 'surat-395002', pincode: '395002', area: 'Textile Market / Ring Road / Inderpura', city: 'Surat' },
  { id: 'surat-395003', pincode: '395003', area: 'Surat Main Station / Bhagal / Mahidharpura', city: 'Surat' },
  { id: 'surat-395003-ho', pincode: '395003', area: 'Surat H.O.', city: 'Surat' },
  { id: 'surat-395004', pincode: '395004', area: 'Katargam / Ved Road', city: 'Surat' },
  { id: 'surat-395005', pincode: '395005', area: 'Bhestan / Variyav / Jahangirpura', city: 'Surat' },
  { id: 'surat-395006', pincode: '395006', area: 'Varachha Road / Puna Gam / Sarthana', city: 'Surat' },
  { id: 'surat-395007', pincode: '395007', area: 'Athwagate / Parle Point / Piplod / Dumas Road', city: 'Surat' },
  { id: 'surat-395008', pincode: '395008', area: 'A.K. Road / Ashwinikumar Road', city: 'Surat' },
  { id: 'surat-395009', pincode: '395009', area: 'Adajan / Pal / Rander', city: 'Surat' },
  { id: 'surat-395017', pincode: '395017', area: 'Althan / Bhimrad', city: 'Surat' },
  { id: 'surat-395023', pincode: '395023', area: 'Bhestan', city: 'Surat' },
  { id: 'surat-394210-udhna', pincode: '394210', area: 'Godadara / Dindoli / Udhna', city: 'Surat' },
  { id: 'surat-394230-sachin', pincode: '394230', area: 'Sachin GIDC / Sachin Village', city: 'Surat' },
  { id: 'surat-394221-bamroli', pincode: '394221', area: 'Bamroli / Vadod', city: 'Surat' },
  { id: 'surat-394221-pandesara', pincode: '394221', area: 'Pandesara', city: 'Surat' },
  { id: 'surat-394107', pincode: '394107', area: 'Amroli / Chhaprabhatha', city: 'Surat' },

  // Surat district towns / talukas
  { id: 'kosamba-394120', pincode: '394120', area: 'Kosamba', city: 'Kosamba' },
  { id: 'sayan-394210', pincode: '394210', area: 'Sayan', city: 'Sayan' },
  { id: 'sayan-394230', pincode: '394230', area: 'Sayan', city: 'Sayan' },
  { id: 'katodara-394130', pincode: '394130', area: 'Katodara / Velanja', city: 'Katodara' },
  { id: 'abrama-394150', pincode: '394150', area: 'Abrama', city: 'Abrama' },
  { id: 'mandvi-394160', pincode: '394160', area: 'Mandvi', city: 'Mandvi' },
  { id: 'tadkeshwar-394170', pincode: '394170', area: 'Tadkeshwar', city: 'Tadkeshwar' },
  { id: 'kamrej-394185', pincode: '394185', area: 'Kamrej', city: 'Kamrej' },
  { id: 'hazira-394270', pincode: '394270', area: 'Hazira / Mora', city: 'Hazira' },
  { id: 'hazira-394516', pincode: '394516', area: 'Hazira / Mora', city: 'Hazira' },
  { id: 'mahuva-394250', pincode: '394250', area: 'Mahuva', city: 'Mahuva' },
  { id: 'palsana-394315', pincode: '394315', area: 'Palsana', city: 'Palsana' },
  { id: 'mangrol-394410', pincode: '394410', area: 'Mangrol', city: 'Mangrol' },
  { id: 'umarpada-394445', pincode: '394445', area: 'Umarpada', city: 'Umarpada' },
  { id: 'chorasi-394510', pincode: '394510', area: 'Chorasi', city: 'Chorasi' },
  { id: 'olpad-394540', pincode: '394540', area: 'Olpad', city: 'Olpad' },
  { id: 'bardoli-394601', pincode: '394601', area: 'Bardoli', city: 'Bardoli' },
  { id: 'kim-394110', pincode: '394110', area: 'Kim', city: 'Kim' },
  { id: 'vyara-394650', pincode: '394650', area: 'Vyara', city: 'Vyara' },

  // Other major Gujarat cities
  { id: 'ahmedabad-380001', pincode: '380001', area: 'Ahmedabad H.O.', city: 'Ahmedabad' },
  { id: 'gandhinagar-382010', pincode: '382010', area: 'Gandhinagar', city: 'Gandhinagar' },
  { id: 'vadodara-390001', pincode: '390001', area: 'Vadodara H.O.', city: 'Vadodara' },
  { id: 'rajkot-360001', pincode: '360001', area: 'Rajkot H.O.', city: 'Rajkot' },
  { id: 'bhavnagar-364001', pincode: '364001', area: 'Bhavnagar H.O.', city: 'Bhavnagar' },
  { id: 'jamnagar-361001', pincode: '361001', area: 'Jamnagar H.O.', city: 'Jamnagar' },
  { id: 'junagadh-362001', pincode: '362001', area: 'Junagadh H.O.', city: 'Junagadh' },
  { id: 'anand-388001', pincode: '388001', area: 'Anand', city: 'Anand' },
  { id: 'navsari-396445', pincode: '396445', area: 'Navsari', city: 'Navsari' },
  { id: 'valsad-396001', pincode: '396001', area: 'Valsad', city: 'Valsad' },
  { id: 'bharuch-392001', pincode: '392001', area: 'Bharuch', city: 'Bharuch' },
  { id: 'mehsana-384001', pincode: '384001', area: 'Mehsana', city: 'Mehsana' },
  { id: 'bhuj-370001', pincode: '370001', area: 'Bhuj - Kutch', city: 'Bhuj' },
  { id: 'godhra-389001', pincode: '389001', area: 'Godhra', city: 'Godhra' },
  { id: 'himmatnagar-383001', pincode: '383001', area: 'Himmatnagar', city: 'Himmatnagar' },
  { id: 'patan-384265', pincode: '384265', area: 'Patan', city: 'Patan' },
  { id: 'amreli-365601', pincode: '365601', area: 'Amreli', city: 'Amreli' },
  { id: 'porbandar-360575', pincode: '360575', area: 'Porbandar', city: 'Porbandar' },
  { id: 'surendranagar-363001', pincode: '363001', area: 'Surendranagar', city: 'Surendranagar' },
];

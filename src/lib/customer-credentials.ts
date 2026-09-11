import { getPool } from './db';
import { hashPassword, verifyPassword } from './password';

// Real customer accounts for the public repair-booking website — a wholly
// separate identity/table from owner_credentials and employee_credentials
// (see sql/migrations/008_customer_accounts.sql for why this is a separate
// table rather than folded into the existing `sessions`/credential tables).

export interface CustomerAccount {
  id: string;
  userEmail: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  pincode: string | null;
  createdAt: string;
}

function rowToAccount(row: any): CustomerAccount {
  return {
    id: row.id,
    userEmail: row.user_email,
    name: row.name,
    mobile: row.mobile,
    email: row.email,
    address: row.address,
    pincode: row.pincode,
    createdAt: row.created_at,
  };
}

export async function findCustomerByIdentifier(userEmail: string, identifier: string): Promise<(CustomerAccount & { passwordHash: string }) | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM customer_accounts WHERE user_email = ? AND (mobile = ? OR email = ?) LIMIT 1',
    [userEmail, identifier, identifier]
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return { ...rowToAccount(row), passwordHash: row.password_hash };
}

export async function getCustomerById(userEmail: string, id: string): Promise<CustomerAccount | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT * FROM customer_accounts WHERE id = ? AND user_email = ? LIMIT 1',
    [id, userEmail]
  );
  const row = (rows as any[])[0];
  return row ? rowToAccount(row) : null;
}

export async function createCustomerAccount(userEmail: string, input: {
  name: string; mobile: string; email?: string | null; password: string; address?: string | null; pincode?: string | null;
}): Promise<CustomerAccount> {
  const pool = getPool();
  const existing = await pool.execute<any[]>(
    'SELECT id FROM customer_accounts WHERE user_email = ? AND mobile = ? LIMIT 1',
    [userEmail, input.mobile]
  );
  if ((existing[0] as any[]).length > 0) {
    throw new Error('An account with this mobile number already exists. Please log in instead.');
  }

  const id = `CUSTACC${Date.now()}`;
  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();
  await pool.execute(
    'INSERT INTO customer_accounts (id, user_email, name, mobile, email, password_hash, address, pincode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userEmail, input.name, input.mobile, input.email || null, passwordHash, input.address || null, input.pincode || null, now]
  );
  return { id, userEmail, name: input.name, mobile: input.mobile, email: input.email || null, address: input.address || null, pincode: input.pincode || null, createdAt: now };
}

export async function verifyCustomerPassword(userEmail: string, identifier: string, plainText: string): Promise<CustomerAccount | null> {
  const account = await findCustomerByIdentifier(userEmail, identifier);
  if (!account) return null;
  const ok = await verifyPassword(plainText, account.passwordHash);
  if (!ok) return null;
  const { passwordHash, ...rest } = account;
  return rest;
}

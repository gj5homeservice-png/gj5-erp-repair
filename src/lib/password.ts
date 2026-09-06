import bcrypt from 'bcryptjs';

// Server-only. Never import this from a client component — bcryptjs pulls in
// Node crypto internals and has no business running in the browser bundle.
const SALT_ROUNDS = 12;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plainText, hash);
}

export function isPasswordStrongEnough(plainText: string): boolean {
  // Minimal, sane floor — not the UI's job to explain policy beyond this.
  return typeof plainText === 'string' && plainText.length >= 6;
}

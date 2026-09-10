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
  return getPasswordStrengthError(plainText) === null;
}

// Returns a human-readable reason the password fails the policy, or null if
// it passes — lets the UI show exactly what's missing instead of a generic
// rejection. Policy: 8+ characters, at least one letter and one number.
// Applied everywhere a password is set or changed (self-service change,
// admin reset-for-employee, and the new owner account), so the bar is
// consistent across the whole app.
export function getPasswordStrengthError(plainText: string): string | null {
  if (typeof plainText !== 'string' || plainText.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[a-zA-Z]/.test(plainText)) {
    return 'Password must include at least one letter.';
  }
  if (!/[0-9]/.test(plainText)) {
    return 'Password must include at least one number.';
  }
  return null;
}

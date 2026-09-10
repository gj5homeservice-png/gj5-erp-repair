import crypto from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  WebAuthnCredential,
} from '@simplewebauthn/server';
import { getPool } from './db';

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Derived from the actual incoming request every time — never hardcoded —
// so this works correctly both on the production domain and on localhost
// during local testing (WebAuthn treats localhost as a secure context).
export function getRpConfig(request: Request): { rpID: string; origin: string } {
  const url = new URL(request.url);
  const originHeader = request.headers.get('origin');
  const origin = originHeader || url.origin;
  let rpID = url.hostname;
  try {
    if (originHeader) rpID = new URL(originHeader).hostname;
  } catch {
    // keep url.hostname
  }
  return { rpID, origin };
}

function stableUserId(userEmail: string, employeeId: string | null) {
  // .slice() (rather than passing the Buffer/Uint8Array straight through)
  // narrows to a plain ArrayBuffer-backed Uint8Array, matching the library's
  // own Uint8Array_ = ReturnType<Uint8Array['slice']> type exactly.
  return new Uint8Array(crypto.createHash('sha256').update(`${userEmail}:${employeeId || 'owner'}`).digest()).slice();
}

// ---- Challenge storage (short-lived, DB-backed — survives across the two
// request/response round trips a WebAuthn ceremony needs, without relying on
// any in-memory state that wouldn't be safe across multiple Node processes). ----

export async function storeChallenge(
  purpose: 'register' | 'authenticate',
  challenge: string,
  identity: { userEmail: string; employeeId: string | null } | null
): Promise<string> {
  const pool = getPool();
  const id = crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  await pool.execute(
    'INSERT INTO webauthn_challenges (id, challenge, purpose, user_email, employee_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, challenge, purpose, identity?.userEmail ?? null, identity?.employeeId ?? null, now.toISOString(), expiresAt.toISOString()]
  );
  return id;
}

export async function consumeChallenge(id: string, purpose: 'register' | 'authenticate'): Promise<{
  challenge: string;
  userEmail: string | null;
  employeeId: string | null;
} | null> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT challenge, purpose, user_email, employee_id, expires_at FROM webauthn_challenges WHERE id = ? LIMIT 1',
    [id]
  );
  const row = (rows as any[])[0];
  // Always delete on read — a challenge is single-use whether it succeeds or
  // fails, preventing any kind of replay.
  await pool.execute('DELETE FROM webauthn_challenges WHERE id = ?', [id]);
  if (!row || row.purpose !== purpose) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { challenge: row.challenge, userEmail: row.user_email, employeeId: row.employee_id };
}

// ---- Registration (always for an already-authenticated identity) ----

export async function buildRegistrationOptions(
  request: Request,
  identity: { userEmail: string; employeeId: string | null },
  displayName: string
) {
  const { rpID } = getRpConfig(request);
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT credential_id, transports FROM webauthn_credentials WHERE user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL))',
    [identity.userEmail, identity.employeeId, identity.employeeId]
  );
  const excludeCredentials = (rows as any[]).map((r) => ({
    id: r.credential_id as string,
    transports: r.transports ? (r.transports.split(',') as any[]) : undefined,
  }));

  const options = await generateRegistrationOptions({
    rpName: 'GJ5 HOME SERVICE',
    rpID,
    userName: identity.userEmail,
    userID: stableUserId(identity.userEmail, identity.employeeId),
    userDisplayName: displayName,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });

  const challengeId = await storeChallenge('register', options.challenge, identity);
  return { options, challengeId };
}

export async function finishRegistration(
  request: Request,
  challengeId: string,
  response: RegistrationResponseJSON,
  identity: { userEmail: string; employeeId: string | null },
  deviceName: string
): Promise<{ success: true } | { success: false; error: string }> {
  const pending = await consumeChallenge(challengeId, 'register');
  if (!pending) return { success: false, error: 'This registration attempt has expired. Please try again.' };

  const { rpID, origin } = getRpConfig(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not verify this passkey.' };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { success: false, error: 'Passkey registration could not be verified.' };
  }

  const { credential } = verification.registrationInfo;
  const pool = getPool();
  await pool.execute(
    `INSERT INTO webauthn_credentials (credential_id, user_email, employee_id, public_key, counter, device_name, transports, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      credential.id,
      identity.userEmail,
      identity.employeeId,
      isoBase64URL.fromBuffer(credential.publicKey),
      credential.counter,
      deviceName || 'Unnamed device',
      credential.transports ? credential.transports.join(',') : null,
      new Date().toISOString(),
    ]
  );
  return { success: true };
}

// ---- Authentication (usernameless — identity resolved from the credential used) ----

export async function buildAuthenticationOptions(request: Request) {
  const { rpID } = getRpConfig(request);
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    // No allowCredentials — lets the platform show every discoverable
    // passkey registered for this site, matching the one-tap flow.
  });
  const challengeId = await storeChallenge('authenticate', options.challenge, null);
  return { options, challengeId };
}

export interface WebAuthnLoginResult {
  userEmail: string;
  employeeId: string | null;
}

export async function finishAuthentication(
  request: Request,
  challengeId: string,
  response: AuthenticationResponseJSON
): Promise<{ success: true; identity: WebAuthnLoginResult } | { success: false; error: string }> {
  const pending = await consumeChallenge(challengeId, 'authenticate');
  if (!pending) return { success: false, error: 'This sign-in attempt has expired. Please try again.' };

  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT credential_id, user_email, employee_id, public_key, counter, transports FROM webauthn_credentials WHERE credential_id = ? LIMIT 1',
    [response.id]
  );
  const row = (rows as any[])[0];
  if (!row) return { success: false, error: 'This passkey is not registered with GJ5 HOME SERVICE.' };

  const storedCredential: WebAuthnCredential = {
    id: row.credential_id,
    publicKey: isoBase64URL.toBuffer(row.public_key),
    counter: Number(row.counter),
    transports: row.transports ? row.transports.split(',') : undefined,
  };

  const { rpID, origin } = getRpConfig(request);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: storedCredential,
    });
  } catch (err: any) {
    return { success: false, error: err?.message || 'Could not verify this passkey.' };
  }

  if (!verification.verified) {
    return { success: false, error: 'Passkey sign-in could not be verified.' };
  }

  await pool.execute('UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE credential_id = ?', [
    verification.authenticationInfo.newCounter,
    new Date().toISOString(),
    row.credential_id,
  ]);

  return { success: true, identity: { userEmail: row.user_email, employeeId: row.employee_id } };
}

// ---- Listing / removing registered passkeys (Settings > Login & Security) ----

export interface WebAuthnCredentialSummary {
  credentialId: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function listCredentials(userEmail: string, employeeId: string | null): Promise<WebAuthnCredentialSummary[]> {
  const pool = getPool();
  const [rows] = await pool.execute<any[]>(
    'SELECT credential_id, device_name, created_at, last_used_at FROM webauthn_credentials WHERE user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL)) ORDER BY created_at DESC',
    [userEmail, employeeId, employeeId]
  );
  return (rows as any[]).map((r) => ({
    credentialId: r.credential_id,
    deviceName: r.device_name,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
}

export async function removeCredential(userEmail: string, employeeId: string | null, credentialId: string): Promise<boolean> {
  const pool = getPool();
  const [result]: any = await pool.execute(
    'DELETE FROM webauthn_credentials WHERE credential_id = ? AND user_email = ? AND (employee_id = ? OR (employee_id IS NULL AND ? IS NULL))',
    [credentialId, userEmail, employeeId, employeeId]
  );
  return result.affectedRows > 0;
}

-- 006: Real server-side owner credentials + WebAuthn/passkey support + email
-- change verification.
--
-- Fixes a real pre-existing gap: POST /api/auth/session previously minted a
-- valid owner session for any email it was given, with the actual password
-- check ("admin@gj5.com" / "123456") only ever happening in browser
-- JavaScript. This migration gives the owner account a real, bcrypt-hashed
-- credential row — application code (src/app/api/auth/session/route.ts) now
-- verifies against it server-side, the same way employee_credentials always
-- has been.
--
-- Nothing here changes the *effective* login: the seed hash below is bcrypt
-- of the literal string "123456" (12 salt rounds), i.e. the exact password
-- that already works today. Nothing is reset or invalidated — existing
-- sessions, existing employees, and existing ERP data are all untouched.
-- Every statement is idempotent (CREATE TABLE IF NOT EXISTS / INSERT IGNORE)
-- so re-running this file is always safe.

SET NAMES utf8mb4;

-- ============================================================
-- Owner (tenant admin) real credentials
-- ============================================================

-- `user_email` is the same immutable tenant-scope value already used as the
-- `user_email` column on every ERP table — it never changes, exactly like
-- how `employee_credentials.user_email` (the employer's email) never changes
-- when an employee updates their own `login_email`. `login_email` is the
-- actual "email you type to log in" and the target of the Settings > Login &
-- Security > Change Email flow — defaults to the same value as user_email
-- until deliberately changed, so changing it never touches, renames, or
-- re-scopes a single row of existing ERP data.
CREATE TABLE IF NOT EXISTS owner_credentials (
  user_email     VARCHAR(191) PRIMARY KEY,
  login_email    VARCHAR(191) NULL,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     VARCHAR(40) NOT NULL,
  updated_at     VARCHAR(40) NULL,
  UNIQUE INDEX idx_owner_credentials_login_email (login_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed the existing owner account so login keeps working immediately after
-- this migration runs. Hash below = bcrypt("123456", 12 rounds) — the exact
-- password that already works today via the old hardcoded client-side check.
-- INSERT IGNORE: if a row already exists (e.g. this migration re-run, or the
-- owner already changed their password before a re-run), it is never
-- overwritten.
INSERT IGNORE INTO owner_credentials (user_email, login_email, password_hash, created_at, updated_at)
VALUES ('admin@gj5.com', 'admin@gj5.com', '$2a$12$IL8AbpgIeAwIWigaUpmageZh1glKEHiqEMSKcADyIdIrC7rSHTyoS', '2026-09-10T00:00:00.000Z', NULL);

-- Employees already have a separate `login_email` distinct from their
-- employer's immutable `user_email` scope — this just gives that same
-- column real use from the self-service Settings screen instead of it only
-- ever being set by an admin at creation time.
-- (No ALTER needed: employee_credentials.login_email already exists.)

-- ============================================================
-- WebAuthn / passkey credentials
-- ============================================================

-- Stores only what WebAuthn itself requires to verify a future login: the
-- credential's public key and bookkeeping metadata. No biometric data,
-- fingerprint image, or Face ID data ever reaches the server — the
-- device's own secure hardware never releases that, by design of the
-- WebAuthn standard itself.
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  credential_id   VARCHAR(255) PRIMARY KEY,
  user_email      VARCHAR(191) NOT NULL,
  -- NULL = the owner account's own passkey. Set = a specific employee's.
  employee_id     VARCHAR(64) NULL,
  public_key      TEXT NOT NULL,
  counter         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  device_name     VARCHAR(100) NOT NULL,
  transports      VARCHAR(191) NULL,
  created_at      VARCHAR(40) NOT NULL,
  last_used_at    VARCHAR(40) NULL,
  INDEX idx_webauthn_credentials_user (user_email),
  INDEX idx_webauthn_credentials_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Short-lived registration/login challenges. A background sweep isn't
-- required — every read path also deletes expired rows it encounters
-- (see src/lib/webauthn.ts), and rows are tiny.
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id             VARCHAR(64) PRIMARY KEY,
  challenge      VARCHAR(255) NOT NULL,
  purpose        VARCHAR(20) NOT NULL, -- 'register' | 'authenticate'
  -- Known up front for 'register' (an already-authenticated user adding a
  -- passkey). NULL for 'authenticate' (usernameless login — identity is
  -- only known once the browser returns which credential it used).
  user_email     VARCHAR(191) NULL,
  employee_id    VARCHAR(64) NULL,
  created_at     VARCHAR(40) NOT NULL,
  expires_at     VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Email change verification
-- ============================================================

CREATE TABLE IF NOT EXISTS email_change_requests (
  token         VARCHAR(128) PRIMARY KEY,
  user_email    VARCHAR(191) NOT NULL,
  employee_id   VARCHAR(64) NULL,
  new_email     VARCHAR(191) NOT NULL,
  created_at    VARCHAR(40) NOT NULL,
  expires_at    VARCHAR(40) NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX idx_email_change_requests_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

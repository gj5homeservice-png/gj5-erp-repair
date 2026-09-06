-- Fixes the session-expiry timezone bug: `sessions.created_at`/`expires_at`
-- were native DATETIME columns, written from a raw JS Date object (serialized
-- using the driver's local-timezone default) and read back as a bare,
-- timezone-less string later re-parsed with `new Date()` — correct only if
-- both sides happen to agree on timezone, which is not something to rely on
-- on shared hosting. This is why a valid, freshly-created session could
-- intermittently be treated as already expired/invalid.
--
-- Run this ONCE against the live Hostinger database via phpMyAdmin's
-- Import/SQL tab, same as migration 001.
--
-- The `sessions` table holds nothing but ephemeral login tokens — no ERP
-- business data — so clearing it first (forcing every currently-logged-in
-- browser to log in again) is the safe, clean way to convert the column type
-- without MySQL having to reinterpret old DATETIME values into strings.
DELETE FROM sessions;

ALTER TABLE sessions
  MODIFY COLUMN created_at VARCHAR(40) NOT NULL,
  MODIFY COLUMN expires_at VARCHAR(40) NOT NULL;

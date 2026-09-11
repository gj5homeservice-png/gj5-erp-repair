-- 008: Public customer accounts + sessions for the new customer repair-
-- booking website.
--
-- Deliberately a SEPARATE table/session pair from owner_credentials/
-- employee_credentials/sessions, not an extension of them. The existing
-- `sessions` table's `employee_id IS NULL` already means "owner/admin,
-- always full ERP access" everywhere it's checked (api-auth.ts,
-- self-account.ts, etc.) — adding a customer identity into that same table
-- would mean every one of those existing "is this the owner?" checks would
-- also need to be found and updated to additionally exclude customers, and
-- missing even one would silently grant a customer full ERP access. A fully
-- separate table makes that class of mistake structurally impossible: a
-- customer's token simply does not exist in `sessions`, so requireUser()
-- (used by every /api/erp/* route) rejects it the same way it rejects any
-- other invalid token — no new "is this actually a customer?" check needed
-- anywhere in the existing ERP code path.
--
-- Every statement is idempotent (CREATE TABLE IF NOT EXISTS) so re-running
-- this file is always safe. Nothing here alters or deletes any existing
-- table or row.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS customer_accounts (
  id             VARCHAR(64) PRIMARY KEY,
  -- Tenant scope — the shop's owner_credentials.user_email this customer
  -- belongs to. This deployment resolves that single value via
  -- src/lib/public-shop.ts (SHOP_TENANT_EMAIL env var, defaulting to the
  -- seeded owner 'admin@gj5.com'); the column exists so the schema itself
  -- doesn't assume single-tenancy even though today's deployment is.
  user_email     VARCHAR(191) NOT NULL,
  name           VARCHAR(191) NOT NULL,
  mobile         VARCHAR(20) NOT NULL,
  email          VARCHAR(191) NULL,
  password_hash  VARCHAR(255) NOT NULL,
  address        VARCHAR(255) NULL,
  pincode        VARCHAR(10) NULL,
  created_at     VARCHAR(40) NOT NULL,
  updated_at     VARCHAR(40) NULL,
  UNIQUE INDEX idx_customer_accounts_tenant_mobile (user_email, mobile),
  INDEX idx_customer_accounts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_sessions (
  token         VARCHAR(128) PRIMARY KEY,
  customer_id   VARCHAR(64) NOT NULL,
  user_email    VARCHAR(191) NOT NULL,
  created_at    VARCHAR(40) NOT NULL,
  expires_at    VARCHAR(40) NOT NULL,
  device_info   VARCHAR(255) NULL,
  INDEX idx_customer_sessions_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

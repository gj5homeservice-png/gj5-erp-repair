-- 018: Settings — permanent, cross-browser Business Profile & Contact info.
--
-- Root cause being fixed: the Settings page's "Business Profile" (Business
-- Name, Tagline, GSTIN, PAN) and "Contact & Address" (Mobile, Alternate
-- Mobile, Email, Website, Address, Pincode, City, State, Country) sections
-- both save through the app's older `companyProfile` path, which is
-- Firestore-backed with a localStorage fallback (see
-- src/hooks/use-erp-store.ts) — never MySQL. Whenever Firestore isn't
-- reachable/configured, or a company record has no Firestore-issued id yet,
-- that save silently becomes localStorage-only for that ONE browser, which
-- is exactly why a second browser/device/Incognito window shows different
-- (or default) values. The Company Logo already had this same problem and
-- was fixed the same way in migration 016 (system_settings.logo_url) — this
-- migration does the identical thing for the rest of the Business Profile
-- and Contact & Address fields, reusing the same table for the same reason:
-- these are account-level settings, not business records, and
-- system_settings is already the app's one row-per-tenant settings table,
-- already loaded on every login via /api/erp/bootstrap.
--
-- Uses the same INFORMATION_SCHEMA-conditional technique as migrations
-- 012-017 (not "ADD COLUMN IF NOT EXISTS", which needs MySQL 8.0.29+) so
-- this runs correctly on any MySQL/MariaDB version and is safe to run more
-- than once.
--
-- Additive only: no table dropped, no existing column dropped, renamed, or
-- altered, and no existing row's data touched. Every new column is
-- NULL-able, so every existing tenant row keeps working with these simply
-- empty until the Settings page is saved once, at which point the
-- existing Firestore/localStorage value is carried over automatically (see
-- use-erp-store.ts's fallback merge) and the account is fully migrated.

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS gj5_add_column_if_missing;

DELIMITER $$

CREATE PROCEDURE gj5_add_column_if_missing(
  IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column
  ) THEN
    SET @gj5_ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE gj5_stmt FROM @gj5_ddl;
    EXECUTE gj5_stmt;
    DEALLOCATE PREPARE gj5_stmt;
  END IF;
END$$

DELIMITER ;

-- Business Profile section
CALL gj5_add_column_if_missing('system_settings', 'company_name', 'VARCHAR(191) NULL');
CALL gj5_add_column_if_missing('system_settings', 'tagline',      'VARCHAR(255) NULL');
CALL gj5_add_column_if_missing('system_settings', 'gst_number',   'VARCHAR(20) NULL');
CALL gj5_add_column_if_missing('system_settings', 'pan_number',   'VARCHAR(20) NULL');

-- Contact & Address section
CALL gj5_add_column_if_missing('system_settings', 'owner_mobile',     'VARCHAR(20) NULL');
CALL gj5_add_column_if_missing('system_settings', 'alternate_mobile', 'VARCHAR(20) NULL');
CALL gj5_add_column_if_missing('system_settings', 'owner_email',      'VARCHAR(191) NULL');
CALL gj5_add_column_if_missing('system_settings', 'website',          'VARCHAR(255) NULL');
CALL gj5_add_column_if_missing('system_settings', 'address',          'VARCHAR(255) NULL');
CALL gj5_add_column_if_missing('system_settings', 'pincode',          'VARCHAR(10) NULL');
CALL gj5_add_column_if_missing('system_settings', 'city',             'VARCHAR(100) NULL');
CALL gj5_add_column_if_missing('system_settings', 'state',            'VARCHAR(100) NULL');
CALL gj5_add_column_if_missing('system_settings', 'country',          'VARCHAR(100) NULL');

DROP PROCEDURE gj5_add_column_if_missing;

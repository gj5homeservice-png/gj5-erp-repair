-- 019: Customer Department — one consolidated, idempotent backfill of every
-- `customers` column Add/Edit Customer actually uses.
--
-- Why this exists: migrations 010 and 011 used "ADD COLUMN IF NOT EXISTS",
-- which requires MySQL 8.0.29+ and is the confirmed reason they silently
-- never applied to production (an older/incompatible server version
-- rejects that syntax outright, aborting the whole statement). Migrations
-- 012 (re-applies 010+011's columns), 013 (facebook_id/instagram_id) and
-- 014 (area) were each written afterwards with the safe
-- INFORMATION_SCHEMA-conditional technique below, but it is not certain
-- from here which of 012/013/014 have actually been run against the live
-- Hostinger database — production is currently still failing with
-- "Unknown column 'area' in 'INSERT INTO'", confirming at least 014 never
-- ran. Rather than ask you to run four separate historical files in the
-- right order, this ONE migration re-checks and adds every column from
-- 010/011/012/013/014 in a single idempotent pass — any column that
-- already exists (from a migration that DID apply) is simply skipped, and
-- create_customer()/update_customer() in src/lib/erp/customers.ts already
-- reference every one of these column names today, so once this file has
-- been run, Add Customer and Edit Customer both have everything they need.
--
-- Additive only: no table is dropped, no existing column is dropped,
-- renamed, or altered, and no existing customer row's data is touched
-- (each ADD COLUMN is NULL-able or gets the same safe default the
-- corresponding original migration used). customer_notes is re-declared
-- with CREATE TABLE IF NOT EXISTS, whose "IF NOT EXISTS" form has always
-- been supported by every MySQL/MariaDB version, so it is unaffected by
-- the ADD COLUMN IF NOT EXISTS issue above and safe to include here
-- unconditionally. Safe to run more than once.

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

-- From migration 010 (originally broken syntax)
CALL gj5_add_column_if_missing('customers', 'alternate_mobile', 'VARCHAR(20) NULL AFTER mobile');
CALL gj5_add_column_if_missing('customers', 'city',             'VARCHAR(100) NULL AFTER address');
CALL gj5_add_column_if_missing('customers', 'state',            'VARCHAR(100) NULL AFTER city');
CALL gj5_add_column_if_missing('customers', 'status',           "VARCHAR(20) NOT NULL DEFAULT 'Active' AFTER source");
CALL gj5_add_column_if_missing('customers', 'updated_at',       'VARCHAR(40) NULL AFTER created_at');

-- From migration 011 (originally broken syntax)
CALL gj5_add_column_if_missing('customers', 'category', "VARCHAR(50) NOT NULL DEFAULT 'Customer' AFTER status");

-- From migration 013
CALL gj5_add_column_if_missing('customers', 'facebook_id',  'VARCHAR(191) NULL AFTER email');
CALL gj5_add_column_if_missing('customers', 'instagram_id', 'VARCHAR(191) NULL AFTER facebook_id');

-- From migration 014 — the column production is currently missing
CALL gj5_add_column_if_missing('customers', 'area', 'VARCHAR(191) NULL AFTER pincode');

DROP PROCEDURE gj5_add_column_if_missing;

-- Same backfill migration 011 already did — a no-op if it already ran.
UPDATE customers SET category = 'Customer' WHERE category IS NULL OR category = '';

CREATE TABLE IF NOT EXISTS customer_notes (
  id           VARCHAR(64) PRIMARY KEY,
  customer_id  VARCHAR(64) NOT NULL,
  user_email   VARCHAR(191) NOT NULL,
  note         TEXT NOT NULL,
  created_by   VARCHAR(191) NULL,
  created_at   VARCHAR(40) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_notes_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

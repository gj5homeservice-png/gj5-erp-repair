-- 012: Re-apply the `customers` table columns that migrations 010 and 011
-- were supposed to add, using a MySQL-version-agnostic technique.
--
-- Root cause this fixes: production reported "Unknown column
-- 'alternate_mobile' in 'INSERT INTO'" when saving a new customer, meaning
-- migration 010 (which adds alternate_mobile, city, state, status,
-- updated_at) never actually applied to the live database — most likely
-- because its `ADD COLUMN IF NOT EXISTS` syntax requires MySQL 8.0.29+ (a
-- caveat migration 003 already documented), and an older/incompatible
-- server version would have rejected that syntax outright, aborting the
-- whole statement before any of its columns were added. Migration 011
-- (category, same syntax) was very likely rejected the same way. Since
-- SELECT/UPDATE against a missing column just silently omits/blanks it
-- while INSERT is the one operation that hard-errors on it, this went
-- unnoticed until Add Customer's INSERT started naming these columns.
--
-- Fix: the exact same six `customers` columns from 010+011, re-added here
-- through a tiny stored procedure that checks INFORMATION_SCHEMA before
-- each ALTER TABLE — no "IF NOT EXISTS" clause anywhere, so this runs
-- correctly on any MySQL/MariaDB version. Each column is checked and added
-- independently, so this is also safe to run even if some of the six
-- already exist (a partial prior application) — those are simply skipped,
-- not duplicated or altered. Also re-applies `customer_notes` (Customer
-- Department's admin-notes table, first added alongside these columns in
-- migration 010) using CREATE TABLE IF NOT EXISTS, whose "IF NOT EXISTS"
-- form has always been supported by every MySQL/MariaDB version — it was
-- likely never reached if the ALTER TABLE earlier in that same import
-- aborted the whole script.
--
-- Additive only: no table is dropped, no existing column is dropped,
-- renamed, or altered, and no existing row's data is modified. Run this
-- ONCE against the live Hostinger database via phpMyAdmin's Import/SQL tab,
-- same as every other migration in this folder.

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

CALL gj5_add_column_if_missing('customers', 'alternate_mobile', 'VARCHAR(20) NULL AFTER mobile');
CALL gj5_add_column_if_missing('customers', 'city',             'VARCHAR(100) NULL AFTER address');
CALL gj5_add_column_if_missing('customers', 'state',            'VARCHAR(100) NULL AFTER city');
CALL gj5_add_column_if_missing('customers', 'status',           "VARCHAR(20) NOT NULL DEFAULT 'Active' AFTER source");
CALL gj5_add_column_if_missing('customers', 'updated_at',       'VARCHAR(40) NULL AFTER created_at');
CALL gj5_add_column_if_missing('customers', 'category',         "VARCHAR(50) NOT NULL DEFAULT 'Customer' AFTER status");

DROP PROCEDURE gj5_add_column_if_missing;

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

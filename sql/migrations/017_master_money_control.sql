-- 017: Master Money Control — multi-account tracking for the E-Wallet.
--
-- Adds ONE new table (`accounts` — named company money locations: Cash,
-- UPI, Bank, and per-Employee/Runner custody accounts) and additive columns
-- on three existing tables so a customer payment, an expense, or any wallet
-- transaction can be attributed to the specific account it landed in / was
-- paid from. This is deliberately NOT a second parallel ledger: the
-- existing `wallet_transactions` table remains the one Master Transaction
-- Ledger, `repair_job_payments`/`expenses` remain the one source of truth
-- for repair income / business expenses (see src/lib/wallet-engine.ts's
-- anti-duplication design) — this migration only lets those existing rows
-- also say WHICH account moved.
--
-- Uses the same INFORMATION_SCHEMA-conditional technique as migrations
-- 012-016 (not "ADD COLUMN IF NOT EXISTS", which needs MySQL 8.0.29+) so
-- this runs correctly on any MySQL/MariaDB version and is safe to run more
-- than once.
--
-- Additive only: no table dropped, no existing column dropped, renamed, or
-- altered, and no existing row's data touched. Every new column is
-- NULL-able (or has a safe default), so every existing repair job payment,
-- expense, and wallet transaction keeps working with these simply empty
-- until the app starts attributing new ones to an account.

SET NAMES utf8mb4;

-- Genuinely new table — CREATE TABLE IF NOT EXISTS is fine here, no
-- gj5_add_column_if_missing needed for a table that doesn't exist yet.
CREATE TABLE IF NOT EXISTS accounts (
  id                  VARCHAR(64) PRIMARY KEY,
  user_email          VARCHAR(191) NOT NULL,
  name                VARCHAR(191) NOT NULL,
  type                VARCHAR(20) NOT NULL,       -- CASH | UPI | BANK | EMPLOYEE | RUNNER
  linked_employee_id  VARCHAR(64) NULL,           -- optional convenience link to employees.id;
                                                   -- never required (Logistics runners are often
                                                   -- free-text name/mobile, not an employees row)
  opening_balance     DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_balance     DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          VARCHAR(40) NULL,
  INDEX idx_accounts_user (user_email),
  INDEX idx_accounts_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

-- Master Transaction Ledger attribution columns — every existing
-- wallet_transactions row keeps working with these simply NULL.
CALL gj5_add_column_if_missing('wallet_transactions', 'from_account_id',   'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'to_account_id',     'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'customer_id',       'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'employee_id',       'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'job_id',            'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'payment_method',    'VARCHAR(30) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'created_by',        'VARCHAR(191) NULL');
CALL gj5_add_column_if_missing('wallet_transactions', 'is_reversal',       'BOOLEAN NOT NULL DEFAULT FALSE');
CALL gj5_add_column_if_missing('wallet_transactions', 'reversed_entry_id', 'VARCHAR(64) NULL');

-- Which account a customer payment landed in / an expense was paid from.
CALL gj5_add_column_if_missing('repair_job_payments', 'account_id', 'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('expenses',            'account_id', 'VARCHAR(64) NULL');

DROP PROCEDURE gj5_add_column_if_missing;

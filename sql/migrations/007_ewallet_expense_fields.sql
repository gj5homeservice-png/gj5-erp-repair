-- 007: Two small additive fields the new E-Wallet financial center needs on
-- `expenses` — Description and Reference (spec section 13's field list).
-- Both nullable, both purely additive: existing expense rows are completely
-- unaffected (their new columns simply come back NULL, exactly as before
-- this migration existed), and nothing is deleted, reset, or renamed.
--
-- No other schema changes are made anywhere else. Every other requirement
-- of the E-Wallet upgrade (dashboard cards, money flow, receivables,
-- payables, the unified ledger, repair/stock financial summaries) is
-- computed live from data that already exists in the ERP's real tables
-- (repair_jobs + repair_job_payments, invoices, stock_items + their
-- movement history, salary_records, wallet_transactions) — see
-- src/lib/wallet-engine.ts. No new tables, and no changes to any existing
-- table's meaning, were needed for those.
--
-- Rewritten to use the same INFORMATION_SCHEMA-conditional technique as
-- migrations 012-016 (not "ADD COLUMN IF NOT EXISTS", which needs MySQL
-- 8.0.29+ and is the confirmed reason migrations 010/011 never actually
-- applied to production) so this runs correctly on any MySQL/MariaDB
-- version and is safe to run more than once. The original version of this
-- file used the broken syntax and was never run in production.

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

CALL gj5_add_column_if_missing('expenses', 'description', 'TEXT NULL');
CALL gj5_add_column_if_missing('expenses', 'reference', 'VARCHAR(191) NULL');

DROP PROCEDURE gj5_add_column_if_missing;

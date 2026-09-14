-- 015: Repair Jobs — Pickup & Delivery Option field.
--
-- Verified first that no existing `repair_jobs` column already captures
-- this (store_location is where the item physically sits, not who
-- transports it), so this adds one new column rather than duplicating
-- anything.
--
-- Uses the same INFORMATION_SCHEMA-conditional technique as migrations
-- 012/013/014 (not "ADD COLUMN IF NOT EXISTS", which needs MySQL 8.0.29+
-- and is the confirmed reason migrations 010/011 never actually applied to
-- production) so this runs correctly on any MySQL/MariaDB version and is
-- safe to run more than once.
--
-- Additive only: no table dropped, no existing column dropped, renamed, or
-- altered, and no existing row's data touched — the new column is
-- NULL-able, so every existing repair job keeps working with it simply
-- empty (no automatic Logistics task) until it's edited and an option is
-- picked.

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

CALL gj5_add_column_if_missing('repair_jobs', 'pickup_delivery_option', 'VARCHAR(40) NULL AFTER store_location');

DROP PROCEDURE gj5_add_column_if_missing;

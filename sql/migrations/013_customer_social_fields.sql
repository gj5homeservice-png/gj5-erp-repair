-- 013: Customer Department — Facebook ID / Instagram ID fields.
--
-- Verified first that no existing `customers` column already serves this
-- purpose (name, mobile, alternate_mobile, email, address, city, state,
-- pincode, source, status, category, created_at, updated_at — nothing else
-- in the table represents a social handle), so this adds two new columns
-- rather than duplicating anything.
--
-- Uses the same INFORMATION_SCHEMA-conditional technique as migration 012
-- (not "ADD COLUMN IF NOT EXISTS", which needs MySQL 8.0.29+ and is the
-- confirmed reason migrations 010/011 never actually applied to
-- production) so this runs correctly on any MySQL/MariaDB version and is
-- safe to run more than once.
--
-- Additive only: no table dropped, no existing column dropped, renamed, or
-- altered, and no existing row's data touched — both new columns are
-- NULL-able, so every existing customer keeps working with them simply
-- empty until edited.

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

CALL gj5_add_column_if_missing('customers', 'facebook_id',  'VARCHAR(191) NULL AFTER email');
CALL gj5_add_column_if_missing('customers', 'instagram_id', 'VARCHAR(191) NULL AFTER facebook_id');

DROP PROCEDURE gj5_add_column_if_missing;

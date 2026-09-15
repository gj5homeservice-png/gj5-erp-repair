-- 016: system_settings — persistent Logo, Admin Theme, and WhatsApp
-- dispatch templates.
--
-- Problem being fixed: the company logo (previously Firestore + a
-- localStorage fallback), the admin light/dark theme toggle, and the
-- Logistics WhatsApp message templates were only ever saved in
-- localStorage/Firestore-fallback-to-localStorage on the ONE browser that
-- set them. A new browser, an Incognito window, or another device/login
-- never saw them, because nothing was written to MySQL. This migration adds
-- the columns needed to store all three server-side, scoped by the existing
-- `user_email` tenant key already used by every other row in this table.
--
-- Reuses the existing `system_settings` table (already exactly "one
-- preferences row per tenant account," already wired end-to-end through
-- /api/erp/settings and useErpStore().updateSettings) instead of creating a
-- new table — this is the same class of thing (a per-account preference),
-- not new business data.
--
-- Uses the same INFORMATION_SCHEMA-conditional technique as migrations
-- 012-015 (not "ADD COLUMN IF NOT EXISTS", which needs MySQL 8.0.29+ and is
-- the confirmed reason migrations 010/011 never actually applied to
-- production) so this runs correctly on any MySQL/MariaDB version and is
-- safe to run more than once.
--
-- Additive only: no table dropped, no existing column dropped, renamed, or
-- altered, and no existing row's data touched. All three new columns are
-- NULL-able (admin_theme also carries a DEFAULT), so every existing tenant
-- row keeps working with them simply empty until first saved, at which
-- point the application's own existing fallback-to-default logic applies —
-- exactly like every other system_settings column already does.

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

CALL gj5_add_column_if_missing('system_settings', 'logo_url', 'LONGTEXT NULL');
CALL gj5_add_column_if_missing('system_settings', 'admin_theme', "VARCHAR(10) NOT NULL DEFAULT 'dark'");
CALL gj5_add_column_if_missing('system_settings', 'transportation_templates', 'JSON NULL');

DROP PROCEDURE gj5_add_column_if_missing;

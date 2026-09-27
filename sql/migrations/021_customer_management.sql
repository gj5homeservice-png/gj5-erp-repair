-- 021: Customer Management upgrade — master record fields, a persistent
-- non-reusable Customer ID sequence, audit log, and (gated, non-destructive)
-- foreign keys from every table that already stores a customer_id.
--
-- Inspected first: `customers` already exists and is already the single
-- master record (populated by both the Customer Department UI and every
-- other module's auto-create-by-mobile fallback — see repairJobs.ts's
-- resolveCustomerId). This migration only widens it; it does not create a
-- second customer table anywhere.
--
-- Existing customers ALREADY have a unique id (the old CUST0001 / CUST<ts>
-- formats) — this does not renumber them. Renaming a live business's
-- existing Customer IDs would silently invalidate every invoice, repair
-- job and sale that was ever printed or sent to a customer under the old
-- id, which is exactly the kind of data corruption "do not break existing
-- data" rules out. Only NEW customers created from now on get the new
-- CUST-1001-style id, via a persistent per-tenant counter
-- (customer_id_sequences) that only ever increases — so a deleted
-- customer's number is never reissued — seeded here from the highest
-- number already in use (covering a prior partial rollout) or 1000
-- (i.e. next = 1001), whichever is higher. The actual starting number is
-- configurable from Settings (system_settings.customer_id_start_number)
-- and is re-applied as a floor on every future allocation, never
-- retroactively.
--
-- Uses the same INFORMATION_SCHEMA-conditional column technique as every
-- migration since 012 (never "ADD COLUMN IF NOT EXISTS", which needs MySQL
-- 8.0.29+), so it runs on any MySQL/MariaDB version and is safe to run more
-- than once. Foreign keys are added only after confirming zero orphaned
-- customer_id values in that specific table — a table that already has an
-- orphan (a customer_id that doesn't exist in `customers`) has its FK
-- skipped rather than the migration failing or any row being touched.

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

-- ------------------------------------------------------------ index helper
DROP PROCEDURE IF EXISTS gj5_add_index_if_missing;

DELIMITER $$

CREATE PROCEDURE gj5_add_index_if_missing(
  IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_columns VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND INDEX_NAME = p_index
  ) THEN
    SET @gj5_ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_columns, ')');
    PREPARE gj5_stmt FROM @gj5_ddl;
    EXECUTE gj5_stmt;
    DEALLOCATE PREPARE gj5_stmt;
  END IF;
END$$

DELIMITER ;

-- ---------------------------------------------------------- gated FK helper
-- Adds `<table>.customer_id -> customers(id)` ON DELETE SET NULL, but ONLY
-- when every existing non-NULL customer_id in that table already matches a
-- real row in `customers` — never fails the migration, never touches data,
-- just silently leaves an already-inconsistent table without the new
-- constraint (logged via a SELECT so it's visible if you run this
-- interactively in phpMyAdmin).
DROP PROCEDURE IF EXISTS gj5_add_customer_fk_if_clean;

DELIMITER $$

CREATE PROCEDURE gj5_add_customer_fk_if_clean(IN p_table VARCHAR(64), IN p_fk_name VARCHAR(64))
BEGIN
  DECLARE orphan_count INT DEFAULT 0;
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = 'customer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_fk_name
  ) THEN
    SET @gj5_count_sql = CONCAT(
      'SELECT COUNT(*) INTO @gj5_orphans FROM `', p_table, '` t ',
      'WHERE t.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = t.customer_id)'
    );
    PREPARE gj5_stmt FROM @gj5_count_sql;
    EXECUTE gj5_stmt;
    DEALLOCATE PREPARE gj5_stmt;
    IF @gj5_orphans = 0 THEN
      SET @gj5_fk_sql = CONCAT(
        'ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_fk_name, '` ',
        'FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE'
      );
      PREPARE gj5_stmt FROM @gj5_fk_sql;
      EXECUTE gj5_stmt;
      DEALLOCATE PREPARE gj5_stmt;
    ELSE
      SELECT CONCAT('Skipped FK ', p_fk_name, ' on ', p_table, ': ', @gj5_orphans, ' row(s) reference a customer_id not present in `customers` — fix or null those out, then re-run this migration.') AS gj5_notice;
    END IF;
  END IF;
END$$

DELIMITER ;

-- ------------------------------------------------------- customers: fields
CALL gj5_add_column_if_missing('customers', 'whatsapp_number', 'VARCHAR(20) NULL');
CALL gj5_add_column_if_missing('customers', 'gstin',           'VARCHAR(20) NULL');
CALL gj5_add_column_if_missing('customers', 'date_of_birth',   'VARCHAR(20) NULL');
CALL gj5_add_column_if_missing('customers', 'photo',           'LONGTEXT NULL');
CALL gj5_add_column_if_missing('customers', 'created_by',      'VARCHAR(191) NULL');
CALL gj5_add_column_if_missing('customers', 'updated_by',      'VARCHAR(191) NULL');
-- Set on the LOSING record of a merge (see Customer Merge) — points at the
-- surviving customer. NULL for every normal, unmerged customer.
CALL gj5_add_column_if_missing('customers', 'merged_into',     'VARCHAR(64) NULL');

CALL gj5_add_index_if_missing('customers', 'idx_customers_whatsapp', 'whatsapp_number');
CALL gj5_add_index_if_missing('customers', 'idx_customers_email',    'email');
CALL gj5_add_index_if_missing('customers', 'idx_customers_gstin',    'gstin');
CALL gj5_add_index_if_missing('customers', 'idx_customers_name',     'name');
CALL gj5_add_index_if_missing('customers', 'idx_customers_status',   'user_email, status');
CALL gj5_add_index_if_missing('customers', 'idx_customers_created',  'user_email, created_at');

-- --------------------------------------------------- id sequence & settings
CALL gj5_add_column_if_missing('system_settings', 'customer_id_start_number', 'INT NOT NULL DEFAULT 1001');

-- One row per tenant. `last_number` only ever increases (see
-- src/lib/erp/customers.ts's allocateCustomerId, which reads this row
-- FOR UPDATE inside a transaction) — a hard-deleted customer's number is
-- never reissued because this counter never looks at the customers table
-- again once seeded.
CREATE TABLE IF NOT EXISTS customer_id_sequences (
  user_email  VARCHAR(191) PRIMARY KEY,
  last_number INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed one row per existing tenant from the highest number already in use in
-- either id scheme (old CUSTnnnn, or a new CUST-n from any prior partial
-- rollout) — so the very first id issued under the new scheme can never
-- collide with a legacy row. 1000 is the floor (i.e. next issued = 1001,
-- the documented default) when no numeric id exists yet; the per-tenant
-- customer_id_start_number floor is applied at allocation time, not here.
INSERT INTO customer_id_sequences (user_email, last_number)
SELECT user_email, GREATEST(
  1000,
  COALESCE(MAX(CASE WHEN id REGEXP '^CUST-?[0-9]+$' THEN CAST(REGEXP_REPLACE(id, '^CUST-?', '') AS UNSIGNED) END), 0)
)
FROM customers
GROUP BY user_email
ON DUPLICATE KEY UPDATE last_number = GREATEST(customer_id_sequences.last_number, VALUES(last_number));

-- ------------------------------------------------------------- audit log
CREATE TABLE IF NOT EXISTS customer_audit_logs (
  id            VARCHAR(64) PRIMARY KEY,
  user_email    VARCHAR(191) NOT NULL,
  customer_id   VARCHAR(64) NOT NULL,
  event_type    VARCHAR(40) NOT NULL,
  performed_by  VARCHAR(191) NOT NULL,
  timestamp     VARCHAR(40) NOT NULL,
  record_id     VARCHAR(64) NULL,
  details       VARCHAR(500) NULL,
  INDEX idx_customer_audit_user (user_email),
  INDEX idx_customer_audit_customer (customer_id),
  INDEX idx_customer_audit_event (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------------- foreign keys
CALL gj5_add_customer_fk_if_clean('repair_calls',     'fk_repair_calls_customer');
CALL gj5_add_customer_fk_if_clean('invoices',         'fk_invoices_customer');
CALL gj5_add_customer_fk_if_clean('wallet_transactions', 'fk_wallet_transactions_customer');
CALL gj5_add_customer_fk_if_clean('sales_orders',     'fk_sales_orders_customer');
CALL gj5_add_customer_fk_if_clean('customer_orders',  'fk_customer_orders_customer');
CALL gj5_add_customer_fk_if_clean('repair_jobs',      'fk_repair_jobs_customer');
CALL gj5_add_customer_fk_if_clean('online_bookings',  'fk_online_bookings_customer');

DROP PROCEDURE gj5_add_column_if_missing;
DROP PROCEDURE gj5_add_index_if_missing;
DROP PROCEDURE gj5_add_customer_fk_if_clean;

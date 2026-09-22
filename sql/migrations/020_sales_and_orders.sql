-- 020: Sales + Orders modules.
--
-- Inspected first: the schema already has `sales_orders` (the retail sale
-- record: customer, product, qty, price, GST, delivery charge, totals,
-- payment/delivery/order status) and `sales_deliveries`, plus the main
-- Billing `invoices` / `invoice_items` and `stock_items` / `stock_movements`.
-- So the SALES module reuses `sales_orders` as-is (it only gains four
-- columns) and links to the existing Billing invoice engine — no second
-- invoice system, no second customer table, no second stock table. Only the
-- genuinely new concepts get new tables:
--   * customer_orders  — the pre-sale order lifecycle
--                        (NEW -> CONFIRMED -> ... -> DELIVERED / CANCELLED)
--   * sales_payments   — a payment history for both sales and orders, so a
--                        PARTIAL payment's Total / Paid / Remaining always
--                        reconciles from real rows instead of one editable
--                        number.
--
-- Uses the same INFORMATION_SCHEMA-conditional column technique as
-- migrations 012-019 (never "ADD COLUMN IF NOT EXISTS", which needs MySQL
-- 8.0.29+), so it runs on any MySQL/MariaDB version and is safe to run more
-- than once.
--
-- Additive only: no table dropped, no column dropped/renamed/altered, no
-- existing sale/invoice/stock/customer row is deleted or rewritten. The one
-- UPDATE below runs exactly once (only on the run that actually adds
-- `stock_deducted`): sales recorded by the older Sales code already took
-- their stock out when they were created, so they are flagged as
-- "stock_deducted" — otherwise editing or cancelling one of them would
-- restock (or deduct) inventory that was never handled by the new logic.

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

-- 1 only on the run that is about to add stock_deducted (see header).
SET @gj5_first_run = (
  SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_orders' AND COLUMN_NAME = 'stock_deducted'
);

CALL gj5_add_column_if_missing('sales_orders', 'notes',              'TEXT NULL');
CALL gj5_add_column_if_missing('sales_orders', 'stock_deducted',     'TINYINT(1) NOT NULL DEFAULT 0');
CALL gj5_add_column_if_missing('sales_orders', 'source_order_id',    'VARCHAR(64) NULL');
CALL gj5_add_column_if_missing('sales_orders', 'billing_invoice_id', 'VARCHAR(64) NULL');

-- Marks a Billing invoice as generated from a Sale ("sale:<sale id>"), so
-- receivable/pending totals count that money once (via the sale) instead of
-- twice (sale balance + invoice).
CALL gj5_add_column_if_missing('invoices', 'source_ref', 'VARCHAR(64) NULL');

DROP PROCEDURE gj5_add_column_if_missing;

SET @gj5_backfill = IF(
  @gj5_first_run = 1,
  "UPDATE sales_orders SET stock_deducted = 1 WHERE product_id IS NOT NULL AND product_id <> '' AND (order_status IS NULL OR order_status NOT IN ('Cancelled', 'Refunded'))",
  'SELECT 1'
);
PREPARE gj5_backfill_stmt FROM @gj5_backfill;
EXECUTE gj5_backfill_stmt;
DEALLOCATE PREPARE gj5_backfill_stmt;

CREATE TABLE IF NOT EXISTS customer_orders (
  id                      VARCHAR(64) PRIMARY KEY,
  user_email              VARCHAR(191) NOT NULL,
  customer_id             VARCHAR(64) NULL,
  customer_name           VARCHAR(191) NULL,
  mobile                  VARCHAR(20) NULL,
  order_date              VARCHAR(30) NULL,
  product_id              VARCHAR(64) NULL,
  product_name            VARCHAR(191) NULL,
  brand                   VARCHAR(100) NULL,
  model                   VARCHAR(100) NULL,
  quantity                INT NOT NULL DEFAULT 1,
  unit_price              DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal                DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount                DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  gst_rate                DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount              DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_charge         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid             DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due             DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
  order_status            VARCHAR(30) NOT NULL DEFAULT 'NEW',
  delivery_required       BOOLEAN NOT NULL DEFAULT TRUE,
  expected_delivery_date  VARCHAR(30) NULL,
  notes                   TEXT NULL,
  sale_id                 VARCHAR(64) NULL,
  created_by              VARCHAR(191) NULL,
  created_at              VARCHAR(40) NULL,
  updated_at              VARCHAR(40) NULL,
  INDEX idx_customer_orders_user (user_email),
  INDEX idx_customer_orders_status (user_email, order_status),
  INDEX idx_customer_orders_customer (customer_id),
  INDEX idx_customer_orders_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_payments (
  id          VARCHAR(64) PRIMARY KEY,
  user_email  VARCHAR(191) NOT NULL,
  ref_type    VARCHAR(10) NOT NULL,
  ref_id      VARCHAR(64) NOT NULL,
  amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  method      VARCHAR(30) NULL,
  paid_on     VARCHAR(30) NULL,
  note        TEXT NULL,
  created_by  VARCHAR(191) NULL,
  created_at  VARCHAR(40) NULL,
  INDEX idx_sales_payments_ref (user_email, ref_type, ref_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

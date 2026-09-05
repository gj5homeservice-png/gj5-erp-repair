-- GJ5 ERP — MySQL schema (Hostinger)
--
-- Run this once against the u289403563_gj5erp database (via Hostinger's
-- phpMyAdmin, or `mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < sql/schema.sql`).
-- Every statement is idempotent (CREATE TABLE IF NOT EXISTS) so re-running is safe.
--
-- Design notes (see the approved migration plan for full rationale):
--   * Every ERP table carries `user_email` as the tenant column, mirroring the
--     app's existing `gj5_user_<email>_` localStorage prefix scheme exactly.
--   * Primary keys keep the app's own string IDs (e.g. "INV1730000000",
--     "RJ1005") — no surrogate auto-increment keys, so no existing ID anywhere
--     in the app (UI, PDFs, cross-references) ever needs renumbering.
--   * Parent/child ownership (invoice -> items, stock -> movements, repair job
--     -> its sub-records) uses real FOREIGN KEY ... ON DELETE CASCADE.
--   * Everything else (customer_id, product_id, job_id, employee_id links) is
--     a plain indexed VARCHAR, not an enforced FK — the app matches these
--     loosely today (by name/mobile/barcode in some cases) and does not
--     guarantee referential integrity, so enforcing strict FKs here could
--     reject inserts the current app allows.

SET NAMES utf8mb4;

-- ============================================================
-- Auth infra
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  token         VARCHAR(128) PRIMARY KEY,
  user_email    VARCHAR(191) NOT NULL,
  created_at    DATETIME NOT NULL,
  expires_at    DATETIME NOT NULL,
  device_info   VARCHAR(255) NULL,
  INDEX idx_sessions_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Customers
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id           VARCHAR(64) PRIMARY KEY,
  user_email   VARCHAR(191) NOT NULL,
  name         VARCHAR(191) NULL,
  mobile       VARCHAR(20) NULL,
  address      VARCHAR(255) NULL,
  pincode      VARCHAR(10) NULL,
  email        VARCHAR(191) NULL,
  source       ENUM('repair','sales','manual') NOT NULL DEFAULT 'manual',
  created_at   VARCHAR(40) NULL,
  INDEX idx_customers_user (user_email),
  INDEX idx_customers_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Repairing (legacy calls) module
-- ============================================================

CREATE TABLE IF NOT EXISTS repair_calls (
  id                  VARCHAR(64) PRIMARY KEY,
  user_email          VARCHAR(191) NOT NULL,
  customer_id         VARCHAR(64) NULL,
  customer_name       VARCHAR(191) NULL,
  mobile              VARCHAR(20) NULL,
  address             VARCHAR(255) NULL,
  pincode             VARCHAR(10) NULL,
  category            VARCHAR(64) NULL,
  brand               VARCHAR(100) NULL,
  model               VARCHAR(100) NULL,
  screen_size         VARCHAR(50) NULL,
  tech_tags           JSON NULL,
  intake_mode         VARCHAR(30) NULL,
  created_at          VARCHAR(40) NULL,
  updated_at          VARCHAR(40) NULL,
  status              VARCHAR(30) NULL,
  warranty_duration   VARCHAR(50) NULL,
  warranty_expiry     VARCHAR(30) NULL,
  store_location      VARCHAR(100) NULL,
  problem_description TEXT NULL,
  repeat_count        INT NOT NULL DEFAULT 0,
  is_old_entry        BOOLEAN NOT NULL DEFAULT FALSE,
  entry_date          VARCHAR(30) NULL,
  received_date       VARCHAR(30) NULL,
  photos              JSON NULL,
  INDEX idx_repair_calls_user (user_email),
  INDEX idx_repair_calls_mobile (mobile),
  INDEX idx_repair_calls_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_call_visit_history (
  id                     VARCHAR(64) PRIMARY KEY,
  repair_call_id         VARCHAR(64) NOT NULL,
  date                   VARCHAR(30) NULL,
  time                   VARCHAR(30) NULL,
  complaint_description  TEXT NULL,
  technician_notes       TEXT NULL,
  status                 VARCHAR(30) NULL,
  FOREIGN KEY (repair_call_id) REFERENCES repair_calls(id) ON DELETE CASCADE,
  INDEX idx_visit_history_call (repair_call_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Billing / Invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id               VARCHAR(64) PRIMARY KEY,
  user_email       VARCHAR(191) NOT NULL,
  invoice_number   VARCHAR(64) NULL,
  date             VARCHAR(30) NULL,
  due_date         VARCHAR(30) NULL,
  customer_id      VARCHAR(64) NULL,
  customer_name    VARCHAR(191) NULL,
  mobile           VARCHAR(20) NULL,
  address          VARCHAR(255) NULL,
  customer_gstin   VARCHAR(20) NULL,
  subtotal         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_discount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  cgst             DECIMAL(12,2) NOT NULL DEFAULT 0,
  sgst             DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total      DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status   VARCHAR(20) NULL,
  payment_mode     VARCHAR(30) NULL,
  timestamp        VARCHAR(50) NULL,
  job_id           VARCHAR(64) NULL,
  model            VARCHAR(100) NULL,
  brand            VARCHAR(100) NULL,
  labour_charges   DECIMAL(12,2) NULL,
  total            DECIMAL(12,2) NULL,
  tax_enabled      BOOLEAN NULL,
  gst              DECIMAL(12,2) NULL,
  INDEX idx_invoices_user (user_email),
  INDEX idx_invoices_number (invoice_number),
  INDEX idx_invoices_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items (
  id           VARCHAR(64) PRIMARY KEY,
  invoice_id   VARCHAR(64) NOT NULL,
  name         VARCHAR(191) NULL,
  brand        VARCHAR(100) NULL,
  size         VARCHAR(50) NULL,
  quantity     INT NOT NULL DEFAULT 1,
  rate         DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_percent  DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice_items_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Stock
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_items (
  id                VARCHAR(64) PRIMARY KEY,
  user_email        VARCHAR(191) NOT NULL,
  name              VARCHAR(191) NULL,
  brand             VARCHAR(100) NULL,
  category          VARCHAR(100) NULL,
  purchase_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price     DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity          INT NOT NULL DEFAULT 0,
  min_stock_level   INT NOT NULL DEFAULT 0,
  barcode           VARCHAR(128) NULL,
  images            JSON NULL,
  last_updated      VARCHAR(40) NULL,
  supplier_name     VARCHAR(191) NULL,
  supplier_mobile   VARCHAR(20) NULL,
  purchase_date     VARCHAR(30) NULL,
  warranty_period   VARCHAR(50) NULL,
  description       TEXT NULL,
  added_by          VARCHAR(100) NULL,
  edited_by         VARCHAR(100) NULL,
  model             VARCHAR(100) NULL,
  screen_size       VARCHAR(50) NULL,
  serial_number     VARCHAR(100) NULL,
  store_location    VARCHAR(100) NULL,
  INDEX idx_stock_items_user (user_email),
  INDEX idx_stock_items_barcode (barcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_movements (
  id             VARCHAR(64) PRIMARY KEY,
  stock_item_id  VARCHAR(64) NOT NULL,
  date           VARCHAR(30) NULL,
  type           ENUM('PURCHASE','SALE','RETURN','DAMAGE','SCRAP','INWARD','OUTWARD') NOT NULL,
  quantity       INT NOT NULL DEFAULT 0,
  notes          TEXT NULL,
  performed_by   VARCHAR(100) NULL,
  reference_id   VARCHAR(64) NULL,
  customer_name  VARCHAR(191) NULL,
  FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE,
  INDEX idx_stock_movements_item (stock_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Wallet
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id           VARCHAR(64) PRIMARY KEY,
  user_email   VARCHAR(191) NOT NULL,
  amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  date         VARCHAR(30) NULL,
  time         VARCHAR(30) NULL,
  type         VARCHAR(64) NULL,
  description  TEXT NULL,
  metadata     JSON NULL,
  INDEX idx_wallet_tx_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_balance (
  user_email  VARCHAR(191) PRIMARY KEY,
  balance     DECIMAL(12,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- HRMS
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id                    VARCHAR(64) PRIMARY KEY,
  user_email            VARCHAR(191) NOT NULL,
  employee_id           VARCHAR(64) NULL,
  photo                 LONGTEXT NULL,
  qr_code               LONGTEXT NULL,
  name                  VARCHAR(191) NULL,
  mobile                VARCHAR(20) NULL,
  email                 VARCHAR(191) NULL,
  designation           VARCHAR(100) NULL,
  department            VARCHAR(100) NULL,
  salary                DECIMAL(12,2) NOT NULL DEFAULT 0,
  joining_date          VARCHAR(30) NULL,
  status                VARCHAR(20) NULL,
  role                  VARCHAR(20) NULL,
  created_at            VARCHAR(40) NULL,
  aadhar_number         VARCHAR(20) NULL,
  pan_number            VARCHAR(20) NULL,
  address_proof_type    VARCHAR(50) NULL,
  current_address       VARCHAR(255) NULL,
  permanent_address     VARCHAR(255) NULL,
  city                  VARCHAR(100) NULL,
  state                 VARCHAR(100) NULL,
  pincode               VARCHAR(10) NULL,
  aadhar_front          LONGTEXT NULL,
  aadhar_back           LONGTEXT NULL,
  pan_card              LONGTEXT NULL,
  address_proof         LONGTEXT NULL,
  INDEX idx_employees_user (user_email),
  INDEX idx_employees_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_records (
  id               VARCHAR(64) PRIMARY KEY,
  user_email       VARCHAR(191) NOT NULL,
  employee_id      VARCHAR(64) NULL,
  employee_name    VARCHAR(191) NULL,
  mobile           VARCHAR(20) NULL,
  date             VARCHAR(30) NULL,
  check_in         VARCHAR(30) NULL,
  check_out        VARCHAR(30) NULL,
  work_hours       VARCHAR(20) NULL,
  overtime         VARCHAR(20) NULL,
  latitude         VARCHAR(50) NULL,
  longitude        VARCHAR(50) NULL,
  address          VARCHAR(255) NULL,
  selfie_check_in  LONGTEXT NULL,
  selfie_check_out LONGTEXT NULL,
  status           VARCHAR(30) NULL,
  created_at       VARCHAR(40) NULL,
  device_info      VARCHAR(255) NULL,
  browser_info     VARCHAR(255) NULL,
  ip_address       VARCHAR(50) NULL,
  attendance_type  VARCHAR(30) NULL,
  INDEX idx_attendance_user (user_email),
  INDEX idx_attendance_employee (employee_id),
  INDEX idx_attendance_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_links (
  id             VARCHAR(64) PRIMARY KEY,
  user_email     VARCHAR(191) NOT NULL,
  token          VARCHAR(128) NOT NULL UNIQUE,
  employee_id    VARCHAR(64) NULL,
  employee_name  VARCHAR(191) NULL,
  mobile         VARCHAR(20) NULL,
  expires_at     VARCHAR(40) NOT NULL,
  used           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     VARCHAR(40) NULL,
  INDEX idx_attendance_links_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS salary_records (
  id                VARCHAR(64) PRIMARY KEY,
  user_email        VARCHAR(191) NOT NULL,
  employee_id       VARCHAR(64) NULL,
  employee_name     VARCHAR(191) NULL,
  month             VARCHAR(20) NULL,
  year              VARCHAR(10) NULL,
  base_salary       DECIMAL(12,2) NOT NULL DEFAULT 0,
  attendance_days   INT NOT NULL DEFAULT 0,
  overtime_hours    DECIMAL(6,2) NOT NULL DEFAULT 0,
  bonus             DECIMAL(12,2) NOT NULL DEFAULT 0,
  deductions        DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_payable       DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status    VARCHAR(20) NULL,
  processed_date    VARCHAR(30) NULL,
  INDEX idx_salary_user (user_email),
  INDEX idx_salary_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
  id             VARCHAR(64) PRIMARY KEY,
  user_email     VARCHAR(191) NOT NULL,
  employee_id    VARCHAR(64) NULL,
  employee_name  VARCHAR(191) NULL,
  start_date     VARCHAR(30) NULL,
  end_date       VARCHAR(30) NULL,
  type           VARCHAR(30) NULL,
  reason         TEXT NULL,
  status         VARCHAR(20) NULL,
  created_at     VARCHAR(40) NULL,
  INDEX idx_leave_user (user_email),
  INDEX idx_leave_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CRM / Inquiries
-- ============================================================

CREATE TABLE IF NOT EXISTS inquiries (
  id                    VARCHAR(64) PRIMARY KEY,
  user_email            VARCHAR(191) NOT NULL,
  customer_name         VARCHAR(191) NULL,
  mobile                VARCHAR(20) NULL,
  alternate_mobile      VARCHAR(20) NULL,
  address               VARCHAR(255) NULL,
  city                  VARCHAR(100) NULL,
  pincode               VARCHAR(10) NULL,
  product_type          VARCHAR(100) NULL,
  brand                 VARCHAR(100) NULL,
  model_number          VARCHAR(100) NULL,
  problem_description   TEXT NULL,
  source                VARCHAR(30) NULL,
  priority              VARCHAR(20) NULL,
  expected_budget       DECIMAL(12,2) NULL,
  assigned_technician   VARCHAR(191) NULL,
  follow_up_date        VARCHAR(30) NULL,
  status                VARCHAR(30) NULL,
  notes                 TEXT NULL,
  created_at            VARCHAR(40) NULL,
  updated_at            VARCHAR(40) NULL,
  converted_job_id      VARCHAR(64) NULL,
  conversion_date       VARCHAR(30) NULL,
  INDEX idx_inquiries_user (user_email),
  INDEX idx_inquiries_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Expenses
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id            VARCHAR(64) PRIMARY KEY,
  user_email    VARCHAR(191) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  category      VARCHAR(100) NULL,
  vendor_name   VARCHAR(191) NULL,
  date          VARCHAR(30) NULL,
  payment_mode  VARCHAR(30) NULL,
  timestamp     VARCHAR(50) NULL,
  INDEX idx_expenses_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Logistics
-- ============================================================

CREATE TABLE IF NOT EXISTS transportation_logs (
  id               VARCHAR(64) PRIMARY KEY,
  user_email       VARCHAR(191) NOT NULL,
  runner_name      VARCHAR(191) NULL,
  runner_mobile    VARCHAR(20) NULL,
  job_id           VARCHAR(64) NULL,
  customer_name    VARCHAR(191) NULL,
  customer_mobile  VARCHAR(20) NULL,
  address          VARCHAR(255) NULL,
  status           VARCHAR(30) NULL,
  dispatch_time    VARCHAR(30) NULL,
  INDEX idx_transport_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Sales module
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_orders (
  id                  VARCHAR(64) PRIMARY KEY,
  user_email          VARCHAR(191) NOT NULL,
  customer_id         VARCHAR(64) NULL,
  customer_name       VARCHAR(191) NULL,
  mobile              VARCHAR(20) NULL,
  email               VARCHAR(191) NULL,
  address             VARCHAR(255) NULL,
  pincode             VARCHAR(10) NULL,
  product_id          VARCHAR(64) NULL,
  brand               VARCHAR(100) NULL,
  model               VARCHAR(100) NULL,
  screen_size         VARCHAR(50) NULL,
  serial_number       VARCHAR(100) NULL,
  quantity            INT NOT NULL DEFAULT 1,
  unit_price          DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_date           VARCHAR(30) NULL,
  salesperson         VARCHAR(191) NULL,
  store_location      VARCHAR(100) NULL,
  payment_method      VARCHAR(30) NULL,
  payment_status      VARCHAR(20) NULL,
  delivery_required   BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_status     VARCHAR(30) NULL,
  subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  gst_rate            DECIMAL(5,2) NOT NULL DEFAULT 0,
  gst_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_charge     DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid         DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due         DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_status        VARCHAR(30) NULL,
  invoice_id          VARCHAR(64) NULL,
  created_at          VARCHAR(40) NULL,
  updated_at          VARCHAR(40) NULL,
  INDEX idx_sales_orders_user (user_email),
  INDEX idx_sales_orders_product (product_id),
  INDEX idx_sales_orders_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_invoices (
  id              VARCHAR(64) PRIMARY KEY,
  user_email      VARCHAR(191) NOT NULL,
  invoice_number  VARCHAR(64) NULL,
  order_id        VARCHAR(64) NULL,
  invoice_date    VARCHAR(30) NULL,
  customer_name   VARCHAR(191) NULL,
  mobile          VARCHAR(20) NULL,
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status  VARCHAR(20) NULL,
  created_at      VARCHAR(40) NULL,
  INDEX idx_sales_invoices_user (user_email),
  INDEX idx_sales_invoices_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_deliveries (
  id               VARCHAR(64) PRIMARY KEY,
  user_email       VARCHAR(191) NOT NULL,
  order_id         VARCHAR(64) NULL,
  runner_name      VARCHAR(191) NULL,
  customer_name    VARCHAR(191) NULL,
  mobile           VARCHAR(20) NULL,
  address          VARCHAR(255) NULL,
  product          VARCHAR(191) NULL,
  delivery_date    VARCHAR(30) NULL,
  delivery_status  VARCHAR(30) NULL,
  payment_status   VARCHAR(20) NULL,
  created_at       VARCHAR(40) NULL,
  updated_at       VARCHAR(40) NULL,
  INDEX idx_sales_deliveries_user (user_email),
  INDEX idx_sales_deliveries_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Repair Jobs module (distinct from legacy repair_calls)
-- ============================================================

CREATE TABLE IF NOT EXISTS repair_jobs (
  id                       VARCHAR(64) PRIMARY KEY,
  user_email               VARCHAR(191) NOT NULL,
  customer_name            VARCHAR(191) NULL,
  mobile                   VARCHAR(20) NULL,
  email                    VARCHAR(191) NULL,
  address                  VARCHAR(255) NULL,
  customer_id              VARCHAR(64) NULL,
  pincode                  VARCHAR(10) NULL,
  tech_tags                JSON NULL,
  photos                   JSON NULL,
  store_location           VARCHAR(100) NULL,
  warranty_duration        VARCHAR(50) NULL,
  warranty_expiry          VARCHAR(30) NULL,
  product_type             VARCHAR(100) NULL,
  brand                    VARCHAR(100) NULL,
  model                    VARCHAR(100) NULL,
  serial_number            VARCHAR(100) NULL,
  product_size             VARCHAR(50) NULL,
  problem_description      TEXT NULL,
  customer_notes           TEXT NULL,
  technician_id            VARCHAR(64) NULL,
  technician_name          VARCHAR(191) NULL,
  received_date            VARCHAR(30) NULL,
  expected_delivery_date   VARCHAR(30) NULL,
  estimated_cost           DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_payment          DECIMAL(12,2) NOT NULL DEFAULT 0,
  status                   VARCHAR(30) NULL,
  labour_charges           DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_charges            DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount                 DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at               VARCHAR(40) NULL,
  updated_at               VARCHAR(40) NULL,
  INDEX idx_repair_jobs_user (user_email),
  INDEX idx_repair_jobs_mobile (mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_job_parts (
  id              VARCHAR(64) PRIMARY KEY,
  repair_job_id   VARCHAR(64) NOT NULL,
  part_name       VARCHAR(191) NULL,
  part_id         VARCHAR(64) NULL,
  qty             INT NOT NULL DEFAULT 1,
  purchase_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
  total           DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes           TEXT NULL,
  FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
  INDEX idx_repair_job_parts_job (repair_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_job_payments (
  id              VARCHAR(64) PRIMARY KEY,
  repair_job_id   VARCHAR(64) NOT NULL,
  date            VARCHAR(30) NULL,
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  method          VARCHAR(30) NULL,
  notes           TEXT NULL,
  FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
  INDEX idx_repair_job_payments_job (repair_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_job_notes (
  id              VARCHAR(64) PRIMARY KEY,
  repair_job_id   VARCHAR(64) NOT NULL,
  date            VARCHAR(30) NULL,
  text            TEXT NULL,
  FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
  INDEX idx_repair_job_notes_job (repair_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_job_status_history (
  id              VARCHAR(64) PRIMARY KEY,
  repair_job_id   VARCHAR(64) NOT NULL,
  status          VARCHAR(30) NULL,
  changed_at      VARCHAR(30) NULL,
  note            TEXT NULL,
  FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
  INDEX idx_repair_job_status_history_job (repair_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS repair_job_notifications (
  id              VARCHAR(64) PRIMARY KEY,
  repair_job_id   VARCHAR(64) NOT NULL,
  trigger_type    VARCHAR(50) NULL,
  message         TEXT NULL,
  sent_at         VARCHAR(40) NULL,
  FOREIGN KEY (repair_job_id) REFERENCES repair_jobs(id) ON DELETE CASCADE,
  INDEX idx_repair_job_notifications_job (repair_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- Per-tenant single-row settings/meta tables
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  user_email                    VARCHAR(191) PRIMARY KEY,
  gst_enabled                   BOOLEAN NOT NULL DEFAULT TRUE,
  gst_rate                      DECIMAL(5,2) NOT NULL DEFAULT 18,
  whatsapp_notifications        BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications           BOOLEAN NOT NULL DEFAULT TRUE,
  customer_notifications        BOOLEAN NOT NULL DEFAULT TRUE,
  repair_notifications          BOOLEAN NOT NULL DEFAULT TRUE,
  sales_notifications           BOOLEAN NOT NULL DEFAULT TRUE,
  invoice_notifications         BOOLEAN NOT NULL DEFAULT TRUE,
  delivery_notifications        BOOLEAN NOT NULL DEFAULT TRUE,
  warranty_notifications        BOOLEAN NOT NULL DEFAULT TRUE,
  sound_notifications           BOOLEAN NOT NULL DEFAULT TRUE,
  auto_notifications            BOOLEAN NOT NULL DEFAULT TRUE,
  auto_backup                   BOOLEAN NOT NULL DEFAULT FALSE,
  sms_notifications             BOOLEAN NOT NULL DEFAULT TRUE,
  delete_password                VARCHAR(255) NOT NULL DEFAULT '1234',
  invoice_prefix                 VARCHAR(20) NOT NULL DEFAULT 'INV',
  customer_id_prefix             VARCHAR(20) NOT NULL DEFAULT 'GJ5',
  default_warranty_duration      VARCHAR(50) NOT NULL DEFAULT 'No Warranty',
  default_pickup_required        BOOLEAN NOT NULL DEFAULT FALSE,
  default_min_stock_level        INT NOT NULL DEFAULT 5,
  default_payment_mode           VARCHAR(30) NOT NULL DEFAULT 'UPI',
  default_due_days               INT NOT NULL DEFAULT 0,
  warranty_expiring_soon_days    INT NOT NULL DEFAULT 30,
  standard_check_in_time         VARCHAR(10) NOT NULL DEFAULT '10:00',
  late_threshold_minutes         INT NOT NULL DEFAULT 15
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS backup_meta (
  user_email       VARCHAR(191) PRIMARY KEY,
  last_backup_at   VARCHAR(40) NULL,
  status           VARCHAR(20) NULL,
  record_counts    JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS visibility_settings (
  user_email  VARCHAR(191) PRIMARY KEY,
  tabs        JSON NULL,
  kpis        JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nav_order (
  user_email  VARCHAR(191) PRIMARY KEY,
  order_json  JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

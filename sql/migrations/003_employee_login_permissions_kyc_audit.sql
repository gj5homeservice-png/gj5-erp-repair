-- Adds employee self-login, granular per-employee module/action permissions,
-- a KYC document vault, and a security audit trail.
--
-- Run this ONCE against the live Hostinger database via phpMyAdmin's
-- Import/SQL tab, same as migrations 001/002. Every statement here is
-- additive: new columns (all NULL-able or defaulted, so existing rows are
-- unaffected) and new tables. Nothing is dropped, nothing existing is
-- altered destructively, and no business data (customers, repair jobs,
-- sales, invoices, stock, attendance, salary, etc.) is touched at all.
--
-- Safe to re-run: every ADD COLUMN uses IF NOT EXISTS (MySQL 8.0.29+; if
-- your version is older and this errors, drop the "IF NOT EXISTS" clauses —
-- re-running would then fail harmlessly with "Duplicate column" instead of
-- silently no-op-ing, which just confirms it already applied).

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(64) NULL;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS salary_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS employment_type VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact_mobile VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS other_id_type VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS other_id_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS address_proof_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS account_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS ifsc VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS branch VARCHAR(191) NULL;

-- `role` was VARCHAR(20) — widen it since new role names ("Service Manager",
-- "Delivery Executive", "Sales Executive") exceed 20 characters.
ALTER TABLE employees MODIFY COLUMN role VARCHAR(30) NULL;

CREATE TABLE IF NOT EXISTS employee_credentials (
  employee_id           VARCHAR(64) PRIMARY KEY,
  user_email            VARCHAR(191) NOT NULL,
  username              VARCHAR(100) NOT NULL,
  login_email           VARCHAR(191) NULL,
  password_hash         VARCHAR(255) NOT NULL,
  login_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at         VARCHAR(40) NULL,
  last_login_device     VARCHAR(255) NULL,
  last_login_ip         VARCHAR(64) NULL,
  created_at            VARCHAR(40) NOT NULL,
  updated_at            VARCHAR(40) NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_employee_credentials_username (username),
  INDEX idx_employee_credentials_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_permissions (
  employee_id   VARCHAR(64) PRIMARY KEY,
  user_email    VARCHAR(191) NOT NULL,
  permissions   JSON NOT NULL,
  updated_at    VARCHAR(40) NULL,
  updated_by    VARCHAR(191) NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_permissions_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_documents (
  id                    VARCHAR(64) PRIMARY KEY,
  employee_id           VARCHAR(64) NOT NULL,
  user_email            VARCHAR(191) NOT NULL,
  document_type         VARCHAR(50) NOT NULL,
  file_data             LONGTEXT NOT NULL,
  uploaded_at           VARCHAR(40) NOT NULL,
  uploaded_by           VARCHAR(191) NULL,
  verification_status   VARCHAR(20) NOT NULL DEFAULT 'Pending',
  verified_by           VARCHAR(191) NULL,
  verified_at           VARCHAR(40) NULL,
  notes                 VARCHAR(255) NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  INDEX idx_employee_documents_employee (employee_id),
  INDEX idx_employee_documents_user (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employee_audit_logs (
  id            VARCHAR(64) PRIMARY KEY,
  user_email    VARCHAR(191) NOT NULL,
  employee_id   VARCHAR(64) NOT NULL,
  event_type    VARCHAR(40) NOT NULL,
  performed_by  VARCHAR(191) NOT NULL,
  timestamp     VARCHAR(40) NOT NULL,
  record_id     VARCHAR(64) NULL,
  ip_address    VARCHAR(64) NULL,
  device_info   VARCHAR(255) NULL,
  details       VARCHAR(255) NULL,
  INDEX idx_employee_audit_user (user_email),
  INDEX idx_employee_audit_employee (employee_id),
  INDEX idx_employee_audit_event (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes on employees requested for email/mobile/role/status lookups (id and
-- employee_id were already indexed).
ALTER TABLE employees ADD INDEX IF NOT EXISTS idx_employees_email (email);
ALTER TABLE employees ADD INDEX IF NOT EXISTS idx_employees_mobile (mobile);
ALTER TABLE employees ADD INDEX IF NOT EXISTS idx_employees_role (role);
ALTER TABLE employees ADD INDEX IF NOT EXISTS idx_employees_status (status);

-- 009: Online Bookings — website "Book a Repair" submissions, kept in their
-- own table so a customer's booking never gets silently merged into
-- repair_jobs. An admin explicitly reviews it in the new Online Bookings
-- module and, only on demand, "Converts to Repair Job" — which creates a
-- real row in the existing repair_jobs table (via the same createRepairJob()
-- the admin's own "New Repair" form and the public booking form already
-- use) and links back here via repair_job_id.
--
-- Additive only: two new tables, nothing altered or dropped. Every
-- statement is idempotent (CREATE TABLE IF NOT EXISTS), safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS online_bookings (
  id                    VARCHAR(64) PRIMARY KEY,     -- 'OB-' prefix, e.g. OB-00001
  user_email            VARCHAR(191) NOT NULL,        -- shop tenant scope, same convention as every other ERP table
  customer_id           VARCHAR(64) NULL,             -- customer_accounts.id, when the booking was made while logged in
  customer_name         VARCHAR(191) NOT NULL,
  customer_mobile       VARCHAR(20) NOT NULL,
  customer_email        VARCHAR(191) NULL,
  address               VARCHAR(255) NULL,
  pincode               VARCHAR(10) NULL,
  device_type           VARCHAR(100) NOT NULL,
  brand                 VARCHAR(191) NOT NULL,
  model                 VARCHAR(191) NULL,
  problem_description   TEXT NOT NULL,
  preferred_date        VARCHAR(20) NULL,
  preferred_time        VARCHAR(20) NULL,
  notes                 TEXT NULL,
  priority              VARCHAR(20) NOT NULL DEFAULT 'Normal',
  estimated_amount      DECIMAL(12,2) NULL,
  payment_method        VARCHAR(30) NULL,
  payment_status        VARCHAR(30) NOT NULL DEFAULT 'Pending',
  payment_reference     VARCHAR(191) NULL,
  status                VARCHAR(30) NOT NULL DEFAULT 'New',
  technician_id         VARCHAR(64) NULL,
  technician_name       VARCHAR(191) NULL,
  repair_job_id         VARCHAR(64) NULL,             -- set exactly once, by "Convert to Repair Job" — prevents double conversion
  source                VARCHAR(30) NOT NULL DEFAULT 'Website',
  rejection_reason      TEXT NULL,
  cancellation_reason   TEXT NULL,
  -- A client-generated key (one per form-load) so a double click, a refresh
  -- after submit, or a network-retry can never create two rows for the same
  -- submission: createOnlineBooking() upserts on this key and returns the
  -- original booking on a repeat instead of inserting again.
  idempotency_key       VARCHAR(128) NULL,
  created_at            VARCHAR(40) NOT NULL,
  updated_at            VARCHAR(40) NOT NULL,
  UNIQUE INDEX idx_online_bookings_idempotency (idempotency_key),
  INDEX idx_online_bookings_user (user_email),
  INDEX idx_online_bookings_mobile (customer_mobile),
  INDEX idx_online_bookings_status (status),
  INDEX idx_online_bookings_repair_job (repair_job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS online_booking_status_history (
  id           VARCHAR(64) PRIMARY KEY,
  booking_id   VARCHAR(64) NOT NULL,
  status       VARCHAR(30) NOT NULL,
  changed_at   VARCHAR(40) NOT NULL,
  note         TEXT NULL,
  INDEX idx_obsh_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

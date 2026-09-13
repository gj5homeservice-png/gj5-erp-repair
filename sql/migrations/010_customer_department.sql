-- 010: Customer Department admin module.
--
-- Reuses the EXISTING `customers` table (already populated automatically
-- whenever a repair job is created — see resolveCustomerId() in
-- src/lib/erp/repairJobs.ts) rather than creating a second customer table.
-- This migration only widens that table with the fields the Customer
-- Department form needs (city, state, a second mobile number, an
-- active/inactive status used for the safe-delete flow, and an updated_at
-- so edits are auditable) and adds one new child table for admin notes,
-- which nothing existing has anywhere today.
--
-- Additive only: no table is dropped, no existing column is dropped or
-- renamed, no existing row is modified. Every statement is idempotent
-- (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS), safe to re-run.

SET NAMES utf8mb4;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(20) NULL AFTER mobile,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL AFTER address,
  ADD COLUMN IF NOT EXISTS state VARCHAR(100) NULL AFTER city,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'Active' AFTER source,
  ADD COLUMN IF NOT EXISTS updated_at VARCHAR(40) NULL AFTER created_at;

CREATE TABLE IF NOT EXISTS customer_notes (
  id           VARCHAR(64) PRIMARY KEY,
  customer_id  VARCHAR(64) NOT NULL,
  user_email   VARCHAR(191) NOT NULL,
  note         TEXT NOT NULL,
  created_by   VARCHAR(191) NULL,
  created_at   VARCHAR(40) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customer_notes_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

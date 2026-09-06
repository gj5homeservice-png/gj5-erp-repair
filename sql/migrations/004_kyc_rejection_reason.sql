-- Migration 004: KYC rejection reason
--
-- Adds a dedicated `rejection_reason` column to `employee_documents` so a
-- rejected KYC document carries a specific, human-readable reason distinct
-- from the generic `notes` field already on the table.
--
-- No other schema change is required for this round of Employee module work:
--   - The new roles (Sales, HR — replacing Sales Executive/Delivery
--     Executive) are just string values in the existing `employees.role`
--     column (already VARCHAR(30), already widened by migration 003) — no
--     ALTER needed.
--   - The new "KYC Vault" permission module is just another key inside the
--     existing `employee_permissions.permissions` JSON blob — no ALTER
--     needed, it is picked up automatically by the application code.
--
-- Purely additive. Safe to re-run. Touches zero business data.

ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL AFTER notes;

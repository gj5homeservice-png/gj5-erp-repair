-- Migration 005: Employee profile fields (DOB/Gender) + widened role column
--
-- Adds two new profile fields used by the upgraded Employee Registration
-- form's Profile tab (Date of Birth, Gender), and widens `employees.role`
-- from VARCHAR(30) to VARCHAR(50) so it comfortably fits both the new preset
-- role names ("Service Manager", "Sales Executive", "Delivery Executive",
-- "Store Manager") and an Admin-entered free-text "Custom Role".
--
-- Purely additive/widening. Safe to re-run. Touches zero business data.
-- No new tables are required — the Permissions tab's new "KYC Vault",
-- "Employee Profile", "Employee Login" and "Audit Logs" rows are just extra
-- keys inside the existing employee_permissions.permissions JSON column.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS date_of_birth VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL;

ALTER TABLE employees MODIFY COLUMN role VARCHAR(50) NULL;

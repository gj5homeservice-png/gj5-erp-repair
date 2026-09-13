-- 011: Customer Department — Category field.
--
-- Additive only: one new nullable-then-backfilled column on the existing
-- `customers` table, nothing dropped, nothing else altered. Every existing
-- customer row is safely assigned 'Customer' as its category (no existing
-- data indicates any other category today, since this field never existed
-- before), matching every new customer's default going forward.

SET NAMES utf8mb4;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Customer' AFTER status;

UPDATE customers SET category = 'Customer' WHERE category IS NULL OR category = '';

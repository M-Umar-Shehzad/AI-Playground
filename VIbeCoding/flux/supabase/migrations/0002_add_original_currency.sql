-- 0002_add_original_currency.sql

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_currency TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2);

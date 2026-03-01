-- 0001_multi_currency.sql

-- 1. Add country and currency preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT;

-- 2. Relax constraints on existing PKR columns so users in other countries don't fail inserts
ALTER TABLE transactions ALTER COLUMN amount_pkr DROP NOT NULL;
ALTER TABLE transactions ALTER COLUMN net_pkr DROP NOT NULL;

-- 3. Add explicit columns for major global currencies (add more later if needed)
-- Indian Rupee
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_inr NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_inr NUMERIC(12, 2);

-- US Dollar (as base currency, native USD tracking instead of just conversions)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_usd NUMERIC(12, 2);

-- Euro
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_eur NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_eur NUMERIC(12, 2);

-- British Pound
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_gbp NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_gbp NUMERIC(12, 2);

-- UAE Dirham
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_aed NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_aed NUMERIC(12, 2);

-- Canadian Dollar
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_cad NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_cad NUMERIC(12, 2);

-- Australian Dollar
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount_aud NUMERIC(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_aud NUMERIC(12, 2);

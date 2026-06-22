-- Profiles Table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_pseb_registered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Transactions Table
CREATE TYPE transaction_type AS ENUM ('income', 'expense');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type transaction_type NOT NULL,
    raw_transcript TEXT,
    amount_usd NUMERIC(12, 2),
    amount_pkr NUMERIC(12, 2) NOT NULL,
    platform_fee_usd NUMERIC(12, 2) DEFAULT 0.00,
    withdrawal_fee_usd NUMERIC(12, 2) DEFAULT 0.00,
    net_pkr NUMERIC(12, 2) NOT NULL,
    exchange_rate NUMERIC(10, 4),
    category TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile."
ON profiles FOR SELECT
USING ( auth.uid() = id );

CREATE POLICY "Users can insert their own profile."
ON profiles FOR INSERT
WITH CHECK ( auth.uid() = id );

CREATE POLICY "Users can update their own profile."
ON profiles FOR UPDATE
USING ( auth.uid() = id );

CREATE POLICY "Users can manage their own transactions."
ON transactions FOR ALL
USING ( auth.uid() = user_id );

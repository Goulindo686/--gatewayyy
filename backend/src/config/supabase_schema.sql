-- ============================================
-- Payment Gateway / Marketplace SaaS
-- Supabase Database Schema
-- ============================================

-- Users table (sellers & admins)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(18) UNIQUE,
  phone VARCHAR(20),
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zipcode VARCHAR(10),
  pix_key VARCHAR(255),
  pix_key_type VARCHAR(20), -- cpf, cnpj, email, phone, random
  bank_name VARCHAR(100),
  bank_agency VARCHAR(10),
  bank_agency_digit VARCHAR(2),
  bank_account VARCHAR(20),
  bank_account_digit VARCHAR(2),
  bank_account_type VARCHAR(20), -- checking, savings

  role VARCHAR(20) DEFAULT 'seller', -- seller, admin
  status VARCHAR(20) DEFAULT 'active', -- active, blocked, pending
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret TEXT,
  two_factor_recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  two_factor_confirmed_at TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipients table (Pagar.me recipients linked to sellers)
CREATE TABLE IF NOT EXISTS recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pagarme_recipient_id VARCHAR(255) UNIQUE,
  status VARCHAR(30) DEFAULT 'pending', -- pending, active, refused, suspended
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- price in cents
  image_url TEXT,
  type VARCHAR(20) DEFAULT 'digital', -- digital, physical
  status VARCHAR(20) DEFAULT 'active', -- active, inactive
  sales_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL REFERENCES users(id),
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  buyer_cpf VARCHAR(14),
  buyer_phone VARCHAR(20),
  amount INTEGER NOT NULL, -- amount in cents
  payment_method VARCHAR(20), -- pix, credit_card
  status VARCHAR(30) DEFAULT 'pending', -- pending, paid, failed, refunded, cancelled
  pagarme_order_id VARCHAR(255),
  pagarme_charge_id VARCHAR(255),
  pix_qr_code TEXT,
  pix_qr_code_url TEXT,
  pix_expires_at TIMESTAMPTZ,
  card_last_digits VARCHAR(4),
  card_brand VARCHAR(30),
  installments INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (financial records)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- sale, fee, refund, withdrawal
  amount INTEGER NOT NULL, -- amount in cents
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, failed
  description TEXT,
  pagarme_transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL, -- amount in cents
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  pix_key VARCHAR(255),
  pix_key_type VARCHAR(20),
  pagarme_transfer_id VARCHAR(255),
  failure_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform fees table
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- fee amount in cents
  percentage DECIMAL(5,2) NOT NULL, -- fee percentage applied
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings table (singleton for global config)
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_percentage DECIMAL(5,2) DEFAULT 15.00,
  platform_name VARCHAR(255) DEFAULT 'PayGateway',
  platform_recipient_id VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (fee_percentage, platform_name) 
VALUES (15.00, 'PayGateway')
ON CONFLICT DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_recipients_user_id ON recipients(user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users update own data"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE VIEW IF NOT EXISTS user_profiles AS
SELECT id, name, avatar_url, store_name, store_slug, store_description
FROM users
WHERE store_active = true;
GRANT SELECT ON TABLE user_profiles TO anon, authenticated;

CREATE POLICY "Recipients view own"
ON recipients FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Recipients manage own"
ON recipients FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Products publicly visible"
ON products FOR SELECT
TO public
USING (show_in_store = true AND status = 'active');

CREATE POLICY "Products manage own"
ON products FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Orders seller view"
ON orders FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

CREATE POLICY "Transactions view own"
ON transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Withdrawals manage own"
ON withdrawals FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Platform settings admin read"
ON platform_settings FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Platform settings admin manage"
ON platform_settings FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
  notes TEXT,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  guests TEXT NOT NULL,
  notes TEXT,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'barista',
  status TEXT NOT NULL DEFAULT 'Active',
  last_seen TEXT NOT NULL DEFAULT 'Never signed in',
  requires_password_reset BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS store_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  cafe_name TEXT NOT NULL DEFAULT 'Raseph Cafe',
  tagline TEXT NOT NULL DEFAULT 'Espresso • Desserts • Slow moments',
  opening_hours TEXT NOT NULL DEFAULT '8:00 AM',
  closing_hours TEXT NOT NULL DEFAULT '10:00 PM',
  address TEXT NOT NULL DEFAULT 'Imus, Cavite, Philippines',
  phone TEXT NOT NULL DEFAULT '+63 900 000 0000',
  email TEXT NOT NULL DEFAULT 'hello@rasephcafe.com',
  instagram TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT '₱',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  total_orders BIGINT NOT NULL DEFAULT 0,
  last_visit TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  when_text TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on logs" ON logs FOR ALL USING (true) WITH CHECK (true);

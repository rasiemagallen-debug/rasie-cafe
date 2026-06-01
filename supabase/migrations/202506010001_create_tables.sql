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

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on reservations" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff" ON staff FOR ALL USING (true) WITH CHECK (true);

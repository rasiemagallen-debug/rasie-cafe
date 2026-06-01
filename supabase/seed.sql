INSERT INTO staff (id, name, email, role, status, last_seen, requires_password_reset) VALUES
  ('staff-1', 'Raseph Admin', 'admin@rasephcafe.com', 'admin', 'Active', 'Just now', false),
  ('staff-2', 'Mia Santos', 'mia@rasephcafe.com', 'manager', 'Active', '10 min ago', false),
  ('staff-3', 'Jonah Cruz', 'jonah@rasephcafe.com', 'barista', 'Active', '18 min ago', false),
  ('staff-4', 'Leah Reyes', 'leah@rasephcafe.com', 'host', 'Inactive', 'Yesterday', false)
ON CONFLICT (id) DO NOTHING;

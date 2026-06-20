CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160),
  phone VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(160),
  city_id UUID REFERENCES cities(id),
  default_address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  description TEXT,
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  estimated_duration VARCHAR(80),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  city_id UUID REFERENCES cities(id),
  districts TEXT,
  skills TEXT,
  bio TEXT,
  rating NUMERIC(3,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  city_id UUID REFERENCES cities(id),
  district_id UUID REFERENCES districts(id),
  event_type VARCHAR(120),
  service_id UUID REFERENCES services(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  people_count INT DEFAULT 1,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  design_image_url TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'new',
  assigned_artist_id UUID REFERENCES artists(id),
  estimated_price NUMERIC(10,2),
  final_price NUMERIC(10,2),
  deposit_amount NUMERIC(10,2),
  payment_status VARCHAR(40) DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  old_status VARCHAR(60),
  new_status VARCHAR(60) NOT NULL,
  changed_by VARCHAR(120),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'support',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO cities (name_ar, name_en) VALUES ('الرياض', 'Riyadh'), ('جدة', 'Jeddah'), ('الدمام', 'Dammam');
INSERT INTO services (name, description, min_price, max_price, estimated_duration) VALUES
('حناء بسيطة', 'نقوش بسيطة للمناسبات اليومية', 100, 200, '1 ساعة'),
('حناء متوسطة', 'نقوش متوسطة للمناسبات', 200, 400, '2 ساعات'),
('حناء فخمة', 'نقوش فخمة للمناسبات الخاصة', 400, 700, '3 ساعات'),
('حناء عروس', 'خدمة حناء عروس حسب التصميم', 700, 2000, 'حسب الطلب');

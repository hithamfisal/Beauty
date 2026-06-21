CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(80) UNIQUE,
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id UUID REFERENCES regions(id),
  external_id VARCHAR(80),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id),
  external_id VARCHAR(80),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160),
  phone VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(160),
  region_id UUID REFERENCES regions(id),
  city_id UUID REFERENCES cities(id),
  district_id UUID REFERENCES districts(id),
  default_address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES service_categories(id),
  name VARCHAR(160),
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  description TEXT,
  base_price NUMERIC(10,2),
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  estimated_duration VARCHAR(80),
  duration_minutes INT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  region_id UUID REFERENCES regions(id),
  city_id UUID REFERENCES cities(id),
  main_expertise_service_id UUID REFERENCES services(id),
  districts TEXT,
  skills TEXT,
  bio TEXT,
  rating NUMERIC(3,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beautician_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beautician_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  experience_level VARCHAR(80),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(beautician_id, service_id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  region_id UUID REFERENCES regions(id),
  city_id UUID REFERENCES cities(id),
  district_id UUID REFERENCES districts(id),
  service_category_id UUID REFERENCES service_categories(id),
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

CREATE TABLE IF NOT EXISTS booking_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  old_status VARCHAR(60),
  new_status VARCHAR(60) NOT NULL,
  changed_by VARCHAR(120),
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artist_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  from_time TIME,
  to_time TIME,
  is_available BOOLEAN DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS artist_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES artists(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  punctuality INTEGER,
  quality INTEGER,
  customer_handling INTEGER,
  overall_rating NUMERIC(3,1),
  suitable_for_brides BOOLEAN DEFAULT FALSE,
  suitable_for_groups BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'support',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO regions (external_id, name_ar, name_en, sort_order) VALUES
('1','الرياض','Riyadh',1),('2','مكة المكرمة','Makkah Al Mukarramah',2),('3','المدينة المنورة','Al Madinah Al Munawwarah',3),('4','القصيم','Al Qassim',4),('5','المنطقة الشرقية','Eastern Province',5),('6','عسير','Aseer',6),('7','تبوك','Tabuk',7),('8','حائل','Hail',8),('9','الحدود الشمالية','Northern Borders',9),('10','جازان','Jazan',10),('11','نجران','Najran',11),('12','الباحة','Al Baha',12),('13','الجوف','Al Jouf',13)
ON CONFLICT (external_id) DO NOTHING;

WITH cats AS (
  INSERT INTO service_categories (name_ar, name_en, description, sort_order) VALUES
  ('الحناء','Henna','خدمات الحناء والنقوش',1),
  ('المكياج','Makeup','خدمات مكياج منزلية',2),
  ('الشعر','Hair','تصفيف وتسريحات الشعر',3),
  ('العناية','Care','العناية بالبشرة واليدين والقدمين',4)
  ON CONFLICT DO NOTHING RETURNING id, name_ar
)
SELECT 1;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE artists ADD COLUMN IF NOT EXISTS main_expertise_category_id UUID REFERENCES service_categories(id);
ALTER TABLE artists ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) DEFAULT 'available';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[0,1,2,3,4,5]'::jsonb;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '10:00';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '22:00';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS max_daily_bookings INT DEFAULT 3;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS coverage_region_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS coverage_city_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS coverage_district_ids JSONB DEFAULT '[]'::jsonb;
UPDATE artists a SET main_expertise_category_id=s.category_id FROM services s
WHERE a.main_expertise_service_id=s.id AND a.main_expertise_category_id IS NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS preferred_artist_id UUID REFERENCES artists(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_review_rating INT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_review_text TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(40);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alternate_time VARCHAR(80);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(40) DEFAULT 'not_sent';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_number VARCHAR(40) UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR(30) DEFAULT 'legacy';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_channel VARCHAR(30);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_notes TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;
CREATE INDEX IF NOT EXISTS idx_bookings_number ON bookings(booking_number);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(booking_source);

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn FROM bookings WHERE booking_number IS NULL
)
UPDATE bookings b SET
  booking_number='BHS-' || EXTRACT(YEAR FROM COALESCE(b.created_at,NOW()))::int || '-' || LPAD(ordered.rn::text,6,'0'),
  booking_source=COALESCE(booking_source,'legacy')
FROM ordered WHERE b.id=ordered.id;

CREATE TABLE IF NOT EXISTS booking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL DEFAULT 'note', title VARCHAR(180), description TEXT,
  actor_type VARCHAR(40) DEFAULT 'system', actor_name VARCHAR(160), metadata JSONB, created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON booking_events(booking_id);

CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  payment_status VARCHAR(40) NOT NULL, payment_method VARCHAR(40), amount NUMERIC(10,2), reference_no VARCHAR(120),
  proof_url TEXT, note TEXT, created_by VARCHAR(160), created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_records_booking ON payment_records(booking_id);

CREATE TABLE IF NOT EXISTS beautician_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), beautician_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL, service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  title_ar VARCHAR(180) NOT NULL, title_en VARCHAR(180), description TEXT, image_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE, status VARCHAR(20) NOT NULL DEFAULT 'published', sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS beautician_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  beautician_id UUID REFERENCES artists(id) ON DELETE SET NULL, customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5), review_text TEXT, status VARCHAR(20) NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(booking_id)
);

CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code VARCHAR(80) UNIQUE, title_ar VARCHAR(180) NOT NULL,
  body_ar TEXT NOT NULL, channel VARCHAR(40) DEFAULT 'whatsapp', status VARCHAR(20) DEFAULT 'active',
  sort_order INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  phone VARCHAR(40) NOT NULL, otp_code VARCHAR(120) NOT NULL, purpose VARCHAR(40) DEFAULT 'login',
  expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE customer_otp_codes ALTER COLUMN otp_code TYPE VARCHAR(120);

CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  region_id UUID REFERENCES regions(id), city_id UUID REFERENCES cities(id), district_id UUID REFERENCES districts(id),
  label VARCHAR(120), address TEXT NOT NULL, is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customer_favorite_beauticians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  beautician_id UUID REFERENCES artists(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(customer_id,beautician_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(160) NOT NULL DEFAULT 'Admin', email VARCHAR(190) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role VARCHAR(40) NOT NULL DEFAULT 'admin', status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

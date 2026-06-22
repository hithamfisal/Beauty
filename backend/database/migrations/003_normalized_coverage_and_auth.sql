CREATE TABLE IF NOT EXISTS beautician_coverage_regions (
  beautician_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  PRIMARY KEY (beautician_id, region_id)
);
CREATE TABLE IF NOT EXISTS beautician_coverage_cities (
  beautician_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY (beautician_id, city_id)
);
CREATE TABLE IF NOT EXISTS beautician_coverage_districts (
  beautician_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
  PRIMARY KEY (beautician_id, district_id)
);

INSERT INTO beautician_coverage_regions (beautician_id, region_id)
SELECT a.id, value::uuid FROM artists a, jsonb_array_elements_text(COALESCE(a.coverage_region_ids,'[]'::jsonb)) value
ON CONFLICT DO NOTHING;
INSERT INTO beautician_coverage_cities (beautician_id, city_id)
SELECT a.id, value::uuid FROM artists a, jsonb_array_elements_text(COALESCE(a.coverage_city_ids,'[]'::jsonb)) value
ON CONFLICT DO NOTHING;
INSERT INTO beautician_coverage_districts (beautician_id, district_id)
SELECT a.id, value::uuid FROM artists a, jsonb_array_elements_text(COALESCE(a.coverage_district_ids,'[]'::jsonb)) value
ON CONFLICT DO NOTHING;

ALTER TABLE customer_otp_codes ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;
ALTER TABLE customer_otp_codes ADD COLUMN IF NOT EXISTS requested_ip VARCHAR(80);
CREATE INDEX IF NOT EXISTS idx_customer_otp_phone_created ON customer_otp_codes(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), identity VARCHAR(190) NOT NULL, ip_address VARCHAR(80),
  succeeded BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_identity_created ON auth_login_attempts(identity, created_at DESC);

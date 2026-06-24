CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name VARCHAR(190) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color VARCHAR(20) DEFAULT '#E6C7C2',
  secondary_color VARCHAR(20) DEFAULT '#FFFDF8',
  contact_phone VARCHAR(40),
  contact_email VARCHAR(190),
  subscription_plan VARCHAR(60) NOT NULL DEFAULT 'starter',
  subscription_status VARCHAR(40) NOT NULL DEFAULT 'active',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tenants (business_name, slug, contact_email, subscription_plan, subscription_status, status)
VALUES ('Beauty Home Service', 'beauty-home-service', 'admin@beauty.local', 'starter', 'active', 'active')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

WITH default_tenant AS (SELECT id FROM tenants WHERE slug='beauty-home-service' LIMIT 1)
UPDATE admin_users SET tenant_id=(SELECT id FROM default_tenant), role=CASE WHEN role='support' THEN 'tenant_owner' ELSE role END WHERE tenant_id IS NULL AND role <> 'super_admin';

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'regions','cities','districts','customers','service_categories','services','artists','beautician_services',
    'artist_availability','artist_reviews','bookings','booking_status_history','booking_events','booking_payments',
    'beautician_coverage_regions','beautician_coverage_cities','beautician_coverage_districts','beautician_portfolio',
    'customer_addresses','customer_favorite_beauticians','communication_templates','notifications'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE', t);
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid', t);
      EXECUTE format('UPDATE %I SET tenant_id=(SELECT id FROM tenants WHERE slug=''beauty-home-service'' LIMIT 1) WHERE tenant_id IS NULL', t);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tenant_id ON %I(tenant_id)', replace(t, '-', '_'), t);
    END IF;
  END LOOP;
END $$;

-- Keep tenant_id nullable during the first SaaS rollout to avoid breaking old imports.
-- Runtime default + API middleware will populate tenant_id for all new records.

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(60) UNIQUE NOT NULL,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  monthly_price NUMERIC(10,2) DEFAULT 0,
  booking_limit INT,
  artist_limit INT,
  service_limit INT,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO subscription_plans (code, name_ar, name_en, monthly_price, booking_limit, artist_limit, service_limit, features)
VALUES
('starter', 'الباقة المبدئية', 'Starter', 0, 100, 3, 20, '{"backup":true,"reports":"basic"}'::jsonb),
('professional', 'الباقة الاحترافية', 'Professional', 199, 1000, 15, NULL, '{"backup":true,"reports":"standard","whatsapp":true}'::jsonb),
('premium', 'الباقة المتقدمة', 'Premium', 499, NULL, NULL, NULL, '{"backup":true,"reports":"advanced","whatsapp":true,"custom_branding":true}'::jsonb)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bookings_count INT NOT NULL DEFAULT 0,
  artists_count INT NOT NULL DEFAULT 0,
  services_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, snapshot_date)
);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'regions','cities','districts','customers','service_categories','services','artists','beautician_services',
    'artist_availability','artist_reviews','bookings','booking_status_history','booking_events','booking_payments',
    'beautician_coverage_regions','beautician_coverage_cities','beautician_coverage_districts','beautician_portfolio',
    'customer_addresses','customer_favorite_beauticians','communication_templates','notifications'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
      EXECUTE format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (current_setting(''app.current_role'', true) = ''super_admin'' OR tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid) WITH CHECK (current_setting(''app.current_role'', true) = ''super_admin'' OR tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)', t);
    END IF;
  END LOOP;
END $$;

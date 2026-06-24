-- v5.1 Tenant Public Access + Branding
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tagline_ar VARCHAR(240);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tagline_en VARCHAR(240);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(40);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_phone VARCHAR(40);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_email VARCHAR(190);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS public_booking_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#DCC5A3';

UPDATE tenants
SET
  tagline_ar = COALESCE(tagline_ar, CASE WHEN slug='beauty-home-service' THEN 'جمالك في بيتك' ELSE 'خدمات تجميل منزلية راقية' END),
  description_ar = COALESCE(description_ar, 'احجزي خدمات التجميل المنزلية بسهولة وتابعي طلبك من نفس الرابط.'),
  primary_color = COALESCE(primary_color, '#E6C7C2'),
  secondary_color = COALESCE(secondary_color, '#FFFDF8'),
  accent_color = COALESCE(accent_color, '#DCC5A3')
WHERE tagline_ar IS NULL OR description_ar IS NULL OR primary_color IS NULL OR secondary_color IS NULL OR accent_color IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_slug_status ON tenants(slug, status);

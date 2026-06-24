-- v5.2 SaaS Tenant Management & Onboarding
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(40) NOT NULL DEFAULT 'pending_setup';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_password_reset_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  actor_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_email VARCHAR(190),
  actor_role VARCHAR(60),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

UPDATE tenants
SET onboarding_status = COALESCE(NULLIF(onboarding_status, ''), 'ready')
WHERE slug = 'beauty-home-service';

-- Ensure every active tenant has at least one tenant_owner admin when possible.
WITH owners AS (
  SELECT tenant_id, COUNT(*)::int AS owners_count
  FROM admin_users
  WHERE tenant_id IS NOT NULL AND role IN ('tenant_owner','admin') AND status='active'
  GROUP BY tenant_id
)
UPDATE tenants t
SET onboarding_notes = COALESCE(t.onboarding_notes, 'لا يوجد مدير شركة نشط بعد. أنشئ حساب مدير من لوحة Super Admin.')
WHERE NOT EXISTS (SELECT 1 FROM owners o WHERE o.tenant_id=t.id AND o.owners_count > 0);

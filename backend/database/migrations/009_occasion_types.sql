CREATE TABLE IF NOT EXISTS occasion_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT NULLIF(current_setting('app.current_tenant', true), '')::uuid,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_occasion_types_tenant_id ON occasion_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_occasion_types_status ON occasion_types(status, sort_order, name_ar);

INSERT INTO occasion_types (tenant_id, name_ar, name_en, description, sort_order, status)
SELECT t.id, v.name_ar, v.name_en, v.description, v.sort_order, 'active'
FROM tenants t
CROSS JOIN (VALUES
  ('زواج', 'Wedding', 'مناسبة زواج أو حفل رئيسي', 1),
  ('خطوبة', 'Engagement', 'مناسبة خطوبة', 2),
  ('ملكة', 'Katb Kitab', 'مناسبة ملكة أو عقد قران', 3),
  ('تخرج', 'Graduation', 'مناسبة تخرج', 4),
  ('عيد', 'Eid', 'مناسبة عيد', 5),
  ('جلسة تصوير', 'Photoshoot', 'جلسة تصوير خاصة', 6),
  ('زيارة منزلية', 'Home Visit', 'خدمة منزلية عامة', 7),
  ('مناسبة خاصة', 'Private Occasion', 'مناسبة خاصة أخرى', 8)
) AS v(name_ar, name_en, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM occasion_types ot WHERE ot.tenant_id=t.id);

ALTER TABLE occasion_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasion_types FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON occasion_types;
CREATE POLICY tenant_isolation ON occasion_types FOR ALL
USING (current_setting('app.current_role', true) = 'super_admin' OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
WITH CHECK (current_setting('app.current_role', true) = 'super_admin' OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

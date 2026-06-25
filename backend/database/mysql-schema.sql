CREATE TABLE IF NOT EXISTS tenants (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  business_name VARCHAR(190) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  contact_email VARCHAR(190),
  contact_phone VARCHAR(40),
  logo_url TEXT,
  cover_image_url TEXT,
  tagline_ar VARCHAR(240),
  tagline_en VARCHAR(240),
  description_ar TEXT,
  description_en TEXT,
  primary_color VARCHAR(20) DEFAULT '#E6C7C2',
  secondary_color VARCHAR(20) DEFAULT '#FFFDF8',
  accent_color VARCHAR(20) DEFAULT '#DCC5A3',
  whatsapp_number VARCHAR(40),
  support_phone VARCHAR(40),
  support_email VARCHAR(190),
  public_booking_enabled TINYINT(1) NOT NULL DEFAULT 1,
  subscription_plan VARCHAR(60) DEFAULT 'starter',
  subscription_status VARCHAR(40) DEFAULT 'active',
  status VARCHAR(40) DEFAULT 'active',
  settings JSON,
  onboarding_status VARCHAR(40) NOT NULL DEFAULT 'pending_setup',
  onboarding_notes TEXT,
  trial_ends_at TIMESTAMP NULL,
  suspended_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenants_slug_status (slug, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS regions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  external_id VARCHAR(80) UNIQUE,
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_regions_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cities (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  region_id CHAR(36),
  external_id VARCHAR(80),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cities_region (region_id),
  INDEX idx_cities_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS districts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  city_id CHAR(36),
  external_id VARCHAR(80),
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_districts_city (city_id),
  INDEX idx_districts_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_categories (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  description TEXT,
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service_categories_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  category_id CHAR(36),
  name VARCHAR(160),
  name_ar VARCHAR(160),
  name_en VARCHAR(160),
  description TEXT,
  image_url TEXT,
  base_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  estimated_duration VARCHAR(80),
  duration_minutes INT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_services_category (category_id),
  INDEX idx_services_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  name VARCHAR(160),
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190),
  region_id CHAR(36),
  city_id CHAR(36),
  district_id CHAR(36),
  default_address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_customers_tenant_phone (tenant_id, phone),
  INDEX idx_customers_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artists (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190),
  region_id CHAR(36),
  city_id CHAR(36),
  main_expertise_service_id CHAR(36),
  main_expertise_category_id CHAR(36),
  districts TEXT,
  skills TEXT,
  specialties TEXT,
  bio TEXT,
  rating DECIMAL(3,2),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  availability_status VARCHAR(30) DEFAULT 'available',
  working_days JSON,
  work_start_time TIME DEFAULT '10:00',
  work_end_time TIME DEFAULT '22:00',
  max_daily_bookings INT DEFAULT 3,
  coverage_region_ids JSON,
  coverage_city_ids JSON,
  coverage_district_ids JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_artists_tenant_id (tenant_id),
  INDEX idx_artists_availability_status (availability_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beautician_services (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  beautician_id CHAR(36),
  service_id CHAR(36),
  experience_level VARCHAR(80),
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_beautician_service (beautician_id, service_id),
  INDEX idx_beautician_services_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beautician_coverage_regions (
  beautician_id CHAR(36) NOT NULL,
  region_id CHAR(36) NOT NULL,
  tenant_id CHAR(36),
  PRIMARY KEY (beautician_id, region_id),
  INDEX idx_bcr_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beautician_coverage_cities (
  beautician_id CHAR(36) NOT NULL,
  city_id CHAR(36) NOT NULL,
  tenant_id CHAR(36),
  PRIMARY KEY (beautician_id, city_id),
  INDEX idx_bcc_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beautician_coverage_districts (
  beautician_id CHAR(36) NOT NULL,
  district_id CHAR(36) NOT NULL,
  tenant_id CHAR(36),
  PRIMARY KEY (beautician_id, district_id),
  INDEX idx_bcd_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  customer_id CHAR(36),
  region_id CHAR(36),
  city_id CHAR(36),
  district_id CHAR(36),
  service_category_id CHAR(36),
  event_type VARCHAR(120),
  service_id CHAR(36),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  people_count INT DEFAULT 1,
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  design_image_url TEXT,
  customer_notes TEXT,
  admin_notes TEXT,
  status VARCHAR(60) NOT NULL DEFAULT 'new',
  assigned_artist_id CHAR(36),
  preferred_artist_id CHAR(36),
  estimated_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  payment_status VARCHAR(40) DEFAULT 'unpaid',
  payment_method VARCHAR(40),
  payment_reference VARCHAR(120),
  payment_proof_url TEXT,
  payment_notes TEXT,
  paid_at TIMESTAMP NULL,
  contact_preference VARCHAR(40),
  alternate_time VARCHAR(80),
  whatsapp_status VARCHAR(40) DEFAULT 'not_sent',
  booking_number VARCHAR(40) UNIQUE,
  booking_source VARCHAR(30) DEFAULT 'unknown',
  source_channel VARCHAR(30),
  last_status_change_at TIMESTAMP NULL,
  confirmed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  customer_review_rating INT,
  customer_review_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bookings_tenant_id (tenant_id),
  INDEX idx_bookings_region (region_id),
  INDEX idx_bookings_category (service_category_id),
  INDEX idx_bookings_number (booking_number),
  INDEX idx_bookings_source (booking_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_status_history (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  booking_id CHAR(36),
  old_status VARCHAR(60),
  new_status VARCHAR(60) NOT NULL,
  changed_by VARCHAR(120),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bsh_booking (booking_id),
  INDEX idx_bsh_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_events (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  booking_id CHAR(36),
  event_type VARCHAR(80),
  title VARCHAR(190),
  description TEXT,
  actor_type VARCHAR(40),
  actor_name VARCHAR(160),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_events_booking (booking_id),
  INDEX idx_booking_events_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_records (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  booking_id CHAR(36),
  payment_status VARCHAR(40),
  payment_method VARCHAR(40),
  amount DECIMAL(10,2),
  reference_no VARCHAR(120),
  proof_url TEXT,
  note TEXT,
  created_by VARCHAR(160),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_records_booking (booking_id),
  INDEX idx_payment_records_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artist_availability (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  artist_id CHAR(36),
  available_date DATE NOT NULL,
  from_time TIME,
  to_time TIME,
  is_available TINYINT(1) DEFAULT 1,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_artist_availability_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artist_reviews (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  artist_id CHAR(36),
  booking_id CHAR(36),
  punctuality INT,
  quality INT,
  customer_handling INT,
  overall_rating DECIMAL(3,1),
  suitable_for_brides TINYINT(1) DEFAULT 0,
  suitable_for_groups TINYINT(1) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_artist_reviews_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beautician_portfolio (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  beautician_id CHAR(36),
  service_category_id CHAR(36),
  service_id CHAR(36),
  title_ar VARCHAR(190),
  title_en VARCHAR(190),
  description TEXT,
  image_url TEXT NOT NULL,
  is_featured TINYINT(1) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'published',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_portfolio_beautician (beautician_id),
  INDEX idx_portfolio_service (service_id),
  INDEX idx_portfolio_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS beautician_reviews (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  booking_id CHAR(36) UNIQUE,
  beautician_id CHAR(36),
  customer_id CHAR(36),
  rating INT,
  review_text TEXT,
  status VARCHAR(30) DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reviews_beautician (beautician_id),
  INDEX idx_reviews_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS communication_templates (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  code VARCHAR(80) UNIQUE,
  title_ar VARCHAR(190),
  body_ar TEXT,
  channel VARCHAR(40) DEFAULT 'whatsapp',
  status VARCHAR(30) DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_communication_templates_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_otp_codes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  customer_id CHAR(36),
  phone VARCHAR(40) NOT NULL,
  otp_code VARCHAR(190) NOT NULL,
  purpose VARCHAR(40) DEFAULT 'login',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  requested_ip VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_otp_phone (phone, expires_at),
  INDEX idx_customer_otp_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  customer_id CHAR(36),
  region_id CHAR(36),
  city_id CHAR(36),
  district_id CHAR(36),
  label VARCHAR(120),
  address TEXT NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_addresses_customer (customer_id),
  INDEX idx_customer_addresses_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_favorite_beauticians (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  customer_id CHAR(36),
  beautician_id CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_customer_favorite (customer_id, beautician_id),
  INDEX idx_customer_favorites_customer (customer_id),
  INDEX idx_customer_favorites_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  name VARCHAR(160) NOT NULL DEFAULT 'Admin',
  email VARCHAR(190) UNIQUE NOT NULL,
  phone VARCHAR(40),
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'admin',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  permissions JSON,
  last_login_at TIMESTAMP NULL,
  last_password_reset_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_users_tenant_id (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
  code VARCHAR(60) PRIMARY KEY,
  name_ar VARCHAR(160),
  name_en VARCHAR(160),
  monthly_price DECIMAL(10,2) DEFAULT 0,
  booking_limit INT,
  artist_limit INT,
  service_limit INT,
  features JSON,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_usage_snapshots (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  snapshot_date DATE NOT NULL,
  bookings_count INT NOT NULL DEFAULT 0,
  artists_count INT NOT NULL DEFAULT 0,
  services_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ux_tenant_usage_snapshot (tenant_id, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  actor_admin_id CHAR(36),
  actor_email VARCHAR(190),
  actor_role VARCHAR(40),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id CHAR(36),
  details JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_tenant_id (tenant_id),
  INDEX idx_audit_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  identity VARCHAR(190) NOT NULL,
  ip_address VARCHAR(80),
  successful TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_login_attempts_identity_ip (identity, ip_address, created_at),
  INDEX idx_auth_login_attempts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS occasion_types (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36),
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_occasion_types_tenant_id (tenant_id),
  INDEX idx_occasion_types_status (status, sort_order, name_ar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_number_counter (
  id INT PRIMARY KEY,
  seq BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tenants (business_name, slug, contact_email, subscription_plan, subscription_status, status, tagline_ar, description_ar, primary_color, secondary_color, accent_color)
VALUES ('Beauty Home Service', 'beauty-home-service', 'admin@beauty.local', 'starter', 'active', 'active', 'خدمات تجميل منزلية', 'احجزي خدمات التجميل المنزلية بسهولة.', '#E6C7C2', '#FFFDF8', '#DCC5A3')
ON DUPLICATE KEY UPDATE business_name=VALUES(business_name);

INSERT INTO subscription_plans (code, name_ar, name_en, monthly_price, booking_limit, artist_limit, service_limit, features)
VALUES
('starter', 'الباقة المبدئية', 'Starter', 0, 100, 3, 20, JSON_OBJECT('backup', true, 'reports', 'basic')),
('professional', 'الباقة الاحترافية', 'Professional', 199, 1000, 15, NULL, JSON_OBJECT('backup', true, 'reports', 'standard', 'whatsapp', true)),
('premium', 'الباقة المتقدمة', 'Premium', 499, NULL, NULL, NULL, JSON_OBJECT('backup', true, 'reports', 'advanced', 'whatsapp', true, 'custom_branding', true))
ON DUPLICATE KEY UPDATE name_ar=VALUES(name_ar), monthly_price=VALUES(monthly_price), features=VALUES(features);

INSERT IGNORE INTO regions (external_id, name_ar, name_en, sort_order) VALUES
('1','الرياض','Riyadh',1),('2','مكة المكرمة','Makkah Al Mukarramah',2),('3','المدينة المنورة','Al Madinah Al Munawwarah',3),('4','القصيم','Al Qassim',4),('5','المنطقة الشرقية','Eastern Province',5),('6','عسير','Aseer',6),('7','تبوك','Tabuk',7),('8','حائل','Hail',8),('9','الحدود الشمالية','Northern Borders',9),('10','جازان','Jazan',10),('11','نجران','Najran',11),('12','الباحة','Al Baha',12),('13','الجوف','Al Jouf',13);

INSERT IGNORE INTO service_categories (tenant_id, name_ar, name_en, description, sort_order)
SELECT t.id, v.name_ar, v.name_en, v.description, v.sort_order
FROM tenants t
JOIN (
  SELECT 'الحناء' AS name_ar, 'Henna' AS name_en, 'خدمات الحناء والنقوش' AS description, 1 AS sort_order
  UNION ALL SELECT 'المكياج', 'Makeup', 'خدمات مكياج منزلية', 2
  UNION ALL SELECT 'الشعر', 'Hair', 'تصفيف وتسريحات الشعر', 3
  UNION ALL SELECT 'العناية', 'Care', 'العناية بالبشرة واليدين والقدمين', 4
) v
WHERE t.slug='beauty-home-service';

INSERT IGNORE INTO occasion_types (tenant_id, name_ar, name_en, description, sort_order, status)
SELECT t.id, v.name_ar, v.name_en, v.description, v.sort_order, 'active'
FROM tenants t
JOIN (
  SELECT 'زواج' AS name_ar, 'Wedding' AS name_en, 'مناسبة زواج أو حفل رئيسي' AS description, 1 AS sort_order
  UNION ALL SELECT 'خطوبة', 'Engagement', 'مناسبة خطوبة', 2
  UNION ALL SELECT 'ملكة', 'Katb Kitab', 'مناسبة ملكة أو عقد قران', 3
  UNION ALL SELECT 'تخرج', 'Graduation', 'مناسبة تخرج', 4
  UNION ALL SELECT 'عيد', 'Eid', 'مناسبة عيد', 5
  UNION ALL SELECT 'جلسة تصوير', 'Photoshoot', 'جلسة تصوير خاصة', 6
  UNION ALL SELECT 'زيارة منزلية', 'Home Visit', 'خدمة منزلية عامة', 7
  UNION ALL SELECT 'مناسبة خاصة', 'Private Occasion', 'مناسبة خاصة أخرى', 8
) v
WHERE t.slug='beauty-home-service';

INSERT IGNORE INTO booking_number_counter (id, seq) VALUES (1, 0);

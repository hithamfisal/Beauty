import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, transaction, runWithTenantContext } from './db.js';
import { runMigrations } from './migrations.js';
import { ApiValidationError, assertUuid, uniqueUuidArray, validateBookingShape, validatePhone, normalizeSaudiPhone, validationResponse } from './validation.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CUSTOMER_OTP_DEV_MODE = String(process.env.CUSTOMER_OTP_DEV_MODE || '').toLowerCase() === 'true';
const CUSTOMER_OTP_TEST_MODE = !IS_PRODUCTION || CUSTOMER_OTP_DEV_MODE;
const JWT_SECRET = process.env.JWT_SECRET || (IS_PRODUCTION ? '' : 'beauty-home-service-local-secret');
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@beauty.local';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Beauty@12345';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'beauty-home-service';
const SUPER_ADMIN_EMAIL = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
const SUPER_ADMIN_PASSWORD = String(process.env.SUPER_ADMIN_PASSWORD || '').trim();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(__dirname, '..', 'backups');

if (IS_PRODUCTION && JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
if (IS_PRODUCTION && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12)) {
  throw new Error('ADMIN_EMAIL and a 12+ character ADMIN_PASSWORD are required in production.');
}

const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
if (IS_PRODUCTION && allowedOrigins.length === 0) throw new Error('CORS_ALLOWED_ORIGINS is required in production.');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors({ origin(origin, callback) {
  if (!origin || !IS_PRODUCTION || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '20mb' }));

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizePhone(value) {
  return normalizeSaudiPhone(value);
}

function nullable(value) {
  const v = normalizeText(value);
  return v === '' ? null : v;
}

async function columnExists(tableName, columnName) {
  const result = await query(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2 LIMIT 1`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

async function ensureV14Schema() {
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await query(`
    CREATE TABLE IF NOT EXISTS regions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      external_id VARCHAR(80) UNIQUE,
      name_ar VARCHAR(160) NOT NULL,
      name_en VARCHAR(160),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS service_categories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name_ar VARCHAR(160) NOT NULL,
      name_en VARCHAR(160),
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);


  await query(`
    CREATE TABLE IF NOT EXISTS occasion_types (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name_ar VARCHAR(160) NOT NULL,
      name_en VARCHAR(160),
      description TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      sort_order INT DEFAULT 0,
      tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE DEFAULT NULLIF(current_setting('app.current_tenant', true), '')::uuid,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_occasion_types_status ON occasion_types(status, sort_order, name_ar)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_occasion_types_tenant_id ON occasion_types(tenant_id)`);

  await query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id)`);
  await query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS external_id VARCHAR(80)`);
  await query(`ALTER TABLE cities ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`);
  await query(`ALTER TABLE districts ADD COLUMN IF NOT EXISTS external_id VARCHAR(80)`);
  await query(`ALTER TABLE districts ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id)`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS name_ar VARCHAR(160)`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS name_en VARCHAR(160)`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price NUMERIC(10,2)`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_minutes INT`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id)`);
  await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_category_id UUID REFERENCES service_categories(id)`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id)`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS main_expertise_service_id UUID REFERENCES services(id)`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS main_expertise_category_id UUID REFERENCES service_categories(id)`);
  await query(`UPDATE artists a SET main_expertise_category_id=s.category_id FROM services s WHERE a.main_expertise_service_id=s.id AND a.main_expertise_category_id IS NULL AND s.category_id IS NOT NULL`);

  await query(`
    CREATE TABLE IF NOT EXISTS beautician_services (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      beautician_id UUID REFERENCES artists(id) ON DELETE CASCADE,
      service_id UUID REFERENCES services(id) ON DELETE CASCADE,
      experience_level VARCHAR(80),
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(beautician_id, service_id)
    )
  `);

  await query(`
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
    )
  `);

  await query(`
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
    )
  `);


  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(160) NOT NULL DEFAULT 'Admin',
      email VARCHAR(190) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'admin',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const adminCount = await query(`SELECT COUNT(*)::int AS count FROM admin_users`);
  if (adminCount.rows[0].count === 0) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await query(
      `INSERT INTO admin_users (name, email, password_hash, role, status) VALUES ($1,$2,$3,'admin','active')`,
      ['System Admin', DEFAULT_ADMIN_EMAIL.toLowerCase(), passwordHash]
    );
    console.log(`Default admin created: ${DEFAULT_ADMIN_EMAIL}`);
  }

  await query(`CREATE INDEX IF NOT EXISTS idx_cities_region ON cities(region_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_districts_city ON districts(city_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_region ON bookings(region_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_category ON bookings(service_category_id)`);

  const hasName = await columnExists('services', 'name');
  if (hasName) {
    await query(`UPDATE services SET name_ar = COALESCE(name_ar, name), name_en = COALESCE(name_en, name) WHERE name_ar IS NULL OR name_en IS NULL`);
  }

  const existingCategories = await query(`SELECT COUNT(*)::int AS count FROM service_categories`);
  if (existingCategories.rows[0].count === 0) {
    const cats = [
      ['الحناء', 'Henna', 'خدمات الحناء والنقوش'],
      ['المكياج', 'Makeup', 'خدمات مكياج منزلية'],
      ['الشعر', 'Hair', 'تصفيف وتسريحات الشعر'],
      ['العناية', 'Care', 'العناية بالبشرة واليدين والقدمين']
    ];
    for (let i = 0; i < cats.length; i++) {
      await query(`INSERT INTO service_categories (name_ar, name_en, description, sort_order) VALUES ($1,$2,$3,$4)`, [...cats[i], i + 1]);
    }
  }

  const hennaCategory = await query(`SELECT id FROM service_categories WHERE name_ar='الحناء' LIMIT 1`);
  if (hennaCategory.rows[0]) {
    await query(`UPDATE services SET category_id = COALESCE(category_id, $1) WHERE category_id IS NULL`, [hennaCategory.rows[0].id]);
  }

  const serviceCount = await query(`SELECT COUNT(*)::int AS count FROM services`);
  if (serviceCount.rows[0].count === 0) {
    const categories = await query(`SELECT id, name_ar FROM service_categories`);
    const idByName = Object.fromEntries(categories.rows.map(c => [c.name_ar, c.id]));
    const services = [
      [idByName['الحناء'], 'حناء بسيطة', 'Simple Henna', 100, 200, 60],
      [idByName['الحناء'], 'حناء متوسطة', 'Medium Henna', 200, 400, 120],
      [idByName['الحناء'], 'حناء فخمة', 'Luxury Henna', 400, 700, 180],
      [idByName['الحناء'], 'حناء عروس', 'Bridal Henna', 700, 2000, 240],
      [idByName['المكياج'], 'مكياج ناعم', 'Soft Makeup', 250, 500, 90],
      [idByName['المكياج'], 'مكياج سهرة', 'Evening Makeup', 450, 900, 120],
      [idByName['المكياج'], 'مكياج عروس', 'Bridal Makeup', 900, 2500, 180],
      [idByName['الشعر'], 'استشوار', 'Blow Dry', 120, 250, 60],
      [idByName['الشعر'], 'تسريحة بسيطة', 'Simple Hairstyle', 200, 450, 90],
      [idByName['الشعر'], 'تسريحة عروس', 'Bridal Hairstyle', 600, 1600, 180],
      [idByName['العناية'], 'تنظيف بشرة', 'Facial Cleansing', 250, 600, 90],
      [idByName['العناية'], 'عناية يدين', 'Hand Care', 100, 250, 45],
      [idByName['العناية'], 'عناية قدمين', 'Foot Care', 120, 300, 60]
    ];
    for (let i = 0; i < services.length; i++) {
      await query(`
        INSERT INTO services (category_id, name, name_ar, name_en, min_price, max_price, duration_minutes, status, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8)
      `, [services[i][0], services[i][1], services[i][1], services[i][2], services[i][3], services[i][4], services[i][5], i + 1]);
    }
  }

  const regionCount = await query(`SELECT COUNT(*)::int AS count FROM regions`);
  if (regionCount.rows[0].count === 0) {
    const regions = [
      ['1', 'الرياض', 'Riyadh'], ['2', 'مكة المكرمة', 'Makkah Al Mukarramah'], ['3', 'المدينة المنورة', 'Al Madinah Al Munawwarah'],
      ['4', 'القصيم', 'Al Qassim'], ['5', 'المنطقة الشرقية', 'Eastern Province'], ['6', 'عسير', 'Aseer'], ['7', 'تبوك', 'Tabuk'],
      ['8', 'حائل', 'Hail'], ['9', 'الحدود الشمالية', 'Northern Borders'], ['10', 'جازان', 'Jazan'], ['11', 'نجران', 'Najran'],
      ['12', 'الباحة', 'Al Baha'], ['13', 'الجوف', 'Al Jouf']
    ];
    for (let i = 0; i < regions.length; i++) {
      await query(`INSERT INTO regions (external_id, name_ar, name_en, sort_order) VALUES ($1,$2,$3,$4)`, [...regions[i], i + 1]);
    }
  }

  const riyadh = await query(`SELECT id FROM regions WHERE name_ar='الرياض' LIMIT 1`);
  if (riyadh.rows[0]) {
    await query(`UPDATE cities SET region_id = COALESCE(region_id, $1) WHERE name_ar IN ('الرياض')`, [riyadh.rows[0].id]);
  }

  const eastern = await query(`SELECT id FROM regions WHERE name_ar='المنطقة الشرقية' LIMIT 1`);
  if (eastern.rows[0]) {
    await query(`UPDATE cities SET region_id = COALESCE(region_id, $1) WHERE name_ar IN ('الدمام','الخبر','الظهران')`, [eastern.rows[0].id]);
  }

  const makkah = await query(`SELECT id FROM regions WHERE name_ar='مكة المكرمة' LIMIT 1`);
  if (makkah.rows[0]) {
    await query(`UPDATE cities SET region_id = COALESCE(region_id, $1) WHERE name_ar IN ('جدة','مكة','مكة المكرمة')`, [makkah.rows[0].id]);
  }
}


async function ensureV16Schema() {
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS preferred_artist_id UUID REFERENCES artists(id)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_review_rating INT`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_review_text TEXT`);

  await query(`
    CREATE TABLE IF NOT EXISTS beautician_portfolio (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      beautician_id UUID REFERENCES artists(id) ON DELETE CASCADE,
      service_category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
      service_id UUID REFERENCES services(id) ON DELETE SET NULL,
      title_ar VARCHAR(180) NOT NULL,
      title_en VARCHAR(180),
      description TEXT,
      image_url TEXT NOT NULL,
      is_featured BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS beautician_reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      beautician_id UUID REFERENCES artists(id) ON DELETE SET NULL,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'published',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(booking_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_portfolio_beautician ON beautician_portfolio(beautician_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_portfolio_service ON beautician_portfolio(service_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_reviews_beautician ON beautician_reviews(beautician_id)`);
}


async function ensureV17V18Schema() {
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_preference VARCHAR(40)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alternate_time VARCHAR(80)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(40) DEFAULT 'not_sent'`);

  await query(`
    CREATE TABLE IF NOT EXISTS booking_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      event_type VARCHAR(80) NOT NULL DEFAULT 'note',
      title VARCHAR(180),
      description TEXT,
      actor_type VARCHAR(40) DEFAULT 'system',
      actor_name VARCHAR(160),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_booking_events_booking ON booking_events(booking_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS communication_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code VARCHAR(80) UNIQUE,
      title_ar VARCHAR(180) NOT NULL,
      body_ar TEXT NOT NULL,
      channel VARCHAR(40) DEFAULT 'whatsapp',
      status VARCHAR(20) DEFAULT 'active',
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const templateCount = await query(`SELECT COUNT(*)::int AS count FROM communication_templates`);
  if (templateCount.rows[0].count === 0) {
    const templates = [
      ['new_request', 'رسالة طلب جديد', 'مرحباً {customer_name}، تم استلام طلبك في بيوتي هوم سيرفس وسيتم التواصل معك لتأكيد الموعد. رقم الطلب: {booking_id}', 1],
      ['confirm_booking', 'تأكيد الحجز', 'مرحباً {customer_name}، تم تأكيد حجزك لخدمة {service_name} بتاريخ {booking_date} الساعة {booking_time}.', 2],
      ['payment_reminder', 'تذكير الدفع', 'مرحباً {customer_name}، نذكرك بحالة الدفع لطلبك رقم {booking_id}. حالة الدفع الحالية: {payment_status}.', 3],
      ['completed_review', 'طلب التقييم', 'مرحباً {customer_name}، سعدنا بخدمتك. يمكنك فتح التطبيق وتقييم خبيرة التجميل للطلب رقم {booking_id}.', 4]
    ];
    for (const t of templates) {
      await query(`INSERT INTO communication_templates (code, title_ar, body_ar, sort_order) VALUES ($1,$2,$3,$4)`, t);
    }
  }
}


async function ensureV20Schema() {
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_number VARCHAR(40) UNIQUE`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR(30) DEFAULT 'unknown'`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source_channel VARCHAR(30)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_status_change_at TIMESTAMP`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`);
  await query(`CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_number ON bookings(booking_number)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(booking_source)`);
  await query(`
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
      FROM bookings
      WHERE booking_number IS NULL
    )
    UPDATE bookings b
    SET booking_number = 'BHS-' || EXTRACT(YEAR FROM COALESCE(b.created_at, NOW()))::int || '-' || LPAD(ordered.rn::text, 6, '0'),
        booking_source = COALESCE(booking_source, 'legacy')
    FROM ordered
    WHERE b.id = ordered.id
  `);
}

async function generateBookingNumber() {
  const result = await query(`SELECT nextval('booking_number_seq') AS seq`);
  const seq = String(result.rows[0].seq).padStart(6, '0');
  const year = new Date().getFullYear();
  return `BHS-${year}-${seq}`;
}


async function ensureV21PaymentSchema() {
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120)`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_notes TEXT`);
  await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`);
  await query(`
    CREATE TABLE IF NOT EXISTS payment_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
      payment_status VARCHAR(40),
      payment_method VARCHAR(40),
      amount NUMERIC(12,2),
      reference_no VARCHAR(120),
      proof_url TEXT,
      note TEXT,
      created_by VARCHAR(120),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_payment_records_booking ON payment_records(booking_id)`);
}

const BOOKING_STATUS_LABELS = {
  new: 'جديد',
  under_review: 'قيد المراجعة',
  waiting_customer_confirmation: 'بانتظار تأكيد العميلة',
  confirmed: 'تم التأكيد',
  beautician_assigned: 'تم تعيين خبيرة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي'
};

const BOOKING_STATUS_ALIASES = {
  artist_assigned: 'beautician_assigned',
  assigned: 'beautician_assigned',
  pending: 'under_review',
  review: 'under_review',
  waiting: 'waiting_customer_confirmation',
  complete: 'completed',
  canceled: 'cancelled',
  unavailable: 'cancelled'
};
const BOOKING_STATUS_VALUES = Object.keys(BOOKING_STATUS_LABELS);

function normalizeBookingStatus(status) {
  const raw = String(status || 'new').trim();
  const normalized = BOOKING_STATUS_ALIASES[raw] || raw;
  return BOOKING_STATUS_VALUES.includes(normalized) ? normalized : null;
}

async function logBookingEvent(bookingId, eventType, title, description, actorType = 'system', actorName = null, metadata = null) {
  if (!bookingId) return null;
  try {
    const result = await query(
      `INSERT INTO booking_events (booking_id, event_type, title, description, actor_type, actor_name, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [bookingId, eventType || 'note', title || null, description || null, actorType || 'system', actorName, metadata ? JSON.stringify(metadata) : null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('booking event log failed:', error.message);
    return null;
  }
}

function fillTemplate(templateText, booking) {
  const values = {
    booking_id: booking.id,
    customer_name: booking.customer_name || booking.name || 'عميلتنا',
    customer_phone: booking.customer_phone || booking.phone || '',
    service_name: booking.service_name || '',
    booking_date: booking.booking_date ? String(booking.booking_date).slice(0, 10) : '',
    booking_time: booking.booking_time ? String(booking.booking_time).slice(0, 5) : '',
    payment_status: booking.payment_status || 'unpaid',
    status: booking.status || ''
  };
  return String(templateText || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

async function uploadToCloudinary(imageDataUrl, folder = 'beauty-home-service') {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) return { url: imageDataUrl, provider: 'inline-data-url' };
  const form = new FormData();
  form.append('file', imageDataUrl);
  form.append('upload_preset', uploadPreset);
  form.append('folder', folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  if (!response.ok) throw new Error(data?.error?.message || data?.error || 'Cloudinary upload failed');
  return { url: data.secure_url || data.url, provider: 'cloudinary', public_id: data.public_id };
}



async function ensureV22V23Schema() {
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS availability_status VARCHAR(30) DEFAULT 'available'`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[0,1,2,3,4,5]'::jsonb`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '10:00'`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '22:00'`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS max_daily_bookings INT DEFAULT 3`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS coverage_region_ids JSONB DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS coverage_city_ids JSONB DEFAULT '[]'::jsonb`);
  await query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS coverage_district_ids JSONB DEFAULT '[]'::jsonb`);
  await query(`CREATE INDEX IF NOT EXISTS idx_artists_availability_status ON artists(availability_status)`);

  await query(`
    CREATE TABLE IF NOT EXISTS customer_otp_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      phone VARCHAR(40) NOT NULL,
      otp_code VARCHAR(10) NOT NULL,
      purpose VARCHAR(40) DEFAULT 'login',
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_customer_otp_phone ON customer_otp_codes(phone, expires_at)`);

  await query(`
    CREATE TABLE IF NOT EXISTS customer_addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      region_id UUID REFERENCES regions(id),
      city_id UUID REFERENCES cities(id),
      district_id UUID REFERENCES districts(id),
      label VARCHAR(120),
      address TEXT NOT NULL,
      is_default BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)`);

  await query(`
    CREATE TABLE IF NOT EXISTS customer_favorite_beauticians (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      beautician_id UUID REFERENCES artists(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(customer_id, beautician_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer ON customer_favorite_beauticians(customer_id)`);
}

function parseJsonArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return fallback;
  try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed : fallback; }
  catch { return String(value).split(',').map(x => x.trim()).filter(Boolean); }
}

function dayOfWeekForDate(dateValue) {
  if (!dateValue) return null;
  const d = new Date(`${String(dateValue).slice(0,10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

function timeToMinutes(value) {
  if (!value) return null;
  const [h, m] = String(value).slice(0,5).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

async function getSuitableBeauticiansForBooking(bookingId) {
  const bookingResult = await bookingsQuery(`WHERE b.id=$1`, [bookingId]);
  const booking = bookingResult.rows[0];
  if (!booking) return { booking: null, suggestions: [] };
  const params = [];
  const where = [`a.status='active'`, `COALESCE(a.availability_status,'available')='available'`];
  if (booking.service_id) {
    params.push(booking.service_id);
    where.push(`(a.main_expertise_service_id=$${params.length} OR a.main_expertise_category_id=(SELECT category_id FROM services WHERE id=$${params.length}) OR EXISTS (SELECT 1 FROM beautician_services bs WHERE bs.beautician_id=a.id AND bs.service_id=$${params.length}))`);
  } else if (booking.service_category_id) {
    params.push(booking.service_category_id);
    where.push(`(a.main_expertise_category_id=$${params.length} OR a.main_expertise_category_id IS NULL)`);
  }
  const result = await query(`
    SELECT a.*, r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(mc.name_ar, ms.name_ar, ms.name) AS main_expertise_name,
      ARRAY(SELECT region_id::text FROM beautician_coverage_regions WHERE beautician_id=a.id) AS coverage_region_ids,
      ARRAY(SELECT city_id::text FROM beautician_coverage_cities WHERE beautician_id=a.id) AS coverage_city_ids,
      ARRAY(SELECT district_id::text FROM beautician_coverage_districts WHERE beautician_id=a.id) AS coverage_district_ids,
      COALESCE(ROUND(AVG(br.rating)::numeric,1), ROUND(AVG(ar.overall_rating)::numeric,1), a.rating, 5) AS review_rating,
      COUNT(DISTINCT b2.id)::int AS active_bookings,
      COUNT(DISTINCT p.id)::int AS portfolio_count
    FROM artists a
    LEFT JOIN regions r ON r.id=a.region_id
    LEFT JOIN cities c ON c.id=a.city_id
    LEFT JOIN service_categories mc ON mc.id=a.main_expertise_category_id
    LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
    LEFT JOIN beautician_reviews br ON br.beautician_id=a.id AND br.status='published'
    LEFT JOIN artist_reviews ar ON ar.artist_id=a.id
    LEFT JOIN beautician_portfolio p ON p.beautician_id=a.id AND p.status='published'
    LEFT JOIN bookings b2 ON b2.assigned_artist_id=a.id AND b2.booking_date=$${params.length + 1} AND b2.status NOT IN ('completed','cancelled')
    WHERE ${where.join(' AND ')}
    GROUP BY a.id, r.name_ar, c.name_ar, mc.name_ar, ms.name_ar, ms.name
  `, [...params, booking.booking_date]);

  const bookingDay = dayOfWeekForDate(booking.booking_date);
  const requestedTime = timeToMinutes(booking.booking_time);
  const suggestions = result.rows.map(a => {
    const reasons = [];
    const blocked = [];
    const days = parseJsonArray(a.working_days, []);
    const coverageRegions = parseJsonArray(a.coverage_region_ids, []);
    const coverageCities = parseJsonArray(a.coverage_city_ids, []);
    const coverageDistricts = parseJsonArray(a.coverage_district_ids, []);
    const start = timeToMinutes(a.work_start_time);
    const end = timeToMinutes(a.work_end_time);
    if (bookingDay != null && days.length && !days.map(String).includes(String(bookingDay))) blocked.push('اليوم خارج أيام العمل'); else reasons.push('اليوم مناسب');
    if (requestedTime != null && start != null && end != null && (requestedTime < start || requestedTime > end)) blocked.push('الوقت خارج ساعات العمل'); else reasons.push('الوقت مناسب');
    if (coverageRegions.length && booking.region_id && !coverageRegions.map(String).includes(String(booking.region_id))) blocked.push('المنطقة خارج التغطية'); else reasons.push('المنطقة ضمن التغطية');
    if (coverageCities.length && booking.city_id && !coverageCities.map(String).includes(String(booking.city_id))) blocked.push('المدينة خارج التغطية'); else reasons.push('المدينة ضمن التغطية');
    if (coverageDistricts.length && booking.district_id && !coverageDistricts.map(String).includes(String(booking.district_id))) blocked.push('الحي خارج التغطية'); else reasons.push('الحي ضمن التغطية');
    if (Number(a.active_bookings || 0) >= Number(a.max_daily_bookings || 3)) blocked.push('وصلت للحد اليومي');
    const score = (Number(a.review_rating || 5) * 20) + (Number(a.portfolio_count || 0) * 2) - (Number(a.active_bookings || 0) * 8) - (blocked.length * 100);
    return { ...a, is_suitable: blocked.length === 0, suitability_score: score, suitability_reasons: reasons, suitability_warnings: blocked };
  }).sort((a,b) => b.suitability_score - a.suitability_score);
  return { booking, suggestions };
}


async function getDefaultTenant() {
  const result = await query(`SELECT * FROM tenants WHERE slug=$1 LIMIT 1`, [DEFAULT_TENANT_SLUG]);
  return result.rows[0] || null;
}

async function resolveTenantFromRequest(req) {
  const slug = String(req.headers['x-tenant-slug'] || req.query.tenant_slug || req.body?.tenant_slug || DEFAULT_TENANT_SLUG).trim() || DEFAULT_TENANT_SLUG;
  const id = String(req.headers['x-tenant-id'] || req.query.tenant_id || req.body?.tenant_id || '').trim();
  const params = [];
  let where = '';
  if (id) { params.push(id); where = 'id=$1::uuid'; }
  else { params.push(slug); where = 'slug=$1'; }
  const result = await query(`SELECT id, business_name, slug, logo_url, cover_image_url, tagline_ar, description_ar, primary_color, secondary_color, accent_color, contact_phone, whatsapp_number, support_phone, support_email, subscription_plan, subscription_status, status, public_booking_enabled FROM tenants WHERE ${where} LIMIT 1`, params);
  return result.rows[0] || await getDefaultTenant();
}

function tenantAware(req, res, next) {
  resolveTenantFromRequest(req).then((tenant) => {
    req.tenant = tenant;
    return runWithTenantContext({ tenantId: tenant?.id || null, tenantSlug: tenant?.slug || DEFAULT_TENANT_SLUG }, () => next());
  }).catch(next);
}

function requireSuperAdmin(req, res, next) {
  if (req.admin?.role !== 'super_admin') return res.status(403).json({ error: 'Super Admin access required' });
  return next();
}

function publicTenantView(tenant) {
  if (!tenant) return null;
  return {
    id: tenant.id,
    business_name: tenant.business_name,
    slug: tenant.slug,
    logo_url: tenant.logo_url || null,
    cover_image_url: tenant.cover_image_url || null,
    tagline_ar: tenant.tagline_ar || 'خدمات تجميل منزلية',
    description_ar: tenant.description_ar || 'احجزي خدمات التجميل المنزلية بسهولة.',
    primary_color: tenant.primary_color || '#E6C7C2',
    secondary_color: tenant.secondary_color || '#FFFDF8',
    accent_color: tenant.accent_color || '#DCC5A3',
    contact_phone: tenant.contact_phone || tenant.support_phone || null,
    whatsapp_number: tenant.whatsapp_number || tenant.contact_phone || null,
    support_email: tenant.support_email || tenant.contact_email || null,
    status: tenant.status,
    public_booking_enabled: tenant.public_booking_enabled !== false
  };
}

function signCustomerToken(customer) {
  return jwt.sign({ id: customer.id, phone: customer.phone, name: customer.name, tenant_id: customer.tenant_id, scope: 'customer' }, JWT_SECRET, { expiresIn: '7d', issuer: 'beauty-home-service', audience: 'beauty-customer', subject: customer.id });
}

function authenticateCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Customer login required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'beauty-home-service', audience: 'beauty-customer' });
    if (payload.scope !== 'customer') return res.status(401).json({ error: 'Invalid customer token' });
    req.customer = payload;
    return next();
  } catch (_) { return res.status(401).json({ error: 'Invalid or expired customer session' }); }
}

async function initSchemas() {
  await ensureV14Schema();
  await ensureV16Schema();
  await ensureV17V18Schema();
  await ensureV20Schema();
  await ensureV21PaymentSchema();
  await ensureV22V23Schema();
}

async function ensureInitialAdmin() {
  const adminEmail = String(DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(DEFAULT_ADMIN_PASSWORD || '').trim();
  if (!adminEmail || !adminPassword) return;

  const defaultTenant = await query(`SELECT id FROM tenants WHERE slug=$1 LIMIT 1`, [DEFAULT_TENANT_SLUG]);
  const defaultTenantId = defaultTenant.rows[0]?.id || null;
  const existing = await query(
    `SELECT id, email, password_hash, role FROM admin_users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
    [adminEmail]
  );

  if (existing.rows[0]) {
    const currentHash = existing.rows[0].password_hash || '';
    const passwordMatches = currentHash ? await bcrypt.compare(adminPassword, currentHash).catch(() => false) : false;
    const passwordHash = passwordMatches ? currentHash : await bcrypt.hash(adminPassword, 12);
    await query(
      `UPDATE admin_users SET password_hash=$1, role=CASE WHEN role='super_admin' THEN role ELSE 'tenant_owner' END, status='active', tenant_id=COALESCE(tenant_id,$2::uuid), updated_at=NOW() WHERE id=$3::uuid`,
      [passwordHash, defaultTenantId, existing.rows[0].id]
    );
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await query(
    `INSERT INTO admin_users (name, email, password_hash, role, status, tenant_id) VALUES ($1,$2,$3,'tenant_owner','active',$4)`,
    ['System Admin', adminEmail, passwordHash, defaultTenantId]
  );
}

async function ensureSuperAdmin() {
  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) return;
  const existing = await query(`SELECT id, password_hash FROM admin_users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [SUPER_ADMIN_EMAIL]);
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  if (existing.rows[0]) {
    await query(`UPDATE admin_users SET password_hash=$1, role='super_admin', tenant_id=NULL, status='active', updated_at=NOW() WHERE id=$2::uuid`, [passwordHash, existing.rows[0].id]);
    return;
  }
  await query(`INSERT INTO admin_users (name, email, password_hash, role, status, tenant_id) VALUES ($1,$2,$3,'super_admin','active',NULL)`, ['Super Admin', SUPER_ADMIN_EMAIL, passwordHash]);
}

await runMigrations();
await ensureInitialAdmin();
await ensureSuperAdmin();


async function findOrCreateRegion(regionName) {
  const name = nullable(regionName);
  if (!name) return null;
  const existing = await query(`SELECT id FROM regions WHERE name_ar=$1 OR name_en=$1 ORDER BY created_at ASC LIMIT 1`, [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await query(`INSERT INTO regions (name_ar, name_en, status) VALUES ($1,$2,'active') RETURNING id`, [name, name]);
  return created.rows[0].id;
}

async function findOrCreateCity(cityName, regionId = null) {
  const name = nullable(cityName);
  if (!name) return null;
  const existing = await query(
    `SELECT id FROM cities WHERE (name_ar=$1 OR name_en=$1) AND ($2::uuid IS NULL OR region_id=$2) ORDER BY created_at ASC LIMIT 1`,
    [name, regionId]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await query(`INSERT INTO cities (region_id, name_ar, name_en, status) VALUES ($1,$2,$3,'active') RETURNING id`, [regionId, name, name]);
  return created.rows[0].id;
}

async function findOrCreateDistrict(cityId, districtName) {
  const name = nullable(districtName);
  if (!cityId || !name) return null;
  const existing = await query(`SELECT id FROM districts WHERE city_id=$1 AND (name_ar=$2 OR name_en=$2) ORDER BY created_at ASC LIMIT 1`, [cityId, name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await query(`INSERT INTO districts (city_id, name_ar, name_en, status) VALUES ($1,$2,$3,'active') RETURNING id`, [cityId, name, name]);
  return created.rows[0].id;
}

async function findServiceId(serviceName) {
  const name = nullable(serviceName);
  if (!name) return null;
  const existing = await query(`SELECT id FROM services WHERE name_ar=$1 OR name_en=$1 OR name=$1 ORDER BY created_at ASC LIMIT 1`, [name]);
  return existing.rows[0]?.id || null;
}

async function findOrCreateCustomer(payload) {
  const phone = normalizePhone(payload.phone);
  if (payload.customer_id) return payload.customer_id;
  if (!phone) return null;
  const existing = await query(`SELECT id FROM customers WHERE phone=$1 LIMIT 1`, [phone]);
  if (existing.rows[0]) {
    await query(`UPDATE customers SET name=COALESCE($1,name), region_id=COALESCE($2,region_id), city_id=COALESCE($3,city_id), district_id=COALESCE($4,district_id), updated_at=NOW() WHERE id=$5`, [nullable(payload.name), payload.region_id || null, payload.city_id || null, payload.district_id || null, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await query(`INSERT INTO customers (name, phone, region_id, city_id, district_id, status) VALUES ($1,$2,$3,$4,$5,'active') RETURNING id`, [nullable(payload.name) || 'عميلة بدون اسم', phone, payload.region_id || null, payload.city_id || null, payload.district_id || null]);
  return created.rows[0].id;
}

function selectNameExpression(alias, fallback = 'name') {
  return `COALESCE(${alias}.name_ar, ${alias}.${fallback})`;
}


function signAdminToken(user) {
  return jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    tenant_id: user.tenant_id || null,
    tenant_slug: user.tenant_slug || null,
    scope: 'admin'
  }, JWT_SECRET, { expiresIn: '8h', issuer: 'beauty-home-service', audience: 'beauty-admin', subject: user.id });
}

async function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Admin login required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'beauty-home-service', audience: 'beauty-admin' });
    if (payload.scope !== 'admin') return res.status(401).json({ error: 'Invalid admin token' });
    const active = await query(`SELECT u.id, u.email, u.role, u.name, u.tenant_id, t.slug AS tenant_slug, t.business_name AS tenant_name, t.status AS tenant_status
      FROM admin_users u
      LEFT JOIN tenants t ON t.id=u.tenant_id
      WHERE u.id=$1::uuid AND u.status='active'`, [payload.id]);
    if (!active.rows[0]) return res.status(401).json({ error: 'Admin account is inactive' });
    if (active.rows[0].role !== 'super_admin' && active.rows[0].tenant_status && active.rows[0].tenant_status !== 'active') return res.status(403).json({ error: 'Tenant account is inactive' });
    req.admin = active.rows[0];
    if (req.admin.role !== 'super_admin' && req.admin.tenant_id) req.tenant = { id: req.admin.tenant_id, slug: req.admin.tenant_slug, business_name: req.admin.tenant_name };
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

app.use(tenantAware);

app.post('/api/admin/login', async (req, res) => {
  try {
    const inputEmail = String(req.body?.email || '').trim().toLowerCase();
    const inputPassword = String(req.body?.password || '').trim();

    const adminEmail = String(process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD || '').trim();

    if (!inputEmail || !inputPassword) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Admin login is not configured' });
    }

    let user = null;

    if (adminEmail && adminPassword && inputEmail === adminEmail && inputPassword === adminPassword) {
      const existing = await query(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.tenant_id, t.slug AS tenant_slug FROM admin_users u LEFT JOIN tenants t ON t.id=u.tenant_id WHERE LOWER(u.email)=LOWER($1) LIMIT 1`,
        [adminEmail]
      );

      if (existing.rows[0]) {
        user = existing.rows[0];

        if (user.status !== 'active' || !['tenant_owner','admin','super_admin'].includes(user.role)) {
          await query(
            `UPDATE admin_users SET role=CASE WHEN role='super_admin' THEN role ELSE 'tenant_owner' END, status='active', tenant_id=COALESCE(tenant_id,$2::uuid), updated_at=NOW() WHERE id=$1::uuid`,
            [user.id, req.tenant?.id || null]
          );
          user.role = user.role === 'super_admin' ? 'super_admin' : 'tenant_owner';
          user.tenant_id = user.tenant_id || req.tenant?.id || null;
          user.status = 'active';
        }
      } else {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        const created = await query(
          `INSERT INTO admin_users (name, email, password_hash, role, status, tenant_id)
           VALUES ($1,$2,$3,'tenant_owner','active',$4)
           RETURNING id, name, email, role, status, tenant_id`,
          ['System Admin', adminEmail, passwordHash, req.tenant?.id || null]
        );
        user = created.rows[0];
      }
    }

    if (!user) {
      const dbUser = await query(
        `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, u.tenant_id, t.slug AS tenant_slug
         FROM admin_users u
         LEFT JOIN tenants t ON t.id=u.tenant_id
         WHERE LOWER(u.email)=LOWER($1) AND u.status='active'
         LIMIT 1`,
        [inputEmail]
      );

      const candidate = dbUser.rows[0];
      const passwordMatches = candidate?.password_hash
        ? await bcrypt.compare(inputPassword, candidate.password_hash).catch(() => false)
        : false;

      if (passwordMatches) user = candidate;
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid login details' });
    }

    const token = signAdminToken({
      id: user.id,
      email: String(user.email || inputEmail).trim().toLowerCase(),
      role: user.role || 'tenant_owner',
      name: user.name || 'Admin',
      tenant_id: user.tenant_id || req.tenant?.id || null,
      tenant_slug: user.tenant_slug || req.tenant?.slug || null
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name || 'Admin',
        email: String(user.email || inputEmail).trim().toLowerCase(),
        role: user.role || 'tenant_owner',
        tenant_id: user.tenant_id || req.tenant?.id || null,
        tenant_slug: user.tenant_slug || req.tenant?.slug || null
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to login',
      details: error.message
    });
  }
});

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ ok: true, app: 'واجهة برمجة بيوتي هوم سيرفس', version: 'v2.3' });
});


app.get(['/api/tenant', '/api/public/tenant'], async (req, res) => {
  try {
    if (!req.tenant || req.tenant.status !== 'active') return res.status(404).json({ error: 'الشركة غير متاحة حالياً' });
    res.json(publicTenantView(req.tenant));
  } catch (error) { res.status(500).json({ error: 'تعذر تحميل بيانات الشركة', details: error.message }); }
});

app.get('/api/public/tenants/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const result = await query(`SELECT id, business_name, slug, logo_url, cover_image_url, tagline_ar, description_ar, primary_color, secondary_color, accent_color, contact_phone, whatsapp_number, support_phone, support_email, contact_email, status, public_booking_enabled FROM tenants WHERE slug=$1 LIMIT 1`, [slug]);
    const tenant = result.rows[0];
    if (!tenant || tenant.status !== 'active') return res.status(404).json({ error: 'الشركة غير متاحة حالياً' });
    res.json(publicTenantView(tenant));
  } catch (error) { res.status(500).json({ error: 'تعذر تحميل بيانات الشركة', details: error.message }); }
});

app.get('/api/regions', async (req, res) => {
  const result = await query(`SELECT * FROM regions WHERE status='active' ORDER BY sort_order, name_ar`);
  res.json(result.rows);
});

app.get('/api/cities', async (req, res) => {
  try {
    const params = [];
    let where = `WHERE status='active'`;
    if (req.query.region_id) { assertUuid(req.query.region_id, 'region_id'); params.push(req.query.region_id); where += ` AND region_id=$1::uuid`; }
    const result = await query(`SELECT * FROM cities ${where} ORDER BY sort_order, name_ar`, params);
    res.json(result.rows);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to load cities' }); }
});

app.get('/api/districts', async (req, res) => {
  try {
    const params = [];
    let where = `WHERE d.status='active'`;
    if (req.query.city_id) { assertUuid(req.query.city_id, 'city_id'); params.push(req.query.city_id); where += ` AND d.city_id=$${params.length}::uuid`; }
    else if (req.query.region_id) { assertUuid(req.query.region_id, 'region_id'); params.push(req.query.region_id); where += ` AND c.region_id=$${params.length}::uuid`; }
    const result = await query(`SELECT d.* FROM districts d LEFT JOIN cities c ON c.id=d.city_id ${where} ORDER BY d.sort_order, d.name_ar`, params);
    res.json(result.rows);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to load districts' }); }
});

app.get('/api/districts/:cityId', async (req, res) => {
  const result = await query(`SELECT * FROM districts WHERE city_id=$1 AND status='active' ORDER BY sort_order, name_ar`, [req.params.cityId]);
  res.json(result.rows);
});


async function ensureDefaultServiceCategories() {
  const existingCategories = await query(`SELECT COUNT(*)::int AS count FROM service_categories`);
  if (Number(existingCategories.rows[0]?.count || 0) > 0) return;
  const cats = [
    ['الحناء', 'Henna', 'خدمات الحناء والنقوش'],
    ['المكياج', 'Makeup', 'خدمات مكياج منزلية'],
    ['الشعر', 'Hair', 'تصفيف وتسريحات الشعر'],
    ['العناية', 'Care', 'العناية بالبشرة واليدين والقدمين']
  ];
  for (let i = 0; i < cats.length; i++) {
    await query(`INSERT INTO service_categories (name_ar, name_en, description, sort_order, status) VALUES ($1,$2,$3,$4,'active')`, [...cats[i], i + 1]);
  }
  const hennaCategory = await query(`SELECT id FROM service_categories WHERE name_ar='الحناء' LIMIT 1`);
  if (hennaCategory.rows[0]) {
    await query(`UPDATE services SET category_id = COALESCE(category_id, $1) WHERE category_id IS NULL`, [hennaCategory.rows[0].id]);
  }
}

app.get('/api/service-categories', async (req, res) => {
  await ensureDefaultServiceCategories();
  const result = await query(`SELECT * FROM service_categories WHERE status='active' ORDER BY sort_order, name_ar`);
  res.json(result.rows);
});

app.get('/api/occasion-types', async (req, res) => {
  try {
    const result = await listOccasionTypes(false);
    res.json(result.rows);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to load occasion types', details: error.message }); }
});

app.get('/api/services', async (req, res) => {
  try {
    const params = [];
    let where = `WHERE s.status='active'`;
    if (req.query.category_id) { assertUuid(req.query.category_id, 'category_id'); params.push(req.query.category_id); where += ` AND s.category_id=$1::uuid`; }
    const result = await query(`
    SELECT s.*, COALESCE(s.name_ar, s.name) AS display_name, sc.name_ar AS category_name
    FROM services s
    LEFT JOIN service_categories sc ON sc.id=s.category_id
    ${where}
    ORDER BY sc.sort_order, s.sort_order, s.min_price NULLS LAST, COALESCE(s.name_ar, s.name)
    `, params);
    res.json(result.rows);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to load services' }); }
});

app.get('/api/customer/catalog', async (req, res) => {
  try {
    await ensureDefaultServiceCategories();
    const [regions, cities, districts, categories, services, occasionTypes] = await Promise.all([
      query(`SELECT * FROM regions WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT * FROM cities WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT * FROM districts WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT * FROM service_categories WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT s.*, COALESCE(s.name_ar, s.name) AS display_name, sc.name_ar AS category_name FROM services s LEFT JOIN service_categories sc ON sc.id=s.category_id WHERE s.status='active' ORDER BY sc.sort_order, s.sort_order, COALESCE(s.name_ar, s.name)`),
      listOccasionTypes(false)
    ]);
    res.json({ regions: regions.rows, cities: cities.rows, districts: districts.rows, service_categories: categories.rows, services: services.rows, occasion_types: occasionTypes.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer catalog', details: error.message });
  }
});

async function validateLocationRelationships(regionId, cityId, districtId) {
  assertUuid(regionId, 'region_id');
  assertUuid(cityId, 'city_id');
  assertUuid(districtId, 'district_id');
  const location = await query(`
    SELECT c.region_id, d.city_id FROM cities c
    JOIN districts d ON d.id=$2::uuid
    WHERE c.id=$1::uuid AND c.status='active' AND d.status='active'
  `, [cityId, districtId]);
  if (!location.rows[0]) throw new ApiValidationError('Selected city or district does not exist', { location: 'invalid' });
  if (String(location.rows[0].region_id) !== String(regionId)) throw new ApiValidationError('City does not belong to the selected region', { city_id: 'wrong_parent' });
  if (String(location.rows[0].city_id) !== String(cityId)) throw new ApiValidationError('District does not belong to the selected city', { district_id: 'wrong_parent' });
}

async function validateBookingRelationships({ regionId, cityId, districtId, serviceId, serviceCategoryId, preferredArtistId }) {
  await validateLocationRelationships(regionId, cityId, districtId);

  const service = await query(`SELECT category_id FROM services WHERE id=$1::uuid AND status='active'`, [serviceId]);
  if (!service.rows[0]) throw new ApiValidationError('Selected service does not exist', { service_id: 'invalid' });
  if (serviceCategoryId && String(service.rows[0].category_id) !== String(serviceCategoryId)) {
    throw new ApiValidationError('Service does not belong to the selected category', { service_id: 'wrong_parent' });
  }
  if (preferredArtistId) {
    const artist = await query(`SELECT 1 FROM artists WHERE id=$1::uuid AND status='active'`, [preferredArtistId]);
    if (!artist.rows[0]) throw new ApiValidationError('Preferred beautician is unavailable', { preferred_artist_id: 'invalid' });
  }
  return service.rows[0].category_id;
}

app.post('/api/bookings', async (req, res) => {
  try {
    const b = req.body || {};
    const shape = validateBookingShape(b);
    const regionId = b.region_id || await findOrCreateRegion(b.region);
    const cityId = b.city_id || await findOrCreateCity(b.city, regionId);
    const districtId = b.district_id || await findOrCreateDistrict(cityId, b.district);
    const serviceId = b.service_id || await findServiceId(b.service_type || b.service_name || b.service);
    const preferredArtistId = b.preferred_artist_id || b.beautician_id || null;
    const actualCategoryId = await validateBookingRelationships({ regionId, cityId, districtId, serviceId, serviceCategoryId: b.service_category_id || null, preferredArtistId });
    const serviceCategoryId = b.service_category_id || actualCategoryId;
    const bookingNumber = await generateBookingNumber();
    const bookingSource = nullable(b.booking_source || b.source || req.headers['x-booking-source']) || shape.source;
    if (!['web','mobile','admin','legacy'].includes(bookingSource)) throw new ApiValidationError('Invalid booking source', { booking_source: 'invalid' });
    const customerId = await findOrCreateCustomer({ ...b, region_id: regionId, city_id: cityId, district_id: districtId });

    if (!customerId) return res.status(400).json({ error: 'Customer is required. Send customer_id or phone.' });
    if (!regionId) return res.status(400).json({ error: 'Region is required. Send region_id or region.' });
    if (!cityId) return res.status(400).json({ error: 'City is required. Send city_id or city.' });
    if (!districtId) return res.status(400).json({ error: 'District is required. Send district_id or district.' });
    if (!serviceId) return res.status(400).json({ error: 'Service is required. Send service_id or service_type.' });
    if (!b.booking_date || !b.booking_time) return res.status(400).json({ error: 'booking_date and booking_time are required.' });

    const result = await query(`
      INSERT INTO bookings (
        customer_id, region_id, city_id, district_id, service_category_id, event_type, service_id,
        booking_date, booking_time, people_count, address, latitude, longitude, design_image_url,
        customer_notes, preferred_artist_id, contact_preference, alternate_time, booking_number, booking_source, status, payment_status, last_status_change_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'new','unpaid',NOW())
      RETURNING *
    `, [
      customerId, regionId, cityId, districtId, serviceCategoryId, nullable(b.event_type), serviceId,
      b.booking_date, b.booking_time, shape.peopleCount, nullable(b.address), b.latitude || null, b.longitude || null,
      b.design_image_url || null, nullable(b.customer_notes), preferredArtistId,
      nullable(b.contact_preference) || 'whatsapp', nullable(b.alternate_time), bookingNumber, bookingSource
    ]);

    await query(`INSERT INTO booking_status_history (booking_id, new_status, changed_by, note) VALUES ($1,'new','customer','تم إنشاء الطلب')`, [result.rows[0].id]);
    await logBookingEvent(result.rows[0].id, 'created', 'تم إنشاء الطلب', `تم إنشاء الطلب من ${bookingSource}`, bookingSource === 'admin' ? 'admin' : 'customer', null, { booking_number: bookingNumber, source: bookingSource });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (validationResponse(error, res)) return;
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});


function getPgDumpExecutable() {
  return process.env.PG_DUMP_PATH || (process.env.POSTGRES_BIN ? path.join(process.env.POSTGRES_BIN, process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump') : 'pg_dump');
}

function buildBackupFileName(source) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `beauty_${source}_backup_${timestamp}.sql`;
}

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function runPgDump(connectionString, source) {
  if (!connectionString) {
    const label = source === 'supabase' ? 'SUPABASE_DATABASE_URL' : 'LOCAL_DATABASE_URL أو DATABASE_URL';
    const error = new Error(`${label} غير موجود في ملف البيئة.`);
    error.statusCode = 400;
    throw error;
  }
  await ensureBackupDir();
  const fileName = buildBackupFileName(source);
  const filePath = path.join(BACKUP_DIR, fileName);
  const pgDump = getPgDumpExecutable();
  const args = ['--format=plain', '--no-owner', '--no-privileges', '--encoding=UTF8', '--file', filePath, connectionString];

  await new Promise((resolve, reject) => {
    const child = spawn(pgDump, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', error => {
      const message = error.code === 'ENOENT'
        ? `لم يتم العثور على pg_dump. أضف PG_DUMP_PATH في ملف .env مثل: C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe`
        : error.message;
      reject(new Error(message));
    });
    child.on('close', code => {
      if (code === 0) return resolve();
      reject(new Error(stderr.trim() || `pg_dump failed with exit code ${code}`));
    });
  });

  const stat = await fs.stat(filePath);
  return { fileName, filePath, size_bytes: stat.size, created_at: stat.mtime.toISOString() };
}

async function listBackupFiles() {
  await ensureBackupDir();
  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || !/^beauty_(local|supabase)_backup_.*\.sql$/i.test(entry.name)) continue;
    const filePath = path.join(BACKUP_DIR, entry.name);
    const stat = await fs.stat(filePath);
    files.push({
      file_name: entry.name,
      source: entry.name.startsWith('beauty_supabase_') ? 'supabase' : 'local',
      size_bytes: stat.size,
      created_at: stat.mtime.toISOString()
    });
  }
  return files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}


app.use('/api/super-admin', authenticateAdmin, requireSuperAdmin, (req, res, next) => runWithTenantContext({ role: 'super_admin' }, () => next()));


function tenantSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function writeAuditLog({ actor, tenantId = null, action, entityType, entityId = null, details = {} }) {
  try {
    if (!action || !entityType) return;
    await query(
      `INSERT INTO audit_logs (tenant_id, actor_admin_id, actor_email, actor_role, action, entity_type, entity_id, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [tenantId, actor?.id || null, actor?.email || null, actor?.role || null, action, entityType, entityId, JSON.stringify(details || {})]
    );
  } catch (error) {
    console.warn('audit_log_failed', error.message);
  }
}

const tenantReturnColumns = `t.*,
  (SELECT COUNT(*)::int FROM bookings b WHERE b.tenant_id=t.id) AS bookings_count,
  (SELECT COUNT(*)::int FROM artists a WHERE a.tenant_id=t.id) AS artists_count,
  (SELECT COUNT(*)::int FROM services s WHERE s.tenant_id=t.id) AS services_count,
  (SELECT COUNT(*)::int FROM admin_users u WHERE u.tenant_id=t.id AND u.status='active') AS admins_count,
  (SELECT u.email FROM admin_users u WHERE u.tenant_id=t.id AND u.role IN ('tenant_owner','admin') ORDER BY CASE WHEN u.role='tenant_owner' THEN 0 ELSE 1 END, u.created_at ASC LIMIT 1) AS owner_email,
  (SELECT u.name FROM admin_users u WHERE u.tenant_id=t.id AND u.role IN ('tenant_owner','admin') ORDER BY CASE WHEN u.role='tenant_owner' THEN 0 ELSE 1 END, u.created_at ASC LIMIT 1) AS owner_name`;

app.get('/api/super-admin/tenants', async (req, res) => {
  try {
    const result = await query(`SELECT ${tenantReturnColumns} FROM tenants t ORDER BY t.created_at DESC`);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'تعذر تحميل الشركات', details: error.message }); }
});

app.get('/api/super-admin/tenants/:id', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const tenantResult = await query(`SELECT ${tenantReturnColumns} FROM tenants t WHERE t.id=$1::uuid LIMIT 1`, [req.params.id]);
    if (!tenantResult.rows[0]) return res.status(404).json({ error: 'الشركة غير موجودة' });
    const admins = await query(`SELECT id, name, email, role, status, created_at, updated_at, last_login_at FROM admin_users WHERE tenant_id=$1::uuid ORDER BY created_at ASC`, [req.params.id]);
    res.json({ ...tenantResult.rows[0], admins: admins.rows });
  } catch (error) { res.status(500).json({ error: 'تعذر تحميل تفاصيل الشركة', details: error.message }); }
});

app.post('/api/super-admin/tenants', async (req, res) => {
  try {
    const b = req.body || {};
    const slug = tenantSlug(b.slug);
    const businessName = String(b.business_name || '').trim();
    if (!businessName || !slug) return res.status(400).json({ error: 'اسم الشركة والرابط المختصر مطلوبان' });

    const ownerEmail = String(b.owner_email || b.admin_email || '').trim().toLowerCase();
    const ownerPassword = String(b.owner_password || b.admin_password || '').trim();
    const ownerName = String(b.owner_name || b.admin_name || businessName).trim();
    if (!ownerEmail || !ownerPassword) return res.status(400).json({ error: 'يجب إدخال بريد وكلمة مرور مدير الشركة' });
    if (ownerPassword.length < 8) return res.status(400).json({ error: 'كلمة مرور مدير الشركة يجب أن تكون 8 أحرف على الأقل' });

    const created = await transaction(async (client) => {
      const tenantResult = await client.query(`INSERT INTO tenants (business_name, slug, contact_email, contact_phone, logo_url, cover_image_url, tagline_ar, description_ar, primary_color, secondary_color, accent_color, whatsapp_number, support_email, public_booking_enabled, subscription_plan, subscription_status, status, onboarding_status, onboarding_notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'#E6C7C2'),COALESCE($10,'#FFFDF8'),COALESCE($11,'#DCC5A3'),$12,$13,COALESCE($14,true),COALESCE($15,'starter'),COALESCE($16,'active'),COALESCE($17,'active'),COALESCE($18,'pending_setup'),$19)
        RETURNING *`,
        [businessName, slug, nullable(b.contact_email || ownerEmail), nullable(b.contact_phone), nullable(b.logo_url), nullable(b.cover_image_url), nullable(b.tagline_ar), nullable(b.description_ar), b.primary_color || '#E6C7C2', b.secondary_color || '#FFFDF8', b.accent_color || '#DCC5A3', nullable(b.whatsapp_number), nullable(b.support_email || b.contact_email || ownerEmail), b.public_booking_enabled !== false, b.subscription_plan || 'starter', b.subscription_status || 'active', b.status || 'active', b.onboarding_status || 'pending_setup', nullable(b.onboarding_notes)]);
      const tenant = tenantResult.rows[0];
      const existingAdmin = await client.query(`SELECT id FROM admin_users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [ownerEmail]);
      const passwordHash = await bcrypt.hash(ownerPassword, 12);
      let admin;
      if (existingAdmin.rows[0]) {
        const updatedAdmin = await client.query(
          `UPDATE admin_users SET name=$1, password_hash=$2, role='tenant_owner', status='active', tenant_id=$3::uuid, updated_at=NOW() WHERE id=$4::uuid RETURNING id, name, email, role, status, tenant_id`,
          [ownerName, passwordHash, tenant.id, existingAdmin.rows[0].id]
        );
        admin = updatedAdmin.rows[0];
      } else {
        const adminResult = await client.query(
          `INSERT INTO admin_users (name, email, password_hash, role, status, tenant_id) VALUES ($1,$2,$3,'tenant_owner','active',$4::uuid) RETURNING id, name, email, role, status, tenant_id`,
          [ownerName, ownerEmail, passwordHash, tenant.id]
        );
        admin = adminResult.rows[0];
      }
      return { tenant, admin };
    });

    await writeAuditLog({ actor: req.admin, tenantId: created.tenant.id, action: 'tenant_created', entityType: 'tenant', entityId: created.tenant.id, details: { business_name: businessName, slug, owner_email: ownerEmail, plan: b.subscription_plan || 'starter' } });
    res.status(201).json(created);
  } catch (error) {
    const msg = error.code === '23505' ? 'الرابط المختصر أو بريد المدير مستخدم مسبقاً' : 'تعذر إنشاء الشركة';
    res.status(500).json({ error: msg, details: error.message });
  }
});

app.patch('/api/super-admin/tenants/:id', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const fields = ['business_name','logo_url','cover_image_url','tagline_ar','tagline_en','description_ar','description_en','primary_color','secondary_color','accent_color','contact_phone','whatsapp_number','support_phone','support_email','contact_email','public_booking_enabled','subscription_plan','subscription_status','status','onboarding_status','onboarding_notes'];
    const columns = fields.filter(f => req.body?.[f] !== undefined);
    if (!columns.length) return res.status(400).json({ error: 'No fields sent' });
    const sets = columns.map((f,i) => `${f}=$${i+1}`).join(', ');
    const values = columns.map(f => req.body[f] === '' ? null : req.body[f]);
    values.push(req.params.id);
    const result = await query(`UPDATE tenants SET ${sets}, updated_at=NOW() WHERE id=$${values.length}::uuid RETURNING *`, values);
    if (!result.rows[0]) return res.status(404).json({ error: 'Tenant not found' });
    await writeAuditLog({ actor: req.admin, tenantId: req.params.id, action: 'tenant_updated', entityType: 'tenant', entityId: req.params.id, details: { fields: columns } });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update tenant', details: error.message }); }
});

app.post('/api/super-admin/tenants/:id/admin-users', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const b = req.body || {};
    const name = String(b.name || 'مدير الشركة').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '').trim();
    const role = ['tenant_owner','admin','booking_manager'].includes(b.role) ? b.role : 'tenant_owner';
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    if (password.length < 8) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    const tenant = await query(`SELECT id, business_name FROM tenants WHERE id=$1::uuid LIMIT 1`, [req.params.id]);
    if (!tenant.rows[0]) return res.status(404).json({ error: 'الشركة غير موجودة' });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO admin_users (name, email, password_hash, role, status, tenant_id) VALUES ($1,$2,$3,$4,'active',$5::uuid)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role, status='active', tenant_id=EXCLUDED.tenant_id, updated_at=NOW()
       RETURNING id, name, email, role, status, tenant_id`,
      [name, email, passwordHash, role, req.params.id]
    );
    await writeAuditLog({ actor: req.admin, tenantId: req.params.id, action: 'tenant_admin_saved', entityType: 'admin_user', entityId: result.rows[0].id, details: { email, role } });
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'تعذر إنشاء مدير الشركة', details: error.message }); }
});

app.patch('/api/super-admin/tenants/:id/admin-users/:userId', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    assertUuid(req.params.userId, 'userId');
    const fields = [];
    const values = [];
    const allowed = ['name','role','status'];
    for (const f of allowed) {
      if (req.body?.[f] !== undefined) { fields.push(`${f}=$${values.length+1}`); values.push(req.body[f]); }
    }
    if (req.body?.password) { fields.push(`password_hash=$${values.length+1}`); values.push(await bcrypt.hash(String(req.body.password), 12)); }
    if (!fields.length) return res.status(400).json({ error: 'لا توجد بيانات للتحديث' });
    values.push(req.params.id, req.params.userId);
    const result = await query(`UPDATE admin_users SET ${fields.join(', ')}, updated_at=NOW() WHERE tenant_id=$${values.length-1}::uuid AND id=$${values.length}::uuid RETURNING id, name, email, role, status, tenant_id`, values);
    if (!result.rows[0]) return res.status(404).json({ error: 'المستخدم غير موجود' });
    await writeAuditLog({ actor: req.admin, tenantId: req.params.id, action: 'tenant_admin_updated', entityType: 'admin_user', entityId: req.params.userId, details: { fields } });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'تعذر تحديث مدير الشركة', details: error.message }); }
});

app.get('/api/super-admin/audit-logs', async (req, res) => {
  try {
    const tenantId = req.query.tenant_id ? String(req.query.tenant_id) : null;
    const params = [];
    let where = '';
    if (tenantId) { assertUuid(tenantId, 'tenant_id'); params.push(tenantId); where = 'WHERE l.tenant_id=$1::uuid'; }
    const result = await query(`SELECT l.*, t.business_name AS tenant_name FROM audit_logs l LEFT JOIN tenants t ON t.id=l.tenant_id ${where} ORDER BY l.created_at DESC LIMIT 200`, params);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'تعذر تحميل سجل العمليات', details: error.message }); }
});

app.get('/api/super-admin/plans', async (req, res) => {
  try { const result = await query(`SELECT * FROM subscription_plans ORDER BY monthly_price, code`); res.json(result.rows); }
  catch (error) { res.status(500).json({ error: 'Failed to load plans', details: error.message }); }
});

app.get('/api/admin/tenant', authenticateAdmin, async (req, res) => {
  try {
    if (req.admin.role === 'super_admin' && req.query.tenant_id) {
      const result = await runWithTenantContext({ role: 'super_admin' }, () => query(`SELECT * FROM tenants WHERE id=$1::uuid LIMIT 1`, [req.query.tenant_id]));
      return res.json(result.rows[0] || null);
    }
    if (!req.admin.tenant_id) return res.status(400).json({ error: 'لا يوجد tenant مرتبط بحساب المدير' });
    const result = await runWithTenantContext({ role: 'super_admin' }, () => query(`SELECT * FROM tenants WHERE id=$1::uuid LIMIT 1`, [req.admin.tenant_id]));
    res.json(result.rows[0] || null);
  } catch (error) { res.status(500).json({ error: 'تعذر تحميل إعدادات الشركة', details: error.message }); }
});

app.patch('/api/admin/tenant', authenticateAdmin, async (req, res) => {
  try {
    if (!['tenant_owner','admin','super_admin'].includes(req.admin.role)) return res.status(403).json({ error: 'غير مصرح' });
    const tenantId = req.admin.role === 'super_admin' && req.body?.tenant_id ? req.body.tenant_id : req.admin.tenant_id;
    if (!tenantId) return res.status(400).json({ error: 'لا يوجد tenant لتعديله' });
    const fields = ['business_name','logo_url','cover_image_url','tagline_ar','description_ar','primary_color','secondary_color','accent_color','contact_phone','whatsapp_number','support_phone','support_email','public_booking_enabled'];
    const columns = fields.filter(f => req.body?.[f] !== undefined);
    if (!columns.length) return res.status(400).json({ error: 'لا توجد حقول للتحديث' });
    const sets = columns.map((f,i) => `${f}=$${i+1}`).join(', ');
    const values = columns.map(f => req.body[f] === '' ? null : req.body[f]);
    values.push(tenantId);
    const result = await runWithTenantContext({ role: 'super_admin' }, () => query(`UPDATE tenants SET ${sets}, updated_at=NOW() WHERE id=$${values.length}::uuid RETURNING *`, values));
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'تعذر تحديث إعدادات الشركة', details: error.message }); }
});

app.use('/api/admin', (req, res, next) => {
  if (req.path === '/login') return next();
  return authenticateAdmin(req, res, () => {
    const selectedTenantId = req.admin?.role === 'super_admin'
      ? (req.headers['x-tenant-id'] || req.query.tenant_id || req.tenant?.id || null)
      : (req.admin?.tenant_id || req.tenant?.id || null);
    return runWithTenantContext({ tenantId: selectedTenantId, tenantSlug: req.admin?.tenant_slug || req.tenant?.slug || DEFAULT_TENANT_SLUG, role: req.admin?.role || 'tenant_admin' }, () => next());
  });
});

app.get('/api/admin/backups', async (req, res) => {
  try {
    const files = await listBackupFiles();
    res.json({ ok: true, backup_dir: BACKUP_DIR, files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list backups', details: error.message });
  }
});

app.post('/api/admin/backups/local', async (req, res) => {
  try {
    const backup = await runPgDump(process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL, 'local');
    res.json({ ok: true, ...backup, download_url: `/api/admin/backups/download/${encodeURIComponent(backup.fileName)}` });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: 'Failed to create local backup', details: error.message });
  }
});

app.post('/api/admin/backups/supabase', async (req, res) => {
  try {
    const backup = await runPgDump(process.env.SUPABASE_DATABASE_URL, 'supabase');
    res.json({ ok: true, ...backup, download_url: `/api/admin/backups/download/${encodeURIComponent(backup.fileName)}` });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: 'Failed to create Supabase backup', details: error.message });
  }
});

app.get('/api/admin/backups/download/:fileName', async (req, res) => {
  try {
    const fileName = path.basename(req.params.fileName || '');
    if (!/^beauty_(local|supabase)_backup_.*\.sql$/i.test(fileName)) return res.status(400).json({ error: 'Invalid backup file name' });
    const filePath = path.join(BACKUP_DIR, fileName);
    await fs.access(filePath);
    res.download(filePath, fileName);
  } catch (error) {
    res.status(404).json({ error: 'Backup file not found', details: error.message });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const total = await query(`SELECT COUNT(*)::int AS count FROM bookings`);
    const newBookings = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE status='new'`);
    const completed = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE status='completed'`);
    const beauticians = await query(`SELECT COUNT(*)::int AS count FROM artists WHERE status='active'`);
    const unassigned = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE assigned_artist_id IS NULL AND status NOT IN ('completed','cancelled','unavailable')`);
    const unpaid = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE COALESCE(payment_status,'unpaid') <> 'paid' AND status NOT IN ('cancelled','unavailable')`);
    const today = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE booking_date = CURRENT_DATE AND status NOT IN ('cancelled','unavailable')`);
    res.json({ total_bookings: total.rows[0].count, new_bookings: newBookings.rows[0].count, completed_bookings: completed.rows[0].count, active_artists: beauticians.rows[0].count, active_beauticians: beauticians.rows[0].count, unassigned_bookings: unassigned.rows[0].count, unpaid_bookings: unpaid.rows[0].count, today_bookings: today.rows[0].count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard', details: error.message });
  }
});

async function bookingsQuery(where = '', params = [], options = {}) {
  const limit = Math.min(Math.max(parseInt(options.limit || 0, 10) || 0, 0), 300);
  const offset = Math.max(parseInt(options.offset || 0, 10) || 0, 0);
  const pageSql = limit ? ` LIMIT ${limit} OFFSET ${offset}` : '';
  return query(`
    SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
      r.name_ar AS region_name, city.name_ar AS city_name, d.name_ar AS district_name,
      sc.name_ar AS service_category_name, COALESCE(s.name_ar, s.name) AS service_name,
      a.name AS artist_name, a.phone AS artist_phone, pa.name AS preferred_artist_name, pa.phone AS preferred_artist_phone,
      CASE COALESCE(b.booking_source,'unknown') WHEN 'mobile' THEN 'الجوال' WHEN 'web' THEN 'الويب' WHEN 'admin' THEN 'الإدارة' WHEN 'legacy' THEN 'قديم' ELSE 'غير محدد' END AS booking_source_label,
      CASE COALESCE(b.status,'new') WHEN 'new' THEN 'طلب جديد' WHEN 'under_review' THEN 'قيد المراجعة' WHEN 'waiting_customer_confirmation' THEN 'بانتظار تأكيد العميلة' WHEN 'confirmed' THEN 'تم تأكيد الحجز' WHEN 'beautician_assigned' THEN 'تم تعيين خبيرة التجميل' WHEN 'artist_assigned' THEN 'تم تعيين خبيرة التجميل' WHEN 'in_progress' THEN 'قيد التنفيذ' WHEN 'completed' THEN 'مكتمل' WHEN 'cancelled' THEN 'ملغي' ELSE COALESCE(b.status,'-') END AS status_label,
      CASE COALESCE(b.payment_status,'unpaid') WHEN 'unpaid' THEN 'غير مدفوع' WHEN 'deposit_paid' THEN 'عربون مدفوع' WHEN 'paid' THEN 'مدفوع بالكامل' WHEN 'refunded' THEN 'مسترجع' ELSE COALESCE(b.payment_status,'غير مدفوع') END AS payment_status_label
    FROM bookings b
    LEFT JOIN customers c ON c.id=b.customer_id
    LEFT JOIN regions r ON r.id=b.region_id
    LEFT JOIN cities city ON city.id=b.city_id
    LEFT JOIN districts d ON d.id=b.district_id
    LEFT JOIN service_categories sc ON sc.id=b.service_category_id
    LEFT JOIN services s ON s.id=b.service_id
    LEFT JOIN artists a ON a.id=b.assigned_artist_id
    LEFT JOIN artists pa ON pa.id=b.preferred_artist_id
    ${where}
    ORDER BY b.created_at DESC${pageSql}
  `, params);
}

app.get('/api/admin/bookings', async (req, res) => {
  try {
    const result = await bookingsQuery('', [], { limit: req.query.limit, offset: req.query.offset });
    res.json(result.rows);
  }
  catch (error) { res.status(500).json({ error: 'Failed to load bookings', details: error.message }); }
});

app.get('/api/admin/bookings/:id', async (req, res) => {
  try {
    const booking = await bookingsQuery(`WHERE b.id=$1`, [req.params.id]);
    if (!booking.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const history = await query(`SELECT * FROM booking_status_history WHERE booking_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    const events = await query(`SELECT * FROM booking_events WHERE booking_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    res.json({ booking: booking.rows[0], history: history.rows, events: events.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load booking details', details: error.message });
  }
});

app.patch('/api/admin/bookings/:id/status', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const requestedStatus = normalizeBookingStatus(req.body.status || req.body.new_status);
    if (!requestedStatus) {
      return res.status(400).json({
        error: 'Invalid booking status',
        details: 'حالة الطلب غير صحيحة.',
        allowed_statuses: BOOKING_STATUS_VALUES
      });
    }

    const current = await query(`SELECT status FROM bookings WHERE id=$1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Booking not found' });

    const result = await query(`
      UPDATE bookings SET
        status=$1::varchar,
        admin_notes=COALESCE($2::text,admin_notes),
        last_status_change_at=NOW(),
        confirmed_at=CASE WHEN $1::text='confirmed' THEN COALESCE(confirmed_at,NOW()) ELSE confirmed_at END,
        completed_at=CASE WHEN $1::text='completed' THEN COALESCE(completed_at,NOW()) ELSE completed_at END,
        cancelled_at=CASE WHEN $1::text='cancelled' THEN COALESCE(cancelled_at,NOW()) ELSE cancelled_at END,
        updated_at=NOW()
      WHERE id=$3::uuid RETURNING *
    `, [requestedStatus, req.body.admin_notes || null, req.params.id]);

    if (current.rows[0].status !== requestedStatus) {
      await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,'admin',$4)`, [req.params.id, current.rows[0].status, requestedStatus, nullable(req.body.note)]);
      await logBookingEvent(req.params.id, 'status_changed', 'تم تغيير حالة الطلب', `${BOOKING_STATUS_LABELS[current.rows[0].status] || current.rows[0].status || '-'} → ${BOOKING_STATUS_LABELS[requestedStatus] || requestedStatus}`, 'admin', req.admin?.email || null);
    }

    res.json({ ok: true, booking: result.rows[0], status: requestedStatus, label: BOOKING_STATUS_LABELS[requestedStatus] });
  } catch (error) {
    if (validationResponse(error, res)) return;
    console.error('Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status', details: error.message });
  }
});

app.patch('/api/admin/bookings/:id/details', async (req, res) => {
  try {
    const b = req.body;
    const result = await query(`
      UPDATE bookings SET estimated_price=$1, final_price=$2, deposit_amount=$3, payment_status=$4, admin_notes=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [b.estimated_price || null, b.final_price || null, b.deposit_amount || null, b.payment_status || 'unpaid', nullable(b.admin_notes), req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$2,'admin','تم تحديث تفاصيل الطلب')`, [req.params.id, result.rows[0].status]);
    await logBookingEvent(req.params.id, 'details_updated', 'تم تحديث تفاصيل الطلب', 'تم تحديث السعر أو الملاحظات أو حالة الدفع من تفاصيل الطلب', 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update booking details', details: error.message }); }
});

app.patch('/api/admin/bookings/:id/payment', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const allowed = ['unpaid', 'deposit_paid', 'paid', 'refunded'];
    const paymentStatus = req.body.payment_status || 'unpaid';
    if (!allowed.includes(paymentStatus)) return res.status(400).json({ error: 'Invalid payment status' });
    const result = await query(`UPDATE bookings SET payment_status=$1::varchar, paid_at=CASE WHEN $1::text='paid' THEN COALESCE(paid_at,NOW()) ELSE paid_at END, updated_at=NOW() WHERE id=$2::uuid RETURNING *`, [paymentStatus, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$2,'admin',$3)`, [req.params.id, result.rows[0].status, `تم تحديث حالة الدفع إلى ${paymentStatus}`]);
    await logBookingEvent(req.params.id, 'payment_updated', 'تم تحديث حالة الدفع', `حالة الدفع: ${paymentStatus}`, 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to update payment status', details: error.message }); }
});


app.patch('/api/admin/bookings/:id/payment-details', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const allowed = ['unpaid', 'deposit_paid', 'paid', 'refunded'];
    const b = req.body || {};
    const current = await query(`SELECT * FROM bookings WHERE id=$1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const paymentStatus = b.payment_status || current.rows[0].payment_status || 'unpaid';
    if (!allowed.includes(paymentStatus)) return res.status(400).json({ error: 'Invalid payment status' });
    const result = await query(`
      UPDATE bookings SET
        payment_status=$1, payment_method=$2, payment_reference=$3, payment_proof_url=$4, payment_notes=$5,
        deposit_amount=COALESCE($6, deposit_amount), final_price=COALESCE($7, final_price),
        paid_at=CASE WHEN $1='paid' THEN COALESCE(paid_at,NOW()) ELSE paid_at END,
        updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [paymentStatus, nullable(b.payment_method), nullable(b.payment_reference), nullable(b.payment_proof_url), nullable(b.payment_notes), b.deposit_amount || null, b.final_price || null, req.params.id]);
    await query(`INSERT INTO payment_records (booking_id, payment_status, payment_method, amount, reference_no, proof_url, note, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [req.params.id, paymentStatus, nullable(b.payment_method), b.amount || b.deposit_amount || null, nullable(b.payment_reference), nullable(b.payment_proof_url), nullable(b.payment_notes), req.admin?.email || 'admin']);
    await logBookingEvent(req.params.id, 'payment_details_updated', 'تم تحديث تفاصيل الدفع', `حالة الدفع: ${paymentStatus}${b.payment_method ? ' / طريقة الدفع: '+b.payment_method : ''}`, 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update payment details', details: error.message }); }
});

app.get('/api/admin/payments', async (req, res) => {
  try {
    const result = await query(`
      SELECT pr.*, b.booking_number, c.name AS customer_name, c.phone AS customer_phone
      FROM payment_records pr
      LEFT JOIN bookings b ON b.id=pr.booking_id
      LEFT JOIN customers c ON c.id=b.customer_id
      ORDER BY pr.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load payment records', details: error.message }); }
});

app.delete('/api/admin/bookings/:id', async (req, res) => {
  try {
    await query(`DELETE FROM booking_status_history WHERE booking_id=$1`, [req.params.id]);
    await query(`DELETE FROM artist_reviews WHERE booking_id=$1`, [req.params.id]).catch(() => null);
    await query(`DELETE FROM bookings WHERE id=$1`, [req.params.id]);
    res.json({ ok: true, deleted_id: req.params.id });
  } catch (error) { res.status(500).json({ error: 'Failed to delete booking', details: error.message }); }
});

app.patch('/api/admin/bookings/:id/assign-artist', async (req, res) => {
  try {
    const { artist_id, force } = req.body;
    assertUuid(req.params.id, 'id');
    if (artist_id) assertUuid(artist_id, 'artist_id');
    const current = await query(`SELECT id, status, booking_date, booking_time, city_id, district_id, service_id FROM bookings WHERE id=$1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    if (artist_id && !force) {
      const smart = await getSuitableBeauticiansForBooking(req.params.id);
      const candidate = smart.suggestions.find(x => x.id === artist_id);
      if (!candidate || !candidate.is_suitable) {
        return res.status(409).json({ error: 'خبيرة التجميل غير مناسبة حسب التوفر أو التغطية.', warnings: candidate?.suitability_warnings || ['ليست ضمن قائمة المرشحات'] });
      }
    }
    const newStatus = artist_id ? 'beautician_assigned' : (normalizeBookingStatus(current.rows[0].status) || 'under_review');
    const result = await query(`UPDATE bookings SET assigned_artist_id=$1::uuid, status=$2::varchar, last_status_change_at=NOW(), updated_at=NOW() WHERE id=$3::uuid RETURNING *`, [artist_id || null, newStatus, req.params.id]);
    await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,'admin',$4)`, [req.params.id, current.rows[0].status, newStatus, artist_id ? 'تم تعيين خبيرة التجميل' : 'تم إلغاء تعيين خبيرة التجميل']);
    await logBookingEvent(req.params.id, 'beautician_assigned', artist_id ? 'تم تعيين خبيرة التجميل' : 'تم إلغاء تعيين الخبيرة', artist_id || '', 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to assign beautician', details: error.message }); }
});

app.get('/api/admin/bookings/:id/smart-beauticians', async (req, res) => {
  try {
    const result = await getSuitableBeauticiansForBooking(req.params.id);
    if (!result.booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(result);
  } catch (error) { res.status(500).json({ error: 'Failed to load smart beautician suggestions', details: error.message }); }
});

app.get('/api/admin/beauticians/:id/availability', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const result = await query(`SELECT a.id, a.name, a.availability_status, a.working_days, a.work_start_time, a.work_end_time, a.max_daily_bookings,
      ARRAY(SELECT region_id::text FROM beautician_coverage_regions WHERE beautician_id=a.id ORDER BY region_id) AS coverage_region_ids,
      ARRAY(SELECT city_id::text FROM beautician_coverage_cities WHERE beautician_id=a.id ORDER BY city_id) AS coverage_city_ids,
      ARRAY(SELECT district_id::text FROM beautician_coverage_districts WHERE beautician_id=a.id ORDER BY district_id) AS coverage_district_ids
      FROM artists a WHERE a.id=$1::uuid`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Beautician not found' });
    res.json(result.rows[0]);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to load availability', details: error.message }); }
});

async function validateCoverageSelection(regionIds, cityIds, districtIds) {
  if (regionIds.length) {
    const regions = await query(`SELECT COUNT(*)::int AS count FROM regions WHERE id=ANY($1::uuid[]) AND status='active'`, [regionIds]);
    if (regions.rows[0].count !== regionIds.length) throw new ApiValidationError('One or more coverage regions are invalid', { coverage_region_ids: 'invalid' });
  }
  if (cityIds.length) {
    const cities = await query(`SELECT id::text, region_id::text FROM cities WHERE id=ANY($1::uuid[]) AND status='active'`, [cityIds]);
    if (cities.rows.length !== cityIds.length) throw new ApiValidationError('One or more coverage cities are invalid', { coverage_city_ids: 'invalid' });
    if (regionIds.length && cities.rows.some(city => !regionIds.includes(city.region_id))) {
      throw new ApiValidationError('A coverage city is outside the selected regions', { coverage_city_ids: 'wrong_parent' });
    }
  }
  if (districtIds.length) {
    const districts = await query(`SELECT id::text, city_id::text FROM districts WHERE id=ANY($1::uuid[]) AND status='active'`, [districtIds]);
    if (districts.rows.length !== districtIds.length) throw new ApiValidationError('One or more coverage districts are invalid', { coverage_district_ids: 'invalid' });
    if (cityIds.length && districts.rows.some(district => !cityIds.includes(district.city_id))) {
      throw new ApiValidationError('A coverage district is outside the selected cities', { coverage_district_ids: 'wrong_parent' });
    }
    if (!cityIds.length && regionIds.length) {
      const valid = await query(`SELECT d.id::text FROM districts d JOIN cities c ON c.id=d.city_id WHERE d.id=ANY($1::uuid[]) AND c.region_id=ANY($2::uuid[])`, [districtIds, regionIds]);
      if (valid.rows.length !== districtIds.length) throw new ApiValidationError('A coverage district is outside the selected regions', { coverage_district_ids: 'wrong_parent' });
    }
  }
}

app.patch('/api/admin/beauticians/:id/availability', async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const b = req.body || {};
    const workingDays = JSON.stringify(parseJsonArray(b.working_days, [0,1,2,3,4,5]).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6));
    const coverageRegions = uniqueUuidArray(parseJsonArray(b.coverage_region_ids, []), 'coverage_region_ids');
    const coverageCities = uniqueUuidArray(parseJsonArray(b.coverage_city_ids, []), 'coverage_city_ids');
    const coverageDistricts = uniqueUuidArray(parseJsonArray(b.coverage_district_ids, []), 'coverage_district_ids');
    const availabilityStatus = b.availability_status || 'available';
    if (!['available','busy','inactive'].includes(availabilityStatus)) throw new ApiValidationError('Invalid availability status', { availability_status: 'invalid' });
    const maxDaily = Number(b.max_daily_bookings || 3);
    if (!Number.isInteger(maxDaily) || maxDaily < 1 || maxDaily > 20) throw new ApiValidationError('max_daily_bookings must be between 1 and 20', { max_daily_bookings: 'invalid' });
    await validateCoverageSelection(coverageRegions, coverageCities, coverageDistricts);
    const result = await transaction(async client => {
      const updated = await client.query(`UPDATE artists SET availability_status=$1::varchar, working_days=$2::jsonb,
        work_start_time=$3::time, work_end_time=$4::time, max_daily_bookings=$5::int,
        coverage_region_ids=$6::jsonb, coverage_city_ids=$7::jsonb, coverage_district_ids=$8::jsonb, updated_at=NOW()
        WHERE id=$9::uuid RETURNING *`, [availabilityStatus, workingDays, b.work_start_time || '10:00', b.work_end_time || '22:00', maxDaily, JSON.stringify(coverageRegions), JSON.stringify(coverageCities), JSON.stringify(coverageDistricts), req.params.id]);
      if (!updated.rows[0]) return updated;
      await client.query(`DELETE FROM beautician_coverage_regions WHERE beautician_id=$1::uuid`, [req.params.id]);
      await client.query(`DELETE FROM beautician_coverage_cities WHERE beautician_id=$1::uuid`, [req.params.id]);
      await client.query(`DELETE FROM beautician_coverage_districts WHERE beautician_id=$1::uuid`, [req.params.id]);
      if (coverageRegions.length) await client.query(`INSERT INTO beautician_coverage_regions (beautician_id,region_id) SELECT $1::uuid, unnest($2::uuid[])`, [req.params.id, coverageRegions]);
      if (coverageCities.length) await client.query(`INSERT INTO beautician_coverage_cities (beautician_id,city_id) SELECT $1::uuid, unnest($2::uuid[])`, [req.params.id, coverageCities]);
      if (coverageDistricts.length) await client.query(`INSERT INTO beautician_coverage_districts (beautician_id,district_id) SELECT $1::uuid, unnest($2::uuid[])`, [req.params.id, coverageDistricts]);
      return updated;
    });
    if (!result.rows[0]) return res.status(404).json({ error: 'Beautician not found' });
    res.json({ ...result.rows[0], coverage_region_ids: coverageRegions, coverage_city_ids: coverageCities, coverage_district_ids: coverageDistricts });
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to update availability', details: error.message }); }
});

function activeOrAll(req) { return req.query.all === '1' ? '' : `WHERE status='active'`; }

async function listRegions(all = false) {
  return query(`SELECT * FROM regions ${all ? '' : `WHERE status='active'`} ORDER BY sort_order, name_ar`);
}
async function listCities(all = false) {
  return query(`SELECT c.*, r.name_ar AS region_name FROM cities c LEFT JOIN regions r ON r.id=c.region_id ${all ? '' : `WHERE c.status='active'`} ORDER BY r.sort_order, c.sort_order, c.name_ar`);
}
async function listDistricts(all = false) {
  return query(`SELECT d.*, c.name_ar AS city_name, r.name_ar AS region_name FROM districts d LEFT JOIN cities c ON c.id=d.city_id LEFT JOIN regions r ON r.id=c.region_id ${all ? '' : `WHERE d.status='active'`} ORDER BY r.sort_order, c.sort_order, d.sort_order, d.name_ar`);
}
async function ensureDefaultOccasionTypes() {
  const existing = await query(`SELECT COUNT(*)::int AS count FROM occasion_types`);
  if (existing.rows[0]?.count > 0) return;
  const occasions = [
    ['زواج', 'Wedding', 'مناسبة زواج أو حفل رئيسي'],
    ['خطوبة', 'Engagement', 'مناسبة خطوبة'],
    ['ملكة', 'Katb Kitab', 'مناسبة ملكة أو عقد قران'],
    ['تخرج', 'Graduation', 'مناسبة تخرج'],
    ['عيد', 'Eid', 'مناسبة عيد'],
    ['جلسة تصوير', 'Photoshoot', 'جلسة تصوير خاصة'],
    ['زيارة منزلية', 'Home Visit', 'خدمة منزلية عامة'],
    ['مناسبة خاصة', 'Private Occasion', 'مناسبة خاصة أخرى'],
  ];
  for (let i = 0; i < occasions.length; i++) {
    await query(`INSERT INTO occasion_types (name_ar, name_en, description, sort_order, status) VALUES ($1,$2,$3,$4,'active')`, [...occasions[i], i + 1]);
  }
}
async function listOccasionTypes(all = false) {
  await ensureDefaultOccasionTypes();
  return query(`SELECT * FROM occasion_types ${all ? '' : `WHERE status='active'`} ORDER BY sort_order, name_ar`);
}

async function listServiceCategories(all = false) {
  await ensureDefaultServiceCategories();
  return query(`SELECT * FROM service_categories ${all ? '' : `WHERE status='active'`} ORDER BY sort_order, name_ar`);
}
async function listServices(all = false) {
  return query(`SELECT s.*, COALESCE(s.name_ar, s.name) AS display_name, sc.name_ar AS category_name FROM services s LEFT JOIN service_categories sc ON sc.id=s.category_id ${all ? '' : `WHERE s.status='active'`} ORDER BY sc.sort_order, s.sort_order, COALESCE(s.name_ar, s.name)`);
}

app.get('/api/admin/catalog', async (req, res) => {
  try {
    const all = req.query.all !== '0';
    const [regions, cities, districts, categories, services, occasionTypes] = await Promise.all([listRegions(all), listCities(all), listDistricts(all), listServiceCategories(all), listServices(all), listOccasionTypes(all)]);
    res.json({ regions: regions.rows, cities: cities.rows, districts: districts.rows, service_categories: categories.rows, services: services.rows, occasion_types: occasionTypes.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to load catalog', details: error.message }); }
});

function catalogRoutes(name, table, fields, listFn) {
  app.get(`/api/admin/${name}`, async (req, res) => {
    try { const result = await listFn(req.query.all === '1'); res.json(result.rows); }
    catch (error) { res.status(500).json({ error: `Failed to load ${name}`, details: error.message }); }
  });
  app.post(`/api/admin/${name}`, async (req, res) => {
    try {
      await validateCatalogPayload(table, req.body || {}, false);
      const columns = fields.filter(f => req.body[f] !== undefined);
      const values = columns.map(f => req.body[f]);
      if (!columns.length) return res.status(400).json({ error: 'No fields sent.' });
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
      const result = await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`, values);
      res.status(201).json(result.rows[0]);
    } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: `Failed to create ${name}`, details: error.message }); }
  });
  app.patch(`/api/admin/${name}/:id`, async (req, res) => {
    try {
      assertUuid(req.params.id, 'id');
      await validateCatalogPayload(table, req.body || {}, true);
      const columns = fields.filter(f => req.body[f] !== undefined);
      if (!columns.length) return res.status(400).json({ error: 'No fields sent.' });
      const sets = columns.map((f, i) => `${f}=$${i + 1}`).join(', ');
      const values = [...columns.map(f => req.body[f]), req.params.id];
      const result = await query(`UPDATE ${table} SET ${sets}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: `Failed to update ${name}`, details: error.message }); }
  });
  app.patch(`/api/admin/${name}/:id/status`, async (req, res) => {
    try {
      const result = await query(`UPDATE ${table} SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`, [req.body.status || 'active', req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: `Failed to update ${name} status`, details: error.message }); }
  });
  app.delete(`/api/admin/${name}/:id`, async (req, res) => {
    try {
      await query(`UPDATE bookings SET ${table === 'regions' ? 'region_id' : table === 'cities' ? 'city_id' : table === 'districts' ? 'district_id' : table === 'service_categories' ? 'service_category_id' : 'service_id'}=NULL WHERE ${table === 'regions' ? 'region_id' : table === 'cities' ? 'city_id' : table === 'districts' ? 'district_id' : table === 'service_categories' ? 'service_category_id' : 'service_id'}=$1`, [req.params.id]).catch(() => null);
      if (table === 'regions') await query(`UPDATE cities SET region_id=NULL WHERE region_id=$1`, [req.params.id]).catch(() => null);
      if (table === 'cities') await query(`UPDATE districts SET city_id=NULL WHERE city_id=$1`, [req.params.id]).catch(() => null);
      if (table === 'service_categories') await query(`UPDATE services SET category_id=NULL WHERE category_id=$1`, [req.params.id]).catch(() => null);
      await query(`DELETE FROM ${table} WHERE id=$1`, [req.params.id]);
      res.json({ ok: true, deleted_id: req.params.id });
    } catch (error) { res.status(500).json({ error: `Failed to delete ${name}`, details: error.message }); }
  });
}

async function validateCatalogPayload(table, body, partial) {
  if (body.status !== undefined && !['active','inactive'].includes(body.status)) throw new ApiValidationError('Invalid catalog status', { status: 'invalid' });
  if (body.sort_order !== undefined && (!Number.isInteger(Number(body.sort_order)) || Number(body.sort_order) < 0)) throw new ApiValidationError('sort_order must be a non-negative integer', { sort_order: 'invalid' });
  if (!partial && ['regions','cities','districts','service_categories','services','occasion_types'].includes(table) && !String(body.name_ar || '').trim()) {
    throw new ApiValidationError('Arabic name is required', { name_ar: 'required' });
  }
  if (table === 'cities' && (!partial || body.region_id !== undefined)) {
    assertUuid(body.region_id, 'region_id');
    const parent = await query(`SELECT 1 FROM regions WHERE id=$1::uuid AND status='active'`, [body.region_id]);
    if (!parent.rows[0]) throw new ApiValidationError('Selected region is invalid', { region_id: 'invalid' });
  }
  if (table === 'districts' && (!partial || body.city_id !== undefined)) {
    assertUuid(body.city_id, 'city_id');
    const parent = await query(`SELECT 1 FROM cities WHERE id=$1::uuid AND status='active'`, [body.city_id]);
    if (!parent.rows[0]) throw new ApiValidationError('Selected city is invalid', { city_id: 'invalid' });
  }
  if (table === 'services' && (!partial || body.category_id !== undefined)) {
    assertUuid(body.category_id, 'category_id');
    const parent = await query(`SELECT 1 FROM service_categories WHERE id=$1::uuid AND status='active'`, [body.category_id]);
    if (!parent.rows[0]) throw new ApiValidationError('Selected service category is invalid', { category_id: 'invalid' });
  }
  if (table === 'services') {
    for (const field of ['base_price','min_price','max_price']) {
      if (body[field] !== undefined && body[field] !== null && (Number.isNaN(Number(body[field])) || Number(body[field]) < 0)) throw new ApiValidationError(`${field} must be non-negative`, { [field]: 'invalid' });
    }
    if (body.min_price !== undefined && body.max_price !== undefined && Number(body.min_price) > Number(body.max_price)) throw new ApiValidationError('Minimum price cannot exceed maximum price', { max_price: 'less_than_minimum' });
    if (body.duration_minutes !== undefined && (!Number.isInteger(Number(body.duration_minutes)) || Number(body.duration_minutes) <= 0)) throw new ApiValidationError('duration_minutes must be positive', { duration_minutes: 'invalid' });
  }
}

catalogRoutes('regions', 'regions', ['external_id','name_ar','name_en','status','sort_order'], listRegions);
catalogRoutes('cities', 'cities', ['region_id','external_id','name_ar','name_en','status','sort_order'], listCities);
catalogRoutes('districts', 'districts', ['city_id','external_id','name_ar','name_en','status','sort_order'], listDistricts);
catalogRoutes('service-categories', 'service_categories', ['name_ar','name_en','description','status','sort_order'], listServiceCategories);
catalogRoutes('occasion-types', 'occasion_types', ['name_ar','name_en','description','status','sort_order'], listOccasionTypes);
catalogRoutes('services', 'services', ['category_id','name','name_ar','name_en','description','base_price','min_price','max_price','duration_minutes','status','sort_order'], listServices);



const OPEN_SAUDI_DATASET = {
  // Primary open dataset: CC0 public-domain data, easier for commercial/testing use.
  // Source: https://github.com/yasseralsamman/saudi-national-address
  regions: [
    'https://raw.githubusercontent.com/yasseralsamman/saudi-national-address/main/data/dist/regions.lite.json',
    'https://raw.githubusercontent.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts/master/json/regions_lite.json'
  ],
  cities: [
    'https://raw.githubusercontent.com/yasseralsamman/saudi-national-address/main/data/dist/cities.lite.json',
    'https://raw.githubusercontent.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts/master/json/cities_lite.json',
    'https://raw.githubusercontent.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts/master/json/cities.json'
  ],
  districts: [
    'https://raw.githubusercontent.com/yasseralsamman/saudi-national-address/main/data/dist/districts.lite.json',
    'https://raw.githubusercontent.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts/master/json/districts_lite.json',
    'https://raw.githubusercontent.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts/master/json/districts.json'
  ]
};

function pickValue(row, keys) {
  for (const key of keys) {
    if (!row) continue;
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = row;
      for (const part of parts) current = current?.[part];
      if (current !== undefined && current !== null && current !== '') return current;
    } else if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return null;
}

function normalizeOpenName(row, lang) {
  const arKeys = ['name_ar', 'arabic_name', 'NameAr', 'nameAr', 'name.ar', 'Name.Arabic', 'name'];
  const enKeys = ['name_en', 'english_name', 'NameEn', 'nameEn', 'name.en', 'Name.English'];
  const value = lang === 'ar' ? pickValue(row, arKeys) : pickValue(row, enKeys);
  if (value && typeof value === 'object') return normalizeText(value[lang] || value.ar || value.en || value.name || '');
  return normalizeText(value);
}

function normalizeOpenDataArray(payload, kind) {
  if (Array.isArray(payload)) return payload;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  if (payload?.items && Array.isArray(payload.items)) return payload.items;
  if (kind && payload?.[kind] && Array.isArray(payload[kind])) return payload[kind];
  if (payload?.regions && Array.isArray(payload.regions)) return payload.regions;
  if (payload?.cities && Array.isArray(payload.cities)) return payload.cities;
  if (payload?.districts && Array.isArray(payload.districts)) return payload.districts;
  return [];
}

async function fetchOpenSaudiDataset(kind) {
  const urls = OPEN_SAUDI_DATASET[kind];
  if (!urls) throw new Error(`Unknown Saudi dataset kind: ${kind}`);

  const errors = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { 'Accept': 'application/json,text/plain,*/*' } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const text = await response.text();
      const rows = normalizeOpenDataArray(JSON.parse(text), kind);
      if (rows.length > 0) return rows;
      errors.push(`${url} returned 0 rows`);
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }

  throw new Error(`Could not fetch Saudi open dataset ${kind}. ${errors.join(' | ')}`);
}

async function upsertOpenRegion(row, sortOrder = 0) {
  const externalId = String(pickValue(row, ['region_id', 'regionId', 'RegionId', 'id', 'Id', 'ID', 'external_id']) ?? '').trim();
  const nameAr = normalizeOpenName(row, 'ar');
  const nameEn = normalizeOpenName(row, 'en') || nameAr;
  if (!externalId || !nameAr) return null;

  const existing = await query(`SELECT id FROM regions WHERE external_id=$1 LIMIT 1`, [externalId]);
  if (existing.rows[0]) {
    await query(`UPDATE regions SET name_ar=$1, name_en=$2, status='active', sort_order=COALESCE(NULLIF(sort_order,0),$3), updated_at=NOW() WHERE id=$4`, [nameAr, nameEn, sortOrder, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await query(`INSERT INTO regions (external_id, name_ar, name_en, status, sort_order) VALUES ($1,$2,$3,'active',$4) RETURNING id`, [externalId, nameAr, nameEn, sortOrder]);
  return created.rows[0].id;
}

async function upsertOpenCity(row, regionMap, sortOrder = 0) {
  const externalId = String(pickValue(row, ['city_id', 'cityId', 'CityId', 'id', 'Id', 'ID', 'external_id']) ?? '').trim();
  const externalRegionId = String(pickValue(row, ['region_id', 'regionId', 'RegionId', 'region']) ?? '').trim();
  const regionId = regionMap.get(externalRegionId) || null;
  const nameAr = normalizeOpenName(row, 'ar');
  const nameEn = normalizeOpenName(row, 'en') || nameAr;
  if (!externalId || !nameAr) return null;

  const existing = await query(`SELECT id FROM cities WHERE external_id=$1 LIMIT 1`, [externalId]);
  if (existing.rows[0]) {
    await query(`UPDATE cities SET region_id=COALESCE($1, region_id), name_ar=$2, name_en=$3, status='active', sort_order=COALESCE(NULLIF(sort_order,0),$4), updated_at=NOW() WHERE id=$5`, [regionId, nameAr, nameEn, sortOrder, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await query(`INSERT INTO cities (region_id, external_id, name_ar, name_en, status, sort_order) VALUES ($1,$2,$3,$4,'active',$5) RETURNING id`, [regionId, externalId, nameAr, nameEn, sortOrder]);
  return created.rows[0].id;
}

async function upsertOpenDistrict(row, cityMap, sortOrder = 0) {
  const externalId = String(pickValue(row, ['district_id', 'districtId', 'DistrictId', 'id', 'Id', 'ID', 'external_id']) ?? '').trim();
  const externalCityId = String(pickValue(row, ['city_id', 'cityId', 'CityId', 'city']) ?? '').trim();
  const cityId = cityMap.get(externalCityId) || null;
  const nameAr = normalizeOpenName(row, 'ar');
  const nameEn = normalizeOpenName(row, 'en') || nameAr;
  if (!externalId || !nameAr) return null;

  const existing = await query(`SELECT id FROM districts WHERE external_id=$1 LIMIT 1`, [externalId]);
  if (existing.rows[0]) {
    await query(`UPDATE districts SET city_id=COALESCE($1, city_id), name_ar=$2, name_en=$3, status='active', sort_order=COALESCE(NULLIF(sort_order,0),$4), updated_at=NOW() WHERE id=$5`, [cityId, nameAr, nameEn, sortOrder, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await query(`INSERT INTO districts (city_id, external_id, name_ar, name_en, status, sort_order) VALUES ($1,$2,$3,$4,'active',$5) RETURNING id`, [cityId, externalId, nameAr, nameEn, sortOrder]);
  return created.rows[0].id;
}

async function importOpenSaudiLocations(mode = 'all') {
  const summary = { regions: 0, cities: 0, districts: 0, source: 'yasseralsamman/saudi-national-address with homaily fallback' };
  const regionMap = new Map();
  const cityMap = new Map();

  if (['regions', 'cities', 'districts', 'all'].includes(mode)) {
    const regions = await fetchOpenSaudiDataset('regions');
    for (let i = 0; i < regions.length; i++) {
      const id = await upsertOpenRegion(regions[i], i + 1);
      const externalId = String(pickValue(regions[i], ['region_id', 'regionId', 'RegionId', 'id', 'Id', 'ID', 'external_id']) ?? '').trim();
      if (id && externalId) regionMap.set(externalId, id);
      if (id) summary.regions++;
    }
  }

  if (['cities', 'districts', 'all'].includes(mode)) {
    if (regionMap.size === 0) {
      const currentRegions = await query(`SELECT id, external_id FROM regions WHERE external_id IS NOT NULL`);
      for (const r of currentRegions.rows) regionMap.set(String(r.external_id), r.id);
    }
    const cities = await fetchOpenSaudiDataset('cities');
    for (let i = 0; i < cities.length; i++) {
      const id = await upsertOpenCity(cities[i], regionMap, i + 1);
      const externalId = String(pickValue(cities[i], ['city_id', 'cityId', 'CityId', 'id', 'Id', 'ID', 'external_id']) ?? '').trim();
      if (id && externalId) cityMap.set(externalId, id);
      if (id) summary.cities++;
    }
  }

  if (['districts', 'all'].includes(mode)) {
    if (cityMap.size === 0) {
      const currentCities = await query(`SELECT id, external_id FROM cities WHERE external_id IS NOT NULL`);
      for (const c of currentCities.rows) cityMap.set(String(c.external_id), c.id);
    }
    const districts = await fetchOpenSaudiDataset('districts');
    for (let i = 0; i < districts.length; i++) {
      const id = await upsertOpenDistrict(districts[i], cityMap, i + 1);
      if (id) summary.districts++;
    }
  }

  return summary;
}

async function fetchSplLookup(kind, params, apiKey) {
  const base = `https://apina.address.gov.sa/NationalAddress/v3.1/lookup/${kind}`;
  const search = new URLSearchParams({ language: 'A', format: 'JSON', encode: 'utf8', api_key: apiKey, ...params });
  const response = await fetch(`${base}?${search.toString()}`);
  if (!response.ok) throw new Error(`SPL API ${kind} failed: ${response.status}`);
  return response.json();
}


app.post('/api/admin/import/saudi-open-data', async (req, res) => {
  try {
    const mode = req.body.mode || 'all';
    const summary = await importOpenSaudiLocations(mode);
    res.json({ ok: true, mode, summary });
  } catch (error) {
    console.error('Saudi open data import error:', error);
    res.status(500).json({ error: 'Failed to import Saudi open location dataset', details: error.message });
  }
});

app.post('/api/admin/import/spl', async (req, res) => {
  try {
    const apiKey = req.body.api_key || process.env.SPL_API_KEY;
    const mode = req.body.mode || 'regions';
    if (!apiKey) return res.status(400).json({ error: 'SPL api_key is required. Send api_key or set SPL_API_KEY.' });
    const summary = { regions: 0, cities: 0, districts: 0 };

    if (['regions', 'all'].includes(mode)) {
      const data = await fetchSplLookup('regions', {}, apiKey);
      const regions = data.Regions || data.regions || [];
      for (const r of regions) {
        await query(`INSERT INTO regions (external_id, name_ar, name_en, status) VALUES ($1,$2,$3,'active') ON CONFLICT (external_id) DO UPDATE SET name_ar=EXCLUDED.name_ar, updated_at=NOW()`, [String(r.Id || r.ID || r.id), r.Name || r.name, r.Name || r.name]);
        summary.regions++;
      }
    }

    if (['cities', 'all'].includes(mode)) {
      const regionRows = req.body.region_id
        ? (await query(`SELECT * FROM regions WHERE id=$1`, [req.body.region_id])).rows
        : (await query(`SELECT * FROM regions WHERE external_id IS NOT NULL ORDER BY sort_order, name_ar`)).rows;
      for (const region of regionRows) {
        if (!region.external_id) continue;
        const data = await fetchSplLookup('cities', { regionid: String(region.external_id) }, apiKey);
        const cities = data.Cities || data.cities || [];
        for (const c of cities) {
          await query(`INSERT INTO cities (region_id, external_id, name_ar, name_en, status) VALUES ($1,$2,$3,$4,'active') ON CONFLICT DO NOTHING`, [region.id, String(c.Id || c.ID || c.id), c.Name || c.name, c.Name || c.name]);
          await query(`UPDATE cities SET region_id=$1, name_ar=$3, updated_at=NOW() WHERE external_id=$2`, [region.id, String(c.Id || c.ID || c.id), c.Name || c.name]);
          summary.cities++;
        }
      }
    }

    if (['districts'].includes(mode)) {
      const cityId = req.body.city_id;
      if (!cityId) return res.status(400).json({ error: 'city_id is required for districts import.' });
      const city = await query(`SELECT * FROM cities WHERE id=$1`, [cityId]);
      if (!city.rows[0]?.external_id) return res.status(400).json({ error: 'Selected city does not have SPL external_id.' });
      const data = await fetchSplLookup('districts', { cityid: String(city.rows[0].external_id) }, apiKey);
      const districts = data.Districts || data.districts || [];
      for (const d of districts) {
        await query(`INSERT INTO districts (city_id, external_id, name_ar, name_en, status) VALUES ($1,$2,$3,$4,'active') ON CONFLICT DO NOTHING`, [cityId, String(d.Id || d.ID || d.id), d.Name || d.name, d.Name || d.name]);
        await query(`UPDATE districts SET city_id=$1, name_ar=$3, updated_at=NOW() WHERE external_id=$2`, [cityId, String(d.Id || d.ID || d.id), d.Name || d.name]);
        summary.districts++;
      }
    }

    res.json({ ok: true, mode, summary });
  } catch (error) {
    console.error('SPL import error:', error);
    res.status(500).json({ error: 'Failed to import from SPL National Address API', details: error.message });
  }
});

async function listBeauticians() {
  return query(`
    SELECT a.*, r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(mc.name_ar, ms.name_ar, ms.name) AS main_expertise_name,
      ARRAY(SELECT region_id::text FROM beautician_coverage_regions WHERE beautician_id=a.id) AS coverage_region_ids,
      ARRAY(SELECT city_id::text FROM beautician_coverage_cities WHERE beautician_id=a.id) AS coverage_city_ids,
      ARRAY(SELECT district_id::text FROM beautician_coverage_districts WHERE beautician_id=a.id) AS coverage_district_ids,
      COUNT(DISTINCT b.id)::int AS total_bookings,
      COUNT(DISTINCT CASE WHEN b.status='completed' THEN b.id END)::int AS completed_bookings,
      ROUND(AVG(rv.overall_rating)::numeric,1) AS review_rating,
      COUNT(DISTINCT rv.id)::int AS review_count,
      COUNT(DISTINCT av.id)::int AS availability_slots
    FROM artists a
    LEFT JOIN regions r ON r.id=a.region_id
    LEFT JOIN cities c ON c.id=a.city_id
    LEFT JOIN service_categories mc ON mc.id=a.main_expertise_category_id
    LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
    LEFT JOIN bookings b ON b.assigned_artist_id=a.id
    LEFT JOIN artist_reviews rv ON rv.artist_id=a.id
    LEFT JOIN artist_availability av ON av.artist_id=a.id AND av.available_date >= CURRENT_DATE
    GROUP BY a.id, r.name_ar, c.name_ar, mc.name_ar, ms.name_ar, ms.name
    ORDER BY a.created_at DESC
  `);
}

app.get(['/api/admin/artists','/api/admin/beauticians'], async (req, res) => {
  try { const result = await listBeauticians(); res.json(result.rows); }
  catch (error) { res.status(500).json({ error: 'Failed to load beauticians', details: error.message }); }
});

async function validateBeauticianPayload(a, { partial = false } = {}) {
  if (!partial || a.phone !== undefined) validatePhone(a.phone);
  for (const field of ['region_id','city_id','main_expertise_category_id']) if (a[field]) assertUuid(a[field], field);
  const serviceIds = uniqueUuidArray(a.service_ids || [], 'service_ids');
  if (a.status && !['active','inactive'].includes(a.status)) throw new ApiValidationError('Invalid beautician status', { status: 'invalid' });
  if (a.rating !== undefined && (Number(a.rating) < 0 || Number(a.rating) > 5)) throw new ApiValidationError('Rating must be between 0 and 5', { rating: 'invalid' });
  if (a.city_id) {
    const city = await query(`SELECT region_id::text FROM cities WHERE id=$1::uuid AND status='active'`, [a.city_id]);
    if (!city.rows[0]) throw new ApiValidationError('Selected city is invalid', { city_id: 'invalid' });
    if (a.region_id && city.rows[0].region_id !== String(a.region_id)) throw new ApiValidationError('City does not belong to the selected region', { city_id: 'wrong_parent' });
  }
  if (a.main_expertise_category_id) {
    const category = await query(`SELECT 1 FROM service_categories WHERE id=$1::uuid AND status='active'`, [a.main_expertise_category_id]);
    if (!category.rows[0]) throw new ApiValidationError('Main expertise category is invalid', { main_expertise_category_id: 'invalid' });
  }
  if (serviceIds.length) {
    const services = await query(`SELECT COUNT(*)::int AS count FROM services WHERE id=ANY($1::uuid[]) AND status='active'`, [serviceIds]);
    if (services.rows[0].count !== serviceIds.length) throw new ApiValidationError('One or more supported services are invalid', { service_ids: 'invalid' });
  }
  return serviceIds;
}

app.post(['/api/admin/artists','/api/admin/beauticians'], async (req, res) => {
  try {
    const a = req.body || {};
    if (!a.name || !a.phone) return res.status(400).json({ error: 'Beautician name and phone are required.' });
    const serviceIds = await validateBeauticianPayload(a);
    const result = await query(`
      INSERT INTO artists (name, phone, region_id, city_id, districts, skills, bio, rating, status, main_expertise_category_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [nullable(a.name), normalizePhone(a.phone), a.region_id || null, a.city_id || null, nullable(a.districts), nullable(a.skills), nullable(a.bio), a.rating || 5, a.status || 'active', a.main_expertise_category_id || null]);
    if (Array.isArray(a.service_ids)) {
      for (const serviceId of serviceIds) {
        await query(`INSERT INTO beautician_services (beautician_id, service_id, is_primary) VALUES ($1,$2,$3) ON CONFLICT (beautician_id, service_id) DO UPDATE SET is_primary=EXCLUDED.is_primary`, [result.rows[0].id, serviceId, false]);
      }
    }
    res.status(201).json(result.rows[0]);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to create beautician', details: error.message }); }
});

app.patch(['/api/admin/artists/:id','/api/admin/beauticians/:id'], async (req, res) => {
  try {
    assertUuid(req.params.id, 'id');
    const serviceIds = await validateBeauticianPayload(req.body || {}, { partial: true });
    const allowed = ['name','phone','region_id','city_id','districts','skills','bio','rating','status','main_expertise_category_id'];
    const columns = allowed.filter(f => req.body[f] !== undefined);
    if (!columns.length && !Array.isArray(req.body.service_ids)) return res.status(400).json({ error: 'No fields sent.' });
    let updated = null;
    if (columns.length) {
      const sets = columns.map((f, i) => `${f}=$${i + 1}`).join(', ');
      const values = columns.map(f => f === 'phone' ? normalizePhone(req.body[f]) : req.body[f]);
      const result = await query(`UPDATE artists SET ${sets}, updated_at=NOW() WHERE id=$${values.length + 1} RETURNING *`, [...values, req.params.id]);
      updated = result.rows[0];
    }
    if (Array.isArray(req.body.service_ids)) {
      await query(`DELETE FROM beautician_services WHERE beautician_id=$1`, [req.params.id]);
      for (const serviceId of serviceIds) {
        await query(`INSERT INTO beautician_services (beautician_id, service_id, is_primary) VALUES ($1,$2,$3)`, [req.params.id, serviceId, false]);
      }
    }
    res.json(updated || { ok: true });
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to update beautician', details: error.message }); }
});

app.delete(['/api/admin/artists/:id','/api/admin/beauticians/:id'], async (req, res) => {
  try {
    await query(`UPDATE bookings SET assigned_artist_id=NULL WHERE assigned_artist_id=$1`, [req.params.id]);
    await query(`DELETE FROM beautician_services WHERE beautician_id=$1`, [req.params.id]);
    await query(`DELETE FROM artists WHERE id=$1`, [req.params.id]);
    res.json({ ok: true, deleted_id: req.params.id });
  } catch (error) { res.status(500).json({ error: 'Failed to delete beautician', details: error.message }); }
});


app.get('/api/beauticians', async (req, res) => {
  try {
    const params = [];
    const where = [`COALESCE(a.status,'active') IN ('active','available')`, `COALESCE(a.availability_status,'available')='available'`];
    if (req.query.region_id) {
      assertUuid(req.query.region_id, 'region_id');
      params.push(req.query.region_id);
      where.push(`(a.region_id=$${params.length}::uuid OR NOT EXISTS (SELECT 1 FROM beautician_coverage_regions x WHERE x.beautician_id=a.id) OR EXISTS (SELECT 1 FROM beautician_coverage_regions x WHERE x.beautician_id=a.id AND x.region_id=$${params.length}::uuid))`);
    }
    if (req.query.city_id) {
      assertUuid(req.query.city_id, 'city_id');
      params.push(req.query.city_id);
      where.push(`(a.city_id=$${params.length}::uuid OR NOT EXISTS (SELECT 1 FROM beautician_coverage_cities x WHERE x.beautician_id=a.id) OR EXISTS (SELECT 1 FROM beautician_coverage_cities x WHERE x.beautician_id=a.id AND x.city_id=$${params.length}::uuid))`);
    }
    if (req.query.district_id) {
      assertUuid(req.query.district_id, 'district_id');
      params.push(req.query.district_id);
      where.push(`(NOT EXISTS (SELECT 1 FROM beautician_coverage_districts x WHERE x.beautician_id=a.id) OR EXISTS (SELECT 1 FROM beautician_coverage_districts x WHERE x.beautician_id=a.id AND x.district_id=$${params.length}::uuid))`);
    }
    if (req.query.service_id) {
      assertUuid(req.query.service_id, 'service_id');
      params.push(req.query.service_id);
      where.push(`(a.main_expertise_service_id=$${params.length}::uuid OR a.main_expertise_category_id=(SELECT category_id FROM services WHERE id=$${params.length}::uuid) OR EXISTS (SELECT 1 FROM beautician_services bs WHERE bs.beautician_id=a.id AND bs.service_id=$${params.length}::uuid))`);
    } else if (req.query.category_id) {
      assertUuid(req.query.category_id, 'category_id');
      params.push(req.query.category_id);
      where.push(`(a.main_expertise_category_id=$${params.length}::uuid OR a.main_expertise_category_id IS NULL)`);
    }
    const result = await query(`
      SELECT a.id, a.name, a.phone, a.bio, a.skills, a.rating, a.status, a.availability_status, a.region_id, a.city_id, a.main_expertise_category_id, a.main_expertise_service_id,
        r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(mc.name_ar, ms.name_ar, ms.name) AS main_expertise_name,
        COALESCE(ROUND(AVG(br.rating)::numeric,1), ROUND(AVG(ar.overall_rating)::numeric,1), a.rating) AS review_rating,
        (COUNT(DISTINCT br.id) + COUNT(DISTINCT ar.id))::int AS review_count,
        COUNT(DISTINCT p.id)::int AS portfolio_count,
        MIN(CASE WHEN p.is_featured THEN p.image_url ELSE NULL END) AS featured_image_url,
        MIN(p.image_url) AS first_image_url
      FROM artists a
      LEFT JOIN regions r ON r.id=a.region_id
      LEFT JOIN cities c ON c.id=a.city_id
      LEFT JOIN service_categories mc ON mc.id=a.main_expertise_category_id
    LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
      LEFT JOIN beautician_portfolio p ON p.beautician_id=a.id AND p.status='published'
      LEFT JOIN beautician_reviews br ON br.beautician_id=a.id AND br.status='published'
      LEFT JOIN artist_reviews ar ON ar.artist_id=a.id
      WHERE ${where.join(' AND ')}
      GROUP BY a.id, r.name_ar, c.name_ar, mc.name_ar, ms.name_ar, ms.name
      ORDER BY review_rating DESC NULLS LAST, portfolio_count DESC, a.name
    `, params);
    res.json(result.rows);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to load beauticians', details: error.message }); }
});

app.get('/api/beauticians/:id', async (req, res) => {
  try {
    const info = await query(`
      SELECT a.*, r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(mc.name_ar, ms.name_ar, ms.name) AS main_expertise_name,
        COALESCE(ROUND(AVG(br.rating)::numeric,1), ROUND(AVG(ar.overall_rating)::numeric,1), a.rating) AS review_rating,
        (COUNT(DISTINCT br.id) + COUNT(DISTINCT ar.id))::int AS review_count
      FROM artists a
      LEFT JOIN regions r ON r.id=a.region_id
      LEFT JOIN cities c ON c.id=a.city_id
      LEFT JOIN service_categories mc ON mc.id=a.main_expertise_category_id
    LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
      LEFT JOIN beautician_reviews br ON br.beautician_id=a.id AND br.status='published'
      LEFT JOIN artist_reviews ar ON ar.artist_id=a.id
      WHERE a.id=$1
      GROUP BY a.id, r.name_ar, c.name_ar, mc.name_ar, ms.name_ar, ms.name
    `, [req.params.id]);
    if (!info.rows[0]) return res.status(404).json({ error: 'Beautician not found' });
    const portfolio = await query(`SELECT p.*, COALESCE(s.name_ar, s.name) AS service_name, sc.name_ar AS category_name FROM beautician_portfolio p LEFT JOIN services s ON s.id=p.service_id LEFT JOIN service_categories sc ON sc.id=p.service_category_id WHERE p.beautician_id=$1 AND p.status='published' ORDER BY p.is_featured DESC, p.sort_order, p.created_at DESC`, [req.params.id]);
    const reviews = await query(`SELECT * FROM beautician_reviews WHERE beautician_id=$1 AND status='published' ORDER BY created_at DESC LIMIT 20`, [req.params.id]);
    res.json({ beautician: info.rows[0], portfolio: portfolio.rows, reviews: reviews.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to load beautician details', details: error.message }); }
});

app.get('/api/portfolio', async (req, res) => {
  try {
    const params = [];
    const where = [`p.status='published'`];
    if (req.query.beautician_id) { params.push(req.query.beautician_id); where.push(`p.beautician_id=$${params.length}`); }
    if (req.query.service_id) { params.push(req.query.service_id); where.push(`p.service_id=$${params.length}`); }
    if (req.query.category_id) { params.push(req.query.category_id); where.push(`p.service_category_id=$${params.length}`); }
    const result = await query(`
      SELECT p.*, a.name AS beautician_name, COALESCE(s.name_ar, s.name) AS service_name, sc.name_ar AS category_name
      FROM beautician_portfolio p
      LEFT JOIN artists a ON a.id=p.beautician_id
      LEFT JOIN services s ON s.id=p.service_id
      LEFT JOIN service_categories sc ON sc.id=p.service_category_id
      WHERE ${where.join(' AND ')}
      ORDER BY p.is_featured DESC, p.sort_order, p.created_at DESC
      LIMIT 100
    `, params);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load portfolio', details: error.message }); }
});

app.get('/api/admin/beautician-portfolio', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, a.name AS beautician_name, COALESCE(s.name_ar, s.name) AS service_name, sc.name_ar AS category_name
      FROM beautician_portfolio p
      LEFT JOIN artists a ON a.id=p.beautician_id
      LEFT JOIN services s ON s.id=p.service_id
      LEFT JOIN service_categories sc ON sc.id=p.service_category_id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load portfolio', details: error.message }); }
});

app.post('/api/admin/beautician-portfolio', async (req, res) => {
  try {
    const p = req.body;
    if (!p.beautician_id || !p.title_ar || !p.image_url) return res.status(400).json({ error: 'beautician_id, title_ar and image_url are required' });
    const result = await query(`
      INSERT INTO beautician_portfolio (beautician_id, service_category_id, service_id, title_ar, title_en, description, image_url, is_featured, status, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [p.beautician_id, p.service_category_id || null, p.service_id || null, nullable(p.title_ar), nullable(p.title_en), nullable(p.description), p.image_url, !!p.is_featured, p.status || 'published', p.sort_order || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to create portfolio item', details: error.message }); }
});

app.patch('/api/admin/beautician-portfolio/:id', async (req, res) => {
  try {
    const allowed = ['beautician_id','service_category_id','service_id','title_ar','title_en','description','image_url','is_featured','status','sort_order'];
    const columns = allowed.filter(f => req.body[f] !== undefined);
    if (!columns.length) return res.status(400).json({ error: 'No fields sent' });
    const sets = columns.map((f, i) => `${f}=$${i + 1}`).join(', ');
    const values = columns.map(f => req.body[f] === '' ? null : req.body[f]);
    const result = await query(`UPDATE beautician_portfolio SET ${sets}, updated_at=NOW() WHERE id=$${values.length + 1} RETURNING *`, [...values, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Portfolio item not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update portfolio item', details: error.message }); }
});

app.delete('/api/admin/beautician-portfolio/:id', async (req, res) => {
  try { await query(`DELETE FROM beautician_portfolio WHERE id=$1`, [req.params.id]); res.json({ ok: true, deleted_id: req.params.id }); }
  catch (error) { res.status(500).json({ error: 'Failed to delete portfolio item', details: error.message }); }
});

app.get('/api/admin/beautician-reviews', async (req, res) => {
  try {
    const result = await query(`
      SELECT br.*, a.name AS beautician_name, c.name AS customer_name, c.phone AS customer_phone
      FROM beautician_reviews br
      LEFT JOIN artists a ON a.id=br.beautician_id
      LEFT JOIN customers c ON c.id=br.customer_id
      ORDER BY br.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load reviews', details: error.message }); }
});

app.post('/api/customer/reviews', async (req, res) => {
  try {
    const r = req.body;
    if (!r.booking_id || !r.rating) return res.status(400).json({ error: 'booking_id and rating are required' });
    const booking = await query(`SELECT id, customer_id, assigned_artist_id, preferred_artist_id FROM bookings WHERE id=$1`, [r.booking_id]);
    if (!booking.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const beauticianId = booking.rows[0].assigned_artist_id || booking.rows[0].preferred_artist_id;
    const result = await query(`
      INSERT INTO beautician_reviews (booking_id, beautician_id, customer_id, rating, review_text, status)
      VALUES ($1,$2,$3,$4,$5,'published')
      ON CONFLICT (booking_id) DO UPDATE SET rating=EXCLUDED.rating, review_text=EXCLUDED.review_text, updated_at=NOW()
      RETURNING *
    `, [r.booking_id, beauticianId, booking.rows[0].customer_id, Number(r.rating), nullable(r.review_text)]);
    await query(`UPDATE bookings SET customer_review_rating=$1, customer_review_text=$2, updated_at=NOW() WHERE id=$3`, [Number(r.rating), nullable(r.review_text), r.booking_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to save review', details: error.message }); }
});


app.get('/api/admin/notifications', async (req, res) => {
  try {
    const newBookings = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE status='new'`);
    const unassigned = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE assigned_artist_id IS NULL AND status NOT IN ('completed','cancelled','unavailable')`);
    const unpaid = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE COALESCE(payment_status,'unpaid') <> 'paid' AND status NOT IN ('completed','cancelled','unavailable')`);
    const today = await query(`SELECT COUNT(*)::int AS count FROM bookings WHERE booking_date=CURRENT_DATE AND status NOT IN ('completed','cancelled','unavailable')`);
    const recent = await bookingsQuery(`WHERE b.status='new' OR b.assigned_artist_id IS NULL OR b.booking_date=CURRENT_DATE`, []);
    res.json({
      counts: { new_bookings: newBookings.rows[0].count, unassigned_bookings: unassigned.rows[0].count, unpaid_bookings: unpaid.rows[0].count, today_bookings: today.rows[0].count },
      items: recent.rows.slice(0, 20)
    });
  } catch (error) { res.status(500).json({ error: 'Failed to load notifications', details: error.message }); }
});



app.get('/api/admin/bookings/:id/operations', async (req, res) => {
  try {
    const booking = await bookingsQuery(`WHERE b.id=$1`, [req.params.id]);
    if (!booking.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const events = await query(`SELECT * FROM booking_events WHERE booking_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    const history = await query(`SELECT * FROM booking_status_history WHERE booking_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    res.json({ booking: booking.rows[0], events: events.rows, history: history.rows, status_labels: BOOKING_STATUS_LABELS });
  } catch (error) { res.status(500).json({ error: 'Failed to load booking operations', details: error.message }); }
});

app.get('/api/admin/bookings/:id/events', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM booking_events WHERE booking_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load booking events', details: error.message }); }
});

app.post('/api/admin/bookings/:id/events', async (req, res) => {
  try {
    const event = await logBookingEvent(req.params.id, req.body.event_type || 'note', req.body.title || 'ملاحظة إدارية', req.body.description || req.body.note || '', 'admin', req.admin?.email || null, req.body.metadata || null);
    res.status(201).json(event);
  } catch (error) { res.status(500).json({ error: 'Failed to add booking event', details: error.message }); }
});

app.get('/api/admin/communication-templates', async (req, res) => {
  try { const result = await query(`SELECT * FROM communication_templates ORDER BY sort_order, created_at`); res.json(result.rows); }
  catch (error) { res.status(500).json({ error: 'Failed to load communication templates', details: error.message }); }
});

app.post('/api/admin/communication-templates', async (req, res) => {
  try {
    const t = req.body;
    const result = await query(`INSERT INTO communication_templates (code, title_ar, body_ar, channel, status, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [t.code || null, t.title_ar, t.body_ar, t.channel || 'whatsapp', t.status || 'active', t.sort_order || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to create communication template', details: error.message }); }
});

app.patch('/api/admin/communication-templates/:id', async (req, res) => {
  try {
    const allowed = ['code','title_ar','body_ar','channel','status','sort_order'];
    const cols = allowed.filter(f => req.body[f] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'No fields sent' });
    const sets = cols.map((f,i)=>`${f}=$${i+1}`).join(', ');
    const values = cols.map(f => req.body[f] === '' ? null : req.body[f]);
    const result = await query(`UPDATE communication_templates SET ${sets}, updated_at=NOW() WHERE id=$${values.length+1} RETURNING *`, [...values, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update communication template', details: error.message }); }
});

app.delete('/api/admin/communication-templates/:id', async (req, res) => {
  try { await query(`DELETE FROM communication_templates WHERE id=$1`, [req.params.id]); res.json({ ok: true, deleted_id: req.params.id }); }
  catch (error) { res.status(500).json({ error: 'Failed to delete communication template', details: error.message }); }
});

app.post('/api/admin/bookings/:id/whatsapp', async (req, res) => {
  try {
    const bookingRes = await bookingsQuery(`WHERE b.id=$1`, [req.params.id]);
    const booking = bookingRes.rows[0];
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    let body = req.body.message || '';
    if (req.body.template_id) {
      const t = await query(`SELECT * FROM communication_templates WHERE id=$1 LIMIT 1`, [req.body.template_id]);
      body = fillTemplate(t.rows[0]?.body_ar || body, booking);
    }
    if (!body) body = fillTemplate('مرحباً {customer_name}، بخصوص طلبك رقم {booking_id} في بيوتي هوم سيرفس.', booking);
    const phone = String(booking.customer_phone || '').replace(/[^0-9+]/g, '');
    const intl = phone.startsWith('0') ? `966${phone.slice(1)}` : phone.replace(/^\+/, '');
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(body)}`;
    await query(`UPDATE bookings SET whatsapp_status='prepared', updated_at=NOW() WHERE id=$1`, [req.params.id]);
    await logBookingEvent(req.params.id, 'whatsapp_prepared', 'تم تجهيز رسالة واتساب', body, 'admin', req.admin?.email || null, { template_id: req.body.template_id || null });
    res.json({ ok: true, url, message: body });
  } catch (error) { res.status(500).json({ error: 'Failed to prepare WhatsApp message', details: error.message }); }
});

app.get('/api/customer/bookings/:id/events', async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const booking = await bookingsQuery(`WHERE b.id=$1 AND c.phone=$2`, [req.params.id, phone]);
    if (!booking.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const result = await query(`SELECT event_type, title, description, created_at FROM booking_events WHERE booking_id=$1 ORDER BY created_at ASC`, [req.params.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load booking events', details: error.message }); }
});

app.get('/api/customer/bookings', async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const result = await bookingsQuery(`WHERE c.phone=$1`, [phone]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load customer bookings', details: error.message }); }
});

app.get('/api/customer/bookings/:id', async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const result = await bookingsQuery(`WHERE b.id=$1 AND c.phone=$2`, [req.params.id, phone]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to load customer booking', details: error.message }); }
});


async function deliverCustomerOtp(phone, otp) {
  if (CUSTOMER_OTP_TEST_MODE) return;
  const url = process.env.SMS_API_URL;
  const token = process.env.SMS_API_TOKEN;
  if (!url || !token) throw new Error('SMS provider is not configured');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: phone, message: `رمز تحقق بيوتي هوم سيرفس: ${otp}`, sender: process.env.SMS_SENDER_ID || 'Beauty' })
  });
  if (!response.ok) throw new Error(`SMS provider rejected the request (${response.status})`);
}

export function buildOtpResponse(otp, exposeOtp = CUSTOMER_OTP_TEST_MODE) {
  const response = { ok: true, message: 'تم إرسال رمز التحقق.' };
  if (exposeOtp) response.dev_otp = otp;
  return response;
}

async function requestCustomerOtp(req, res) {
  try {
    const phone = validatePhone(req.body.phone);
    const name = nullable(req.body.name);
    const recent = await query(`SELECT COUNT(*)::int AS count FROM customer_otp_codes WHERE (phone=$1 OR requested_ip=$2) AND created_at > NOW()-INTERVAL '15 minutes'`, [phone, req.ip]);
    if (recent.rows[0].count >= 5) return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
    let customer = await query(`SELECT * FROM customers WHERE phone=$1 LIMIT 1`, [phone]);
    if (!customer.rows[0]) {
      customer = await query(`INSERT INTO customers (name, phone, status) VALUES ($1,$2,'active') RETURNING *`, [name || 'عميلة', phone]);
    } else if (name) {
      customer = await query(`UPDATE customers SET name=COALESCE($1,name), updated_at=NOW() WHERE id=$2 RETURNING *`, [name, customer.rows[0].id]);
    }
    const otp = CUSTOMER_OTP_TEST_MODE ? '1234' : String(randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    await deliverCustomerOtp(phone, otp);
    await query(`UPDATE customer_otp_codes SET used_at=NOW() WHERE phone=$1 AND used_at IS NULL`, [phone]);
    await query(`INSERT INTO customer_otp_codes (customer_id, phone, otp_code, purpose, expires_at, requested_ip) VALUES ($1,$2,$3,'login',NOW() + INTERVAL '10 minutes',$4)`, [customer.rows[0].id, phone, otpHash, req.ip]);
    res.json(buildOtpResponse(otp));
  } catch (error) {
    if (validationResponse(error, res)) return;
    const message = CUSTOMER_OTP_TEST_MODE ? error.message : 'Unable to send verification code';
    res.status(error.message === 'SMS provider is not configured' ? 503 : 500).json({ error: message });
  }
}

async function verifyCustomerOtp(req, res) {
  try {
    const phone = validatePhone(req.body.phone);
    const code = String(req.body.otp || req.body.code || '').trim();
    if (!/^\d{4,6}$/.test(code)) return res.status(400).json({ error: 'Invalid or expired OTP' });
    const otp = await query(`SELECT * FROM customer_otp_codes WHERE phone=$1 AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, [phone]);
    if (!otp.rows[0] || otp.rows[0].attempt_count >= 5) return res.status(400).json({ error: 'Invalid or expired OTP' });
    const valid = await bcrypt.compare(code, otp.rows[0].otp_code);
    if (!valid) {
      await query(`UPDATE customer_otp_codes SET attempt_count=attempt_count+1, used_at=CASE WHEN attempt_count+1>=5 THEN NOW() ELSE used_at END WHERE id=$1`, [otp.rows[0].id]);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    await query(`UPDATE customer_otp_codes SET used_at=NOW() WHERE id=$1`, [otp.rows[0].id]);
    const customer = await query(`SELECT * FROM customers WHERE id=$1 LIMIT 1`, [otp.rows[0].customer_id]);
    if (!customer.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    const token = signCustomerToken(customer.rows[0]);
    res.json({ ok: true, token, customer: { id: customer.rows[0].id, name: customer.rows[0].name, phone: customer.rows[0].phone } });
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to verify OTP' }); }
}

app.post('/api/customer/auth/request-otp', requestCustomerOtp);
app.post('/api/customer/auth/verify-otp', verifyCustomerOtp);
app.post('/api/auth/request-otp', requestCustomerOtp);
app.post('/api/auth/verify-otp', verifyCustomerOtp);

app.get('/api/customer/me', authenticateCustomer, async (req, res) => {
  try {
    const c = await query(`SELECT id, name, phone, region_id, city_id, district_id, status FROM customers WHERE id=$1`, [req.customer.id]);
    if (!c.rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(c.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to load customer profile', details: error.message }); }
});

app.get('/api/customer/my-bookings', authenticateCustomer, async (req, res) => {
  try { const result = await bookingsQuery(`WHERE b.customer_id=$1`, [req.customer.id]); res.json(result.rows); }
  catch (error) { res.status(500).json({ error: 'Failed to load customer bookings', details: error.message }); }
});

app.get('/api/customer/addresses', authenticateCustomer, async (req, res) => {
  try {
    const result = await query(`SELECT ca.*, r.name_ar AS region_name, c.name_ar AS city_name, d.name_ar AS district_name FROM customer_addresses ca LEFT JOIN regions r ON r.id=ca.region_id LEFT JOIN cities c ON c.id=ca.city_id LEFT JOIN districts d ON d.id=ca.district_id WHERE ca.customer_id=$1 ORDER BY ca.is_default DESC, ca.created_at DESC`, [req.customer.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load addresses', details: error.message }); }
});

app.post('/api/customer/addresses', authenticateCustomer, async (req, res) => {
  try {
    const a = req.body || {};
    if (!a.address) return res.status(400).json({ error: 'address is required' });
    await validateLocationRelationships(a.region_id, a.city_id, a.district_id);
    if (a.is_default) await query(`UPDATE customer_addresses SET is_default=FALSE WHERE customer_id=$1`, [req.customer.id]);
    const result = await query(`INSERT INTO customer_addresses (customer_id, region_id, city_id, district_id, label, address, is_default) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [req.customer.id, a.region_id || null, a.city_id || null, a.district_id || null, nullable(a.label) || 'عنوان', nullable(a.address), !!a.is_default]);
    res.status(201).json(result.rows[0]);
  } catch (error) { if (!validationResponse(error, res)) res.status(500).json({ error: 'Failed to save address', details: error.message }); }
});

app.delete('/api/customer/addresses/:id', authenticateCustomer, async (req, res) => {
  try { await query(`DELETE FROM customer_addresses WHERE id=$1 AND customer_id=$2`, [req.params.id, req.customer.id]); res.json({ ok: true }); }
  catch (error) { res.status(500).json({ error: 'Failed to delete address', details: error.message }); }
});

app.get('/api/customer/favorites', authenticateCustomer, async (req, res) => {
  try {
    const result = await query(`SELECT f.*, a.name AS beautician_name, a.phone AS beautician_phone, COALESCE(sc.name_ar, s.name_ar, s.name) AS main_expertise_name FROM customer_favorite_beauticians f LEFT JOIN artists a ON a.id=f.beautician_id LEFT JOIN service_categories sc ON sc.id=a.main_expertise_category_id LEFT JOIN services s ON s.id=a.main_expertise_service_id WHERE f.customer_id=$1 ORDER BY f.created_at DESC`, [req.customer.id]);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load favorites', details: error.message }); }
});

app.post('/api/customer/favorites/:beauticianId', authenticateCustomer, async (req, res) => {
  try {
    const result = await query(`INSERT INTO customer_favorite_beauticians (customer_id, beautician_id) VALUES ($1,$2) ON CONFLICT (customer_id, beautician_id) DO NOTHING RETURNING *`, [req.customer.id, req.params.beauticianId]);
    res.status(201).json(result.rows[0] || { ok: true });
  } catch (error) { res.status(500).json({ error: 'Failed to save favorite', details: error.message }); }
});

app.delete('/api/customer/favorites/:beauticianId', authenticateCustomer, async (req, res) => {
  try { await query(`DELETE FROM customer_favorite_beauticians WHERE customer_id=$1 AND beautician_id=$2`, [req.customer.id, req.params.beauticianId]); res.json({ ok: true }); }
  catch (error) { res.status(500).json({ error: 'Failed to delete favorite', details: error.message }); }
});

app.post('/api/uploads/design-image', async (req, res) => {
  try {
    const { image_data_url, folder } = req.body;
    if (!image_data_url || typeof image_data_url !== 'string') return res.status(400).json({ error: 'image_data_url is required.' });
    const uploaded = await uploadToCloudinary(image_data_url, folder || 'beauty-home-service/designs');
    res.json({ ok: true, ...uploaded });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

app.post('/api/admin/uploads/image', async (req, res) => {
  try {
    const { image_data_url, folder } = req.body;
    if (!image_data_url || typeof image_data_url !== 'string') return res.status(400).json({ error: 'image_data_url is required.' });
    const uploaded = await uploadToCloudinary(image_data_url, folder || 'beauty-home-service/admin');
    res.json({ ok: true, ...uploaded });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

app.get('/api/admin/artist-availability', async (req, res) => {
  const result = await query(`SELECT av.*, a.name AS artist_name FROM artist_availability av LEFT JOIN artists a ON a.id=av.artist_id ORDER BY av.available_date DESC, av.from_time ASC`);
  res.json(result.rows);
});

app.post('/api/admin/artist-availability', async (req, res) => {
  const a = req.body;
  if (!a.artist_id || !a.available_date) return res.status(400).json({ error: 'artist_id and available_date are required' });
  const result = await query(`INSERT INTO artist_availability (artist_id, available_date, from_time, to_time, is_available, note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [a.artist_id, a.available_date, a.from_time || null, a.to_time || null, a.is_available !== false, nullable(a.note)]);
  res.status(201).json(result.rows[0]);
});

app.delete('/api/admin/artist-availability/:id', async (req, res) => {
  await query(`DELETE FROM artist_availability WHERE id=$1`, [req.params.id]);
  res.json({ ok: true, deleted_id: req.params.id });
});

app.post('/api/admin/artist-reviews', async (req, res) => {
  const r = req.body;
  if (!r.artist_id || !r.booking_id) return res.status(400).json({ error: 'artist_id and booking_id are required' });
  const scores = [Number(r.punctuality || 0), Number(r.quality || 0), Number(r.customer_handling || 0)].filter(Boolean);
  const overall = scores.length ? scores.reduce((a,b)=>a+b,0) / scores.length : null;
  const result = await query(`INSERT INTO artist_reviews (artist_id, booking_id, punctuality, quality, customer_handling, overall_rating, suitable_for_brides, suitable_for_groups, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [r.artist_id, r.booking_id, r.punctuality || null, r.quality || null, r.customer_handling || null, overall, !!r.suitable_for_brides, !!r.suitable_for_groups, nullable(r.note)]);
  res.status(201).json(result.rows[0]);
});

const isVercel = !!process.env.VERCEL;
if (!isVercel && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`واجهة برمجة بيوتي هوم سيرفس تعمل على المنفذ ${PORT}`));
}

export default app;

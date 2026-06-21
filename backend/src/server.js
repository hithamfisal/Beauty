import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'beauty-home-service-local-secret';
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@beauty.local';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Beauty@12345';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizePhone(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, '') : value;
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
      ['new_request', 'رسالة طلب جديد', 'مرحباً {customer_name}، تم استلام طلبك في Beauty Home Service وسيتم التواصل معك لتأكيد الموعد. رقم الطلب: {booking_id}', 1],
      ['confirm_booking', 'تأكيد الحجز', 'مرحباً {customer_name}، تم تأكيد حجزك لخدمة {service_name} بتاريخ {booking_date} الساعة {booking_time}.', 2],
      ['payment_reminder', 'تذكير الدفع', 'مرحباً {customer_name}، نذكرك بحالة الدفع لطلبك رقم {booking_id}. حالة الدفع الحالية: {payment_status}.', 3],
      ['completed_review', 'طلب التقييم', 'مرحباً {customer_name}، سعدنا بخدمتك. يمكنك فتح التطبيق وتقييم خبيرة التجميل للطلب رقم {booking_id}.', 4]
    ];
    for (const t of templates) {
      await query(`INSERT INTO communication_templates (code, title_ar, body_ar, sort_order) VALUES ($1,$2,$3,$4)`, t);
    }
  }
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

async function initSchemas() {
  await ensureV14Schema();
  await ensureV16Schema();
  await ensureV17V18Schema();
}

initSchemas().catch(error => console.error('schema init failed:', error));


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
  return jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
}

function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Admin login required' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

app.post('/api/admin/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const result = await query(`SELECT * FROM admin_users WHERE email=$1 AND status='active' LIMIT 1`, [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid login details' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid login details' });
    const token = signAdminToken(user);
    res.json({ ok: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ ok: true, app: 'Beauty Home Service API', version: 'v1.8' });
});

app.get('/api/regions', async (req, res) => {
  const result = await query(`SELECT * FROM regions WHERE status='active' ORDER BY sort_order, name_ar`);
  res.json(result.rows);
});

app.get('/api/cities', async (req, res) => {
  const params = [];
  let where = `WHERE status='active'`;
  if (req.query.region_id) { params.push(req.query.region_id); where += ` AND region_id=$1`; }
  const result = await query(`SELECT * FROM cities ${where} ORDER BY sort_order, name_ar`, params);
  res.json(result.rows);
});

app.get('/api/districts', async (req, res) => {
  const params = [];
  let where = `WHERE status='active'`;
  if (req.query.city_id) { params.push(req.query.city_id); where += ` AND city_id=$1`; }
  const result = await query(`SELECT * FROM districts ${where} ORDER BY sort_order, name_ar`, params);
  res.json(result.rows);
});

app.get('/api/districts/:cityId', async (req, res) => {
  const result = await query(`SELECT * FROM districts WHERE city_id=$1 AND status='active' ORDER BY sort_order, name_ar`, [req.params.cityId]);
  res.json(result.rows);
});

app.get('/api/service-categories', async (req, res) => {
  const result = await query(`SELECT * FROM service_categories WHERE status='active' ORDER BY sort_order, name_ar`);
  res.json(result.rows);
});

app.get('/api/services', async (req, res) => {
  const params = [];
  let where = `WHERE s.status='active'`;
  if (req.query.category_id) { params.push(req.query.category_id); where += ` AND s.category_id=$1`; }
  const result = await query(`
    SELECT s.*, COALESCE(s.name_ar, s.name) AS display_name, sc.name_ar AS category_name
    FROM services s
    LEFT JOIN service_categories sc ON sc.id=s.category_id
    ${where}
    ORDER BY sc.sort_order, s.sort_order, s.min_price NULLS LAST, COALESCE(s.name_ar, s.name)
  `, params);
  res.json(result.rows);
});

app.get('/api/customer/catalog', async (req, res) => {
  try {
    const [regions, cities, districts, categories, services] = await Promise.all([
      query(`SELECT * FROM regions WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT * FROM cities WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT * FROM districts WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT * FROM service_categories WHERE status='active' ORDER BY sort_order, name_ar`),
      query(`SELECT s.*, COALESCE(s.name_ar, s.name) AS display_name, sc.name_ar AS category_name FROM services s LEFT JOIN service_categories sc ON sc.id=s.category_id WHERE s.status='active' ORDER BY sc.sort_order, s.sort_order, COALESCE(s.name_ar, s.name)`)
    ]);
    res.json({ regions: regions.rows, cities: cities.rows, districts: districts.rows, service_categories: categories.rows, services: services.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer catalog', details: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const b = req.body;
    const regionId = b.region_id || await findOrCreateRegion(b.region);
    const cityId = b.city_id || await findOrCreateCity(b.city, regionId);
    const districtId = b.district_id || await findOrCreateDistrict(cityId, b.district);
    const serviceId = b.service_id || await findServiceId(b.service_type || b.service_name || b.service);
    const serviceData = serviceId ? await query(`SELECT category_id FROM services WHERE id=$1`, [serviceId]) : { rows: [] };
    const serviceCategoryId = b.service_category_id || serviceData.rows[0]?.category_id || null;
    const preferredArtistId = b.preferred_artist_id || b.beautician_id || null;
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
        customer_notes, preferred_artist_id, contact_preference, alternate_time, status, payment_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'new','unpaid')
      RETURNING *
    `, [
      customerId, regionId, cityId, districtId, serviceCategoryId, nullable(b.event_type), serviceId,
      b.booking_date, b.booking_time, b.people_count || 1, nullable(b.address), b.latitude || null, b.longitude || null,
      b.design_image_url || null, nullable(b.customer_notes), preferredArtistId,
      nullable(b.contact_preference) || 'whatsapp', nullable(b.alternate_time)
    ]);

    await query(`INSERT INTO booking_status_history (booking_id, new_status, changed_by, note) VALUES ($1,'new','customer','تم إنشاء الطلب')`, [result.rows[0].id]);
    await logBookingEvent(result.rows[0].id, 'created', 'تم إنشاء الطلب', 'تم إنشاء الطلب من تطبيق العميلة', 'customer');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

app.use('/api/admin', (req, res, next) => {
  if (req.path === '/login') return next();
  return authenticateAdmin(req, res, next);
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

async function bookingsQuery(where = '', params = []) {
  return query(`
    SELECT b.*, c.name AS customer_name, c.phone AS customer_phone,
      r.name_ar AS region_name, city.name_ar AS city_name, d.name_ar AS district_name,
      sc.name_ar AS service_category_name, COALESCE(s.name_ar, s.name) AS service_name,
      a.name AS artist_name, a.phone AS artist_phone, pa.name AS preferred_artist_name, pa.phone AS preferred_artist_phone
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
    ORDER BY b.created_at DESC
  `, params);
}

app.get('/api/admin/bookings', async (req, res) => {
  try { const result = await bookingsQuery(); res.json(result.rows); }
  catch (error) { res.status(500).json({ error: 'Failed to load bookings', details: error.message }); }
});

app.get('/api/admin/bookings/:id', async (req, res) => {
  try {
    const booking = await bookingsQuery(`WHERE b.id=$1`, [req.params.id]);
    if (!booking.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const history = await query(`SELECT * FROM booking_status_history WHERE booking_id=$1 ORDER BY created_at DESC`, [req.params.id]);
    res.json({ booking: booking.rows[0], history: history.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load booking details', details: error.message });
  }
});

app.patch('/api/admin/bookings/:id/status', async (req, res) => {
  try {
    const current = await query(`SELECT status FROM bookings WHERE id=$1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    const result = await query(`UPDATE bookings SET status=$1, admin_notes=COALESCE($2,admin_notes), updated_at=NOW() WHERE id=$3 RETURNING *`, [req.body.status, req.body.admin_notes || null, req.params.id]);
    await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,'admin',$4)`, [req.params.id, current.rows[0].status, req.body.status, nullable(req.body.note)]);
    await logBookingEvent(req.params.id, 'status_changed', 'تم تغيير حالة الطلب', `${current.rows[0].status} → ${req.body.status}`, 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update booking status', details: error.message }); }
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
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update booking details', details: error.message }); }
});

app.patch('/api/admin/bookings/:id/payment', async (req, res) => {
  try {
    const allowed = ['unpaid', 'deposit_paid', 'paid', 'refunded'];
    const paymentStatus = req.body.payment_status || 'unpaid';
    if (!allowed.includes(paymentStatus)) return res.status(400).json({ error: 'Invalid payment status' });
    const result = await query(`UPDATE bookings SET payment_status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`, [paymentStatus, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$2,'admin',$3)`, [req.params.id, result.rows[0].status, `تم تحديث حالة الدفع إلى ${paymentStatus}`]);
    await logBookingEvent(req.params.id, 'payment_updated', 'تم تحديث حالة الدفع', `حالة الدفع: ${paymentStatus}`, 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to update payment status', details: error.message }); }
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
    const current = await query(`SELECT id, status, booking_date FROM bookings WHERE id=$1`, [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Booking not found' });
    if (artist_id && !force) {
      const conflicts = await query(`SELECT id, booking_date, booking_time, status FROM bookings WHERE assigned_artist_id=$1 AND id<>$2 AND booking_date=$3 AND status NOT IN ('completed','cancelled','unavailable')`, [artist_id, req.params.id, current.rows[0].booking_date]);
      if (conflicts.rows.length) return res.status(409).json({ error: 'يوجد تعارض في جدول خبيرة التجميل لنفس اليوم.', conflict_count: conflicts.rows.length, conflicts: conflicts.rows });
    }
    const status = artist_id ? 'artist_assigned' : current.rows[0].status;
    const result = await query(`UPDATE bookings SET assigned_artist_id=$1, status=$2, updated_at=NOW() WHERE id=$3 RETURNING *`, [artist_id || null, status, req.params.id]);
    await query(`INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,'admin',$4)`, [req.params.id, current.rows[0].status, status, artist_id ? 'تم تعيين خبيرة التجميل' : 'تم إلغاء تعيين خبيرة التجميل']);
    await logBookingEvent(req.params.id, 'beautician_assigned', artist_id ? 'تم تعيين خبيرة التجميل' : 'تم إلغاء تعيين الخبيرة', artist_id || '', 'admin', req.admin?.email || null);
    res.json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to assign beautician', details: error.message }); }
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
async function listServiceCategories(all = false) {
  return query(`SELECT * FROM service_categories ${all ? '' : `WHERE status='active'`} ORDER BY sort_order, name_ar`);
}
async function listServices(all = false) {
  return query(`SELECT s.*, COALESCE(s.name_ar, s.name) AS display_name, sc.name_ar AS category_name FROM services s LEFT JOIN service_categories sc ON sc.id=s.category_id ${all ? '' : `WHERE s.status='active'`} ORDER BY sc.sort_order, s.sort_order, COALESCE(s.name_ar, s.name)`);
}

app.get('/api/admin/catalog', async (req, res) => {
  try {
    const all = req.query.all !== '0';
    const [regions, cities, districts, categories, services] = await Promise.all([listRegions(all), listCities(all), listDistricts(all), listServiceCategories(all), listServices(all)]);
    res.json({ regions: regions.rows, cities: cities.rows, districts: districts.rows, service_categories: categories.rows, services: services.rows });
  } catch (error) { res.status(500).json({ error: 'Failed to load catalog', details: error.message }); }
});

function catalogRoutes(name, table, fields, listFn) {
  app.get(`/api/admin/${name}`, async (req, res) => {
    try { const result = await listFn(req.query.all === '1'); res.json(result.rows); }
    catch (error) { res.status(500).json({ error: `Failed to load ${name}`, details: error.message }); }
  });
  app.post(`/api/admin/${name}`, async (req, res) => {
    try {
      const columns = fields.filter(f => req.body[f] !== undefined);
      const values = columns.map(f => req.body[f]);
      if (!columns.length) return res.status(400).json({ error: 'No fields sent.' });
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');
      const result = await query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) RETURNING *`, values);
      res.status(201).json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: `Failed to create ${name}`, details: error.message }); }
  });
  app.patch(`/api/admin/${name}/:id`, async (req, res) => {
    try {
      const columns = fields.filter(f => req.body[f] !== undefined);
      if (!columns.length) return res.status(400).json({ error: 'No fields sent.' });
      const sets = columns.map((f, i) => `${f}=$${i + 1}`).join(', ');
      const values = [...columns.map(f => req.body[f]), req.params.id];
      const result = await query(`UPDATE ${table} SET ${sets}, updated_at=NOW() WHERE id=$${values.length} RETURNING *`, values);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (error) { res.status(500).json({ error: `Failed to update ${name}`, details: error.message }); }
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

catalogRoutes('regions', 'regions', ['external_id','name_ar','name_en','status','sort_order'], listRegions);
catalogRoutes('cities', 'cities', ['region_id','external_id','name_ar','name_en','status','sort_order'], listCities);
catalogRoutes('districts', 'districts', ['city_id','external_id','name_ar','name_en','status','sort_order'], listDistricts);
catalogRoutes('service-categories', 'service_categories', ['name_ar','name_en','description','status','sort_order'], listServiceCategories);
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
    SELECT a.*, r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(ms.name_ar, ms.name) AS main_expertise_name,
      COUNT(DISTINCT b.id)::int AS total_bookings,
      COUNT(DISTINCT CASE WHEN b.status='completed' THEN b.id END)::int AS completed_bookings,
      ROUND(AVG(rv.overall_rating)::numeric,1) AS review_rating,
      COUNT(DISTINCT rv.id)::int AS review_count,
      COUNT(DISTINCT av.id)::int AS availability_slots
    FROM artists a
    LEFT JOIN regions r ON r.id=a.region_id
    LEFT JOIN cities c ON c.id=a.city_id
    LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
    LEFT JOIN bookings b ON b.assigned_artist_id=a.id
    LEFT JOIN artist_reviews rv ON rv.artist_id=a.id
    LEFT JOIN artist_availability av ON av.artist_id=a.id AND av.available_date >= CURRENT_DATE
    GROUP BY a.id, r.name_ar, c.name_ar, ms.name_ar, ms.name
    ORDER BY a.created_at DESC
  `);
}

app.get(['/api/admin/artists','/api/admin/beauticians'], async (req, res) => {
  try { const result = await listBeauticians(); res.json(result.rows); }
  catch (error) { res.status(500).json({ error: 'Failed to load beauticians', details: error.message }); }
});

app.post(['/api/admin/artists','/api/admin/beauticians'], async (req, res) => {
  try {
    const a = req.body;
    if (!a.name || !a.phone) return res.status(400).json({ error: 'Beautician name and phone are required.' });
    const result = await query(`
      INSERT INTO artists (name, phone, region_id, city_id, districts, skills, bio, rating, status, main_expertise_service_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [nullable(a.name), normalizePhone(a.phone), a.region_id || null, a.city_id || null, nullable(a.districts), nullable(a.skills), nullable(a.bio), a.rating || 5, a.status || 'active', a.main_expertise_service_id || null]);
    if (Array.isArray(a.service_ids)) {
      for (const serviceId of a.service_ids) {
        await query(`INSERT INTO beautician_services (beautician_id, service_id, is_primary) VALUES ($1,$2,$3) ON CONFLICT (beautician_id, service_id) DO UPDATE SET is_primary=EXCLUDED.is_primary`, [result.rows[0].id, serviceId, serviceId === a.main_expertise_service_id]);
      }
    }
    res.status(201).json(result.rows[0]);
  } catch (error) { res.status(500).json({ error: 'Failed to create beautician', details: error.message }); }
});

app.patch(['/api/admin/artists/:id','/api/admin/beauticians/:id'], async (req, res) => {
  try {
    const allowed = ['name','phone','region_id','city_id','districts','skills','bio','rating','status','main_expertise_service_id'];
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
      for (const serviceId of req.body.service_ids) {
        await query(`INSERT INTO beautician_services (beautician_id, service_id, is_primary) VALUES ($1,$2,$3)`, [req.params.id, serviceId, serviceId === req.body.main_expertise_service_id]);
      }
    }
    res.json(updated || { ok: true });
  } catch (error) { res.status(500).json({ error: 'Failed to update beautician', details: error.message }); }
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
    const where = [`a.status='active'`];
    if (req.query.region_id) { params.push(req.query.region_id); where.push(`(a.region_id=$${params.length} OR a.region_id IS NULL)`); }
    if (req.query.city_id) { params.push(req.query.city_id); where.push(`(a.city_id=$${params.length} OR a.city_id IS NULL)`); }
    if (req.query.service_id) { params.push(req.query.service_id); where.push(`(a.main_expertise_service_id=$${params.length} OR EXISTS (SELECT 1 FROM beautician_services bs WHERE bs.beautician_id=a.id AND bs.service_id=$${params.length}))`); }
    const result = await query(`
      SELECT a.id, a.name, a.phone, a.bio, a.skills, a.rating, a.status, a.region_id, a.city_id, a.main_expertise_service_id,
        r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(ms.name_ar, ms.name) AS main_expertise_name,
        COALESCE(ROUND(AVG(br.rating)::numeric,1), ROUND(AVG(ar.overall_rating)::numeric,1), a.rating) AS review_rating,
        (COUNT(DISTINCT br.id) + COUNT(DISTINCT ar.id))::int AS review_count,
        COUNT(DISTINCT p.id)::int AS portfolio_count,
        MIN(CASE WHEN p.is_featured THEN p.image_url ELSE NULL END) AS featured_image_url,
        MIN(p.image_url) AS first_image_url
      FROM artists a
      LEFT JOIN regions r ON r.id=a.region_id
      LEFT JOIN cities c ON c.id=a.city_id
      LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
      LEFT JOIN beautician_portfolio p ON p.beautician_id=a.id AND p.status='published'
      LEFT JOIN beautician_reviews br ON br.beautician_id=a.id AND br.status='published'
      LEFT JOIN artist_reviews ar ON ar.artist_id=a.id
      WHERE ${where.join(' AND ')}
      GROUP BY a.id, r.name_ar, c.name_ar, ms.name_ar, ms.name
      ORDER BY review_rating DESC NULLS LAST, portfolio_count DESC, a.name
    `, params);
    res.json(result.rows);
  } catch (error) { res.status(500).json({ error: 'Failed to load beauticians', details: error.message }); }
});

app.get('/api/beauticians/:id', async (req, res) => {
  try {
    const info = await query(`
      SELECT a.*, r.name_ar AS region_name, c.name_ar AS city_name, COALESCE(ms.name_ar, ms.name) AS main_expertise_name,
        COALESCE(ROUND(AVG(br.rating)::numeric,1), ROUND(AVG(ar.overall_rating)::numeric,1), a.rating) AS review_rating,
        (COUNT(DISTINCT br.id) + COUNT(DISTINCT ar.id))::int AS review_count
      FROM artists a
      LEFT JOIN regions r ON r.id=a.region_id
      LEFT JOIN cities c ON c.id=a.city_id
      LEFT JOIN services ms ON ms.id=a.main_expertise_service_id
      LEFT JOIN beautician_reviews br ON br.beautician_id=a.id AND br.status='published'
      LEFT JOIN artist_reviews ar ON ar.artist_id=a.id
      WHERE a.id=$1
      GROUP BY a.id, r.name_ar, c.name_ar, ms.name_ar, ms.name
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
    if (!body) body = fillTemplate('مرحباً {customer_name}، بخصوص طلبك رقم {booking_id} في Beauty Home Service.', booking);
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

app.post('/api/auth/request-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!phone) return res.status(400).json({ error: 'phone is required' });
  res.json({ ok: true, message: 'OTP generated for local testing', otp: '1234' });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || '');
  if (!phone || otp !== '1234') return res.status(400).json({ error: 'Invalid OTP' });
  res.json({ ok: true, token: `local-customer-${phone}`, phone });
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
if (!isVercel) {
  app.listen(PORT, () => console.log(`Beauty Home Service API running on port ${PORT}`));
}

export default app;

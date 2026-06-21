import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigin = process.env.CORS_ORIGIN || '*';

app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

async function ensureV12V13Schema() {
  await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
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

  await query(`CREATE INDEX IF NOT EXISTS idx_artist_availability_artist_date ON artist_availability(artist_id, available_date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_artist_reviews_artist ON artist_reviews(artist_id)`);
}

ensureV12V13Schema().catch(error => console.error('v1.2/v1.3 schema init failed:', error));


function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizePhone(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, '') : value;
}

async function findOrCreateCity(cityName) {
  const name = normalizeText(cityName);
  if (!name) return null;

  const existing = await query(
    `SELECT id
     FROM cities
     WHERE name_ar = $1 OR name_en = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [name]
  );

  if (existing.rows.length > 0) return existing.rows[0].id;

  const created = await query(
    'INSERT INTO cities (name_ar, name_en, status) VALUES ($1, $2, $3) RETURNING id',
    [name, name, 'active']
  );

  return created.rows[0].id;
}

async function findOrCreateDistrict(cityId, districtName) {
  const name = normalizeText(districtName);
  if (!cityId || !name) return null;

  const existing = await query(
    `SELECT id
     FROM districts
     WHERE city_id = $1
       AND (name_ar = $2 OR name_en = $2)
     ORDER BY created_at ASC
     LIMIT 1`,
    [cityId, name]
  );

  if (existing.rows.length > 0) return existing.rows[0].id;

  const created = await query(
    'INSERT INTO districts (city_id, name_ar, name_en, status) VALUES ($1, $2, $3, $4) RETURNING id',
    [cityId, name, name, 'active']
  );

  return created.rows[0].id;
}

async function findServiceId(serviceName) {
  const name = normalizeText(serviceName);
  if (!name) return null;

  const existing = await query(
    `SELECT id
     FROM services
     WHERE name = $1
     ORDER BY created_at ASC
     LIMIT 1`,
    [name]
  );

  return existing.rows[0]?.id || null;
}

async function findOrCreateCustomer(payload) {
  let customerId = payload.customer_id || null;
  const phone = normalizePhone(payload.phone);
  const name = normalizeText(payload.name) || 'عميلة بدون اسم';

  if (customerId) return customerId;
  if (!phone) return null;

  const existing = await query(
    'SELECT id FROM customers WHERE phone = $1 LIMIT 1',
    [phone]
  );

  if (existing.rows.length > 0) {
    customerId = existing.rows[0].id;
    await query(
      'UPDATE customers SET name = COALESCE($1, name), updated_at = NOW() WHERE id = $2',
      [name, customerId]
    );
    return customerId;
  }

  const created = await query(
    'INSERT INTO customers (name, phone, status) VALUES ($1, $2, $3) RETURNING id',
    [name, phone, 'active']
  );

  return created.rows[0].id;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Beauty Home Service API' });

// Vercel/simple health alias. Useful when a hosting rewrite strips the /api prefix.
app.get('/health', (req, res) => {
  res.json({ ok: true, app: 'Beauty Home Service API' });
});

});

app.get('/api/cities', async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM cities WHERE status='active' ORDER BY name_ar"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load cities', details: error.message });
  }
});

app.get('/api/districts/:cityId', async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM districts WHERE city_id=$1 AND status='active' ORDER BY name_ar",
      [req.params.cityId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load districts', details: error.message });
  }
});

app.get('/api/services', async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM services WHERE status='active' ORDER BY min_price NULLS LAST"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load services', details: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const b = req.body;

    const customerId = await findOrCreateCustomer(b);
    const cityId = b.city_id || await findOrCreateCity(b.city);
    const districtId = b.district_id || await findOrCreateDistrict(cityId, b.district);
    const serviceId = b.service_id || await findServiceId(b.service_type || b.service_name);

    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required. Send customer_id or phone.' });
    }

    if (!cityId) {
      return res.status(400).json({ error: 'City is required. Send city_id or city.' });
    }

    if (!serviceId) {
      return res.status(400).json({ error: 'Service is required. Send service_id or service_type.' });
    }

    if (!b.booking_date || !b.booking_time) {
      return res.status(400).json({ error: 'booking_date and booking_time are required.' });
    }

    const result = await query(`
      INSERT INTO bookings (
        customer_id,
        city_id,
        district_id,
        event_type,
        service_id,
        booking_date,
        booking_time,
        people_count,
        address,
        latitude,
        longitude,
        design_image_url,
        customer_notes,
        status,
        payment_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      customerId,
      cityId,
      districtId,
      normalizeText(b.event_type) || null,
      serviceId,
      b.booking_date,
      b.booking_time,
      b.people_count || 1,
      normalizeText(b.address) || null,
      b.latitude || null,
      b.longitude || null,
      b.design_image_url || null,
      normalizeText(b.customer_notes) || null,
      'new',
      'unpaid'
    ]);

    await query(
      'INSERT INTO booking_status_history (booking_id, new_status, changed_by, note) VALUES ($1,$2,$3,$4)',
      [result.rows[0].id, 'new', 'customer', 'تم إنشاء الطلب']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking', details: error.message });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const total = await query('SELECT COUNT(*)::int AS count FROM bookings');
    const newBookings = await query("SELECT COUNT(*)::int AS count FROM bookings WHERE status='new'");
    const completed = await query("SELECT COUNT(*)::int AS count FROM bookings WHERE status='completed'");
    const artists = await query("SELECT COUNT(*)::int AS count FROM artists WHERE status='active'");
    const unassigned = await query("SELECT COUNT(*)::int AS count FROM bookings WHERE assigned_artist_id IS NULL AND status NOT IN ('completed','cancelled','unavailable')");
    const unpaid = await query("SELECT COUNT(*)::int AS count FROM bookings WHERE COALESCE(payment_status,'unpaid') <> 'paid' AND status NOT IN ('cancelled','unavailable')");
    const today = await query("SELECT COUNT(*)::int AS count FROM bookings WHERE booking_date = CURRENT_DATE AND status NOT IN ('cancelled','unavailable')");

    res.json({
      total_bookings: total.rows[0].count,
      new_bookings: newBookings.rows[0].count,
      completed_bookings: completed.rows[0].count,
      active_artists: artists.rows[0].count,
      unassigned_bookings: unassigned.rows[0].count,
      unpaid_bookings: unpaid.rows[0].count,
      today_bookings: today.rows[0].count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard', details: error.message });
  }
});

app.get('/api/admin/bookings', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        b.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        city.name_ar AS city_name,
        d.name_ar AS district_name,
        s.name AS service_name,
        a.name AS artist_name,
        a.phone AS artist_phone
      FROM bookings b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN cities city ON city.id = b.city_id
      LEFT JOIN districts d ON d.id = b.district_id
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN artists a ON a.id = b.assigned_artist_id
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load bookings', details: error.message });
  }
});

app.patch('/api/admin/bookings/:id/status', async (req, res) => {
  try {
    const current = await query(
      'SELECT status FROM bookings WHERE id = $1',
      [req.params.id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const oldStatus = current.rows[0].status;

    const result = await query(
      `UPDATE bookings
       SET status = $1,
           admin_notes = COALESCE($2, admin_notes),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.body.status, req.body.admin_notes || null, req.params.id]
    );

    await query(
      'INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, oldStatus, req.body.status, 'admin', req.body.note || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking status', details: error.message });
  }
});

app.get('/api/admin/artists', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        a.*,
        c.name_ar AS city_name,
        COUNT(DISTINCT b.id)::int AS total_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)::int AS completed_bookings,
        ROUND(AVG(r.overall_rating)::numeric, 1) AS review_rating,
        COUNT(DISTINCT r.id)::int AS review_count,
        COUNT(DISTINCT av.id)::int AS availability_slots
      FROM artists a
      LEFT JOIN cities c ON c.id = a.city_id
      LEFT JOIN bookings b ON b.assigned_artist_id = a.id
      LEFT JOIN artist_reviews r ON r.artist_id = a.id
      LEFT JOIN artist_availability av ON av.artist_id = a.id AND av.available_date >= CURRENT_DATE
      GROUP BY a.id, c.name_ar
      ORDER BY a.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load artists', details: error.message });
  }
});

app.post('/api/admin/artists', async (req, res) => {
  try {
    const a = req.body;
    const cityId = a.city_id || await findOrCreateCity(a.city);

    if (!a.name || !a.phone) {
      return res.status(400).json({ error: 'Artist name and phone are required.' });
    }

    const result = await query(`
      INSERT INTO artists (
        name,
        phone,
        city_id,
        districts,
        skills,
        bio,
        rating,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [
      normalizeText(a.name),
      normalizePhone(a.phone),
      cityId,
      normalizeText(a.districts) || null,
      normalizeText(a.skills) || null,
      normalizeText(a.bio) || null,
      a.rating || 5,
      a.status || 'active'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create artist error:', error);
    res.status(500).json({ error: 'Failed to create artist', details: error.message });
  }
});

app.patch('/api/admin/bookings/:id/assign-artist', async (req, res) => {
  try {
    const { artist_id, force } = req.body;
    const { id } = req.params;

    const current = await query(
      `SELECT id, status, booking_date, booking_time, assigned_artist_id
       FROM bookings
       WHERE id = $1`,
      [id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const oldStatus = current.rows[0].status;
    const newStatus = artist_id ? 'artist_assigned' : oldStatus;

    if (artist_id && !force) {
      const conflicts = await query(`
        SELECT
          b.id,
          b.booking_date,
          b.booking_time,
          b.status,
          c.name AS customer_name,
          c.phone AS customer_phone,
          s.name AS service_name
        FROM bookings b
        LEFT JOIN customers c ON c.id = b.customer_id
        LEFT JOIN services s ON s.id = b.service_id
        WHERE b.assigned_artist_id = $1
          AND b.id <> $2
          AND b.booking_date = $3
          AND b.status NOT IN ('completed','cancelled','unavailable')
        ORDER BY b.booking_time ASC
      `, [artist_id, id, current.rows[0].booking_date]);

      if (conflicts.rows.length > 0) {
        return res.status(409).json({
          error: 'يوجد تعارض في جدول الحنانة لنفس اليوم.',
          conflict_count: conflicts.rows.length,
          conflicts: conflicts.rows
        });
      }
    }

    const result = await query(`
      UPDATE bookings
      SET assigned_artist_id = $1,
          status = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [artist_id || null, newStatus, id]);

    await query(
      'INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)',
      [id, oldStatus, newStatus, 'admin', artist_id ? 'تم تعيين الحنانة' : 'تم إلغاء تعيين الحنانة']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Assign artist error:', error);
    res.status(500).json({ error: 'Failed to assign artist', details: error.message });
  }
});



app.get('/api/admin/bookings/:id', async (req, res) => {
  try {
    const booking = await query(`
      SELECT
        b.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        city.name_ar AS city_name,
        d.name_ar AS district_name,
        s.name AS service_name,
        a.name AS artist_name,
        a.phone AS artist_phone
      FROM bookings b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN cities city ON city.id = b.city_id
      LEFT JOIN districts d ON d.id = b.district_id
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN artists a ON a.id = b.assigned_artist_id
      WHERE b.id = $1
      LIMIT 1
    `, [req.params.id]);

    if (booking.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const history = await query(`
      SELECT *
      FROM booking_status_history
      WHERE booking_id = $1
      ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({ booking: booking.rows[0], history: history.rows });
  } catch (error) {
    console.error('Booking detail error:', error);
    res.status(500).json({ error: 'Failed to load booking details', details: error.message });
  }
});

app.patch('/api/admin/bookings/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body;

    const existing = await query('SELECT status FROM bookings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const result = await query(`
      UPDATE bookings
      SET
        estimated_price = $1,
        final_price = $2,
        deposit_amount = $3,
        payment_status = $4,
        admin_notes = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      b.estimated_price === '' || b.estimated_price === undefined ? null : b.estimated_price,
      b.final_price === '' || b.final_price === undefined ? null : b.final_price,
      b.deposit_amount === '' || b.deposit_amount === undefined ? null : b.deposit_amount,
      b.payment_status || 'unpaid',
      normalizeText(b.admin_notes) || null,
      id
    ]);

    await query(
      'INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)',
      [id, existing.rows[0].status, existing.rows[0].status, 'admin', 'تم تحديث تفاصيل الطلب المالية والإدارية']
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update booking details error:', error);
    res.status(500).json({ error: 'Failed to update booking details', details: error.message });
  }
});

app.delete('/api/admin/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM bookings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    await query('DELETE FROM booking_status_history WHERE booking_id = $1', [id]);
    await query('DELETE FROM bookings WHERE id = $1', [id]);

    res.json({ ok: true, deleted_id: id });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ error: 'Failed to delete booking', details: error.message });
  }
});

app.delete('/api/admin/artists/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM artists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    await query(`
      UPDATE bookings
      SET assigned_artist_id = NULL,
          status = CASE WHEN status = 'artist_assigned' THEN 'confirmed' ELSE status END,
          updated_at = NOW()
      WHERE assigned_artist_id = $1
    `, [id]);

    await query('DELETE FROM artists WHERE id = $1', [id]);

    res.json({ ok: true, deleted_id: id });
  } catch (error) {
    console.error('Delete artist error:', error);
    res.status(500).json({ error: 'Failed to delete artist', details: error.message });
  }
});


app.get('/api/admin/services', async (req, res) => {
  try {
    const result = await query('SELECT * FROM services ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Admin services list error:', error);
    res.status(500).json({ error: 'Failed to load services', details: error.message });
  }
});

app.post('/api/admin/services', async (req, res) => {
  try {
    const s = req.body;
    const result = await query(`
      INSERT INTO services (name, description, min_price, max_price, estimated_duration, status)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [
      normalizeText(s.name),
      normalizeText(s.description) || null,
      s.min_price === '' || s.min_price === undefined ? null : s.min_price,
      s.max_price === '' || s.max_price === undefined ? null : s.max_price,
      normalizeText(s.estimated_duration) || null,
      s.status || 'active'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service', details: error.message });
  }
});

app.patch('/api/admin/services/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await query(
      'UPDATE services SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status || 'active', id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update service status error:', error);
    res.status(500).json({ error: 'Failed to update service status', details: error.message });
  }
});


app.delete('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM services WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    await query('UPDATE bookings SET service_id = NULL, updated_at = NOW() WHERE service_id = $1', [id]);
    await query('DELETE FROM services WHERE id = $1', [id]);

    res.json({ ok: true, deleted_id: id });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service', details: error.message });
  }
});

app.get('/api/admin/cities', async (req, res) => {
  try {
    const result = await query('SELECT * FROM cities ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Admin cities list error:', error);
    res.status(500).json({ error: 'Failed to load cities', details: error.message });
  }
});

app.post('/api/admin/cities', async (req, res) => {
  try {
    const c = req.body;
    const result = await query(`
      INSERT INTO cities (name_ar, name_en, status)
      VALUES ($1,$2,$3)
      RETURNING *
    `, [
      normalizeText(c.name_ar),
      normalizeText(c.name_en) || normalizeText(c.name_ar),
      c.status || 'active'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create city error:', error);
    res.status(500).json({ error: 'Failed to create city', details: error.message });
  }
});

app.patch('/api/admin/cities/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await query(
      'UPDATE cities SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status || 'active', id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'City not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update city status error:', error);
    res.status(500).json({ error: 'Failed to update city status', details: error.message });
  }
});


app.delete('/api/admin/cities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM cities WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    await query(`
      UPDATE bookings
      SET district_id = NULL, updated_at = NOW()
      WHERE district_id IN (SELECT id FROM districts WHERE city_id = $1)
    `, [id]);
    await query('UPDATE bookings SET city_id = NULL, updated_at = NOW() WHERE city_id = $1', [id]);
    await query('UPDATE customers SET city_id = NULL, updated_at = NOW() WHERE city_id = $1', [id]);
    await query('UPDATE artists SET city_id = NULL, updated_at = NOW() WHERE city_id = $1', [id]);
    await query('DELETE FROM districts WHERE city_id = $1', [id]);
    await query('DELETE FROM cities WHERE id = $1', [id]);

    res.json({ ok: true, deleted_id: id });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ error: 'Failed to delete city', details: error.message });
  }
});

app.get('/api/admin/districts', async (req, res) => {
  try {
    const result = await query(`
      SELECT d.*, c.name_ar AS city_name
      FROM districts d
      LEFT JOIN cities c ON c.id = d.city_id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Admin districts list error:', error);
    res.status(500).json({ error: 'Failed to load districts', details: error.message });
  }
});

app.post('/api/admin/districts', async (req, res) => {
  try {
    const d = req.body;
    let cityId = d.city_id || null;

    if (!cityId && d.city) {
      cityId = await findOrCreateCity(d.city);
    }

    if (!cityId) {
      return res.status(400).json({ error: 'City is required for district' });
    }

    const result = await query(`
      INSERT INTO districts (city_id, name_ar, name_en, status)
      VALUES ($1,$2,$3,$4)
      RETURNING *
    `, [
      cityId,
      normalizeText(d.name_ar),
      normalizeText(d.name_en) || normalizeText(d.name_ar),
      d.status || 'active'
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create district error:', error);
    res.status(500).json({ error: 'Failed to create district', details: error.message });
  }
});

app.patch('/api/admin/districts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await query(
      'UPDATE districts SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status || 'active', id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'District not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update district status error:', error);
    res.status(500).json({ error: 'Failed to update district status', details: error.message });
  }
});


app.delete('/api/admin/districts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM districts WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'District not found' });
    }

    await query('UPDATE bookings SET district_id = NULL, updated_at = NOW() WHERE district_id = $1', [id]);
    await query('DELETE FROM districts WHERE id = $1', [id]);

    res.json({ ok: true, deleted_id: id });
  } catch (error) {
    console.error('Delete district error:', error);
    res.status(500).json({ error: 'Failed to delete district', details: error.message });
  }
});

app.get('/api/admin/calendar', async (req, res) => {
  try {
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const to = req.query.to || from;

    const result = await query(`
      SELECT
        b.id,
        b.booking_date,
        b.booking_time,
        b.status,
        b.payment_status,
        b.final_price,
        c.name AS customer_name,
        c.phone AS customer_phone,
        city.name_ar AS city_name,
        d.name_ar AS district_name,
        s.name AS service_name,
        a.name AS artist_name,
        a.phone AS artist_phone
      FROM bookings b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN cities city ON city.id = b.city_id
      LEFT JOIN districts d ON d.id = b.district_id
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN artists a ON a.id = b.assigned_artist_id
      WHERE b.booking_date BETWEEN $1 AND $2
      ORDER BY b.booking_date ASC, b.booking_time ASC
    `, [from, to]);

    res.json(result.rows);
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).json({ error: 'Failed to load calendar', details: error.message });
  }
});



// Customer mobile app catalog and booking lookup - v1.2
app.get('/api/customer/catalog', async (req, res) => {
  try {
    const [cities, districts, services] = await Promise.all([
      query("SELECT * FROM cities WHERE status='active' ORDER BY name_ar"),
      query("SELECT d.*, c.name_ar AS city_name FROM districts d LEFT JOIN cities c ON c.id=d.city_id WHERE d.status='active' ORDER BY d.name_ar"),
      query("SELECT * FROM services WHERE status='active' ORDER BY min_price NULLS LAST")
    ]);
    res.json({ cities: cities.rows, districts: districts.rows, services: services.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer catalog', details: error.message });
  }
});

app.get('/api/customer/bookings', async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const result = await query(`
      SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, city.name_ar AS city_name,
             d.name_ar AS district_name, s.name AS service_name, a.name AS artist_name
      FROM bookings b
      LEFT JOIN customers c ON c.id=b.customer_id
      LEFT JOIN cities city ON city.id=b.city_id
      LEFT JOIN districts d ON d.id=b.district_id
      LEFT JOIN services s ON s.id=b.service_id
      LEFT JOIN artists a ON a.id=b.assigned_artist_id
      WHERE c.phone=$1
      ORDER BY b.created_at DESC
    `, [phone]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer bookings', details: error.message });
  }
});

app.get('/api/customer/bookings/:id', async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!phone) return res.status(400).json({ error: 'phone is required' });
    const result = await query(`
      SELECT b.*, c.name AS customer_name, c.phone AS customer_phone, city.name_ar AS city_name,
             d.name_ar AS district_name, s.name AS service_name, a.name AS artist_name
      FROM bookings b
      LEFT JOIN customers c ON c.id=b.customer_id
      LEFT JOIN cities city ON city.id=b.city_id
      LEFT JOIN districts d ON d.id=b.district_id
      LEFT JOIN services s ON s.id=b.service_id
      LEFT JOIN artists a ON a.id=b.assigned_artist_id
      WHERE b.id=$1 AND c.phone=$2
      LIMIT 1
    `, [req.params.id, phone]);
    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load customer booking', details: error.message });
  }
});

// Mock OTP endpoints for v1.2 local testing. Replace with real SMS provider before production.
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

// Lightweight image upload placeholder: accepts a data URL and returns it.
app.post('/api/uploads/design-image', async (req, res) => {
  try {
    const { image_data_url } = req.body;
    if (!image_data_url || typeof image_data_url !== 'string') {
      return res.status(400).json({ error: 'image_data_url is required for the local placeholder upload.' });
    }
    res.json({ ok: true, url: image_data_url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

// Artist availability and review management - v1.3
app.get('/api/admin/artists/:id/profile', async (req, res) => {
  try {
    const artist = await query(`
      SELECT a.*, c.name_ar AS city_name,
             COUNT(DISTINCT b.id)::int AS total_bookings,
             COUNT(DISTINCT CASE WHEN b.status='completed' THEN b.id END)::int AS completed_bookings,
             ROUND(AVG(r.overall_rating)::numeric, 1) AS review_rating,
             COUNT(DISTINCT r.id)::int AS review_count
      FROM artists a
      LEFT JOIN cities c ON c.id=a.city_id
      LEFT JOIN bookings b ON b.assigned_artist_id=a.id
      LEFT JOIN artist_reviews r ON r.artist_id=a.id
      WHERE a.id=$1
      GROUP BY a.id, c.name_ar
    `, [req.params.id]);
    if (!artist.rows.length) return res.status(404).json({ error: 'Artist not found' });
    const availability = await query('SELECT * FROM artist_availability WHERE artist_id=$1 ORDER BY available_date DESC, from_time ASC', [req.params.id]);
    const reviews = await query(`
      SELECT r.*, b.booking_date, c.name AS customer_name, s.name AS service_name
      FROM artist_reviews r
      LEFT JOIN bookings b ON b.id=r.booking_id
      LEFT JOIN customers c ON c.id=b.customer_id
      LEFT JOIN services s ON s.id=b.service_id
      WHERE r.artist_id=$1
      ORDER BY r.created_at DESC
    `, [req.params.id]);
    res.json({ artist: artist.rows[0], availability: availability.rows, reviews: reviews.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load artist profile', details: error.message });
  }
});

app.get('/api/admin/artist-availability', async (req, res) => {
  try {
    const artistId = req.query.artist_id;
    const params = [];
    let where = '';
    if (artistId) { params.push(artistId); where = 'WHERE av.artist_id=$1'; }
    const result = await query(`
      SELECT av.*, a.name AS artist_name
      FROM artist_availability av
      LEFT JOIN artists a ON a.id=av.artist_id
      ${where}
      ORDER BY av.available_date DESC, av.from_time ASC
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load availability', details: error.message });
  }
});

app.post('/api/admin/artist-availability', async (req, res) => {
  try {
    const a = req.body;
    if (!a.artist_id || !a.available_date) return res.status(400).json({ error: 'artist_id and available_date are required' });
    const result = await query(`
      INSERT INTO artist_availability (artist_id, available_date, from_time, to_time, is_available, note)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [a.artist_id, a.available_date, a.from_time || null, a.to_time || null, a.is_available !== false, normalizeText(a.note) || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create availability', details: error.message });
  }
});

app.delete('/api/admin/artist-availability/:id', async (req, res) => {
  try {
    await query('DELETE FROM artist_availability WHERE id=$1', [req.params.id]);
    res.json({ ok: true, deleted_id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete availability', details: error.message });
  }
});

app.get('/api/admin/artist-reviews', async (req, res) => {
  try {
    const artistId = req.query.artist_id;
    const params = [];
    let where = '';
    if (artistId) { params.push(artistId); where = 'WHERE r.artist_id=$1'; }
    const result = await query(`
      SELECT r.*, a.name AS artist_name, b.booking_date, c.name AS customer_name, s.name AS service_name
      FROM artist_reviews r
      LEFT JOIN artists a ON a.id=r.artist_id
      LEFT JOIN bookings b ON b.id=r.booking_id
      LEFT JOIN customers c ON c.id=b.customer_id
      LEFT JOIN services s ON s.id=b.service_id
      ${where}
      ORDER BY r.created_at DESC
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load artist reviews', details: error.message });
  }
});

app.post('/api/admin/artist-reviews', async (req, res) => {
  try {
    const r = req.body;
    if (!r.artist_id) return res.status(400).json({ error: 'artist_id is required' });
    const scores = [r.punctuality, r.quality, r.customer_handling].map(v => Number(v || 0)).filter(v => v > 0);
    const overall = r.overall_rating || (scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : null);
    const result = await query(`
      INSERT INTO artist_reviews (artist_id, booking_id, punctuality, quality, customer_handling, overall_rating, suitable_for_brides, suitable_for_groups, note)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [
      r.artist_id,
      r.booking_id || null,
      r.punctuality || null,
      r.quality || null,
      r.customer_handling || null,
      overall,
      !!r.suitable_for_brides,
      !!r.suitable_for_groups,
      normalizeText(r.note) || null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create artist review', details: error.message });
  }
});

app.delete('/api/admin/artist-reviews/:id', async (req, res) => {
  try {
    await query('DELETE FROM artist_reviews WHERE id=$1', [req.params.id]);
    res.json({ ok: true, deleted_id: req.params.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete artist review', details: error.message });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Beauty Home Service API running on port ${PORT}`));
}

export default app;

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-jwt-secret-with-at-least-32-characters';

const { default: app, buildOtpResponse } = await import('../src/server.js');
const { pool, query } = await import('../src/db.js');

const marker = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
const fixture = {};

async function insert(sql, params) {
  const result = await query(sql, params);
  return result.rows[0];
}

before(async () => {
  fixture.region = await insert(`INSERT INTO regions (name_ar,name_en,status) VALUES ($1,$1,'active') RETURNING *`, [`E2E Region ${marker}`]);
  fixture.otherRegion = await insert(`INSERT INTO regions (name_ar,name_en,status) VALUES ($1,$1,'active') RETURNING *`, [`E2E Other Region ${marker}`]);
  fixture.city = await insert(`INSERT INTO cities (region_id,name_ar,name_en,status) VALUES ($1,$2,$2,'active') RETURNING *`, [fixture.region.id, `E2E City ${marker}`]);
  fixture.otherCity = await insert(`INSERT INTO cities (region_id,name_ar,name_en,status) VALUES ($1,$2,$2,'active') RETURNING *`, [fixture.otherRegion.id, `E2E Other City ${marker}`]);
  fixture.district = await insert(`INSERT INTO districts (city_id,name_ar,name_en,status) VALUES ($1,$2,$2,'active') RETURNING *`, [fixture.city.id, `E2E District ${marker}`]);
  fixture.otherDistrict = await insert(`INSERT INTO districts (city_id,name_ar,name_en,status) VALUES ($1,$2,$2,'active') RETURNING *`, [fixture.otherCity.id, `E2E Other District ${marker}`]);
  fixture.category = await insert(`INSERT INTO service_categories (name_ar,name_en,status) VALUES ($1,$1,'active') RETURNING *`, [`E2E Category ${marker}`]);
  fixture.otherCategory = await insert(`INSERT INTO service_categories (name_ar,name_en,status) VALUES ($1,$1,'active') RETURNING *`, [`E2E Other Category ${marker}`]);
  fixture.service = await insert(`INSERT INTO services (category_id,name,name_ar,name_en,status) VALUES ($1,$2,$2,$2,'active') RETURNING *`, [fixture.category.id, `E2E Service ${marker}`]);
  fixture.artist = await insert(`INSERT INTO artists (name,phone,region_id,city_id,main_expertise_category_id,status,availability_status) VALUES ($1,$2,$3,$4,$5,'active','available') RETURNING *`, [`E2E Beautician ${marker}`, `050${String(Date.now()).slice(-7)}`, fixture.region.id, fixture.city.id, fixture.category.id]);
  fixture.adminEmail = `e2e-${marker}@beauty.local`;
  fixture.adminPassword = 'E2e-Secure-Password!';
  fixture.admin = await insert(`INSERT INTO admin_users (name,email,password_hash,role,status) VALUES ('E2E Admin',$1,$2,'admin','active') RETURNING *`, [fixture.adminEmail, await bcrypt.hash(fixture.adminPassword, 10)]);
  fixture.phone = `+9665${String(Date.now()).slice(-8)}`;
});

after(async () => {
  if (fixture.booking?.id) {
    await query(`DELETE FROM booking_status_history WHERE booking_id=$1`, [fixture.booking.id]);
    await query(`DELETE FROM bookings WHERE id=$1`, [fixture.booking.id]);
  }
  await query(`DELETE FROM customer_otp_codes WHERE phone=$1`, [fixture.phone]).catch(() => null);
  await query(`DELETE FROM customers WHERE phone=$1`, [fixture.phone]).catch(() => null);
  await query(`DELETE FROM auth_login_attempts WHERE identity=$1`, [fixture.adminEmail]).catch(() => null);
  if (fixture.admin?.id) await query(`DELETE FROM admin_users WHERE id=$1`, [fixture.admin.id]);
  if (fixture.artist?.id) await query(`DELETE FROM artists WHERE id=$1`, [fixture.artist.id]);
  if (fixture.service?.id) await query(`DELETE FROM services WHERE id=$1`, [fixture.service.id]);
  if (fixture.category?.id) await query(`DELETE FROM service_categories WHERE id=$1`, [fixture.category.id]);
  if (fixture.otherCategory?.id) await query(`DELETE FROM service_categories WHERE id=$1`, [fixture.otherCategory.id]);
  if (fixture.district?.id) await query(`DELETE FROM districts WHERE id=$1`, [fixture.district.id]);
  if (fixture.otherDistrict?.id) await query(`DELETE FROM districts WHERE id=$1`, [fixture.otherDistrict.id]);
  if (fixture.city?.id) await query(`DELETE FROM cities WHERE id=$1`, [fixture.city.id]);
  if (fixture.otherCity?.id) await query(`DELETE FROM cities WHERE id=$1`, [fixture.otherCity.id]);
  if (fixture.region?.id) await query(`DELETE FROM regions WHERE id=$1`, [fixture.region.id]);
  if (fixture.otherRegion?.id) await query(`DELETE FROM regions WHERE id=$1`, [fixture.otherRegion.id]);
  await pool.end();
});

test('location and service endpoints apply their parent filters', async () => {
  const cities = await request(app).get('/api/cities').query({ region_id: fixture.region.id }).expect(200);
  assert.deepEqual(cities.body.map(row => row.id), [fixture.city.id]);
  const districts = await request(app).get('/api/districts').query({ region_id: fixture.region.id }).expect(200);
  assert.ok(districts.body.some(row => row.id === fixture.district.id));
  assert.ok(!districts.body.some(row => row.id === fixture.otherDistrict.id));
  const services = await request(app).get('/api/services').query({ category_id: fixture.category.id }).expect(200);
  assert.deepEqual(services.body.map(row => row.id), [fixture.service.id]);
});

test('booking rejects mismatched parent-child selections', async () => {
  const response = await request(app).post('/api/bookings').send({
    name: 'E2E Customer', phone: fixture.phone, region_id: fixture.region.id, city_id: fixture.city.id,
    district_id: fixture.otherDistrict.id, service_category_id: fixture.category.id, service_id: fixture.service.id,
    booking_date: '2030-01-01', booking_time: '18:00', address: 'E2E address', booking_source: 'web'
  }).expect(400);
  assert.equal(response.body.fields.district_id, 'wrong_parent');

  const wrongService = await request(app).post('/api/bookings').send({
    name: 'E2E Customer', phone: fixture.phone, region_id: fixture.region.id, city_id: fixture.city.id,
    district_id: fixture.district.id, service_category_id: fixture.otherCategory.id, service_id: fixture.service.id,
    booking_date: '2030-01-01', booking_time: '18:00', address: 'E2E address', booking_source: 'web'
  }).expect(400);
  assert.equal(wrongService.body.fields.service_id, 'wrong_parent');
});

test('booking, status, payment, and assignment flow persists', async () => {
  const login = await request(app).post('/api/admin/login').send({ email: fixture.adminEmail, password: fixture.adminPassword }).expect(200);
  fixture.adminToken = login.body.token;
  const auth = { Authorization: `Bearer ${login.body.token}` };
  const invalidCatalog = await request(app).post('/api/admin/cities').set(auth).send({ name_ar: 'Invalid city', region_id: 'not-a-uuid' }).expect(400);
  assert.equal(invalidCatalog.body.fields.region_id, 'invalid');
  const created = await request(app).post('/api/bookings').send({
    name: 'E2E Customer', phone: fixture.phone, region_id: fixture.region.id, city_id: fixture.city.id,
    district_id: fixture.district.id, service_category_id: fixture.category.id, service_id: fixture.service.id,
    booking_date: '2030-01-01', booking_time: '18:00', people_count: 2, address: 'E2E address', booking_source: 'web'
  }).expect(201);
  fixture.booking = created.body;
  assert.match(created.body.booking_number, /^BHS-\d{4}-\d{6}$/);

  const status = await request(app).patch(`/api/admin/bookings/${fixture.booking.id}/status`).set(auth).send({ status: 'confirmed' }).expect(200);
  assert.equal(status.body.booking.status, 'confirmed');
  const payment = await request(app).patch(`/api/admin/bookings/${fixture.booking.id}/payment`).set(auth).send({ payment_status: 'deposit_paid' }).expect(200);
  assert.equal(payment.body.payment_status, 'deposit_paid');
  const assignment = await request(app).patch(`/api/admin/bookings/${fixture.booking.id}/assign-artist`).set(auth).send({ artist_id: fixture.artist.id, force: true }).expect(200);
  assert.equal(assignment.body.assigned_artist_id, fixture.artist.id);
  assert.equal(assignment.body.status, 'beautician_assigned');
});

test('beautician coverage is normalized, validated, and used by matching', async () => {
  const auth = { Authorization: `Bearer ${fixture.adminToken}` };
  const invalid = await request(app).patch(`/api/admin/beauticians/${fixture.artist.id}/availability`).set(auth).send({
    coverage_region_ids: [fixture.region.id], coverage_city_ids: [fixture.otherCity.id], coverage_district_ids: []
  }).expect(400);
  assert.equal(invalid.body.fields.coverage_city_ids, 'wrong_parent');

  await request(app).patch(`/api/admin/beauticians/${fixture.artist.id}/availability`).set(auth).send({
    availability_status: 'available', working_days: [0,1,2,3,4,5,6], work_start_time: '08:00', work_end_time: '23:00',
    max_daily_bookings: 5, coverage_region_ids: [fixture.region.id], coverage_city_ids: [fixture.city.id], coverage_district_ids: [fixture.district.id]
  }).expect(200);
  const stored = await query(`SELECT
    (SELECT COUNT(*)::int FROM beautician_coverage_regions WHERE beautician_id=$1) AS regions,
    (SELECT COUNT(*)::int FROM beautician_coverage_cities WHERE beautician_id=$1) AS cities,
    (SELECT COUNT(*)::int FROM beautician_coverage_districts WHERE beautician_id=$1) AS districts`, [fixture.artist.id]);
  assert.deepEqual(stored.rows[0], { regions: 1, cities: 1, districts: 1 });

  const matching = await request(app).get('/api/beauticians').query({ district_id: fixture.district.id }).expect(200);
  assert.ok(matching.body.some(row => row.id === fixture.artist.id));
  const outside = await request(app).get('/api/beauticians').query({ district_id: fixture.otherDistrict.id }).expect(200);
  assert.ok(!outside.body.some(row => row.id === fixture.artist.id));
});

test('OTP is hashed, single-use, and never exposed by a production response', async () => {
  const requested = await request(app).post('/api/customer/auth/request-otp').send({ phone: fixture.phone }).expect(200);
  assert.equal(requested.body.dev_otp, '1234');
  const stored = await query(`SELECT otp_code FROM customer_otp_codes WHERE phone=$1 ORDER BY created_at DESC LIMIT 1`, [fixture.phone]);
  assert.notEqual(stored.rows[0].otp_code, '1234');
  assert.equal(await bcrypt.compare('1234', stored.rows[0].otp_code), true);

  const verified = await request(app).post('/api/customer/auth/verify-otp').send({ phone: fixture.phone, otp: '1234' }).expect(200);
  assert.ok(verified.body.token);
  const customerAuth = { Authorization: `Bearer ${verified.body.token}` };
  const wrongAddress = await request(app).post('/api/customer/addresses').set(customerAuth).send({
    region_id: fixture.region.id, city_id: fixture.city.id, district_id: fixture.otherDistrict.id, address: 'Wrong location'
  }).expect(400);
  assert.equal(wrongAddress.body.fields.district_id, 'wrong_parent');
  await request(app).get('/api/admin/dashboard').set(customerAuth).expect(401);
  await request(app).post('/api/customer/auth/verify-otp').send({ phone: fixture.phone, otp: '1234' }).expect(400);
  assert.equal(Object.hasOwn(buildOtpResponse('123456', true), 'dev_otp'), false);
});

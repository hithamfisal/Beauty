export class ApiValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ApiValidationError';
    this.status = 400;
    this.fields = fields;
  }
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertUuid(value, field, { optional = false } = {}) {
  if ((value == null || value === '') && optional) return null;
  if (!UUID_PATTERN.test(String(value || ''))) throw new ApiValidationError(`${field} must be a valid UUID`, { [field]: 'invalid' });
  return String(value);
}

export function uniqueUuidArray(value, field) {
  const items = Array.isArray(value) ? value : [];
  const unique = [...new Set(items.map(String).filter(Boolean))];
  unique.forEach(item => assertUuid(item, field));
  return unique;
}

export function normalizeSaudiPhone(value) {
  let digits = String(value || '').trim().replace(/\D/g, '');
  if (digits.startsWith('9665')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('5')) digits = `0${digits}`;
  digits = digits.slice(0, 10);
  return digits;
}

export function validatePhone(value) {
  const phone = normalizeSaudiPhone(value);
  if (!/^05\d{8}$/.test(phone)) throw new ApiValidationError('Phone number must be in 05xxxxxxxx format', { phone: 'invalid' });
  return phone;
}

export function validateBookingShape(body = {}) {
  const fields = {};
  if (!body.customer_id && !String(body.phone || '').trim()) fields.phone = 'required';
  if (!body.region_id && !String(body.region || '').trim()) fields.region_id = 'required';
  if (!body.city_id && !String(body.city || '').trim()) fields.city_id = 'required';
  if (!body.district_id && !String(body.district || '').trim()) fields.district_id = 'required';
  if (!body.service_id && !String(body.service || body.service_name || body.service_type || '').trim()) fields.service_id = 'required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.booking_date || ''))) fields.booking_date = 'invalid';
  if (!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(body.booking_time || ''))) fields.booking_time = 'invalid';
  const peopleCount = Number(body.people_count ?? 1);
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 50) fields.people_count = 'must be between 1 and 50';
  const source = body.booking_source || body.source || 'web';
  if (!['web', 'mobile', 'admin', 'legacy'].includes(source)) fields.booking_source = 'invalid';
  if (Object.keys(fields).length) throw new ApiValidationError('Booking validation failed', fields);

  for (const field of ['customer_id','region_id','city_id','district_id','service_category_id','service_id','preferred_artist_id','beautician_id']) {
    if (body[field]) assertUuid(body[field], field);
  }
  if (body.phone) validatePhone(body.phone);
  return { peopleCount, source };
}

export function validationResponse(error, res) {
  if (!(error instanceof ApiValidationError)) return false;
  res.status(error.status).json({ error: error.message, fields: error.fields });
  return true;
}

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, MapPin, Search, Sparkles, Star, UserCheck, MessageCircle, ImagePlus, Clock3, CheckCircle2, Home as HomeIcon, PlusSquare, Users, ClipboardList, UserCircle, Bell, Phone, LogIn, ShieldCheck, Scissors, Palette, Heart, ChevronRight } from 'lucide-react';
import './style.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
const DEFAULT_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'beauty-home-service';
function detectTenantSlug() {
  const qs = new URLSearchParams(window.location.search);
  const querySlug = qs.get('tenant') || qs.get('tenant_slug');
  if (querySlug) return querySlug.trim().toLowerCase();
  const firstSegment = window.location.pathname.split('/').filter(Boolean)[0];
  if (firstSegment && !['app','customer','index.html'].includes(firstSegment)) return firstSegment.trim().toLowerCase();
  return localStorage.getItem('beauty_tenant_slug') || DEFAULT_TENANT_SLUG;
}
const TENANT_SLUG = detectTenantSlug();
localStorage.setItem('beauty_tenant_slug', TENANT_SLUG);

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: { 'Content-Type': 'application/json', 'x-tenant-slug': TENANT_SLUG, ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text || 'رد غير صالح من الخادم' }; }
  if (!res.ok) throw new Error(data?.error || data?.details || `HTTP ${res.status}`);
  return data;
}

const emptyBooking = {
  customer_name: '', phone: '', region_id: '', city_id: '', district_id: '', event_type: 'زواج',
  service_category_id: '', service_id: '', preferred_artist_id: '', booking_date: '', booking_time: '', alternate_time: '',
  people_count: 1, address: '', contact_preference: 'whatsapp', design_image_url: '', customer_notes: ''
};

function label(item) { return item?.name_ar || item?.display_name || item?.name || item?.title_ar || item?.name_en || '-'; }
function sameId(a, b) { return String(a || '') === String(b || ''); }
function money(v) { return v == null || v === '' ? '' : `${Number(v).toLocaleString('ar-SA')} ر.س`; }
function fmtDate(v) { try { return v ? new Date(v).toLocaleDateString('ar-SA') : '-'; } catch { return v || '-'; } }
function shortTime(v) { return v ? String(v).slice(0, 5) : '-'; }

const STATUS_LABELS = {
  new: 'طلب جديد',
  under_review: 'قيد المراجعة',
  waiting_customer_confirmation: 'بانتظار تأكيد العميلة',
  confirmed: 'تم تأكيد الحجز',
  beautician_assigned: 'تم تعيين خبيرة التجميل',
  artist_assigned: 'تم تعيين خبيرة التجميل',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  pending: 'قيد المراجعة',
  unavailable: 'غير متاح'
};
const PAYMENT_LABELS = {
  unpaid: 'غير مدفوع',
  deposit_paid: 'عربون مدفوع',
  paid: 'مدفوع بالكامل',
  refunded: 'مسترجع'
};
const SOURCE_LABELS = {
  mobile: 'الجوال',
  web: 'الويب',
  admin: 'الإدارة',
  legacy: 'قديم',
  unknown: 'غير محدد'
};
function statusLabel(v) { return STATUS_LABELS[String(v || '').trim()] || v || '-'; }
function paymentLabel(v) { return PAYMENT_LABELS[String(v || 'unpaid').trim()] || v || 'غير مدفوع'; }
function sourceLabel(v, fallback) { return fallback || SOURCE_LABELS[String(v || 'unknown').trim()] || v || 'غير محدد'; }


const PHONE_PLACEHOLDER = '05xxxxxxxx';
function formatSaudiPhoneInput(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('9665')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('05')) digits = digits;
  else if (digits.startsWith('5')) digits = `05${digits.slice(1)}`;
  else if (digits === '0') digits = '05';
  else if (digits.startsWith('0') && !digits.startsWith('05')) digits = `05${digits.slice(1)}`;
  else if (!digits.startsWith('0')) digits = `05${digits}`;
  return digits.slice(0, 10);
}
function phoneMask(value) {
  const digits = formatSaudiPhoneInput(value);
  const tail = digits.startsWith('05') ? digits.slice(2, 10) : '';
  return `05${tail.padEnd(8, 'x')}`;
}
function isSaudiPhone(value) { return /^05\d{8}$/.test(formatSaudiPhoneInput(value)); }
function PhoneInput({ value, onChange, disabled = false, required = false, placeholder = PHONE_PLACEHOLDER }) {
  const actualValue = formatSaudiPhoneInput(value);
  const displayValue = phoneMask(actualValue);
  const updateFromText = text => onChange?.(formatSaudiPhoneInput(text));
  return <input
    type="tel"
    inputMode="numeric"
    dir="ltr"
    className="phoneMaskInput"
    value={displayValue}
    disabled={disabled}
    required={required}
    maxLength={18}
    placeholder={placeholder}
    autoComplete="tel"
    onFocus={e => requestAnimationFrame(() => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length))}
    onClick={e => requestAnimationFrame(() => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length))}
    onPaste={e => { e.preventDefault(); updateFromText(e.clipboardData.getData('text')); }}
    onKeyDown={e => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onChange?.(actualValue.length <= 2 ? '' : actualValue.slice(0, -1));
      }
    }}
    onChange={e => updateFromText(e.target.value)}
    onBlur={e => updateFromText(e.target.value)}
    title="رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx"
  />;
}


function Select({ value, onChange, children, disabled }) {
  return <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}>{children}</select>;
}
function Input(props) { return <input {...props} onChange={e => props.onChange?.(e.target.value)} />; }
function TextArea(props) { return <textarea {...props} onChange={e => props.onChange?.(e.target.value)} />; }
function OptionList({ items, empty }) {
  return <><option value="">{empty || 'اختر'}</option>{items.map(x => <option key={x.id} value={x.id}>{label(x)}</option>)}</>;
}
function Field({ label, children, className = "" }) { return <label className={`field ${className}`.trim()}><span>{label}</span>{children}</label>; }

function App() {
  const [tab, setTab] = useState('home');
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [occasionTypes, setOccasionTypes] = useState([]);
  const [beauticians, setBeauticians] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [booking, setBooking] = useState(emptyBooking);
  const [trackingPhone, setTrackingPhone] = useState('');
  const [trackingResults, setTrackingResults] = useState([]);
  const [selectedBeautician, setSelectedBeautician] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('beauty_customer_token') || '');
  const [customer, setCustomer] = useState(null);
  const [authPhone, setAuthPhone] = useState('');
  const [authName, setAuthName] = useState('');
  const [bookingMode, setBookingMode] = useState(() => localStorage.getItem('beauty_customer_token') ? 'account' : 'guest');
  const [otp, setOtp] = useState('');
  const [accountBookings, setAccountBookings] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState({ label:'المنزل', region_id:'', city_id:'', district_id:'', address:'', is_default:true });

  useEffect(() => { init(); }, []);
  useEffect(() => { loadCities(booking.region_id); }, [booking.region_id]);
  useEffect(() => { loadDistricts(booking.city_id); }, [booking.city_id]);
  useEffect(() => { loadServices(booking.service_category_id); }, [booking.service_category_id]);
  useEffect(() => { loadBeauticians(); loadPortfolio(); }, [booking.region_id, booking.city_id, booking.district_id, booking.service_id, booking.service_category_id]);
  useEffect(() => { if (customerToken) loadAccount(); }, [customerToken]);

  useEffect(() => { if (customerToken && customer) applyCustomerToBooking(customer, addresses); }, [customerToken, customer, addresses]);

  function applyCustomerToBooking(customerData, customerAddresses = []) {
    const defaultAddress = (customerAddresses || []).find(a => a.is_default) || (customerAddresses || [])[0];
    setBooking(b => ({
      ...b,
      customer_name: b.customer_name || customerData?.name || '',
      phone: b.phone || formatSaudiPhoneInput(customerData?.phone) || '',
      region_id: b.region_id || customerData?.region_id || defaultAddress?.region_id || '',
      city_id: b.city_id || customerData?.city_id || defaultAddress?.city_id || '',
      district_id: b.district_id || customerData?.district_id || defaultAddress?.district_id || '',
      address: b.address || defaultAddress?.address || ''
    }));
  }

  async function init() {
    try {
      const tenantProfile = await api('/tenant');
      setTenant(tenantProfile || null);
      document.title = tenantProfile?.business_name ? `${tenantProfile.business_name} | الحجز` : 'منصة حجز خدمات التجميل';
      const [r, sc, p, ot] = await Promise.all([api('/regions'), api('/service-categories'), api('/portfolio'), api('/occasion-types')]);
      setRegions(r || []); setCategories(sc || []); setPortfolio(p || []); setOccasionTypes(ot || []);
      if (!booking.event_type && Array.isArray(ot) && ot[0]) setBookingField('event_type', ot[0].name_ar || ot[0].name_en || 'مناسبة خاصة');
      await Promise.all([loadCities(''), loadDistricts(''), loadServices(''), loadBeauticians()]);
    } catch (e) { setMessage(`تعذر تحميل البيانات: ${e.message}`); }
  }
  async function loadCities(regionId = booking.region_id) {
    try {
      const r = await api(regionId ? `/cities?region_id=${encodeURIComponent(regionId)}` : '/cities');
      setCities(r || []);
    }
    catch (e) { setMessage(`تعذر تحميل المدن: ${e.message}`); }
  }
  async function loadDistricts(cityId = booking.city_id, regionId = booking.region_id) {
    try {
      const path = cityId
        ? `/districts?city_id=${encodeURIComponent(cityId)}`
        : (regionId ? `/districts?region_id=${encodeURIComponent(regionId)}` : '/districts');
      const r = await api(path);
      setDistricts(r || []);
    }
    catch (e) { setMessage(`تعذر تحميل الأحياء: ${e.message}`); }
  }
  async function loadServices(categoryId = booking.service_category_id) {
    try {
      const r = await api(categoryId ? `/services?category_id=${encodeURIComponent(categoryId)}` : '/services');
      setServices(r || []);
    }
    catch (e) { setMessage(`تعذر تحميل الخدمات: ${e.message}`); }
  }
  async function loadBeauticians() {
    try {
      const qs = new URLSearchParams();
      if (booking.region_id) qs.set('region_id', booking.region_id);
      if (booking.city_id) qs.set('city_id', booking.city_id);
      if (booking.district_id) qs.set('district_id', booking.district_id);
      if (booking.service_id) qs.set('service_id', booking.service_id);
      else if (booking.service_category_id) qs.set('category_id', booking.service_category_id);
      let r = await api(`/beauticians${qs.toString() ? `?${qs}` : ''}`);
      // لا نترك قائمة اختيار الخبيرة فارغة: إذا لم توجد مطابقة دقيقة نعرض كل الخبيرات المتاحات مع بقاء خيار الدعم.
      if ((!r || !r.length) && qs.toString()) r = await api('/beauticians');
      setBeauticians(r || []);
    } catch (e) { setMessage(`تعذر تحميل الخبيرات: ${e.message}`); }
  }
  async function loadPortfolio() {
    try {
      const qs = new URLSearchParams();
      if (booking.service_id) qs.set('service_id', booking.service_id);
      else if (booking.service_category_id) qs.set('category_id', booking.service_category_id);
      let r = await api(`/portfolio${qs.toString() ? `?${qs}` : ''}`);
      // إذا لم توجد نماذج مطابقة للخدمة المحددة، نرجع للقسم ثم للمعرض العام حتى تظهر نماذج للعميلة.
      if ((!r || !r.length) && booking.service_id && booking.service_category_id) r = await api(`/portfolio?category_id=${booking.service_category_id}`);
      if ((!r || !r.length) && qs.toString()) r = await api('/portfolio');
      setPortfolio(r || []);
    } catch (e) { setMessage(`تعذر تحميل المعرض: ${e.message}`); }
  }
  function setBookingField(k, v) {
    setBooking(b => {
      const next = { ...b, [k]: v };
      if (k === 'region_id') { next.city_id = ''; next.district_id = ''; }
      if (k === 'city_id') next.district_id = '';
      if (k === 'service_category_id') { next.service_id = ''; next.preferred_artist_id = ''; }
      if (k === 'service_id') next.preferred_artist_id = '';
      return next;
    });
  }
  async function uploadImage(file) {
    if (!file) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      const uploaded = await api('/uploads/design-image', { method: 'POST', body: JSON.stringify({ image_data_url: dataUrl, folder: 'beauty-home-service/customer-web' }) });
      setBookingField('design_image_url', uploaded.url);
      setMessage('تم رفع صورة التصميم بنجاح.');
    } catch (e) { setMessage(`تعذر رفع الصورة: ${e.message}`); }
    finally { setLoading(false); }
  }
  async function submitBooking(e) {
    e.preventDefault(); setLoading(true); setMessage('');
    try {
      const customerPhone = formatSaudiPhoneInput(booking.phone);
      if (!isSaudiPhone(customerPhone)) throw new Error('رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx');
      const payload = { ...booking, phone: customerPhone, customer_phone: customerPhone, people_count: Number(booking.people_count || 1), booking_source: 'web', booking_customer_mode: customerToken && bookingMode === 'account' ? 'account' : 'guest' };
      const created = await api('/bookings', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(`تم إرسال الطلب بنجاح. رقم الطلب: ${created.booking_number || created.id}`);
      if (customerToken && bookingMode === 'account' && customer) {
        const defaultAddress = (addresses || []).find(a => a.is_default) || (addresses || [])[0];
        setBooking({ ...emptyBooking, customer_name: customer?.name || '', phone: formatSaudiPhoneInput(customer?.phone) || '', region_id: customer?.region_id || defaultAddress?.region_id || '', city_id: customer?.city_id || defaultAddress?.city_id || '', district_id: customer?.district_id || defaultAddress?.district_id || '', address: defaultAddress?.address || '' });
      } else {
        setBooking(emptyBooking);
      }
      setTab('track');
      setTrackingPhone(payload.phone);
    } catch (e) { setMessage(`تعذر إرسال الطلب: ${e.message}`); }
    finally { setLoading(false); }
  }
  async function trackBookings(e) {
    e?.preventDefault?.(); setLoading(true); setMessage('');
    try {
      const normalizedPhone = formatSaudiPhoneInput(trackingPhone);
      if (!isSaudiPhone(normalizedPhone)) throw new Error('رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx');
      const r = await api(`/customer/bookings?phone=${encodeURIComponent(normalizedPhone)}`);
      setTrackingResults(r || []);
      if (!r?.length) setMessage('لا توجد طلبات لهذا الرقم.');
    } catch (e) { setMessage(`تعذر متابعة الطلبات: ${e.message}`); }
    finally { setLoading(false); }
  }
  async function openBeautician(id) {
    setLoading(true);
    try { setSelectedBeautician(await api(`/beauticians/${id}`)); setTab('beautician'); }
    catch (e) { setMessage(`تعذر فتح تفاصيل الخبيرة: ${e.message}`); }
    finally { setLoading(false); }
  }

  async function requestOtp(e) {
    e?.preventDefault?.(); setLoading(true); setMessage('');
    try {
      const normalizedPhone = formatSaudiPhoneInput(authPhone);
      if (!isSaudiPhone(normalizedPhone)) throw new Error('رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx');
      const r = await api('/customer/auth/request-otp', { method:'POST', body: JSON.stringify({ phone: normalizedPhone, name: authName }) });
      setAuthPhone(normalizedPhone);
      setMessage(`تم إرسال رمز التحقق. رمز التجربة: ${r.dev_otp || 'تم الإرسال'}`);
    } catch(e) { setMessage(`تعذر إرسال رمز التحقق: ${e.message}`); }
    finally { setLoading(false); }
  }

  async function verifyOtp(e) {
    e?.preventDefault?.(); setLoading(true); setMessage('');
    try {
      const normalizedPhone = formatSaudiPhoneInput(authPhone);
      if (!isSaudiPhone(normalizedPhone)) throw new Error('رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx');
      const r = await api('/customer/auth/verify-otp', { method:'POST', body: JSON.stringify({ phone: normalizedPhone, otp }) });
      setAuthPhone(normalizedPhone);
      localStorage.setItem('beauty_customer_token', r.token);
      setCustomerToken(r.token); setCustomer(r.customer); setMessage('تم تسجيل الدخول لحساب العميلة.');
      await loadAccount(r.token);
    } catch(e) { setMessage(`تعذر التحقق: ${e.message}`); }
    finally { setLoading(false); }
  }

  async function loadAccount(token = customerToken) {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [me, myBookings, myAddresses] = await Promise.all([
        api('/customer/me', { headers }), api('/customer/my-bookings', { headers }), api('/customer/addresses', { headers })
      ]);
      setCustomer(me); setAuthPhone(formatSaudiPhoneInput(me?.phone) || ''); setAuthName(me?.name || ''); setAccountBookings(myBookings || []); setAddresses(myAddresses || []); applyCustomerToBooking(me, myAddresses || []);
    } catch(e) { setMessage(`تعذر تحميل الحساب: ${e.message}`); }
  }

  async function saveAddress(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api('/customer/addresses', { method:'POST', headers:{ Authorization:`Bearer ${customerToken}` }, body: JSON.stringify(addressForm) });
      setMessage('تم حفظ العنوان.'); setAddressForm({ label:'المنزل', region_id:'', city_id:'', district_id:'', address:'', is_default:true }); await loadAccount();
    } catch(e) { setMessage(`تعذر حفظ العنوان: ${e.message}`); }
    finally { setLoading(false); }
  }

  function logoutCustomer() { localStorage.removeItem('beauty_customer_token'); setCustomerToken(''); setCustomer(null); setAccountBookings([]); setAddresses([]); setBookingMode('guest'); }

  const bookingCities = useMemo(() => cities.filter(c => !booking.region_id || sameId(c.region_id, booking.region_id)), [cities, booking.region_id]);
  const bookingDistricts = useMemo(() => districts.filter(d => {
    if (booking.city_id) return sameId(d.city_id, booking.city_id);
    if (booking.region_id) {
      const city = cities.find(c => String(c.id) === String(d.city_id));
      return city && sameId(city.region_id, booking.region_id);
    }
    return true;
  }), [districts, cities, booking.city_id, booking.region_id]);
  const bookingServices = useMemo(() => services.filter(s => !booking.service_category_id || sameId(s.category_id, booking.service_category_id)), [services, booking.service_category_id]);

  const navItems = [
    { id: 'home', label: 'الرئيسية', ar: 'الرئيسية', icon: <HomeIcon size={22}/> },
    { id: 'booking', label: 'طلب حجز', ar: 'طلب حجز', icon: <PlusSquare size={22}/> },
    { id: 'beauticians', label: 'الخبيرات', ar: 'الخبيرات', icon: <Users size={22}/> },
    { id: 'track', label: 'متابعة الطلب', ar: 'متابعة الطلب', icon: <ClipboardList size={22}/> },
    { id: 'account', label: 'حسابي', ar: 'حسابي', icon: <UserCircle size={22}/> }
  ];

  const tenantStyle = tenant ? {
    '--brand-primary': tenant.primary_color || '#E6C7C2',
    '--brand-secondary': tenant.secondary_color || '#FFFDF8',
    '--brand-accent': tenant.accent_color || '#DCC5A3'
  } : {};

  return <div className="app" style={tenantStyle}>
    <header className="siteHeader">
      <div className="brandBlock" onClick={() => setTab('home')} role="button" tabIndex={0}>
        <div className="brandMark">{tenant?.logo_url ? <img src={tenant.logo_url} alt={tenant.business_name || 'الشعار'} /> : <Sparkles size={30}/>}</div>
        <div><b>{tenant?.business_name || 'بيوتي هوم سيرفس'}</b><small>{tenant?.tagline_ar || 'خدمات تجميل منزلية'}</small></div>
      </div>
      <nav className="topNav" aria-label="تنقل العميلة">
        {navItems.map(item => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.icon}<span>{item.label}</span><small>{item.ar}</small></button>)}
      </nav>
      <div className="headerActions"><Search size={22}/><Bell size={22}/></div>
    </header>

    <section className="hero" style={tenant?.cover_image_url ? { backgroundImage: `linear-gradient(90deg, rgba(255,253,248,.95), rgba(255,253,248,.60)), url(${tenant.cover_image_url})` } : undefined}>
      <div className="heroText"><span>{tenant?.tagline_ar || 'خدمات تجميل منزلية'}</span><h1>{tenant?.business_name ? `احجزي مع ${tenant.business_name}` : 'احجزي خدمتك بسهولة وشاهدي أعمال الخبيرات قبل الاختيار'}</h1><p>{tenant?.description_ar || 'واجهة عميلة منظمة للحجز، عرض النماذج، متابعة الطلبات، والدخول برقم الجوال.'}</p><button className="primary" onClick={() => setTab('booking')} disabled={tenant?.public_booking_enabled === false}>{tenant?.public_booking_enabled === false ? 'الحجز غير متاح حالياً' : 'ابدئي طلب حجز'}</button></div>
    </section>

    <CustomerAccessStrip
      customerToken={customerToken}
      customer={customer}
      bookingMode={bookingMode}
      setBookingMode={setBookingMode}
      setTab={setTab}
      authName={authName}
      setAuthName={setAuthName}
      authPhone={authPhone}
      setAuthPhone={setAuthPhone}
      otp={otp}
      setOtp={setOtp}
      requestOtp={requestOtp}
      verifyOtp={verifyOtp}
      logoutCustomer={logoutCustomer}
    />

    {message && <div className="message">{message}</div>}
    {loading && <div className="loading">جاري التحميل...</div>}

    {tab === 'home' && <Home categories={categories} portfolio={portfolio} beauticians={beauticians} setTab={setTab} openBeautician={openBeautician} />}
    {tab === 'booking' && <BookingForm booking={booking} setBookingField={setBookingField} regions={regions} cities={bookingCities} districts={bookingDistricts} categories={categories} services={bookingServices} occasionTypes={occasionTypes} beauticians={beauticians} portfolio={portfolio} uploadImage={uploadImage} submitBooking={submitBooking} openBeautician={openBeautician} customerToken={customerToken} customer={customer} bookingMode={bookingMode} setBookingMode={setBookingMode} authName={authName} setAuthName={setAuthName} authPhone={authPhone} setAuthPhone={setAuthPhone} otp={otp} setOtp={setOtp} requestOtp={requestOtp} verifyOtp={verifyOtp} />}
    {tab === 'beauticians' && <BeauticiansPage beauticians={beauticians} portfolio={portfolio} openBeautician={openBeautician} />}
    {tab === 'beautician' && <BeauticianDetails data={selectedBeautician} choose={(id) => { setBookingField('preferred_artist_id', id); setTab('booking'); }} />}
    {tab === 'track' && <TrackPage phone={trackingPhone} setPhone={setTrackingPhone} results={trackingResults} submit={trackBookings} />}
    {tab === 'account' && <AccountPage customerToken={customerToken} customer={customer} authName={authName} setAuthName={setAuthName} authPhone={authPhone} setAuthPhone={setAuthPhone} otp={otp} setOtp={setOtp} requestOtp={requestOtp} verifyOtp={verifyOtp} logoutCustomer={logoutCustomer} bookings={accountBookings} addresses={addresses} addressForm={addressForm} setAddressForm={setAddressForm} saveAddress={saveAddress} regions={regions} cities={cities} districts={districts} />}

    <SiteFooter setTab={setTab} tenant={tenant} />
  </div>;
}


function CustomerAccessStrip({ customerToken, customer, bookingMode, setBookingMode, setTab, authName, setAuthName, authPhone, setAuthPhone, otp, setOtp, requestOtp, verifyOtp, logoutCustomer }) {
  const isLoggedIn = Boolean(customerToken && customer);
  return <section className="customerAccess">
    <div className="customerAccessHead">
      <div>
        <span className="eyebrow">دخول العميلة</span>
        <h2>احجزي بحسابك أو تابعي كضيفة</h2>
        <p>الحساب يعبئ الاسم ورقم الجوال والعنوان المحفوظ تلقائياً، والضيف يدخل البيانات داخل الطلب.</p>
      </div>
      <div className="accessActions">
        <button type="button" className={bookingMode === 'account' ? 'mode active' : 'mode'} onClick={() => { setBookingMode('account'); setTab('booking'); }}><LogIn size={18}/> تسجيل / دخول برقم الهاتف</button>
        <button type="button" className={bookingMode === 'guest' ? 'mode active' : 'mode'} onClick={() => { setBookingMode('guest'); setTab('booking'); }}><UserCircle size={18}/> المتابعة كضيف</button>
      </div>
    </div>

    {isLoggedIn ? <div className="signedInBox">
      <div className="signedProfile"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop" alt="العميلة"/><div><b>{customer?.name || customer?.phone}</b><small>{customer?.phone}</small></div></div>
      <div className="signedInActions"><button type="button" onClick={() => setTab('account')}>حسابي / طلباتي</button><button type="button" onClick={logoutCustomer}>تسجيل الخروج</button></div>
    </div> : <form className="quickLogin" onSubmit={verifyOtp}>
      <Input value={authName} onChange={setAuthName} placeholder="اسم العميلة للتسجيل أول مرة" />
      <PhoneInput value={authPhone} onChange={setAuthPhone} />
      <button type="button" onClick={requestOtp}>إرسال رمز التحقق</button>
      <Input value={otp} onChange={setOtp} placeholder="رمز التحقق" />
      <button className="primary" type="submit">دخول الحساب</button>
      <button type="button" className="guestBtn" onClick={() => { setBookingMode('guest'); setTab('booking'); }}>حجز كضيف</button>
      <small>رمز الاختبار المحلي: 1234. عند تفعيل الرسائل سيتم إرسال الرمز للعميلة.</small>
    </form>}
  </section>;
}

function Home({ categories, portfolio, beauticians, setTab, openBeautician }) {
  const previewCategories = categories.slice(0, 8);
  const serviceIcons = [<Scissors size={24}/>, <Palette size={24}/>, <Sparkles size={24}/>, <Heart size={24}/>];
  return <main className="container homeLayout">
    <section className="homeShowcase">
      <div className="homeWelcome">
        <span className="eyebrow">جمال فاخر وناعم</span>
        <h2>جمالكِ في بيتك بخطوات حجز واضحة وناعمة</h2>
        <p>اختاري القسم، الخدمة، الموعد، والموقع. بعد إرسال الطلب يتواصل معك فريق الدعم لتأكيد توفر الخبيرة والموعد.</p>
        <div className="homeSearch"><input placeholder="ابحثي عن حناء، مكياج، شعر، أظافر..."/><button className="primary" onClick={() => setTab('booking')}><Search size={18}/> حجز سريع</button></div>
      </div>
      <div className="homeAside">
        <div className="miniFeature"><CalendarDays/><div><b>رحلة حجز مختصرة</b><p>بيانات العميلة، الخدمة، الموعد، ثم ملخص الطلب.</p></div></div>
        <div className="miniFeature"><UserCheck/><div><b>خبيرات تجميل</b><p>عرض الأعمال والتقييمات قبل اختيار الخبيرة المناسبة.</p></div></div>
        <div className="miniFeature"><MessageCircle/><div><b>تأكيد عبر الدعم</b><p>فريق الدعم يتواصل لتأكيد التوفر والموقع.</p></div></div>
      </div>
    </section>

    <section className="dashStats">
      <Card icon={<Scissors/>} title="أقسام الخدمات" sub="أقسام الخدمات" value={categories.length}/>
      <Card icon={<UserCheck/>} title="خبيرات التجميل" sub="خبيرات متاحات" value={beauticians.length}/>
      <Card icon={<ImagePlus/>} title="نماذج الأعمال" sub="نماذج أعمال" value={portfolio.length}/>
    </section>

    <section className="panel servicePanel">
      <div className="sectionTitle"><div><small>Categories</small><h2>أقسام الخدمات</h2></div><button className="linkBtn" onClick={() => setTab('booking')}>عرض كل الخدمات <ChevronRight size={16}/></button></div>
      <div className="categoryGrid">{previewCategories.map((c, i) => <button className="categoryCard" key={c.id} onClick={() => setTab('booking')}><span>{serviceIcons[i % serviceIcons.length]}</span><b>{label(c)}</b><small>اختاري القسم للانتقال إلى الحجز</small></button>)}</div>
    </section>

    <section className="panel portfolioPanel">
      <div className="sectionTitle"><div><small>Featured Work</small><h2>نماذج مميزة من أعمال الخبيرات</h2></div><button className="linkBtn" onClick={() => setTab('beauticians')}>عرض الخبيرات <ChevronRight size={16}/></button></div>
      <PortfolioGrid items={portfolio.slice(0,4)} compact />
    </section>

    <section className="panel expertStrip">
      <div className="sectionTitle"><div><small>Recommended Experts</small><h2>خبيرات مميزات</h2></div></div>
      <BeauticianGrid items={beauticians.slice(0,3)} openBeautician={openBeautician} compact />
    </section>
  </main>
}
function Card({ icon, title, sub, value }) { return <div className="stat"><div className="statIcon">{icon}</div><div><strong>{value}</strong><span>{title}</span>{sub && <small>{sub}</small>}</div></div> }
function BookingForm({ booking, setBookingField, regions, cities, districts, categories, services, occasionTypes, beauticians, portfolio, uploadImage, submitBooking, openBeautician, customerToken, customer, bookingMode, setBookingMode, authName, setAuthName, authPhone, setAuthPhone, otp, setOtp, requestOtp, verifyOtp }) {
  const selectedService = services.find(s => s.id === booking.service_id);
  const usingAccount = bookingMode === 'account' && customerToken && customer;
  const needAccountLogin = bookingMode === 'account' && !customerToken;
  return <main className="container">
    <section className="panel bookingHero">
      <div>
        <span className="eyebrow">Booking Journey</span>
        <h2>طلب حجز خدمة تجميل منزلية</h2>
        <p>تم تنظيم الحجز على خطوات واضحة حتى تكون التجربة خفيفة وسريعة للعميلة.</p>
      </div>
      <button className="linkBtn" type="button">سيتم تأكيد الموعد بواسطة الدعم</button>
    </section>

    <section className="panel">
      <div className="sectionTitle"><div><small>Account Mode</small><h2>طريقة الحجز</h2></div></div>
      <div className="modeCards"><button type="button" className={bookingMode === 'account' ? 'mode active' : 'mode'} onClick={()=>setBookingMode('account')}>تسجيل / دخول برقم الهاتف</button><button type="button" className={bookingMode === 'guest' ? 'mode active' : 'mode'} onClick={()=>setBookingMode('guest')}>المتابعة كضيف</button></div>
      {usingAccount && <div className="accountNotice">تم الدخول كـ <b>{customer?.name || customer?.phone}</b>. سيتم تعبئة الاسم ورقم الجوال والعنوان الافتراضي تلقائياً إن وجد.</div>}
      {needAccountLogin && <form className="inlineAuth" onSubmit={verifyOtp}><Input value={authName} onChange={setAuthName} placeholder="اسم العميلة للتسجيل أول مرة"/><PhoneInput value={authPhone} onChange={setAuthPhone}/><button type="button" onClick={requestOtp}>إرسال الرمز</button><Input value={otp} onChange={setOtp} placeholder="رمز التحقق"/><button className="primary">دخول</button><small>يمكنك أيضاً اختيار المتابعة كضيف وإدخال البيانات داخل الطلب.</small></form>}
    </section>

    <section className="panel">
      <div className="sectionTitle"><div><small>Multi-step Form</small><h2>بيانات الطلب</h2></div></div>
      <div className="bookingSteps"><span className="stepPill"><b>1</b> بيانات العميلة</span><span className="stepPill"><b>2</b> الخدمة والموقع</span><span className="stepPill"><b>3</b> الموعد والخبيرة</span><span className="stepPill"><b>4</b> ملخص وإرسال</span></div>
      <form className="bookingGrid" onSubmit={submitBooking}>
        <Field label="اسم العميلة"><Input required disabled={usingAccount} value={booking.customer_name} onChange={v=>setBookingField('customer_name',v)} placeholder={usingAccount ? 'من بيانات الحساب' : 'الاسم'} /></Field>
        <Field label="رقم الجوال"><PhoneInput required disabled={usingAccount} value={booking.phone} onChange={v=>setBookingField('phone',v)} placeholder={usingAccount ? 'من بيانات الحساب' : PHONE_PLACEHOLDER} /></Field>
        <Field label="نوع المناسبة"><Select value={booking.event_type} onChange={v=>setBookingField('event_type',v)}><option value="">اختاري نوع المناسبة</option>{(occasionTypes || []).map(o=><option key={o.id} value={o.name_ar || o.name_en || o.id}>{o.name_ar || o.name_en}</option>)}</Select></Field>
        <Field label="المنطقة"><Select value={booking.region_id} onChange={v=>setBookingField('region_id',v)}><OptionList items={regions} empty="كل المناطق / اختاري المنطقة" /></Select></Field>
        <Field label="المدينة"><Select value={booking.city_id} onChange={v=>setBookingField('city_id',v)}><OptionList items={cities} empty={booking.region_id ? "مدن المنطقة المختارة" : "كل المدن / اختاري المدينة"} /></Select></Field>
        <Field label="الحي"><Select value={booking.district_id} onChange={v=>setBookingField('district_id',v)}><OptionList items={districts} empty={booking.city_id ? "أحياء المدينة المختارة" : booking.region_id ? "أحياء المنطقة المختارة" : "كل الأحياء / اختاري الحي"} /></Select></Field>
        <Field label="قسم الخدمة"><Select value={booking.service_category_id} onChange={v=>setBookingField('service_category_id',v)}><OptionList items={categories} empty="كل الأقسام" /></Select></Field>
        <Field label="الخدمة"><Select required value={booking.service_id} onChange={v=>setBookingField('service_id',v)}><OptionList items={services} empty={booking.service_category_id ? "خدمات القسم المختار" : "كل الخدمات / اختاري الخدمة"} /></Select></Field>
        <Field label="عدد الأشخاص"><Input type="number" min="1" value={booking.people_count} onChange={v=>setBookingField('people_count',v)} /></Field>
        <Field label="التاريخ"><Input required type="date" value={booking.booking_date} onChange={v=>setBookingField('booking_date',v)} /></Field>
        <Field label="الوقت"><Input required type="time" value={booking.booking_time} onChange={v=>setBookingField('booking_time',v)} /></Field>
        <Field label="وقت بديل"><Input type="time" value={booking.alternate_time} onChange={v=>setBookingField('alternate_time',v)} /></Field>
        <Field label="طريقة التواصل"><Select value={booking.contact_preference} onChange={v=>setBookingField('contact_preference',v)}><option value="whatsapp">واتساب</option><option value="call">اتصال</option><option value="sms">رسالة SMS</option></Select></Field>
        <Field label="خبيرة مفضلة"><Select value={booking.preferred_artist_id} onChange={v=>setBookingField('preferred_artist_id',v)}><option value="">اترك الاختيار للدعم</option>{beauticians.map(b=><option key={b.id} value={b.id}>{b.name} {b.review_rating ? `⭐ ${b.review_rating}` : ''}{b.is_fallback ? ' - اختيار عام' : ''}</option>)}</Select></Field>
        <Field label="صورة التصميم"><input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0])}/>{booking.design_image_url && <small>تم إرفاق الصورة</small>}</Field>
        <Field label="العنوان" className="wide"><Input required value={booking.address} onChange={v=>setBookingField('address',v)} placeholder="تفاصيل العنوان" /></Field>
        <Field label="ملاحظات"><TextArea value={booking.customer_notes} onChange={v=>setBookingField('customer_notes',v)} placeholder="أي تفاصيل إضافية" /></Field>
        <div className="summary"><b>{selectedService ? label(selectedService) : 'ملخص الحجز'}</b><span>{selectedService ? [money(selectedService.min_price), money(selectedService.max_price)].filter(Boolean).join(' - ') : 'اختاري الخدمة لمعرفة السعر المتوقع'}</span><small>{booking.booking_date || 'التاريخ'} • {booking.booking_time || 'الوقت'} • {booking.city_id ? 'تم اختيار المدينة' : 'اختاري المدينة'}</small></div>
        <button className="primary submit" type="submit" disabled={needAccountLogin}>إرسال الطلب</button>
      </form>
    </section>
    <section className="panel"><div className="sectionTitle"><div><small>Related Portfolio</small><h2>نماذج مرتبطة بالخدمة</h2></div></div><PortfolioGrid items={portfolio.slice(0,8)} /></section>
    <section className="panel"><div className="sectionTitle"><div><small>Available Experts</small><h2>خبيرات مناسبات</h2></div></div><BeauticianGrid items={beauticians.slice(0,8)} openBeautician={openBeautician} /></section>
  </main>
}
function PortfolioGrid({ items, compact = false }) {
  if (!items.length) return <p className="empty">لا توجد نماذج أعمال منشورة حالياً.</p>;
  return <div className={compact ? "portfolioGrid compact" : "portfolioGrid"}>{items.map(p => <div className="portfolioCard" key={p.id}>{p.image_url && <img src={p.image_url} alt={p.title_ar || 'نموذج عمل'}/>}<b>{p.title_ar}</b><small>{p.beautician_name || '-'} • {p.service_name || p.category_name || '-'}</small><p>{p.description || ''}</p><button type="button">عرض التفاصيل</button></div>)}</div>;
}
function BeauticianGrid({ items, openBeautician, compact = false }) {
  if (!items.length) return <p className="empty">لا توجد خبيرات مطابقة حالياً.</p>;
  return <div className={compact ? "beauticianGrid compact" : "beauticianGrid"}>{items.map(b => <div className="beauticianCard" key={b.id}><img src={b.featured_image_url || b.first_image_url || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop'} alt={b.name}/><div><h3>{b.name}</h3><p>{b.main_expertise_name || 'خبيرة تجميل'} • {b.city_name || 'عدة مدن'}</p><span><Star size={16}/> {b.review_rating || b.rating || '-'} • {b.portfolio_count || 0} أعمال</span><button onClick={() => openBeautician(b.id)}>عرض التفاصيل</button></div></div>)}</div>;
}
function BeauticiansPage({ beauticians, portfolio, openBeautician }) {
  return <main className="container"><section className="panel"><h2>خبيرات التجميل</h2><BeauticianGrid items={beauticians} openBeautician={openBeautician}/></section><section className="panel"><h2>معرض الأعمال</h2><PortfolioGrid items={portfolio}/></section></main>
}
function BeauticianDetails({ data, choose }) {
  if (!data?.beautician) return <main className="container"><div className="panel">اختاري خبيرة لعرض التفاصيل.</div></main>;
  const b = data.beautician;
  return <main className="container"><section className="profile"><div><h2>{b.name}</h2><p>{b.bio || 'خبيرة تجميل منزلية'}</p><div className="badges"><span><Star size={16}/> {b.review_rating || b.rating || '-'}</span><span>{b.main_expertise_name || 'خدمات تجميل'}</span><span>{b.city_name || 'عدة مدن'}</span></div><button className="primary" onClick={() => choose(b.id)}>اختيار هذه الخبيرة للحجز</button></div></section><section className="panel"><h2>معرض الأعمال</h2><PortfolioGrid items={data.portfolio || []}/></section><section className="panel"><h2>تقييمات العميلات</h2>{(data.reviews || []).length ? data.reviews.map(r => <div className="review" key={r.id}><b>⭐ {r.rating}</b><p>{r.review_text}</p></div>) : <p className="empty">لا توجد تقييمات منشورة حالياً.</p>}</section></main>
}
function TrackPage({ phone, setPhone, results, submit }) {
  return <main className="container"><section className="panel"><h2>متابعة الطلب</h2><form className="track" onSubmit={submit}><PhoneInput value={phone} onChange={setPhone} placeholder="رقم الجوال 05xxxxxxxx"/><button className="primary"><Search size={18}/> بحث</button></form><div className="bookingList">{results.map(b => <div className="bookingCard" key={b.id}><div><b>{b.booking_number || `طلب #${b.id}`}</b><span>{statusLabel(b.status)}</span></div><p>{b.service_name || '-'} • {fmtDate(b.booking_date)} • {shortTime(b.booking_time)} • {sourceLabel(b.booking_source, b.booking_source_label)}</p><p>{b.region_name || '-'} / {b.city_name || '-'} / {b.district_name || '-'}</p>{b.artist_name && <p>الخبيرة المعينة: {b.artist_name}</p>}{b.preferred_artist_name && <p>الخبيرة المفضلة: {b.preferred_artist_name}</p>}<div className="timeline"><span><CheckCircle2 size={16}/> طلب جديد</span><span><Clock3 size={16}/> {statusLabel(b.status || 'under_review')}</span><span><MessageCircle size={16}/> {paymentLabel(b.payment_status)}</span></div></div>)}</div></section></main>
}


function AccountPage({ customerToken, customer, authName, setAuthName, authPhone, setAuthPhone, otp, setOtp, requestOtp, verifyOtp, logoutCustomer, bookings, addresses, addressForm, setAddressForm, saveAddress, regions, cities, districts }) {
  const filteredCities = cities.filter(c => !addressForm.region_id || sameId(c.region_id, addressForm.region_id));
  const filteredDistricts = districts.filter(d => {
    if (addressForm.city_id) return sameId(d.city_id, addressForm.city_id);
    if (addressForm.region_id) {
      const city = cities.find(c => String(c.id) === String(d.city_id));
      return city && sameId(city.region_id, addressForm.region_id);
    }
    return true;
  });
  if (!customerToken) return <main className="container"><section className="panel"><h2>حساب العميلة</h2><p className="empty">سجلي الدخول برقم الجوال لعرض طلباتك وعناوينك المحفوظة.</p><form className="track" onSubmit={requestOtp}><input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="اسم العميلة للتسجيل أول مرة"/><PhoneInput value={authPhone} onChange={setAuthPhone}/><button className="primary">إرسال رمز التحقق</button></form><form className="track" onSubmit={verifyOtp}><input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="رمز التحقق"/><button className="primary">دخول</button></form></section></main>;
  return <main className="container"><section className="panel"><h2>حساب العميلة</h2><p>مرحباً {customer?.name || customer?.phone}</p><button onClick={logoutCustomer}>تسجيل خروج</button></section><section className="panel"><h2>طلباتي</h2>{bookings.length ? bookings.map(b=><div className="bookingCard" key={b.id}><div><b>{b.booking_number || b.id}</b><span>{statusLabel(b.status)}</span></div><p>{b.service_name || '-'} • {fmtDate(b.booking_date)} {shortTime(b.booking_time)}</p><p>{b.region_name || '-'} / {b.city_name || '-'} / {b.district_name || '-'}</p></div>) : <p className="empty">لا توجد طلبات في الحساب.</p>}</section><section className="panel"><h2>العناوين المحفوظة</h2>{addresses.map(a=><div className="bookingCard" key={a.id}><b>{a.label}</b><p>{a.region_name||'-'} / {a.city_name||'-'} / {a.district_name||'-'}</p><p>{a.address}</p></div>)}<form className="bookingGrid" onSubmit={saveAddress}><Field label="اسم العنوان"><Input value={addressForm.label} onChange={v=>setAddressForm({...addressForm,label:v})}/></Field><Field label="المنطقة"><Select value={addressForm.region_id} onChange={v=>setAddressForm({...addressForm,region_id:v,city_id:'',district_id:''})}><OptionList items={regions}/></Select></Field><Field label="المدينة"><Select value={addressForm.city_id} onChange={v=>setAddressForm({...addressForm,city_id:v,district_id:''})}><OptionList items={filteredCities}/></Select></Field><Field label="الحي"><Select value={addressForm.district_id} onChange={v=>setAddressForm({...addressForm,district_id:v})}><OptionList items={filteredDistricts}/></Select></Field><Field label="العنوان التفصيلي"><Input required value={addressForm.address} onChange={v=>setAddressForm({...addressForm,address:v})}/></Field><button className="primary">حفظ العنوان</button></form></section></main>;
}


function SiteFooter({ setTab, tenant }) {
  return <footer className="siteFooter">
    <div><h4>عن التطبيق</h4><button onClick={() => setTab('home')}>عن {tenant?.business_name || 'بيوتي هوم سيرفس'}</button><button onClick={() => setTab('beauticians')}>خبيراتنا</button></div>
    <div><h4>تواصل معنا</h4><button>تواصل معنا</button><button>الدعم</button></div>
    <div><h4>الخدمات</h4><button onClick={() => setTab('booking')}>طلب حجز</button><button onClick={() => setTab('track')}>متابعة الطلب</button></div>
    <div><h4>القانونية</h4><button>الشروط والأحكام</button><button>سياسة الخصوصية</button></div>
    <p>© {tenant?.business_name || 'بيوتي هوم سيرفس'}</p>
  </footer>;
}

createRoot(document.getElementById('root')).render(<App />);

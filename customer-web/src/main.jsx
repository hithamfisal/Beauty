import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, MapPin, Search, Sparkles, Star, UserCheck, MessageCircle, ImagePlus, Clock3, CheckCircle2 } from 'lucide-react';
import './style.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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
function money(v) { return v == null || v === '' ? '' : `${Number(v).toLocaleString('ar-SA')} ر.س`; }
function fmtDate(v) { try { return v ? new Date(v).toLocaleDateString('ar-SA') : '-'; } catch { return v || '-'; } }
function shortTime(v) { return v ? String(v).slice(0, 5) : '-'; }

function Select({ value, onChange, children, disabled }) {
  return <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}>{children}</select>;
}
function Input(props) { return <input {...props} onChange={e => props.onChange?.(e.target.value)} />; }
function TextArea(props) { return <textarea {...props} onChange={e => props.onChange?.(e.target.value)} />; }
function OptionList({ items, empty }) {
  return <><option value="">{empty || 'اختر'}</option>{items.map(x => <option key={x.id} value={x.id}>{label(x)}</option>)}</>;
}
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }

function App() {
  const [tab, setTab] = useState('home');
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [beauticians, setBeauticians] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [booking, setBooking] = useState(emptyBooking);
  const [trackingPhone, setTrackingPhone] = useState('');
  const [trackingResults, setTrackingResults] = useState([]);
  const [selectedBeautician, setSelectedBeautician] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { init(); }, []);
  useEffect(() => { loadCities(booking.region_id); }, [booking.region_id]);
  useEffect(() => { loadDistricts(booking.city_id); }, [booking.city_id]);
  useEffect(() => { loadServices(booking.service_category_id); }, [booking.service_category_id]);
  useEffect(() => { loadBeauticians(); loadPortfolio(); }, [booking.region_id, booking.city_id, booking.service_id, booking.service_category_id]);

  async function init() {
    try {
      const [r, sc, p] = await Promise.all([api('/regions'), api('/service-categories'), api('/portfolio')]);
      setRegions(r || []); setCategories(sc || []); setPortfolio(p || []);
      await Promise.all([loadCities(''), loadDistricts(''), loadServices(''), loadBeauticians()]);
    } catch (e) { setMessage(`تعذر تحميل البيانات: ${e.message}`); }
  }
  async function loadCities(regionId) {
    try { const r = await api(regionId ? `/cities?region_id=${regionId}` : '/cities'); setCities(r || []); }
    catch (e) { setMessage(`تعذر تحميل المدن: ${e.message}`); }
  }
  async function loadDistricts(cityId) {
    try { const r = await api(cityId ? `/districts?city_id=${cityId}` : '/districts'); setDistricts(r || []); }
    catch (e) { setMessage(`تعذر تحميل الأحياء: ${e.message}`); }
  }
  async function loadServices(categoryId) {
    try { const r = await api(categoryId ? `/services?category_id=${categoryId}` : '/services'); setServices(r || []); }
    catch (e) { setMessage(`تعذر تحميل الخدمات: ${e.message}`); }
  }
  async function loadBeauticians() {
    try {
      const qs = new URLSearchParams();
      if (booking.region_id) qs.set('region_id', booking.region_id);
      if (booking.city_id) qs.set('city_id', booking.city_id);
      if (booking.service_id) qs.set('service_id', booking.service_id);
      const r = await api(`/beauticians${qs.toString() ? `?${qs}` : ''}`);
      setBeauticians(r || []);
    } catch (e) { setMessage(`تعذر تحميل الخبيرات: ${e.message}`); }
  }
  async function loadPortfolio() {
    try {
      const qs = new URLSearchParams();
      if (booking.service_id) qs.set('service_id', booking.service_id);
      else if (booking.service_category_id) qs.set('category_id', booking.service_category_id);
      const r = await api(`/portfolio${qs.toString() ? `?${qs}` : ''}`);
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
      const payload = { ...booking, customer_phone: booking.phone, phone: booking.phone, people_count: Number(booking.people_count || 1), booking_source: 'web' };
      const created = await api('/bookings', { method: 'POST', body: JSON.stringify(payload) });
      setMessage(`تم إرسال الطلب بنجاح. رقم الطلب: ${created.booking_number || created.id}`);
      setBooking(emptyBooking);
      setTab('track');
      setTrackingPhone(payload.phone);
    } catch (e) { setMessage(`تعذر إرسال الطلب: ${e.message}`); }
    finally { setLoading(false); }
  }
  async function trackBookings(e) {
    e?.preventDefault?.(); setLoading(true); setMessage('');
    try {
      const r = await api(`/customer/bookings?phone=${encodeURIComponent(trackingPhone)}`);
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

  return <div className="app">
    <header className="hero">
      <nav>
        <b>Beauty Home Service</b>
        <div>
          <button onClick={() => setTab('home')}>الرئيسية</button>
          <button onClick={() => setTab('booking')}>طلب حجز</button>
          <button onClick={() => setTab('beauticians')}>الخبيرات</button>
          <button onClick={() => setTab('track')}>متابعة الطلب</button>
        </div>
      </nav>
      <section className="heroText"><span>خدمات تجميل منزلية</span><h1>احجزي خدمتك بسهولة وشاهدي أعمال الخبيرات قبل الاختيار</h1><p>واجهة عميلة تعمل على الكمبيوتر والمتصفح وترتبط مباشرة بالسيرفر السحابي.</p><button className="primary" onClick={() => setTab('booking')}>ابدئي طلب حجز</button></section>
    </header>

    {message && <div className="message">{message}</div>}
    {loading && <div className="loading">جاري التحميل...</div>}

    {tab === 'home' && <Home categories={categories} portfolio={portfolio} beauticians={beauticians} setTab={setTab} openBeautician={openBeautician} />}
    {tab === 'booking' && <BookingForm booking={booking} setBookingField={setBookingField} regions={regions} cities={cities} districts={districts} categories={categories} services={services} beauticians={beauticians} portfolio={portfolio} uploadImage={uploadImage} submitBooking={submitBooking} openBeautician={openBeautician} />}
    {tab === 'beauticians' && <BeauticiansPage beauticians={beauticians} portfolio={portfolio} openBeautician={openBeautician} />}
    {tab === 'beautician' && <BeauticianDetails data={selectedBeautician} choose={(id) => { setBookingField('preferred_artist_id', id); setTab('booking'); }} />}
    {tab === 'track' && <TrackPage phone={trackingPhone} setPhone={setTrackingPhone} results={trackingResults} submit={trackBookings} />}

    <footer>Beauty Home Service © بوابة العميلة</footer>
  </div>;
}

function Home({ categories, portfolio, beauticians, setTab, openBeautician }) {
  return <main className="container">
    <div className="stats"><Card icon={<Sparkles/>} title="أقسام الخدمات" value={categories.length}/><Card icon={<UserCheck/>} title="خبيرات التجميل" value={beauticians.length}/><Card icon={<ImagePlus/>} title="نماذج الأعمال" value={portfolio.length}/></div>
    <section className="panel"><h2>أقسام الخدمات</h2><div className="chips">{categories.map(c => <span key={c.id}>{label(c)}</span>)}</div></section>
    <section className="panel"><h2>نماذج مميزة من أعمال الخبيرات</h2><PortfolioGrid items={portfolio.slice(0,8)} /></section>
    <section className="panel"><h2>خبيرات مميزات</h2><BeauticianGrid items={beauticians.slice(0,6)} openBeautician={openBeautician} /></section>
  </main>
}
function Card({ icon, title, value }) { return <div className="stat">{icon}<strong>{value}</strong><span>{title}</span></div> }
function BookingForm({ booking, setBookingField, regions, cities, districts, categories, services, beauticians, portfolio, uploadImage, submitBooking, openBeautician }) {
  const selectedService = services.find(s => s.id === booking.service_id);
  return <main className="container"><section className="panel"><h2>طلب حجز</h2><form className="bookingGrid" onSubmit={submitBooking}>
    <Field label="اسم العميلة"><Input required value={booking.customer_name} onChange={v=>setBookingField('customer_name',v)} placeholder="الاسم" /></Field>
    <Field label="رقم الجوال"><Input required value={booking.phone} onChange={v=>setBookingField('phone',v)} placeholder="05xxxxxxxx" /></Field>
    <Field label="المنطقة"><Select value={booking.region_id} onChange={v=>setBookingField('region_id',v)}><OptionList items={regions} empty="كل المناطق / اختاري المنطقة" /></Select></Field>
    <Field label="المدينة"><Select value={booking.city_id} onChange={v=>setBookingField('city_id',v)}><OptionList items={cities} empty="كل المدن / اختاري المدينة" /></Select></Field>
    <Field label="الحي"><Select value={booking.district_id} onChange={v=>setBookingField('district_id',v)}><OptionList items={districts} empty="اختاري الحي" /></Select></Field>
    <Field label="قسم الخدمة"><Select required value={booking.service_category_id} onChange={v=>setBookingField('service_category_id',v)}><OptionList items={categories} empty="اختاري القسم" /></Select></Field>
    <Field label="الخدمة"><Select required value={booking.service_id} onChange={v=>setBookingField('service_id',v)}><OptionList items={services} empty="اختاري الخدمة" /></Select></Field>
    <Field label="نوع المناسبة"><Input value={booking.event_type} onChange={v=>setBookingField('event_type',v)} /></Field>
    <Field label="التاريخ"><Input required type="date" value={booking.booking_date} onChange={v=>setBookingField('booking_date',v)} /></Field>
    <Field label="الوقت"><Input required type="time" value={booking.booking_time} onChange={v=>setBookingField('booking_time',v)} /></Field>
    <Field label="وقت بديل"><Input type="time" value={booking.alternate_time} onChange={v=>setBookingField('alternate_time',v)} /></Field>
    <Field label="عدد الأشخاص"><Input type="number" min="1" value={booking.people_count} onChange={v=>setBookingField('people_count',v)} /></Field>
    <Field label="طريقة التواصل"><Select value={booking.contact_preference} onChange={v=>setBookingField('contact_preference',v)}><option value="whatsapp">واتساب</option><option value="call">اتصال</option><option value="sms">رسالة SMS</option></Select></Field>
    <Field label="خبيرة مفضلة"><Select value={booking.preferred_artist_id} onChange={v=>setBookingField('preferred_artist_id',v)}><option value="">اترك الاختيار للدعم</option>{beauticians.map(b=><option key={b.id} value={b.id}>{b.name} {b.review_rating ? `⭐ ${b.review_rating}` : ''}</option>)}</Select></Field>
    <Field label="العنوان"><Input required value={booking.address} onChange={v=>setBookingField('address',v)} placeholder="تفاصيل العنوان" /></Field>
    <Field label="صورة التصميم"><input type="file" accept="image/*" onChange={e=>uploadImage(e.target.files?.[0])}/>{booking.design_image_url && <small>تم إرفاق الصورة</small>}</Field>
    <Field label="ملاحظات"><TextArea value={booking.customer_notes} onChange={v=>setBookingField('customer_notes',v)} placeholder="أي تفاصيل إضافية" /></Field>
    <div className="summary"><b>{selectedService ? label(selectedService) : 'الخدمة'}</b><span>{selectedService ? [money(selectedService.min_price), money(selectedService.max_price)].filter(Boolean).join(' - ') : 'اختاري الخدمة لمعرفة التفاصيل'}</span></div>
    <button className="primary submit" type="submit">إرسال الطلب</button>
  </form></section>
  <section className="panel"><h2>نماذج مرتبطة بالخدمة</h2><PortfolioGrid items={portfolio.slice(0,8)} /></section>
  <section className="panel"><h2>خبيرات مناسبات</h2><BeauticianGrid items={beauticians.slice(0,8)} openBeautician={openBeautician} /></section></main>
}
function PortfolioGrid({ items }) {
  if (!items.length) return <p className="empty">لا توجد نماذج أعمال منشورة حالياً.</p>;
  return <div className="portfolioGrid">{items.map(p => <div className="portfolioCard" key={p.id}>{p.image_url && <img src={p.image_url} alt={p.title_ar || 'نموذج عمل'}/>}<b>{p.title_ar}</b><small>{p.beautician_name || '-'} • {p.service_name || p.category_name || '-'}</small><p>{p.description || ''}</p></div>)}</div>;
}
function BeauticianGrid({ items, openBeautician }) {
  if (!items.length) return <p className="empty">لا توجد خبيرات مطابقة حالياً.</p>;
  return <div className="beauticianGrid">{items.map(b => <div className="beauticianCard" key={b.id}><img src={b.featured_image_url || b.first_image_url || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop'} alt={b.name}/><div><h3>{b.name}</h3><p>{b.main_expertise_name || 'خبيرة تجميل'} • {b.city_name || 'عدة مدن'}</p><span><Star size={16}/> {b.review_rating || b.rating || '-'} • {b.portfolio_count || 0} أعمال</span><button onClick={() => openBeautician(b.id)}>عرض التفاصيل</button></div></div>)}</div>;
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
  return <main className="container"><section className="panel"><h2>متابعة الطلب</h2><form className="track" onSubmit={submit}><Input value={phone} onChange={setPhone} placeholder="رقم الجوال"/><button className="primary"><Search size={18}/> بحث</button></form><div className="bookingList">{results.map(b => <div className="bookingCard" key={b.id}><div><b>{b.booking_number || `طلب #${b.id}`}</b><span>{b.status || '-'}</span></div><p>{b.service_name || '-'} • {fmtDate(b.booking_date)} • {shortTime(b.booking_time)} • {b.booking_source_label || b.booking_source || 'web'}</p><p>{b.region_name || '-'} / {b.city_name || '-'} / {b.district_name || '-'}</p><div className="timeline"><span><CheckCircle2 size={16}/> جديد</span><span><Clock3 size={16}/> {b.status || 'قيد المراجعة'}</span><span><MessageCircle size={16}/> {b.payment_status || 'غير مدفوع'}</span></div></div>)}</div></section></main>
}

createRoot(document.getElementById('root')).render(<App />);

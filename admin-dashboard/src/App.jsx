import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const statusLabels = {
  new: 'طلب جديد', under_review: 'جاري المراجعة', waiting_customer_confirmation: 'بانتظار تأكيد العميلة',
  confirmed: 'تم تأكيد الحجز', beautician_assigned: 'تم تعيين خبيرة التجميل', in_progress: 'قيد التنفيذ',
  completed: 'مكتمل', cancelled: 'ملغي', unavailable: 'غير متوفر'
};
const statusOptions = Object.entries(statusLabels);
const paymentLabels = { unpaid: 'غير مدفوع', deposit_paid: 'عربون مدفوع', paid: 'مدفوع بالكامل', refunded: 'مسترجع' };
const paymentOptions = Object.entries(paymentLabels);
const paymentMethodLabels = { cash:'كاش', bank_transfer:'تحويل بنكي', stc_pay:'STC Pay', mada:'مدى', card:'بطاقة', other:'أخرى' };

const emptyBooking = { name:'', phone:'', region_id:'', city_id:'', district_id:'', service_category_id:'', service_id:'', preferred_artist_id:'', event_type:'زواج', booking_date:'', booking_time:'18:00', people_count:1, address:'', customer_notes:'', design_image_url:'', booking_source:'admin' };
const emptyBeautician = { name:'', phone:'', region_id:'', city_id:'', main_expertise_service_id:'', districts:'', skills:'', bio:'', rating:5, status:'active' };
const emptyRegion = { name_ar:'', name_en:'', external_id:'', status:'active', sort_order:0 };
const emptyCity = { region_id:'', name_ar:'', name_en:'', external_id:'', status:'active', sort_order:0 };
const emptyDistrict = { city_id:'', name_ar:'', name_en:'', external_id:'', status:'active', sort_order:0 };
const emptyCategory = { name_ar:'', name_en:'', description:'', status:'active', sort_order:0 };
const emptyService = { category_id:'', name_ar:'', name_en:'', description:'', min_price:'', max_price:'', duration_minutes:'', status:'active', sort_order:0 };
const emptyPortfolio = { beautician_id:'', service_category_id:'', service_id:'', title_ar:'', title_en:'', description:'', image_url:'', is_featured:false, status:'published', sort_order:0 };
const emptyTemplate = { code:'', title_ar:'', body_ar:'', channel:'whatsapp', status:'active', sort_order:0 };
const contactLabels = { whatsapp:'واتساب', call:'اتصال', sms:'رسالة SMS' };

function formatDate(value) { return value ? new Date(value).toLocaleDateString('ar-SA') : '-'; }
function formatTime(value) { return value ? String(value).slice(0,5) : '-'; }
function clean(obj) { return Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, v === '' ? null : v])); }
function whatsapp(phone, text) { const p = String(phone||'').replace(/[^0-9+]/g,''); const intl = p.startsWith('0') ? `966${p.slice(1)}` : p.replace(/^\+/,''); return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`; }
function Card({ title, value }) { return <div className="card"><div className="value">{value}</div><div className="label">{title}</div></div>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function TextInput({ value, onChange, placeholder, type='text', required=false }) { return <input type={type} value={value ?? ''} placeholder={placeholder} required={required} onChange={e=>onChange(e.target.value)} />; }
function Select({ value, onChange, children, required=false }) { return <select value={value ?? ''} required={required} onChange={e=>onChange(e.target.value)}>{children}</select>; }
function OptionList({ items, label='name_ar', empty='اختر' }) { return <><option value="">{empty}</option>{items.map(i => <option key={i.id} value={i.id}>{i[label] || i.display_name || i.name || i.name_ar}</option>)}</>; }

function App() {
  const [dashboard, setDashboard] = useState({});
  const [bookings, setBookings] = useState([]);
  const [beauticians, setBeauticians] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState({ counts:{}, items:[] });
  const [templates, setTemplates] = useState([]);
  const [catalog, setCatalog] = useState({ regions:[], cities:[], districts:[], service_categories:[], services:[] });
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [beauticianForm, setBeauticianForm] = useState(emptyBeautician);
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolio);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [editing, setEditing] = useState({ type:null, id:null });
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ q:'', status:'', payment:'', region_id:'', city_id:'', beautician_id:'' });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('beauty_admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => { try { return JSON.parse(localStorage.getItem('beauty_admin_user') || 'null'); } catch { return null; } });
  const [loginForm, setLoginForm] = useState({ email: 'admin@beauty.local', password: '' });

  async function api(path, options={}) {
    const headers = { 'Content-Type':'application/json; charset=utf-8', ...(options.headers || {}) };
    if (adminToken && path.startsWith('/admin')) headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; }
    catch { data = { error: text?.slice(0, 300) || 'Invalid server response' }; }
    if (!res.ok) throw new Error(data?.details || data?.error || 'Request failed');
    return data;
  }

  async function load() {
    try {
      const [d, b, c, a, p, r, n, t] = await Promise.all([
        api('/admin/dashboard'), api('/admin/bookings'), api('/admin/catalog?all=1'), api('/admin/beauticians'), api('/admin/beautician-portfolio'), api('/admin/beautician-reviews'), api('/admin/notifications'), api('/admin/communication-templates')
      ]);
      setDashboard(d || {}); setBookings(Array.isArray(b)?b:[]); setCatalog(c || {regions:[],cities:[],districts:[],service_categories:[],services:[]}); setBeauticians(Array.isArray(a)?a:[]); setPortfolio(Array.isArray(p)?p:[]); setReviews(Array.isArray(r)?r:[]); setNotifications(n || {counts:{},items:[]}); setTemplates(Array.isArray(t)?t:[]);
    } catch(e) { setMessage(`خطأ تحميل البيانات: ${e.message}`); }
  }
  useEffect(()=>{ if (adminToken) load(); }, [adminToken]);

  async function login(e) {
    e.preventDefault(); setMessage('');
    try {
      const res = await fetch(`${API}/admin/login`, { method:'POST', headers:{ 'Content-Type':'application/json; charset=utf-8' }, body: JSON.stringify(loginForm) });
      const data = await res.json().catch(()=>null);
      if (!res.ok) throw new Error(data?.error || 'فشل تسجيل الدخول');
      localStorage.setItem('beauty_admin_token', data.token); localStorage.setItem('beauty_admin_user', JSON.stringify(data.user));
      setAdminToken(data.token); setAdminUser(data.user); setMessage('تم تسجيل الدخول.');
    } catch(e) { setMessage(`تعذر تسجيل الدخول: ${e.message}`); }
  }
  function logout() { localStorage.removeItem('beauty_admin_token'); localStorage.removeItem('beauty_admin_user'); setAdminToken(''); setAdminUser(null); }

  const citiesForBooking = catalog.cities.filter(c => !bookingForm.region_id || c.region_id === bookingForm.region_id);
  const districtsForBooking = catalog.districts.filter(d => !bookingForm.city_id || d.city_id === bookingForm.city_id);
  const servicesForBooking = catalog.services.filter(s => !bookingForm.service_category_id || s.category_id === bookingForm.service_category_id);
  const citiesForBeautician = catalog.cities.filter(c => !beauticianForm.region_id || c.region_id === beauticianForm.region_id);
  const portfolioServices = catalog.services.filter(s => !portfolioForm.service_category_id || s.category_id === portfolioForm.service_category_id);
  const filteredBookings = useMemo(() => bookings.filter(b => {
    const q = filters.q.trim().toLowerCase();
    if (q && ![b.customer_name,b.customer_phone,b.region_name,b.city_name,b.district_name,b.service_name,b.artist_name,b.preferred_artist_name].some(v => String(v||'').toLowerCase().includes(q))) return false;
    if (filters.status && b.status !== filters.status) return false;
    if (filters.payment && (b.payment_status || 'unpaid') !== filters.payment) return false;
    if (filters.region_id && b.region_id !== filters.region_id) return false;
    if (filters.city_id && b.city_id !== filters.city_id) return false;
    if (filters.beautician_id && b.assigned_artist_id !== filters.beautician_id && b.preferred_artist_id !== filters.beautician_id) return false;
    return true;
  }), [bookings, filters]);

  function setBooking(key, value) { setBookingForm(prev => { const next = { ...prev, [key]: value }; if (key === 'region_id') { next.city_id=''; next.district_id=''; } if (key === 'city_id') next.district_id=''; if (key === 'service_category_id') next.service_id=''; return next; }); }
  function setBeautician(key, value) { setBeauticianForm(prev => { const next = { ...prev, [key]: value }; if (key === 'region_id') next.city_id=''; return next; }); }
  function setPortfolioField(key, value) { setPortfolioForm(prev => { const next = { ...prev, [key]: value }; if (key === 'service_category_id') next.service_id=''; return next; }); }

  async function createBooking(e) { e.preventDefault(); try { await api('/bookings', { method:'POST', body: JSON.stringify(clean(bookingForm)) }); setBookingForm(emptyBooking); setMessage('تم إنشاء الطلب.'); await load(); } catch(e) { setMessage(`تعذر إنشاء الطلب: ${e.message}`); } }
  async function saveBeautician(e) { e.preventDefault(); try { const payload = clean(beauticianForm); if (editing.type === 'beautician') await api(`/admin/beauticians/${editing.id}`, { method:'PATCH', body: JSON.stringify(payload) }); else await api('/admin/beauticians', { method:'POST', body: JSON.stringify(payload) }); setBeauticianForm(emptyBeautician); setEditing({}); setMessage('تم حفظ خبيرة التجميل.'); await load(); } catch(e) { setMessage(`تعذر حفظ خبيرة التجميل: ${e.message}`); } }
  async function savePortfolio(e) { e.preventDefault(); try { const payload = clean(portfolioForm); if (editing.type === 'portfolio') await api(`/admin/beautician-portfolio/${editing.id}`, { method:'PATCH', body: JSON.stringify(payload) }); else await api('/admin/beautician-portfolio', { method:'POST', body: JSON.stringify(payload) }); setPortfolioForm(emptyPortfolio); setEditing({}); setMessage('تم حفظ نموذج العمل.'); await load(); } catch(e) { setMessage(`تعذر حفظ نموذج العمل: ${e.message}`); } }
  async function deleteItem(path, id, label='العنصر') { if (!confirm(`تأكيد حذف ${label}؟`)) return; try { await api(`${path}/${id}`, { method:'DELETE' }); setMessage('تم الحذف.'); await load(); } catch(e) { setMessage(`تعذر الحذف: ${e.message}`); } }
  async function updateStatus(id, status) {
    try {
      setMessage('');
      const res = await api(`/admin/bookings/${id}/status`, { method:'PATCH', body: JSON.stringify({ status }) });
      const updated = res?.booking || res;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updated, status } : b));
      if (selectedBooking?.id === id) await openBookingDetails({ id });
      await load();
      setMessage('تم تحديث حالة الطلب.');
    } catch(e) {
      setMessage(`تعذر تحديث حالة الطلب: ${e.message}`);
      await load();
    }
  }
  async function updatePayment(id, payment_status) { await api(`/admin/bookings/${id}/payment`, { method:'PATCH', body: JSON.stringify({ payment_status }) }); await load(); }
  async function updatePaymentDetails(b) {
    const payment_status = prompt('حالة الدفع: unpaid / deposit_paid / paid / refunded', b.payment_status || 'unpaid');
    if (payment_status === null) return;
    const payment_method = prompt('طريقة الدفع: cash / bank_transfer / stc_pay / mada / card / other', b.payment_method || 'bank_transfer');
    if (payment_method === null) return;
    const payment_reference = prompt('رقم المرجع / التحويل', b.payment_reference || '');
    const payment_proof_url = prompt('رابط إثبات الدفع / الإيصال', b.payment_proof_url || '');
    const payment_notes = prompt('ملاحظات الدفع', b.payment_notes || '');
    await api(`/admin/bookings/${b.id}/payment-details`, { method:'PATCH', body: JSON.stringify({ payment_status, payment_method, payment_reference, payment_proof_url, payment_notes }) });
    setMessage('تم تحديث تفاصيل الدفع.');
    await load();
  }
  async function assignBeautician(id, artist_id) { await api(`/admin/bookings/${id}/assign-artist`, { method:'PATCH', body: JSON.stringify({ artist_id: artist_id || null, force:true }) }); await load(); }
  async function openBookingDetails(b) { try { const data = await api(`/admin/bookings/${b.id}`); setSelectedBooking({ ...data.booking, history: data.history || [], events: data.events || [] }); } catch(e) { setMessage(`تعذر فتح تفاصيل الطلب: ${e.message}`); } }
  async function importSaudiOpenData() { try { const data = await api('/admin/import/saudi-open-data', { method:'POST', body: JSON.stringify({ mode:'all' }) }); setMessage(`تم الاستيراد: مناطق ${data.summary?.regions||0}, مدن ${data.summary?.cities||0}, أحياء ${data.summary?.districts||0}`); await load(); } catch(e) { setMessage(`تعذر الاستيراد: ${e.message}`); } }
  async function uploadAdminImage(file, setter) { if(!file) return; try { const reader = new FileReader(); reader.onload = async () => { const result = await api('/admin/uploads/image', { method:'POST', body: JSON.stringify({ image_data_url: reader.result, folder:'beauty-home-service/admin' }) }); setter(result.url); setMessage('تم رفع الصورة.'); }; reader.readAsDataURL(file); } catch(e) { setMessage(`تعذر رفع الصورة: ${e.message}`); } }
  async function saveTemplate(e) { e.preventDefault(); try { const payload = clean(templateForm); if (editing.type === 'template') await api(`/admin/communication-templates/${editing.id}`, { method:'PATCH', body: JSON.stringify(payload) }); else await api('/admin/communication-templates', { method:'POST', body: JSON.stringify(payload) }); setTemplateForm(emptyTemplate); setEditing({}); setMessage('تم حفظ قالب التواصل.'); await load(); } catch(e) { setMessage(`تعذر حفظ قالب التواصل: ${e.message}`); } }
  async function prepareWhatsApp(booking, templateId='') { try { const data = await api(`/admin/bookings/${booking.id}/whatsapp`, { method:'POST', body: JSON.stringify({ template_id: templateId || null }) }); window.open(data.url, '_blank'); await load(); } catch(e) { setMessage(`تعذر تجهيز رسالة واتساب: ${e.message}`); } }

  if (!adminToken) return <main dir="rtl" className="login-page"><section className="login-card"><h1>Beauty Home Service</h1><p className="muted">تسجيل دخول لوحة الإدارة</p>{message && <div className="message">{message}</div>}<form onSubmit={login}><Field label="البريد الإلكتروني"><TextInput value={loginForm.email} onChange={v=>setLoginForm({...loginForm,email:v})} required /></Field><Field label="كلمة المرور"><TextInput type="password" value={loginForm.password} onChange={v=>setLoginForm({...loginForm,password:v})} required /></Field><button>دخول</button></form><p className="muted">الحساب المحلي الافتراضي: admin@beauty.local / Beauty@12345</p></section></main>;

  return <main dir="rtl">
    <header className="header"><div><h1>لوحة إدارة Beauty Home Service</h1><p>إدارة الطلبات وخبيرات التجميل والمواقع والخدمات ومعرض الأعمال</p></div><div className="header-actions"><span className="muted">{adminUser?.name || adminUser?.email}</span><button onClick={load}>تحديث</button><button className="secondary" onClick={logout}>خروج</button></div></header>
    {message && <div className="message">{message}</div>}
    {selectedBooking && <BookingDetailsModal booking={selectedBooking} beauticians={beauticians} updateStatus={updateStatus} assignBeautician={assignBeautician} updatePayment={updatePayment} updatePaymentDetails={updatePaymentDetails} close={()=>setSelectedBooking(null)} />}
    <section className="cards"><Card title="كل الطلبات" value={dashboard.total_bookings ?? 0}/><Card title="طلبات جديدة" value={dashboard.new_bookings ?? 0}/><Card title="طلبات اليوم" value={dashboard.today_bookings ?? 0}/><Card title="بدون خبيرة" value={dashboard.unassigned_bookings ?? 0}/><Card title="غير مدفوعة" value={dashboard.unpaid_bookings ?? 0}/><Card title="خبيرات فعالات" value={dashboard.active_beauticians ?? dashboard.active_artists ?? 0}/></section>

    <NotificationsPanel notifications={notifications} templates={templates} prepareWhatsApp={prepareWhatsApp} />
    <PaymentOpsPanel bookings={bookings} updatePaymentDetails={updatePaymentDetails} />

    <CatalogPanel catalog={catalog} load={load} api={api} setMessage={setMessage} />
    <ServicesPanel catalog={catalog} load={load} api={api} setMessage={setMessage} />

    <section className="panel"><h2>استيراد بيانات المواقع</h2><p className="muted">استيراد بيانات السعودية الجاهزة للمناطق والمدن والأحياء.</p><button onClick={importSaudiOpenData}>استيراد بيانات السعودية الجاهزة من GitHub</button></section>

    <section className="panel"><h2>إنشاء طلب جديد</h2><form className="grid4" onSubmit={createBooking}><Field label="اسم العميلة"><TextInput required value={bookingForm.name} onChange={v=>setBooking('name',v)} /></Field><Field label="الجوال"><TextInput required value={bookingForm.phone} onChange={v=>setBooking('phone',v)} /></Field><Field label="المنطقة"><Select required value={bookingForm.region_id} onChange={v=>setBooking('region_id',v)}><OptionList items={catalog.regions}/></Select></Field><Field label="المدينة"><Select required value={bookingForm.city_id} onChange={v=>setBooking('city_id',v)}><OptionList items={citiesForBooking}/></Select></Field><Field label="الحي"><Select required value={bookingForm.district_id} onChange={v=>setBooking('district_id',v)}><OptionList items={districtsForBooking}/></Select></Field><Field label="قسم الخدمة"><Select required value={bookingForm.service_category_id} onChange={v=>setBooking('service_category_id',v)}><OptionList items={catalog.service_categories}/></Select></Field><Field label="الخدمة"><Select required value={bookingForm.service_id} onChange={v=>setBooking('service_id',v)}><OptionList items={servicesForBooking} label="display_name"/></Select></Field><Field label="خبيرة مفضلة"><Select value={bookingForm.preferred_artist_id} onChange={v=>setBooking('preferred_artist_id',v)}><OptionList items={beauticians.filter(a=>a.status==='active')} label="name" empty="بدون تفضيل"/></Select></Field><Field label="نوع المناسبة"><TextInput value={bookingForm.event_type} onChange={v=>setBooking('event_type',v)} /></Field><Field label="التاريخ"><TextInput type="date" required value={bookingForm.booking_date} onChange={v=>setBooking('booking_date',v)} /></Field><Field label="الوقت"><TextInput type="time" required value={bookingForm.booking_time} onChange={v=>setBooking('booking_time',v)} /></Field><Field label="العنوان"><TextInput value={bookingForm.address} onChange={v=>setBooking('address',v)} /></Field><Field label="صورة التصميم"><TextInput value={bookingForm.design_image_url} onChange={v=>setBooking('design_image_url',v)} placeholder="رابط الصورة أو رفع ملف" /><input type="file" accept="image/*" onChange={e=>uploadAdminImage(e.target.files?.[0], url=>setBooking('design_image_url', url))}/></Field><Field label="طريقة التواصل"><Select value={bookingForm.contact_preference||'whatsapp'} onChange={v=>setBooking('contact_preference',v)}><option value="whatsapp">واتساب</option><option value="call">اتصال</option><option value="sms">رسالة SMS</option></Select></Field><Field label="وقت بديل"><TextInput value={bookingForm.alternate_time||''} onChange={v=>setBooking('alternate_time',v)} placeholder="مثال: بعد المغرب" /></Field><Field label="ملاحظات"><textarea value={bookingForm.customer_notes} onChange={e=>setBooking('customer_notes',e.target.value)} /></Field><div className="actions"><button>إنشاء الطلب</button></div></form></section>

    <section className="panel"><h2>إدارة خبيرات التجميل</h2><form className="grid4" onSubmit={saveBeautician}><Field label="اسم خبيرة التجميل"><TextInput required value={beauticianForm.name} onChange={v=>setBeautician('name',v)} /></Field><Field label="الجوال"><TextInput required value={beauticianForm.phone} onChange={v=>setBeautician('phone',v)} /></Field><Field label="المنطقة"><Select value={beauticianForm.region_id} onChange={v=>setBeautician('region_id',v)}><OptionList items={catalog.regions}/></Select></Field><Field label="المدينة"><Select value={beauticianForm.city_id} onChange={v=>setBeautician('city_id',v)}><OptionList items={citiesForBeautician}/></Select></Field><Field label="الخبرة الأساسية"><Select value={beauticianForm.main_expertise_service_id} onChange={v=>setBeautician('main_expertise_service_id',v)}><OptionList items={catalog.services} label="display_name" /></Select></Field><Field label="الأحياء التي تغطيها"><TextInput value={beauticianForm.districts} onChange={v=>setBeautician('districts',v)} /></Field><Field label="المهارات"><TextInput value={beauticianForm.skills} onChange={v=>setBeautician('skills',v)} /></Field><Field label="التقييم"><TextInput type="number" value={beauticianForm.rating} onChange={v=>setBeautician('rating',Number(v)||5)} /></Field><Field label="الحالة"><Select value={beauticianForm.status} onChange={v=>setBeautician('status',v)}><option value="active">فعالة</option><option value="inactive">غير فعالة</option></Select></Field><Field label="نبذة"><textarea value={beauticianForm.bio} onChange={e=>setBeautician('bio',e.target.value)} /></Field><div className="actions"><button>{editing.type==='beautician' ? 'حفظ التعديل' : 'إضافة خبيرة'}</button></div></form>
      <table><thead><tr><th>الاسم</th><th>الجوال</th><th>المدينة</th><th>الخبرة</th><th>التقييم</th><th>إجراء</th></tr></thead><tbody>{beauticians.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.phone}</td><td>{a.city_name||'-'}</td><td>{a.main_expertise_name||'-'}</td><td>{a.review_rating||a.rating||'-'}</td><td><button onClick={()=>{setBeauticianForm({...emptyBeautician,...a});setEditing({type:'beautician',id:a.id});}}>تعديل</button><button className="danger" onClick={()=>deleteItem('/admin/beauticians',a.id,'خبيرة التجميل')}>حذف</button></td></tr>)}</tbody></table></section>

    <section className="panel"><h2>معرض أعمال خبيرات التجميل</h2><form className="grid4" onSubmit={savePortfolio}><Field label="خبيرة التجميل"><Select required value={portfolioForm.beautician_id} onChange={v=>setPortfolioField('beautician_id',v)}><OptionList items={beauticians} label="name" empty="اختر خبيرة" /></Select></Field><Field label="قسم الخدمة"><Select value={portfolioForm.service_category_id} onChange={v=>setPortfolioField('service_category_id',v)}><OptionList items={catalog.service_categories} empty="اختر القسم" /></Select></Field><Field label="الخدمة"><Select value={portfolioForm.service_id} onChange={v=>setPortfolioField('service_id',v)}><OptionList items={portfolioServices} label="display_name" empty="اختر الخدمة" /></Select></Field><Field label="عنوان النموذج"><TextInput required value={portfolioForm.title_ar} onChange={v=>setPortfolioField('title_ar',v)} placeholder="مثال: مكياج سهرة ناعم" /></Field><Field label="الصورة"><TextInput required value={portfolioForm.image_url} onChange={v=>setPortfolioField('image_url',v)} placeholder="https://..." /><input type="file" accept="image/*" onChange={e=>uploadAdminImage(e.target.files?.[0], url=>setPortfolioField('image_url', url))}/></Field><Field label="الوصف"><textarea value={portfolioForm.description || ''} onChange={e=>setPortfolioField('description',e.target.value)} /></Field><Field label="الحالة"><Select value={portfolioForm.status} onChange={v=>setPortfolioField('status',v)}><option value="published">منشور</option><option value="draft">مسودة</option><option value="hidden">مخفي</option></Select></Field><Field label="مميز"><Select value={portfolioForm.is_featured ? '1':'0'} onChange={v=>setPortfolioField('is_featured',v==='1')}><option value="0">لا</option><option value="1">نعم</option></Select></Field><div className="actions"><button>{editing.type==='portfolio'?'حفظ تعديل النموذج':'إضافة نموذج عمل'}</button></div></form>
      <div className="portfolio-grid">{portfolio.map(p=><div className="portfolio-card" key={p.id}>{p.image_url&&<img src={p.image_url} alt={p.title_ar}/>}<b>{p.title_ar}</b><small>{p.beautician_name||'-'} • {p.category_name||'-'} • {p.service_name||'-'}</small><p>{p.description||''}</p><div><button onClick={()=>{setPortfolioForm({...emptyPortfolio,...p});setEditing({type:'portfolio',id:p.id});}}>تعديل</button><button className="danger" onClick={()=>deleteItem('/admin/beautician-portfolio',p.id,'نموذج العمل')}>حذف</button></div></div>)}</div></section>

    <section className="panel"><h2>تقييمات العملاء</h2><table><thead><tr><th>خبيرة التجميل</th><th>العميلة</th><th>التقييم</th><th>التعليق</th><th>التاريخ</th></tr></thead><tbody>{reviews.map(r=><tr key={r.id}><td>{r.beautician_name||'-'}</td><td>{r.customer_name||r.customer_phone||'-'}</td><td>{'★'.repeat(Number(r.rating||0))}</td><td>{r.review_text||'-'}</td><td>{formatDate(r.created_at)}</td></tr>)}</tbody></table></section>

    <section className="panel"><h2>الطلبات</h2><div className="filters"><input placeholder="بحث" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">كل الحالات</option>{statusOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select value={filters.payment} onChange={e=>setFilters({...filters,payment:e.target.value})}><option value="">كل الدفع</option>{paymentOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select value={filters.region_id} onChange={e=>setFilters({...filters,region_id:e.target.value,city_id:''})}><OptionList items={catalog.regions} empty="كل المناطق" /></select><select value={filters.city_id} onChange={e=>setFilters({...filters,city_id:e.target.value})}><OptionList items={catalog.cities.filter(c=>!filters.region_id||c.region_id===filters.region_id)} empty="كل المدن" /></select></div><p className="muted">المعروض: {filteredBookings.length} من {bookings.length}</p><table><thead><tr><th>رقم الطلب</th><th>المصدر</th><th>العميلة</th><th>الموقع</th><th>الخدمة</th><th>خبيرة مفضلة</th><th>خبيرة معينة</th><th>التاريخ</th><th>الحالة</th><th>الدفع</th><th>إجراء</th></tr></thead><tbody>{filteredBookings.map((b,i)=><tr key={b.id}><td><b>{b.booking_number||`#${i+1}`}</b><br/><small>{b.id.slice(0,8)}</small></td><td>{b.booking_source_label||b.booking_source||'-'}</td><td>{b.customer_name||'-'}<br/><small>{b.customer_phone||'-'}</small></td><td>{b.region_name||'-'} / {b.city_name||'-'} / {b.district_name||'-'}</td><td>{b.service_category_name||'-'} / {b.service_name||'-'}</td><td>{b.preferred_artist_name||'-'}</td><td>{b.artist_name||'-'}</td><td>{formatDate(b.booking_date)} {formatTime(b.booking_time)}</td><td><select value={b.status} onChange={e=>updateStatus(b.id,e.target.value)}>{statusOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></td><td><select className="payment-select" value={b.payment_status || 'unpaid'} onChange={e=>updatePayment(b.id,e.target.value)}>{paymentOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></td><td><button onClick={()=>openBookingDetails(b)}>تفاصيل</button><select value={b.assigned_artist_id||''} onChange={e=>assignBeautician(b.id,e.target.value)}><option value="">تعيين خبيرة</option>{beauticians.filter(a=>a.status==='active').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="mini" onClick={()=>prepareWhatsApp(b)}>واتساب</button><button className="mini" onClick={()=>updatePaymentDetails(b)}>تفاصيل الدفع</button><button className="danger" onClick={()=>deleteItem('/admin/bookings',b.id,'الطلب')}>حذف</button></td></tr>)}</tbody></table></section>
  </main>;
}


function PaymentOpsPanel({ bookings, updatePaymentDetails }) {
  const pending = bookings.filter(b => (b.payment_status || 'unpaid') !== 'paid');
  const paid = bookings.filter(b => (b.payment_status || 'unpaid') === 'paid');
  return <section className="panel"><h2>إدارة الدفع والتحصيل</h2><div className="cards small"><Card title="طلبات غير مدفوعة" value={pending.length}/><Card title="طلبات مدفوعة" value={paid.length}/><Card title="عربون مدفوع" value={bookings.filter(b=>b.payment_status==='deposit_paid').length}/><Card title="مسترجع" value={bookings.filter(b=>b.payment_status==='refunded').length}/></div><table><thead><tr><th>رقم الطلب</th><th>العميلة</th><th>الخدمة</th><th>حالة الدفع</th><th>طريقة الدفع</th><th>المرجع</th><th>الإيصال</th><th>إجراء</th></tr></thead><tbody>{bookings.slice(0,20).map(b=><tr key={b.id}><td>{b.booking_number||b.id.slice(0,8)}</td><td>{b.customer_name||'-'}<br/><small>{b.customer_phone||''}</small></td><td>{b.service_name||'-'}</td><td>{paymentLabels[b.payment_status||'unpaid']}</td><td>{paymentMethodLabels[b.payment_method]||b.payment_method||'-'}</td><td>{b.payment_reference||'-'}</td><td>{b.payment_proof_url ? <a href={b.payment_proof_url} target="_blank">فتح</a> : '-'}</td><td><button onClick={()=>updatePaymentDetails(b)}>تعديل الدفع</button></td></tr>)}</tbody></table></section>;
}

function NotificationsPanel({ notifications, templates, prepareWhatsApp }) {
  const counts = notifications?.counts || {};
  const items = notifications?.items || [];
  return <section className="panel"><h2>تنبيهات الطلبات</h2><div className="cards small"><Card title="طلبات جديدة" value={counts.new_bookings || 0}/><Card title="بدون خبيرة" value={counts.unassigned_bookings || 0}/><Card title="غير مدفوعة" value={counts.unpaid_bookings || 0}/><Card title="طلبات اليوم" value={counts.today_bookings || 0}/></div><table><thead><tr><th>العميلة</th><th>الخدمة</th><th>الحالة</th><th>التواصل</th></tr></thead><tbody>{items.slice(0,8).map(b=><tr key={b.id}><td>{b.customer_name||'-'}<br/><small>{b.customer_phone||''}</small></td><td>{b.service_name||'-'}</td><td>{statusLabels[b.status]||b.status}</td><td><select onChange={e=>e.target.value&&prepareWhatsApp(b,e.target.value)} defaultValue=""><option value="">اختر قالب واتساب</option>{templates.filter(t=>t.status==='active').map(t=><option key={t.id} value={t.id}>{t.title_ar}</option>)}</select></td></tr>)}</tbody></table></section>;
}

function TemplatesPanel({ templates, templateForm, setTemplateForm, saveTemplate, setEditing, deleteItem }) {
  return <section className="panel"><h2>قوالب رسائل واتساب</h2><form className="grid4" onSubmit={saveTemplate}><Field label="الكود"><TextInput value={templateForm.code} onChange={v=>setTemplateForm({...templateForm,code:v})} placeholder="confirm_booking" /></Field><Field label="العنوان"><TextInput required value={templateForm.title_ar} onChange={v=>setTemplateForm({...templateForm,title_ar:v})} /></Field><Field label="الحالة"><Select value={templateForm.status} onChange={v=>setTemplateForm({...templateForm,status:v})}><option value="active">فعال</option><option value="inactive">غير فعال</option></Select></Field><Field label="ترتيب"><TextInput type="number" value={templateForm.sort_order} onChange={v=>setTemplateForm({...templateForm,sort_order:Number(v)||0})} /></Field><Field label="نص الرسالة"><textarea value={templateForm.body_ar} onChange={e=>setTemplateForm({...templateForm,body_ar:e.target.value})} placeholder="مرحباً {customer_name} ..." /></Field><div className="actions"><button>حفظ القالب</button></div></form><p className="muted">متغيرات متاحة: {'{customer_name}'} {'{booking_id}'} {'{service_name}'} {'{booking_date}'} {'{booking_time}'} {'{payment_status}'}</p><div className="listbox">{templates.map(t=><div className="listrow" key={t.id}><span><b>{t.title_ar}</b><small>{t.body_ar}</small></span><span><button onClick={()=>{setTemplateForm({...emptyTemplate,...t});setEditing({type:'template',id:t.id});}}>تعديل</button><button className="danger" onClick={()=>deleteItem('/admin/communication-templates',t.id,'القالب')}>حذف</button></span></div>)}</div></section>;
}

function BookingDetailsModal({ booking, beauticians, updateStatus, assignBeautician, updatePayment, updatePaymentDetails, close }) {
  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-head"><h2>تفاصيل الطلب {booking.booking_number || ''}</h2><button onClick={close}>إغلاق</button></div><div className="detail-grid"><p><b>رقم الطلب:</b> {booking.booking_number || booking.id}</p><p><b>مصدر الطلب:</b> {booking.booking_source_label || booking.booking_source || '-'}</p><p><b>العميلة:</b> {booking.customer_name || '-'}</p><p><b>الجوال:</b> {booking.customer_phone || '-'}</p><p><b>الموقع:</b> {booking.region_name || '-'} / {booking.city_name || '-'} / {booking.district_name || '-'}</p><p><b>الخدمة:</b> {booking.service_category_name || '-'} / {booking.service_name || '-'}</p><p><b>خبيرة مفضلة:</b> {booking.preferred_artist_name || '-'}</p><p><b>خبيرة معينة:</b> {booking.artist_name || '-'}</p><p><b>التاريخ:</b> {formatDate(booking.booking_date)} {formatTime(booking.booking_time)}</p><p><b>ملاحظات العميلة:</b> {booking.customer_notes || '-'}</p><p><b>حالة الدفع:</b> {paymentLabels[booking.payment_status || 'unpaid']}</p><p><b>طريقة الدفع:</b> {paymentMethodLabels[booking.payment_method] || booking.payment_method || '-'}</p><p><b>مرجع الدفع:</b> {booking.payment_reference || '-'}</p><p><b>إثبات الدفع:</b> {booking.payment_proof_url ? <a href={booking.payment_proof_url} target="_blank">فتح الإيصال</a> : '-'}</p><p><b>طريقة التواصل:</b> {contactLabels[booking.contact_preference] || booking.contact_preference || '-'}</p><p><b>وقت بديل:</b> {booking.alternate_time || '-'}</p></div>{booking.design_image_url && <div className="image-box"><b>صورة التصميم:</b><br/><a href={booking.design_image_url} target="_blank">فتح الصورة</a></div>}<div className="grid3"><Field label="تغيير الحالة"><Select value={booking.status} onChange={v=>updateStatus(booking.id, v)}>{statusOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select></Field><Field label="حالة الدفع"><Select value={booking.payment_status || 'unpaid'} onChange={v=>updatePayment(booking.id, v)}>{paymentOptions.map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select></Field><div className="field"><span>تفاصيل الدفع</span><button onClick={()=>updatePaymentDetails(booking)}>تعديل تفاصيل الدفع</button></div><Field label="تعيين خبيرة تجميل"><Select value={booking.assigned_artist_id || ''} onChange={v=>assignBeautician(booking.id, v)}><option value="">بدون تعيين</option>{beauticians.filter(a=>a.status==='active').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field></div><div className="timeline"><b>تسلسل الحالة:</b><span>طلب جديد</span><span>جاري المراجعة</span><span>تم التأكيد</span><span>تم التعيين</span><span>مكتمل</span></div><div className="events-box"><b>سجل أحداث الطلب</b>{(booking.events||[]).length ? booking.events.map(ev=><div className="event-row" key={ev.id}><span>{ev.title||ev.event_type}</span><small>{ev.description||''} • {formatDate(ev.created_at)}</small></div>) : <small>لا توجد أحداث مسجلة.</small>}</div></div></div>;
}

function CatalogPanel({ catalog, api, load, setMessage }) {
  const [region, setRegion] = useState(emptyRegion), [city, setCity] = useState(emptyCity), [district, setDistrict] = useState(emptyDistrict);
  const [edit, setEdit] = useState({}); const [selectedRegionId, setSelectedRegionId] = useState(''); const [selectedCityId, setSelectedCityId] = useState('');
  const visibleCities = catalog.cities.filter(c => !selectedRegionId || c.region_id === selectedRegionId);
  const cityOptionsForDistrict = catalog.cities.filter(c => !selectedRegionId || c.region_id === selectedRegionId);
  const visibleDistricts = catalog.districts.filter(d => !selectedCityId || d.city_id === selectedCityId);
  async function save(path, form, reset) { try { const id = edit[path]; await api(`/admin/${path}${id?`/${id}`:''}`, { method:id?'PATCH':'POST', body: JSON.stringify(clean(form)) }); reset(); setEdit({}); setMessage('تم الحفظ.'); await load(); } catch(e) { setMessage(`تعذر الحفظ: ${e.message}`); } }
  async function del(path,id,label){ if(!confirm(`حذف ${label}؟`)) return; try{ await api(`/admin/${path}/${id}`,{method:'DELETE'}); await load(); }catch(e){ setMessage(e.message); } }
  return <section className="panel"><h2>إدارة المواقع: المناطق والمدن والأحياء</h2><p className="muted">إذا لم تختَر منطقة تظهر كل المدن، وعند اختيار منطقة تظهر مدنها فقط. وإذا لم تختَر مدينة تظهر كل الأحياء، وعند اختيار مدينة تظهر أحياؤها فقط.</p><div className="three"><div><h3>المناطق</h3><Field label="اسم عربي"><TextInput value={region.name_ar} onChange={v=>setRegion({...region,name_ar:v})}/></Field><Field label="اسم إنجليزي"><TextInput value={region.name_en} onChange={v=>setRegion({...region,name_en:v})}/></Field><button onClick={()=>save('regions',region,()=>setRegion(emptyRegion))}>{edit.regions?'حفظ تعديل':'إضافة منطقة'}</button><List items={catalog.regions} onEdit={x=>{setRegion({...emptyRegion,...x});setEdit({regions:x.id});}} onDel={x=>del('regions',x.id,'المنطقة')} /></div><div><h3>المدن</h3><Field label="فلترة حسب المنطقة"><Select value={selectedRegionId} onChange={v=>{setSelectedRegionId(v);setSelectedCityId('');setCity(prev=>({...prev,region_id:v||prev.region_id}));}}><OptionList items={catalog.regions} empty="كل المناطق"/></Select></Field><Field label="المنطقة للمدينة"><Select value={city.region_id} onChange={v=>setCity({...city,region_id:v})}><OptionList items={catalog.regions}/></Select></Field><Field label="اسم عربي"><TextInput value={city.name_ar} onChange={v=>setCity({...city,name_ar:v})}/></Field><Field label="اسم إنجليزي"><TextInput value={city.name_en} onChange={v=>setCity({...city,name_en:v})}/></Field><button onClick={()=>save('cities',city,()=>setCity(emptyCity))}>{edit.cities?'حفظ تعديل':'إضافة مدينة'}</button><p className="muted">المعروض: {visibleCities.length} من {catalog.cities.length}</p><List items={visibleCities} sub="region_name" onEdit={x=>{setCity({...emptyCity,...x});setSelectedRegionId(x.region_id||'');setEdit({cities:x.id});}} onDel={x=>del('cities',x.id,'المدينة')} /></div><div><h3>الأحياء</h3><Field label="فلترة المدن حسب المنطقة"><Select value={selectedRegionId} onChange={v=>{setSelectedRegionId(v);setSelectedCityId('');}}><OptionList items={catalog.regions} empty="كل المناطق"/></Select></Field><Field label="فلترة الأحياء حسب المدينة"><Select value={selectedCityId} onChange={setSelectedCityId}><OptionList items={cityOptionsForDistrict} empty="كل المدن"/></Select></Field><Field label="المدينة للحي"><Select value={district.city_id} onChange={v=>setDistrict({...district,city_id:v})}><OptionList items={cityOptionsForDistrict}/></Select></Field><Field label="اسم عربي"><TextInput value={district.name_ar} onChange={v=>setDistrict({...district,name_ar:v})}/></Field><Field label="اسم إنجليزي"><TextInput value={district.name_en} onChange={v=>setDistrict({...district,name_en:v})}/></Field><button onClick={()=>save('districts',district,()=>setDistrict(emptyDistrict))}>{edit.districts?'حفظ تعديل':'إضافة حي'}</button><p className="muted">المعروض: {visibleDistricts.length} من {catalog.districts.length}</p><List items={visibleDistricts} sub="city_name" onEdit={x=>{setDistrict({...emptyDistrict,...x});setSelectedCityId(x.city_id||'');setEdit({districts:x.id});}} onDel={x=>del('districts',x.id,'الحي')} /></div></div></section>;
}

function ServicesPanel({ catalog, api, load, setMessage }) {
  const [cat, setCat] = useState(emptyCategory), [service, setService] = useState(emptyService), [edit, setEdit] = useState({});
  async function save(path, form, reset) { try { const id = edit[path]; await api(`/admin/${path}${id?`/${id}`:''}`, { method:id?'PATCH':'POST', body: JSON.stringify(clean(form)) }); reset(); setEdit({}); setMessage('تم الحفظ.'); await load(); } catch(e) { setMessage(`تعذر الحفظ: ${e.message}`); } }
  async function del(path,id,label){ if(!confirm(`حذف ${label}؟`)) return; try{ await api(`/admin/${path}/${id}`,{method:'DELETE'}); await load(); }catch(e){ setMessage(e.message); } }
  return <section className="panel"><h2>إدارة أقسام الخدمات والخدمات</h2><div className="two"><div><h3>أقسام الخدمات</h3><Field label="اسم عربي"><TextInput value={cat.name_ar} onChange={v=>setCat({...cat,name_ar:v})}/></Field><Field label="اسم إنجليزي"><TextInput value={cat.name_en} onChange={v=>setCat({...cat,name_en:v})}/></Field><Field label="الوصف"><TextInput value={cat.description} onChange={v=>setCat({...cat,description:v})}/></Field><button onClick={()=>save('service-categories',cat,()=>setCat(emptyCategory))}>{edit['service-categories']?'حفظ تعديل':'إضافة قسم'}</button><List items={catalog.service_categories} onEdit={x=>{setCat({...emptyCategory,...x});setEdit({'service-categories':x.id});}} onDel={x=>del('service-categories',x.id,'القسم')} /></div><div><h3>الخدمات</h3><Field label="القسم"><Select value={service.category_id} onChange={v=>setService({...service,category_id:v})}><OptionList items={catalog.service_categories}/></Select></Field><Field label="اسم عربي"><TextInput value={service.name_ar} onChange={v=>setService({...service,name_ar:v,name:v})}/></Field><Field label="اسم إنجليزي"><TextInput value={service.name_en} onChange={v=>setService({...service,name_en:v})}/></Field><div className="grid3"><Field label="أقل سعر"><TextInput type="number" value={service.min_price} onChange={v=>setService({...service,min_price:v})}/></Field><Field label="أعلى سعر"><TextInput type="number" value={service.max_price} onChange={v=>setService({...service,max_price:v})}/></Field><Field label="المدة بالدقائق"><TextInput type="number" value={service.duration_minutes} onChange={v=>setService({...service,duration_minutes:v})}/></Field></div><button onClick={()=>save('services',service,()=>setService(emptyService))}>{edit.services?'حفظ تعديل':'إضافة خدمة'}</button><List items={catalog.services} name="display_name" sub="category_name" onEdit={x=>{setService({...emptyService,...x});setEdit({services:x.id});}} onDel={x=>del('services',x.id,'الخدمة')} /></div></div></section>;
}
function List({ items, name='name_ar', sub, onEdit, onDel }) { return <div className="listbox">{items.map(x=><div className="listrow" key={x.id}><span><b>{x[name]||x.name_ar||x.display_name}</b>{sub&&<small>{x[sub]||''}</small>}</span><span><button onClick={()=>onEdit(x)}>تعديل</button><button className="danger" onClick={()=>onDel(x)}>حذف</button></span></div>)}</div>; }

createRoot(document.getElementById('root')).render(<App />);

import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const statusLabels = {
  new: 'طلب جديد',
  under_review: 'جاري المراجعة',
  waiting_customer_confirmation: 'بانتظار تأكيد العميلة',
  confirmed: 'تم تأكيد الحجز',
  artist_assigned: 'تم تعيين الحنانة',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  unavailable: 'غير متوفر'
};

const statusOptions = [
  ['new', 'طلب جديد'],
  ['under_review', 'جاري المراجعة'],
  ['waiting_customer_confirmation', 'بانتظار تأكيد العميلة'],
  ['confirmed', 'تم تأكيد الحجز'],
  ['artist_assigned', 'تم تعيين الحنانة'],
  ['in_progress', 'قيد التنفيذ'],
  ['completed', 'مكتمل'],
  ['cancelled', 'ملغي'],
  ['unavailable', 'غير متوفر']
];

const paymentLabels = {
  unpaid: 'غير مدفوع',
  deposit_paid: 'عربون مدفوع',
  paid: 'مدفوع بالكامل',
  refunded: 'مسترجع'
};

function formatDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-';
  return `${Number(value).toLocaleString('ar-SA')} ريال`;
}

function formatTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 5);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function toDateKey(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function cleanPhone(phone) {
  return String(phone || '').replace(/[^0-9+]/g, '');
}

function whatsappLink(phone, text) {
  const normalized = cleanPhone(phone);
  if (!normalized) return '#';
  const international = normalized.startsWith('0') ? `966${normalized.slice(1)}` : normalized.replace(/^\+/, '');
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

function csvEscape(value) {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
}

function Card({ title, value }) {
  return (
    <div className="card">
      <div className="value">{value}</div>
      <div className="label">{title}</div>
    </div>
  );
}

const initialForm = {
  name: '',
  phone: '',
  city: 'الرياض',
  district: '',
  event_type: 'زواج',
  service_type: 'حناء عروس',
  booking_date: '',
  booking_time: '',
  people_count: 1,
  address: '',
  customer_notes: ''
};

const initialArtistForm = {
  name: '',
  phone: '',
  city: 'الرياض',
  districts: '',
  skills: '',
  bio: '',
  rating: 5,
  status: 'active'
};

const initialAvailabilityForm = {
  artist_id: '',
  available_date: '',
  from_time: '16:00',
  to_time: '22:00',
  is_available: true,
  note: ''
};

const initialReviewForm = {
  artist_id: '',
  booking_id: '',
  punctuality: 5,
  quality: 5,
  customer_handling: 5,
  suitable_for_brides: false,
  suitable_for_groups: false,
  note: ''
};

const initialDetailForm = {
  estimated_price: '',
  final_price: '',
  deposit_amount: '',
  payment_status: 'unpaid',
  admin_notes: ''
};

const initialServiceForm = {
  name: '',
  description: '',
  min_price: '',
  max_price: '',
  estimated_duration: '',
  status: 'active'
};

const initialCityForm = {
  name_ar: '',
  name_en: '',
  status: 'active'
};

const initialDistrictForm = {
  city_id: '',
  name_ar: '',
  name_en: '',
  status: 'active'
};

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.details || `Request failed: ${response.status}`);
  }

  return data;
}

function App() {
  const [dashboard, setDashboard] = useState({});
  const [bookings, setBookings] = useState([]);
  const [artists, setArtists] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [artistForm, setArtistForm] = useState(initialArtistForm);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingArtist, setSavingArtist] = useState(false);
  const [availability, setAvailability] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [availabilityForm, setAvailabilityForm] = useState(initialAvailabilityForm);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [savingArtistOps, setSavingArtistOps] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingHistory, setBookingHistory] = useState([]);
  const [detailForm, setDetailForm] = useState(initialDetailForm);
  const [savingDetails, setSavingDetails] = useState(false);
  const [services, setServices] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [cityForm, setCityForm] = useState(initialCityForm);
  const [districtForm, setDistrictForm] = useState(initialDistrictForm);
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    payment_status: 'all',
    city: 'all',
    artist: 'all'
  });
  const [calendarDate, setCalendarDate] = useState(getTodayKey());

  const activeArtistsCount = useMemo(
    () => artists.filter(a => a.status === 'active').length,
    [artists]
  );

  const filteredBookings = useMemo(() => {
    const text = filters.search.trim().toLowerCase();

    return bookings.filter(b => {
      const matchesText = !text || [
        b.customer_name,
        b.customer_phone,
        b.city_name,
        b.service_name,
        b.artist_name,
        b.address,
        b.customer_notes
      ].some(value => String(value || '').toLowerCase().includes(text));

      const matchesStatus = filters.status === 'all' || b.status === filters.status;
      const matchesPayment = filters.payment_status === 'all' || b.payment_status === filters.payment_status;
      const matchesCity = filters.city === 'all' || b.city_name === filters.city;
      const matchesArtist = filters.artist === 'all' || b.assigned_artist_id === filters.artist;

      return matchesText && matchesStatus && matchesPayment && matchesCity && matchesArtist;
    });
  }, [bookings, filters]);

  const operationalMetrics = useMemo(() => {
    const todayKey = getTodayKey();
    return {
      today: bookings.filter(b => toDateKey(b.booking_date) === todayKey && !['cancelled', 'unavailable'].includes(b.status)).length,
      unassigned: bookings.filter(b => !b.assigned_artist_id && !['completed', 'cancelled', 'unavailable'].includes(b.status)).length,
      unpaid: bookings.filter(b => (b.payment_status || 'unpaid') !== 'paid' && !['cancelled', 'unavailable'].includes(b.status)).length
    };
  }, [bookings]);

  const calendarBookings = useMemo(() => {
    return bookings
      .filter(b => toDateKey(b.booking_date) === calendarDate)
      .sort((a, b) => String(a.booking_time || '').localeCompare(String(b.booking_time || '')));
  }, [bookings, calendarDate]);

  const cityFilterOptions = useMemo(() => {
    return [...new Set(bookings.map(b => b.city_name).filter(Boolean))];
  }, [bookings]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }

  function resetFilters() {
    setFilters({
      search: '',
      status: 'all',
      payment_status: 'all',
      city: 'all',
      artist: 'all'
    });
  }

  async function load() {
    setMessage('');

    try {
      const d = await fetchJson(`${API}/admin/dashboard`);
      const b = await fetchJson(`${API}/admin/bookings`);

      setDashboard(d || {});
      setBookings(Array.isArray(b) ? b : []);

      try {
        const a = await fetchJson(`${API}/admin/artists`);
        setArtists(Array.isArray(a) ? a : []);
      } catch (artistError) {
        console.warn('Artists endpoint is not available yet:', artistError);
        setArtists([]);
      }

      try {
        const [svc, cts, dts] = await Promise.all([
          fetchJson(`${API}/admin/services`),
          fetchJson(`${API}/admin/cities`),
          fetchJson(`${API}/admin/districts`)
        ]);
        setServices(Array.isArray(svc) ? svc : []);
        setCities(Array.isArray(cts) ? cts : []);
        setDistricts(Array.isArray(dts) ? dts : []);
      } catch (catalogError) {
        console.warn('Catalog endpoints are not available yet:', catalogError);
        setServices([]);
        setCities([]);
        setDistricts([]);
      }

      try {
        const [av, rv] = await Promise.all([
          fetchJson(`${API}/admin/artist-availability`),
          fetchJson(`${API}/admin/artist-reviews`)
        ]);
        setAvailability(Array.isArray(av) ? av : []);
        setReviews(Array.isArray(rv) ? rv : []);
      } catch (artistOpsError) {
        console.warn('v1.3 artist ops endpoints are not available yet:', artistOpsError);
        setAvailability([]);
        setReviews([]);
      }
    } catch (e) {
      console.error(e);
      setMessage('تعذر تحميل البيانات. تأكد أن Backend يعمل على المنفذ 4000.');
    }
  }

  async function updateStatus(id, status) {
    try {
      await fetchJson(`${API}/admin/bookings/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ status })
      });

      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر تحديث حالة الطلب: ${e.message}`);
    }
  }

  async function assignArtist(bookingId, artistId, force = false) {
    try {
      await fetchJson(`${API}/admin/bookings/${bookingId}/assign-artist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ artist_id: artistId || null, force })
      });

      await load();
    } catch (e) {
      console.error(e);

      const isConflict = String(e.message || '').includes('تعارض');
      if (artistId && isConflict) {
        const confirmed = window.confirm('تنبيه: توجد طلبات أخرى لنفس الحنانة في نفس اليوم. هل تريد التعيين رغم ذلك؟');
        if (confirmed) {
          return assignArtist(bookingId, artistId, true);
        }
      }

      setMessage(`تعذر تعيين الحنانة: ${e.message}`);
    }
  }

  function exportBookingsCsv() {
    const header = ['رقم', 'العميلة', 'الجوال', 'المدينة', 'الخدمة', 'الحنانة', 'السعر النهائي', 'الدفع', 'التاريخ', 'الوقت', 'الحالة'];
    const rows = filteredBookings.map((b, index) => [
      index + 1,
      b.customer_name || '',
      b.customer_phone || '',
      b.city_name || '',
      b.service_name || '',
      b.artist_name || '',
      b.final_price || '',
      paymentLabels[b.payment_status] || b.payment_status || '',
      formatDate(b.booking_date),
      formatTime(b.booking_time),
      statusLabels[b.status] || b.status || ''
    ]);

    const csv = [header, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beauty-bookings-${getTodayKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }


  async function deleteBooking(id, customerName) {
    const label = customerName || 'هذا الطلب';
    const confirmed = window.confirm(`هل تريد حذف طلب ${label}؟ لا يمكن التراجع عن هذه العملية.`);
    if (!confirmed) return;

    try {
      await fetchJson(`${API}/admin/bookings/${id}`, {
        method: 'DELETE'
      });

      setMessage('تم حذف الطلب بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر حذف الطلب: ${e.message}`);
    }
  }

  async function deleteArtist(id, artistName) {
    const label = artistName || 'هذه الحنانة';
    const confirmed = window.confirm(`هل تريد حذف ${label}؟ سيتم إزالة تعيينها من أي طلب مرتبط.`);
    if (!confirmed) return;

    try {
      await fetchJson(`${API}/admin/artists/${id}`, {
        method: 'DELETE'
      });

      setMessage('تم حذف الحنانة بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر حذف الحنانة: ${e.message}`);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: name === 'people_count' ? Number(value) : value
    }));
  }

  function handleArtistChange(e) {
    const { name, value } = e.target;

    setArtistForm(prev => ({
      ...prev,
      [name]: name === 'rating' ? Number(value) : value
    }));
  }

  async function createBooking(e) {
    e.preventDefault();
    setSavingBooking(true);
    setMessage('');

    try {
      await fetchJson(`${API}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(form)
      });

      setForm(initialForm);
      setMessage('تم إنشاء الطلب بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`خطأ في إنشاء الطلب: ${e.message}`);
    } finally {
      setSavingBooking(false);
    }
  }

  async function createArtist(e) {
    e.preventDefault();
    setSavingArtist(true);
    setMessage('');

    try {
      await fetchJson(`${API}/admin/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(artistForm)
      });

      setArtistForm(initialArtistForm);
      setMessage('تمت إضافة الحنانة بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`خطأ في إضافة الحنانة: ${e.message}`);
    } finally {
      setSavingArtist(false);
    }
  }


  async function openBookingDetails(bookingId) {
    try {
      const data = await fetchJson(`${API}/admin/bookings/${bookingId}`);
      const booking = data.booking;

      setSelectedBooking(booking);
      setBookingHistory(Array.isArray(data.history) ? data.history : []);
      setDetailForm({
        estimated_price: booking.estimated_price ?? '',
        final_price: booking.final_price ?? '',
        deposit_amount: booking.deposit_amount ?? '',
        payment_status: booking.payment_status || 'unpaid',
        admin_notes: booking.admin_notes || ''
      });
    } catch (e) {
      console.error(e);
      setMessage(`تعذر فتح تفاصيل الطلب: ${e.message}`);
    }
  }

  function closeBookingDetails() {
    setSelectedBooking(null);
    setBookingHistory([]);
    setDetailForm(initialDetailForm);
  }

  function handleDetailChange(e) {
    const { name, value } = e.target;
    setDetailForm(prev => ({ ...prev, [name]: value }));
  }

  async function saveBookingDetails(e) {
    e.preventDefault();
    if (!selectedBooking) return;

    setSavingDetails(true);
    setMessage('');

    try {
      await fetchJson(`${API}/admin/bookings/${selectedBooking.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(detailForm)
      });

      setMessage('تم حفظ تفاصيل الطلب بنجاح.');
      await load();
      await openBookingDetails(selectedBooking.id);
    } catch (e) {
      console.error(e);
      setMessage(`تعذر حفظ تفاصيل الطلب: ${e.message}`);
    } finally {
      setSavingDetails(false);
    }
  }


  function handleServiceChange(e) {
    const { name, value } = e.target;
    setServiceForm(prev => ({ ...prev, [name]: value }));
  }

  function handleCityChange(e) {
    const { name, value } = e.target;
    setCityForm(prev => ({ ...prev, [name]: value }));
  }

  function handleDistrictChange(e) {
    const { name, value } = e.target;
    setDistrictForm(prev => ({ ...prev, [name]: value }));
  }

  async function createService(e) {
    e.preventDefault();
    setSavingCatalog(true);
    setMessage('');

    try {
      await fetchJson(`${API}/admin/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(serviceForm)
      });
      setServiceForm(initialServiceForm);
      setMessage('تمت إضافة الخدمة بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر إضافة الخدمة: ${e.message}`);
    } finally {
      setSavingCatalog(false);
    }
  }

  async function createCity(e) {
    e.preventDefault();
    setSavingCatalog(true);
    setMessage('');

    try {
      await fetchJson(`${API}/admin/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(cityForm)
      });
      setCityForm(initialCityForm);
      setMessage('تمت إضافة المدينة بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر إضافة المدينة: ${e.message}`);
    } finally {
      setSavingCatalog(false);
    }
  }

  async function createDistrict(e) {
    e.preventDefault();
    setSavingCatalog(true);
    setMessage('');

    try {
      await fetchJson(`${API}/admin/districts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(districtForm)
      });
      setDistrictForm(initialDistrictForm);
      setMessage('تمت إضافة الحي بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر إضافة الحي: ${e.message}`);
    } finally {
      setSavingCatalog(false);
    }
  }

  async function updateCatalogStatus(type, id, status) {
    try {
      await fetchJson(`${API}/admin/${type}/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ status })
      });
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر تحديث الحالة: ${e.message}`);
    }
  }


  async function deleteCatalogItem(type, id, label) {
    const typeLabel = type === 'services' ? 'الخدمة' : type === 'cities' ? 'المدينة' : 'الحي';
    if (!window.confirm(`هل تريد حذف ${typeLabel}: ${label || ''}؟`)) return;

    try {
      await fetchJson(`${API}/admin/${type}/${id}`, {
        method: 'DELETE'
      });
      setMessage(`تم حذف ${typeLabel} بنجاح.`);
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر حذف ${typeLabel}: ${e.message}`);
    }
  }

  function handleAvailabilityChange(e) {
    const { name, value, type, checked } = e.target;
    setAvailabilityForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function handleReviewChange(e) {
    const { name, value, type, checked } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (['punctuality', 'quality', 'customer_handling'].includes(name) ? Number(value) : value)
    }));
  }

  async function createAvailability(e) {
    e.preventDefault();
    setSavingArtistOps(true);
    setMessage('');
    try {
      await fetchJson(`${API}/admin/artist-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(availabilityForm)
      });
      setAvailabilityForm(initialAvailabilityForm);
      setMessage('تمت إضافة توفر الحنانة بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر إضافة التوفر: ${e.message}`);
    } finally {
      setSavingArtistOps(false);
    }
  }

  async function deleteAvailability(id) {
    if (!window.confirm('هل تريد حذف سجل التوفر؟')) return;
    try {
      await fetchJson(`${API}/admin/artist-availability/${id}`, { method: 'DELETE' });
      setMessage('تم حذف سجل التوفر.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر حذف التوفر: ${e.message}`);
    }
  }

  async function createReview(e) {
    e.preventDefault();
    setSavingArtistOps(true);
    setMessage('');
    try {
      await fetchJson(`${API}/admin/artist-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(reviewForm)
      });
      setReviewForm(initialReviewForm);
      setMessage('تمت إضافة تقييم الحنانة بنجاح.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر إضافة التقييم: ${e.message}`);
    } finally {
      setSavingArtistOps(false);
    }
  }

  async function deleteReview(id) {
    if (!window.confirm('هل تريد حذف تقييم الحنانة؟')) return;
    try {
      await fetchJson(`${API}/admin/artist-reviews/${id}`, { method: 'DELETE' });
      setMessage('تم حذف التقييم.');
      await load();
    } catch (e) {
      console.error(e);
      setMessage(`تعذر حذف التقييم: ${e.message}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main dir="rtl">
      <header className="header">
        <div>
          <h1>لوحة إدارة Beauty Home Service</h1>
          <p>إدارة الطلبات والحنانات والخدمات</p>
        </div>
        <button onClick={load}>تحديث</button>
      </header>

      <section className="cards cards-v11">
        <Card title="كل الطلبات" value={dashboard.total_bookings ?? bookings.length ?? 0} />
        <Card title="طلبات اليوم" value={dashboard.today_bookings ?? operationalMetrics.today} />
        <Card title="بدون حنانة" value={dashboard.unassigned_bookings ?? operationalMetrics.unassigned} />
        <Card title="غير مدفوعة" value={dashboard.unpaid_bookings ?? operationalMetrics.unpaid} />
        <Card title="طلبات جديدة" value={dashboard.new_bookings ?? bookings.filter(b => b.status === 'new').length} />
        <Card title="حنانات فعالات" value={dashboard.active_artists ?? activeArtistsCount} />
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>تقويم الطلبات</h2>
            <p className="muted">عرض سريع للطلبات حسب اليوم مع الوقت والحنانة والحالة</p>
          </div>
          <div className="calendar-controls">
            <input type="date" value={calendarDate} onChange={e => setCalendarDate(e.target.value)} />
            <button className="secondary-btn" onClick={() => setCalendarDate(getTodayKey())}>اليوم</button>
          </div>
        </div>

        <div className="calendar-list">
          {calendarBookings.map(item => (
            <div className="calendar-item" key={item.id}>
              <strong>{formatTime(item.booking_time)}</strong>
              <span>{item.customer_name || '-'} — {item.service_name || '-'}</span>
              <small>{item.artist_name || 'بدون حنانة'} • {statusLabels[item.status] || item.status}</small>
              <button className="secondary-btn small-btn" onClick={() => openBookingDetails(item.id)}>تفاصيل</button>
            </div>
          ))}

          {calendarBookings.length === 0 && <p className="empty">لا توجد طلبات في هذا اليوم</p>}
        </div>
      </section>

      {message && <div className="message global-message">{message}</div>}


      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>إدارة الخدمات والمدن والأحياء</h2>
            <p className="muted">تعريف الخدمات والمناطق التي تظهر في نماذج الحجز</p>
          </div>
        </div>

        <div className="catalog-grid">
          <div className="catalog-box">
            <h3>إضافة خدمة</h3>
            <form className="mini-form" onSubmit={createService}>
              <input name="name" value={serviceForm.name} onChange={handleServiceChange} placeholder="اسم الخدمة" required />
              <input name="description" value={serviceForm.description} onChange={handleServiceChange} placeholder="وصف مختصر" />
              <div className="mini-row">
                <input type="number" min="0" name="min_price" value={serviceForm.min_price} onChange={handleServiceChange} placeholder="السعر من" />
                <input type="number" min="0" name="max_price" value={serviceForm.max_price} onChange={handleServiceChange} placeholder="السعر إلى" />
              </div>
              <input name="estimated_duration" value={serviceForm.estimated_duration} onChange={handleServiceChange} placeholder="المدة التقريبية" />
              <button type="submit" disabled={savingCatalog}>{savingCatalog ? 'جاري الحفظ...' : 'إضافة خدمة'}</button>
            </form>

            <table className="small-table compact-table">
              <thead><tr><th>الخدمة</th><th>السعر</th><th>الحالة</th><th>إجراء</th></tr></thead>
              <tbody>
                {services.map(svc => (
                  <tr key={svc.id}>
                    <td>{svc.name}</td>
                    <td>{formatMoney(svc.min_price)} - {formatMoney(svc.max_price)}</td>
                    <td>{svc.status === 'active' ? 'فعالة' : 'موقوفة'}</td>
                    <td>
                      <button className="secondary-btn small-btn" onClick={() => updateCatalogStatus('services', svc.id, svc.status === 'active' ? 'inactive' : 'active')}>
                        {svc.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button className="danger-btn small-btn" onClick={() => deleteCatalogItem('services', svc.id, svc.name)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="catalog-box">
            <h3>إضافة مدينة</h3>
            <form className="mini-form" onSubmit={createCity}>
              <input name="name_ar" value={cityForm.name_ar} onChange={handleCityChange} placeholder="اسم المدينة عربي" required />
              <input name="name_en" value={cityForm.name_en} onChange={handleCityChange} placeholder="اسم المدينة إنجليزي" />
              <button type="submit" disabled={savingCatalog}>{savingCatalog ? 'جاري الحفظ...' : 'إضافة مدينة'}</button>
            </form>

            <table className="small-table compact-table">
              <thead><tr><th>المدينة</th><th>EN</th><th>الحالة</th><th>إجراء</th></tr></thead>
              <tbody>
                {cities.map(city => (
                  <tr key={city.id}>
                    <td>{city.name_ar}</td>
                    <td>{city.name_en || '-'}</td>
                    <td>{city.status === 'active' ? 'فعالة' : 'موقوفة'}</td>
                    <td>
                      <button className="secondary-btn small-btn" onClick={() => updateCatalogStatus('cities', city.id, city.status === 'active' ? 'inactive' : 'active')}>
                        {city.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button className="danger-btn small-btn" onClick={() => deleteCatalogItem('cities', city.id, city.name_ar)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="catalog-box">
            <h3>إضافة حي</h3>
            <form className="mini-form" onSubmit={createDistrict}>
              <select name="city_id" value={districtForm.city_id} onChange={handleDistrictChange} required>
                <option value="">اختر المدينة</option>
                {cities.filter(c => c.status === 'active').map(city => (
                  <option key={city.id} value={city.id}>{city.name_ar}</option>
                ))}
              </select>
              <input name="name_ar" value={districtForm.name_ar} onChange={handleDistrictChange} placeholder="اسم الحي عربي" required />
              <input name="name_en" value={districtForm.name_en} onChange={handleDistrictChange} placeholder="اسم الحي إنجليزي" />
              <button type="submit" disabled={savingCatalog}>{savingCatalog ? 'جاري الحفظ...' : 'إضافة حي'}</button>
            </form>

            <table className="small-table compact-table">
              <thead><tr><th>الحي</th><th>المدينة</th><th>الحالة</th><th>إجراء</th></tr></thead>
              <tbody>
                {districts.map(d => (
                  <tr key={d.id}>
                    <td>{d.name_ar}</td>
                    <td>{d.city_name || '-'}</td>
                    <td>{d.status === 'active' ? 'فعال' : 'موقوف'}</td>
                    <td>
                      <button className="secondary-btn small-btn" onClick={() => updateCatalogStatus('districts', d.id, d.status === 'active' ? 'inactive' : 'active')}>
                        {d.status === 'active' ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button className="danger-btn small-btn" onClick={() => deleteCatalogItem('districts', d.id, d.name_ar)}>
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>إنشاء طلب جديد</h2>
            <p className="muted">أدخل بيانات العميلة والحجز من لوحة الإدارة مباشرة</p>
          </div>
        </div>

        <form className="booking-form" onSubmit={createBooking}>
          <div className="field">
            <label>اسم العميلة</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="مثال: سارة أحمد"
              required
            />
          </div>

          <div className="field">
            <label>رقم الجوال</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          <div className="field">
            <label>المدينة</label>
            <select name="city" value={form.city} onChange={handleChange} required>
              {(cities.length ? cities.filter(c => c.status === 'active') : [
                { id: 'riyadh', name_ar: 'الرياض' },
                { id: 'jeddah', name_ar: 'جدة' },
                { id: 'dammam', name_ar: 'الدمام' }
              ]).map(c => (
                <option key={c.id} value={c.name_ar}>{c.name_ar}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>الحي</label>
            <input
              name="district"
              value={form.district}
              onChange={handleChange}
              placeholder="مثال: حي النرجس"
              required
            />
          </div>

          <div className="field">
            <label>نوع المناسبة</label>
            <select name="event_type" value={form.event_type} onChange={handleChange}>
              <option value="زواج">زواج</option>
              <option value="ملكة">ملكة</option>
              <option value="عيد">عيد</option>
              <option value="جلسة خاصة">جلسة خاصة</option>
              <option value="حناء أطفال">حناء أطفال</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div className="field">
            <label>نوع الخدمة</label>
            <select name="service_type" value={form.service_type} onChange={handleChange}>
              {(services.length ? services.filter(s => s.status === 'active') : [
                { id: 's1', name: 'حناء بسيطة' },
                { id: 's2', name: 'حناء متوسطة' },
                { id: 's3', name: 'حناء فخمة' },
                { id: 's4', name: 'حناء عروس' }
              ]).map(svc => (
                <option key={svc.id} value={svc.name}>{svc.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>تاريخ الحجز</label>
            <input
              type="date"
              name="booking_date"
              value={form.booking_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label>وقت الحجز</label>
            <input
              type="time"
              name="booking_time"
              value={form.booking_time}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label>عدد الأشخاص</label>
            <input
              type="number"
              min="1"
              name="people_count"
              value={form.people_count}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field wide">
            <label>العنوان</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="مثال: الرياض - حي النرجس"
              required
            />
          </div>

          <div className="field full">
            <label>ملاحظات</label>
            <textarea
              name="customer_notes"
              value={form.customer_notes}
              onChange={handleChange}
              placeholder="أي تفاصيل إضافية عن الطلب"
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={savingBooking}>
              {savingBooking ? 'جاري الحفظ...' : 'إنشاء الطلب'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>إدارة الحنانات</h2>
            <p className="muted">إضافة الحنانات المتاحات وربطهن بالطلبات</p>
          </div>
        </div>

        <form className="booking-form" onSubmit={createArtist}>
          <div className="field">
            <label>اسم الحنانة</label>
            <input
              name="name"
              value={artistForm.name}
              onChange={handleArtistChange}
              placeholder="مثال: أم نورة"
              required
            />
          </div>

          <div className="field">
            <label>رقم الجوال</label>
            <input
              name="phone"
              value={artistForm.phone}
              onChange={handleArtistChange}
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          <div className="field">
            <label>المدينة</label>
            <select name="city" value={artistForm.city} onChange={handleArtistChange}>
              {(cities.length ? cities.filter(c => c.status === 'active') : [
                { id: 'riyadh', name_ar: 'الرياض' },
                { id: 'jeddah', name_ar: 'جدة' },
                { id: 'dammam', name_ar: 'الدمام' }
              ]).map(c => (
                <option key={c.id} value={c.name_ar}>{c.name_ar}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>الأحياء التي تغطيها</label>
            <input
              name="districts"
              value={artistForm.districts}
              onChange={handleArtistChange}
              placeholder="مثال: النرجس، الياسمين"
            />
          </div>

          <div className="field wide">
            <label>المهارات</label>
            <input
              name="skills"
              value={artistForm.skills}
              onChange={handleArtistChange}
              placeholder="مثال: حناء عروس، حناء أطفال"
            />
          </div>

          <div className="field">
            <label>التقييم الداخلي</label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              name="rating"
              value={artistForm.rating}
              onChange={handleArtistChange}
            />
          </div>

          <div className="field">
            <label>الحالة</label>
            <select name="status" value={artistForm.status} onChange={handleArtistChange}>
              <option value="active">فعالة</option>
              <option value="inactive">غير فعالة</option>
            </select>
          </div>

          <div className="field full">
            <label>نبذة / ملاحظات</label>
            <textarea
              name="bio"
              value={artistForm.bio}
              onChange={handleArtistChange}
              rows="2"
              placeholder="ملاحظات داخلية عن الحنانة"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={savingArtist}>
              {savingArtist ? 'جاري الحفظ...' : 'إضافة حنانة'}
            </button>
          </div>
        </form>

        <table className="small-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الجوال</th>
              <th>المدينة</th>
              <th>الأحياء</th>
              <th>المهارات</th>
              <th>التقييم</th>
              <th>طلبات مكتملة</th>
              <th>تقييمات</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>

          <tbody>
            {artists.map(a => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.phone}</td>
                <td>{a.city_name || '-'}</td>
                <td>{a.districts || '-'}</td>
                <td>{a.skills || '-'}</td>
                <td>{a.review_rating || a.rating || '-'}</td>
                <td>{a.completed_bookings ?? 0}</td>
                <td>{a.review_count ?? 0}</td>
                <td>{a.status === 'active' ? 'فعالة' : 'غير فعالة'}</td>
                <td>
                  <button className="danger-btn" onClick={() => deleteArtist(a.id, a.name)}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}

            {artists.length === 0 && (
              <tr>
                <td colSpan="10" className="empty">لا توجد حنانات حالياً</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>توفر وتقييم الحنانات - v1.3</h2>
            <p className="muted">إدارة جدول توفر الحنانة وتقييم الجودة بعد تنفيذ الطلبات</p>
          </div>
        </div>

        <div className="catalog-grid artist-ops-grid">
          <div className="catalog-box">
            <h3>إضافة توفر للحنانة</h3>
            <form className="mini-form" onSubmit={createAvailability}>
              <select name="artist_id" value={availabilityForm.artist_id} onChange={handleAvailabilityChange} required>
                <option value="">اختر الحنانة</option>
                {artists.filter(a => a.status === 'active').map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input type="date" name="available_date" value={availabilityForm.available_date} onChange={handleAvailabilityChange} required />
              <div className="mini-row">
                <input type="time" name="from_time" value={availabilityForm.from_time} onChange={handleAvailabilityChange} />
                <input type="time" name="to_time" value={availabilityForm.to_time} onChange={handleAvailabilityChange} />
              </div>
              <label className="check-line">
                <input type="checkbox" name="is_available" checked={availabilityForm.is_available} onChange={handleAvailabilityChange} />
                متاحة في هذا الموعد
              </label>
              <input name="note" value={availabilityForm.note} onChange={handleAvailabilityChange} placeholder="ملاحظة اختيارية" />
              <button type="submit" disabled={savingArtistOps}>{savingArtistOps ? 'جاري الحفظ...' : 'إضافة التوفر'}</button>
            </form>

            <table className="small-table compact-table">
              <thead><tr><th>الحنانة</th><th>التاريخ</th><th>من</th><th>إلى</th><th>الحالة</th><th>إجراء</th></tr></thead>
              <tbody>
                {availability.slice(0, 20).map(item => (
                  <tr key={item.id}>
                    <td>{item.artist_name || '-'}</td>
                    <td>{formatDate(item.available_date)}</td>
                    <td>{formatTime(item.from_time)}</td>
                    <td>{formatTime(item.to_time)}</td>
                    <td>{item.is_available ? 'متاحة' : 'غير متاحة'}</td>
                    <td><button className="danger-btn small-btn" onClick={() => deleteAvailability(item.id)}>حذف</button></td>
                  </tr>
                ))}
                {availability.length === 0 && <tr><td colSpan="6" className="empty">لا يوجد توفر مسجل</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="catalog-box">
            <h3>تقييم حنانة بعد الطلب</h3>
            <form className="mini-form" onSubmit={createReview}>
              <select name="artist_id" value={reviewForm.artist_id} onChange={handleReviewChange} required>
                <option value="">اختر الحنانة</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select name="booking_id" value={reviewForm.booking_id} onChange={handleReviewChange}>
                <option value="">ربط بطلب اختياري</option>
                {bookings.filter(b => b.assigned_artist_id === reviewForm.artist_id || !reviewForm.artist_id).map(b => (
                  <option key={b.id} value={b.id}>{b.customer_name || 'طلب'} - {formatDate(b.booking_date)}</option>
                ))}
              </select>
              <div className="mini-row">
                <input type="number" min="1" max="5" name="punctuality" value={reviewForm.punctuality} onChange={handleReviewChange} placeholder="الالتزام" />
                <input type="number" min="1" max="5" name="quality" value={reviewForm.quality} onChange={handleReviewChange} placeholder="الجودة" />
                <input type="number" min="1" max="5" name="customer_handling" value={reviewForm.customer_handling} onChange={handleReviewChange} placeholder="التعامل" />
              </div>
              <label className="check-line"><input type="checkbox" name="suitable_for_brides" checked={reviewForm.suitable_for_brides} onChange={handleReviewChange} /> مناسبة للعرائس</label>
              <label className="check-line"><input type="checkbox" name="suitable_for_groups" checked={reviewForm.suitable_for_groups} onChange={handleReviewChange} /> مناسبة للطلبات الجماعية</label>
              <input name="note" value={reviewForm.note} onChange={handleReviewChange} placeholder="ملاحظة التقييم" />
              <button type="submit" disabled={savingArtistOps}>{savingArtistOps ? 'جاري الحفظ...' : 'إضافة التقييم'}</button>
            </form>

            <table className="small-table compact-table">
              <thead><tr><th>الحنانة</th><th>التقييم</th><th>الطلب</th><th>ملاحظة</th><th>إجراء</th></tr></thead>
              <tbody>
                {reviews.slice(0, 20).map(r => (
                  <tr key={r.id}>
                    <td>{r.artist_name || '-'}</td>
                    <td>{r.overall_rating || '-'}</td>
                    <td>{r.customer_name || '-'}</td>
                    <td>{r.note || '-'}</td>
                    <td><button className="danger-btn small-btn" onClick={() => deleteReview(r.id)}>حذف</button></td>
                  </tr>
                ))}
                {reviews.length === 0 && <tr><td colSpan="5" className="empty">لا توجد تقييمات بعد</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <h2>الطلبات</h2>
            <p className="muted">عدد الطلبات المعروضة: {filteredBookings.length} من {bookings.length}</p>
          </div>
          <div className="title-actions">
            <button className="secondary-btn" onClick={exportBookingsCsv}>تصدير CSV</button>
            <button className="secondary-btn" onClick={resetFilters}>مسح الفلاتر</button>
          </div>
        </div>

        <div className="filters-row">
          <div className="field filter-field">
            <label>بحث عام</label>
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="بحث بالاسم، الجوال، المدينة، الخدمة، الحنانة"
            />
          </div>

          <div className="field filter-field">
            <label>حالة الطلب</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="all">كل الحالات</option>
              {statusOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="field filter-field">
            <label>حالة الدفع</label>
            <select name="payment_status" value={filters.payment_status} onChange={handleFilterChange}>
              <option value="all">كل حالات الدفع</option>
              <option value="unpaid">غير مدفوع</option>
              <option value="deposit_paid">عربون مدفوع</option>
              <option value="paid">مدفوع بالكامل</option>
              <option value="refunded">مسترجع</option>
            </select>
          </div>

          <div className="field filter-field">
            <label>المدينة</label>
            <select name="city" value={filters.city} onChange={handleFilterChange}>
              <option value="all">كل المدن</option>
              {cityFilterOptions.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="field filter-field">
            <label>الحنانة</label>
            <select name="artist" value={filters.artist} onChange={handleFilterChange}>
              <option value="all">كل الحنانات</option>
              {artists.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>رقم</th>
              <th>العميلة</th>
              <th>الجوال</th>
              <th>المدينة</th>
              <th>الخدمة</th>
              <th>الحنانة</th>
              <th>السعر النهائي</th>
              <th>الدفع</th>
              <th>التاريخ</th>
              <th>الوقت</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>

          <tbody>
            {filteredBookings.map((b, i) => (
              <tr key={b.id}>
                <td>{i + 1}</td>
                <td>{b.customer_name || '-'}</td>
                <td>{b.customer_phone || '-'}</td>
                <td>{b.city_name || '-'}</td>
                <td>{b.service_name || '-'}</td>
                <td>{b.artist_name || '-'}</td>
                <td>{formatMoney(b.final_price)}</td>
                <td>{paymentLabels[b.payment_status] || b.payment_status || '-'}</td>
                <td>{formatDate(b.booking_date)}</td>
                <td>{formatTime(b.booking_time)}</td>
                <td>
                  <span className="status">{statusLabels[b.status] || b.status}</span>
                </td>
                <td>
                  <div className="actions-stack">
                    <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}>
                      {statusOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>

                    <select
                      value={b.assigned_artist_id || ''}
                      onChange={e => assignArtist(b.id, e.target.value)}
                    >
                      <option value="">تعيين حنانة</option>
                      {artists
                        .filter(a => a.status === 'active')
                        .map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>


                    <button className="secondary-btn details-btn" onClick={() => openBookingDetails(b.id)}>
                      تفاصيل الطلب
                    </button>

                    <button className="danger-btn" onClick={() => deleteBooking(b.id, b.customer_name)}>
                      حذف الطلب
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan="12" className="empty">لا توجد طلبات حالياً</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {selectedBooking && (
        <div className="modal-backdrop">
          <section className="details-modal" dir="rtl">
            <div className="modal-header">
              <div>
                <h2>تفاصيل الطلب</h2>
                <p className="muted">مراجعة بيانات الحجز وتحديث الأسعار والدفع والملاحظات</p>
              </div>
              <button className="secondary-btn" onClick={closeBookingDetails}>إغلاق</button>
            </div>

            <div className="details-grid">
              <div className="detail-item"><span>العميلة</span><strong>{selectedBooking.customer_name || '-'}</strong></div>
              <div className="detail-item"><span>الجوال</span><strong>{selectedBooking.customer_phone || '-'}</strong></div>
              <div className="detail-item"><span>المدينة</span><strong>{selectedBooking.city_name || '-'}</strong></div>
              <div className="detail-item"><span>الحي</span><strong>{selectedBooking.district_name || '-'}</strong></div>
              <div className="detail-item"><span>الخدمة</span><strong>{selectedBooking.service_name || '-'}</strong></div>
              <div className="detail-item"><span>الحنانة</span><strong>{selectedBooking.artist_name || '-'}</strong></div>
              <div className="detail-item"><span>التاريخ</span><strong>{formatDate(selectedBooking.booking_date)}</strong></div>
              <div className="detail-item"><span>الوقت</span><strong>{formatTime(selectedBooking.booking_time)}</strong></div>
              <div className="detail-item"><span>عدد الأشخاص</span><strong>{selectedBooking.people_count || '-'}</strong></div>
              <div className="detail-item"><span>الحالة</span><strong>{statusLabels[selectedBooking.status] || selectedBooking.status}</strong></div>
              <div className="detail-item full"><span>العنوان</span><strong>{selectedBooking.address || '-'}</strong></div>
              <div className="detail-item full"><span>ملاحظات العميلة</span><strong>{selectedBooking.customer_notes || '-'}</strong></div>
            </div>

            <div className="quick-actions">
              <a
                className="whatsapp-btn"
                href={whatsappLink(selectedBooking.customer_phone, `مرحباً ${selectedBooking.customer_name || ''}، بخصوص طلب الحناء بتاريخ ${formatDate(selectedBooking.booking_date)} الساعة ${formatTime(selectedBooking.booking_time)}.`)}
                target="_blank"
                rel="noreferrer"
              >
                واتساب العميلة
              </a>
              {selectedBooking.artist_phone && (
                <a
                  className="whatsapp-btn secondary-whatsapp"
                  href={whatsappLink(selectedBooking.artist_phone, `مرحباً، لديك طلب حناء بتاريخ ${formatDate(selectedBooking.booking_date)} الساعة ${formatTime(selectedBooking.booking_time)} للعميلة ${selectedBooking.customer_name || ''}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  واتساب الحنانة
                </a>
              )}
            </div>

            <form className="booking-form details-form" onSubmit={saveBookingDetails}>
              <div className="field">
                <label>السعر التقديري</label>
                <input
                  type="number"
                  min="0"
                  name="estimated_price"
                  value={detailForm.estimated_price}
                  onChange={handleDetailChange}
                  placeholder="مثال: 300"
                />
              </div>

              <div className="field">
                <label>السعر النهائي</label>
                <input
                  type="number"
                  min="0"
                  name="final_price"
                  value={detailForm.final_price}
                  onChange={handleDetailChange}
                  placeholder="مثال: 450"
                />
              </div>

              <div className="field">
                <label>العربون</label>
                <input
                  type="number"
                  min="0"
                  name="deposit_amount"
                  value={detailForm.deposit_amount}
                  onChange={handleDetailChange}
                  placeholder="مثال: 100"
                />
              </div>

              <div className="field">
                <label>حالة الدفع</label>
                <select name="payment_status" value={detailForm.payment_status} onChange={handleDetailChange}>
                  <option value="unpaid">غير مدفوع</option>
                  <option value="deposit_paid">عربون مدفوع</option>
                  <option value="paid">مدفوع بالكامل</option>
                  <option value="refunded">مسترجع</option>
                </select>
              </div>

              <div className="field full">
                <label>ملاحظات الإدارة</label>
                <textarea
                  name="admin_notes"
                  value={detailForm.admin_notes}
                  onChange={handleDetailChange}
                  rows="3"
                  placeholder="ملاحظات داخلية تظهر للإدارة فقط"
                />
              </div>

              <div className="form-actions">
                <button type="submit" disabled={savingDetails}>
                  {savingDetails ? 'جاري الحفظ...' : 'حفظ تفاصيل الطلب'}
                </button>
              </div>
            </form>

            <div className="history-box">
              <h3>سجل حالة الطلب</h3>
              {bookingHistory.length === 0 && <p className="muted">لا يوجد سجل بعد</p>}
              {bookingHistory.map(item => (
                <div className="history-item" key={item.id}>
                  <strong>{statusLabels[item.new_status] || item.new_status || 'تحديث'}</strong>
                  <span>{item.note || '-'}</span>
                  <small>{new Date(item.created_at).toLocaleString('ar-SA')}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

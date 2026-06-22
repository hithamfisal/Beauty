import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Images,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const statusLabels = {
  new: "طلب جديد",
  under_review: "جاري المراجعة",
  waiting_customer_confirmation: "بانتظار تأكيد العميلة",
  confirmed: "تم تأكيد الحجز",
  beautician_assigned: "تم تعيين خبيرة التجميل",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};
const statusOptions = Object.entries(statusLabels);
const paymentLabels = {
  unpaid: "غير مدفوع",
  deposit_paid: "عربون مدفوع",
  paid: "مدفوع بالكامل",
  refunded: "مسترجع",
};
const paymentOptions = Object.entries(paymentLabels);
const paymentMethodLabels = {
  cash: "كاش",
  bank_transfer: "تحويل بنكي",
  stc_pay: "STC Pay",
  mada: "مدى",
  card: "بطاقة",
  other: "أخرى",
};

const emptyBooking = {
  name: "",
  phone: "",
  region_id: "",
  city_id: "",
  district_id: "",
  service_category_id: "",
  service_id: "",
  preferred_artist_id: "",
  event_type: "زواج",
  booking_date: "",
  booking_time: "18:00",
  people_count: 1,
  address: "",
  customer_notes: "",
  design_image_url: "",
  booking_source: "admin",
};
const emptyBeautician = {
  name: "",
  phone: "",
  region_id: "",
  city_id: "",
  main_expertise_category_id: "",
  skills: "",
  bio: "",
  rating: 5,
  status: "active",
};
const emptyAvailability = {
  beautician_id: "",
  availability_status: "available",
  working_days: ["0", "1", "2", "3", "4", "5"],
  work_start_time: "10:00",
  work_end_time: "22:00",
  max_daily_bookings: 3,
  coverage_region_ids: [],
  coverage_city_ids: [],
  coverage_district_ids: [],
};
const availabilityLabels = {
  available: "متاحة",
  busy: "مشغولة",
  inactive: "موقوفة",
};
const dayLabels = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];
const emptyRegion = {
  name_ar: "",
  name_en: "",
  external_id: "",
  status: "active",
  sort_order: 0,
};
const emptyCity = {
  region_id: "",
  name_ar: "",
  name_en: "",
  external_id: "",
  status: "active",
  sort_order: 0,
};
const emptyDistrict = {
  city_id: "",
  name_ar: "",
  name_en: "",
  external_id: "",
  status: "active",
  sort_order: 0,
};
const emptyCategory = {
  name_ar: "",
  name_en: "",
  description: "",
  status: "active",
  sort_order: 0,
};
const emptyService = {
  category_id: "",
  name_ar: "",
  name_en: "",
  description: "",
  min_price: "",
  max_price: "",
  duration_minutes: "",
  status: "active",
  sort_order: 0,
};
const emptyPortfolio = {
  beautician_id: "",
  service_category_id: "",
  service_id: "",
  title_ar: "",
  title_en: "",
  description: "",
  image_url: "",
  is_featured: false,
  status: "published",
  sort_order: 0,
};
const emptyTemplate = {
  code: "",
  title_ar: "",
  body_ar: "",
  channel: "whatsapp",
  status: "active",
  sort_order: 0,
};
const contactLabels = { whatsapp: "واتساب", call: "اتصال", sms: "رسالة SMS" };

const adminNavigation = [
  {
    id: "insights",
    label: "معلومات التطبيق والقياسات",
    icon: LayoutDashboard,
    items: [
      { id: "overview", label: "لوحة المعلومات", icon: LayoutDashboard },
      { id: "analytics", label: "التحليلات", icon: BarChart3 },
      { id: "notifications", label: "تنبيهات الطلبات", icon: Bell },
      { id: "templates", label: "قوالب التواصل", icon: MessageCircle },
    ],
  },
  {
    id: "payments",
    label: "إدارة الدفع والتحصيل",
    icon: CreditCard,
    items: [
      { id: "payment-operations", label: "الدفع والتحصيل", icon: CreditCard },
    ],
  },
  {
    id: "locations",
    label: "إدارة المواقع",
    icon: MapPin,
    items: [
      {
        id: "location-management",
        label: "المناطق والمدن والأحياء",
        icon: MapPin,
      },
      { id: "location-import", label: "استيراد بيانات المواقع", icon: Upload },
    ],
  },
  {
    id: "services",
    label: "إدارة الخدمات",
    icon: Sparkles,
    items: [
      {
        id: "service-management",
        label: "أقسام الخدمات والخدمات",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "beauticians",
    label: "إدارة خبيرات التجميل",
    icon: UserRound,
    items: [
      { id: "beautician-management", label: "خبيرات التجميل", icon: UserRound },
      {
        id: "beautician-availability",
        label: "التوفر والتغطية",
        icon: ListChecks,
      },
      { id: "beautician-portfolio", label: "معرض الأعمال", icon: Images },
      { id: "customer-reviews", label: "تقييمات العملاء", icon: Star },
    ],
  },
  {
    id: "bookings",
    label: "إدارة الطلبات",
    icon: ClipboardList,
    items: [
      { id: "booking-create", label: "إنشاء طلب جديد", icon: PlusCircle },
      { id: "booking-list", label: "الطلبات", icon: ClipboardList },
    ],
  },
];

const viewTitles = Object.fromEntries(
  adminNavigation.flatMap((group) =>
    group.items.map((item) => [item.id, item.label]),
  ),
);

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("ar-SA") : "-";
}
function formatTime(value) {
  return value ? String(value).slice(0, 5) : "-";
}
function clean(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === "" ? null : v]),
  );
}

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
function PhoneInput({ value, onChange, required = false, disabled = false }) {
  const actualValue = formatSaudiPhoneInput(value);
  const displayValue = phoneMask(actualValue);
  const updateFromText = (text) => onChange(formatSaudiPhoneInput(text));
  return (
    <input
      type="tel"
      inputMode="numeric"
      dir="ltr"
      className="phoneMaskInput"
      value={displayValue}
      placeholder="05xxxxxxxx"
      required={required}
      disabled={disabled}
      maxLength={18}
      autoComplete="tel"
      title="رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx"
      onFocus={(e) => requestAnimationFrame(() => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length))}
      onClick={(e) => requestAnimationFrame(() => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length))}
      onPaste={(e) => { e.preventDefault(); updateFromText(e.clipboardData.getData('text')); }}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          onChange(actualValue.length <= 2 ? '' : actualValue.slice(0, -1));
        }
      }}
      onChange={(e) => updateFromText(e.target.value)}
      onBlur={(e) => updateFromText(e.target.value)}
    />
  );
}

function whatsapp(phone, text) {
  const p = String(phone || "").replace(/[^0-9+]/g, "");
  const intl = p.startsWith("0") ? `966${p.slice(1)}` : p.replace(/^\+/, "");
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
function Card({ title, value }) {
  return (
    <div className="card">
      <div className="value">{value}</div>
      <div className="label">{title}</div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
function Select({
  value,
  onChange,
  children,
  required = false,
  disabled = false,
}) {
  return (
    <select
      value={value ?? ""}
      required={required}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}
function sameId(a, b) { return String(a || "") === String(b || ""); }

function OptionList({ items, label = "name_ar", empty = "اختر" }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <>
      <option value="">{empty}</option>
      {list.map((i) => (
        <option key={i.id} value={i.id}>
          {i[label] || i.display_name || i.name || i.name_ar}
        </option>
      ))}
    </>
  );
}

function AdminSidebar({
  activeView,
  onNavigate,
  adminUser,
  open,
  onClose,
  onLogout,
}) {
  const activeGroup =
    adminNavigation.find((group) =>
      group.items.some((item) => item.id === activeView),
    )?.id || "insights";
  const [openGroups, setOpenGroups] = useState({ [activeGroup]: true });

  useEffect(() => {
    setOpenGroups((current) =>
      current[activeGroup] ? current : { ...current, [activeGroup]: true },
    );
  }, [activeGroup]);

  function toggleGroup(id) {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }

  function navigate(id) {
    onNavigate(id);
    onClose();
  }

  return (
    <>
      <aside
        className={`admin-sidebar ${open ? "is-open" : ""}`}
        aria-label="التنقل الرئيسي"
      >
        <div className="sidebar-brand">
          <div className="brand-mark">B</div>
          <div>
            <b>Beauty Home Service</b>
            <small>لوحة الإدارة</small>
          </div>
          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {adminNavigation.map((group) => {
            const GroupIcon = group.icon;
            const expanded = !!openGroups[group.id];
            const selected = group.id === activeGroup;
            return (
              <div
                className={`nav-group ${selected ? "is-current" : ""}`}
                key={group.id}
              >
                <button
                  className="nav-group-trigger"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={expanded}
                >
                  <span>
                    <GroupIcon size={19} />
                    {group.label}
                  </span>
                  <ChevronDown
                    size={17}
                    className={expanded ? "is-rotated" : ""}
                  />
                </button>
                {expanded && (
                  <div className="nav-submenu">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          className={activeView === item.id ? "is-active" : ""}
                          onClick={() => navigate(item.id)}
                        >
                          <ItemIcon size={17} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">
            <UserRound size={19} />
          </div>
          <div>
            <b>{adminUser?.name || "مدير النظام"}</b>
            <small>{adminUser?.email || ""}</small>
          </div>
          <button onClick={onLogout} aria-label="تسجيل الخروج">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-scrim"
          onClick={onClose}
          aria-label="إغلاق القائمة"
        />
      )}
    </>
  );
}

function App() {
  const [dashboard, setDashboard] = useState({});
  const [bookings, setBookings] = useState([]);
  const [beauticians, setBeauticians] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState({ counts: {}, items: [] });
  const [templates, setTemplates] = useState([]);
  const emptyCatalog = {
    regions: [],
    cities: [],
    districts: [],
    service_categories: [],
    services: [],
  };
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [beauticianForm, setBeauticianForm] = useState(emptyBeautician);
  const [portfolioForm, setPortfolioForm] = useState(emptyPortfolio);
  const [templateForm, setTemplateForm] = useState(emptyTemplate);
  const [editing, setEditing] = useState({ type: null, id: null });
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    payment: "",
    region_id: "",
    city_id: "",
    beautician_id: "",
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [updating, setUpdating] = useState({});
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem("beauty_admin_token") || "",
  );
  const [adminUser, setAdminUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("beauty_admin_user") || "null");
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({
    email: import.meta.env.DEV ? "admin@beauty.local" : "",
    password: "",
  });
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailability);
  const [smartSuggestions, setSmartSuggestions] = useState({
    booking_id: null,
    items: [],
  });
  const [availabilityRegionFilter, setAvailabilityRegionFilter] = useState("");
  const [availabilityCityFilter, setAvailabilityCityFilter] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    };
    if (adminToken && path.startsWith("/admin"))
      headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text?.slice(0, 300) || "Invalid server response" };
    }
    if (!res.ok)
      throw new Error(data?.details || data?.error || "Request failed");
    return data;
  }

  async function load() {
    try {
      const [d, b, c, a, p, r, n, t] = await Promise.all([
        api("/admin/dashboard"),
        api("/admin/bookings"),
        api("/admin/catalog?all=1"),
        api("/admin/beauticians"),
        api("/admin/beautician-portfolio"),
        api("/admin/beautician-reviews"),
        api("/admin/notifications"),
        api("/admin/communication-templates"),
      ]);
      setDashboard(d || {});
      setBookings(Array.isArray(b) ? b : []);
      setCatalog({
        ...emptyCatalog,
        ...(c || {}),
        regions: Array.isArray(c?.regions) ? c.regions : [],
        cities: Array.isArray(c?.cities) ? c.cities : [],
        districts: Array.isArray(c?.districts) ? c.districts : [],
        service_categories: Array.isArray(c?.service_categories)
          ? c.service_categories
          : [],
        services: Array.isArray(c?.services) ? c.services : [],
      });
      setBeauticians(Array.isArray(a) ? a : []);
      setPortfolio(Array.isArray(p) ? p : []);
      setReviews(Array.isArray(r) ? r : []);
      setNotifications(n || { counts: {}, items: [] });
      setTemplates(Array.isArray(t) ? t : []);
    } catch (e) {
      setMessage(`خطأ تحميل البيانات: ${e.message}`);
    }
  }
  async function refreshServiceCatalog() {
    const [categories, services] = await Promise.all([
      api("/admin/service-categories?all=1"),
      api("/admin/services?all=1"),
    ]);
    setCatalog((prev) => ({
      ...prev,
      service_categories: Array.isArray(categories) ? categories : [],
      services: Array.isArray(services) ? services : [],
    }));
    return { categories, services };
  }
  useEffect(() => {
    if (adminToken) load();
  }, [adminToken]);

  async function login(e) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل تسجيل الدخول");
      localStorage.setItem("beauty_admin_token", data.token);
      localStorage.setItem("beauty_admin_user", JSON.stringify(data.user));
      setAdminToken(data.token);
      setAdminUser(data.user);
      setMessage("تم تسجيل الدخول.");
    } catch (e) {
      setMessage(`تعذر تسجيل الدخول: ${e.message}`);
    }
  }
  function logout() {
    localStorage.removeItem("beauty_admin_token");
    localStorage.removeItem("beauty_admin_user");
    setAdminToken("");
    setAdminUser(null);
  }

  const catalogRegions = Array.isArray(catalog.regions) ? catalog.regions : [];
  const catalogCities = Array.isArray(catalog.cities) ? catalog.cities : [];
  const catalogDistricts = Array.isArray(catalog.districts)
    ? catalog.districts
    : [];
  const catalogServices = Array.isArray(catalog.services)
    ? catalog.services
    : [];
  const citiesForBooking = catalogCities.filter(
    (c) => !bookingForm.region_id || sameId(c.region_id, bookingForm.region_id),
  );
  const districtsForBooking = catalogDistricts.filter((d) => {
    if (bookingForm.city_id) return sameId(d.city_id, bookingForm.city_id);
    if (bookingForm.region_id) {
      const city = catalogCities.find(
        (c) => String(c.id) === String(d.city_id),
      );
      return city && sameId(city.region_id, bookingForm.region_id);
    }
    return true;
  });
  const servicesForBooking = catalogServices.filter(
    (s) =>
      !bookingForm.service_category_id ||
      sameId(s.category_id, bookingForm.service_category_id),
  );
  const citiesForBeautician = catalogCities.filter(
    (c) =>
      !beauticianForm.region_id || sameId(c.region_id, beauticianForm.region_id),
  );
  const portfolioServices = catalogServices.filter(
    (s) =>
      !portfolioForm.service_category_id ||
      sameId(s.category_id, portfolioForm.service_category_id),
  );
  const serviceCategories = useMemo(
    () =>
      Array.isArray(catalog.service_categories)
        ? catalog.service_categories.filter(Boolean)
        : [],
    [catalog.service_categories],
  );
  const coveredRegionIds = Array.isArray(availabilityForm.coverage_region_ids)
    ? availabilityForm.coverage_region_ids.map(String).filter(Boolean)
    : [];
  const coveredCityIds = Array.isArray(availabilityForm.coverage_city_ids)
    ? availabilityForm.coverage_city_ids.map(String).filter(Boolean)
    : [];
  const availabilityCities = catalogCities.filter(
    (c) =>
      !coveredRegionIds.length ||
      coveredRegionIds.includes(String(c.region_id)),
  );
  const availabilityDistricts = catalogDistricts.filter((d) => {
    if (coveredCityIds.length)
      return coveredCityIds.includes(String(d.city_id));
    if (coveredRegionIds.length) {
      const city = catalogCities.find(
        (c) => String(c.id) === String(d.city_id),
      );
      return city && coveredRegionIds.includes(String(city.region_id));
    }
    return true;
  });
  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => {
        const q = filters.q.trim().toLowerCase();
        if (
          q &&
          ![
            b.customer_name,
            b.customer_phone,
            b.region_name,
            b.city_name,
            b.district_name,
            b.service_name,
            b.artist_name,
            b.preferred_artist_name,
          ].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(q),
          )
        )
          return false;
        if (filters.status && b.status !== filters.status) return false;
        if (
          filters.payment &&
          (b.payment_status || "unpaid") !== filters.payment
        )
          return false;
        if (filters.region_id && !sameId(b.region_id, filters.region_id))
          return false;
        if (filters.city_id && !sameId(b.city_id, filters.city_id)) return false;
        if (
          filters.beautician_id &&
          b.assigned_artist_id !== filters.beautician_id &&
          b.preferred_artist_id !== filters.beautician_id
        )
          return false;
        return true;
      }),
    [bookings, filters],
  );

  function setBooking(key, value) {
    setBookingForm((prev) => {
      const normalizedValue = key === "phone" ? formatSaudiPhoneInput(value) : value;
      const next = { ...prev, [key]: normalizedValue };
      if (key === "region_id") {
        next.city_id = "";
        next.district_id = "";
      }
      if (key === "city_id") next.district_id = "";
      if (key === "service_category_id") next.service_id = "";
      return next;
    });
  }
  function setBeautician(key, value) {
    setBeauticianForm((prev) => {
      const normalizedValue = key === "phone" ? formatSaudiPhoneInput(value) : value;
      const next = { ...prev, [key]: normalizedValue };
      if (key === "region_id") next.city_id = "";
      return next;
    });
  }
  function setPortfolioField(key, value) {
    setPortfolioForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "service_category_id") next.service_id = "";
      return next;
    });
  }

  async function createBooking(e) {
    e.preventDefault();
    try {
      await api("/bookings", {
        method: "POST",
        body: JSON.stringify(clean(bookingForm)),
      });
      setBookingForm(emptyBooking);
      setMessage("تم إنشاء الطلب.");
      await load();
    } catch (e) {
      setMessage(`تعذر إنشاء الطلب: ${e.message}`);
    }
  }
  async function saveBeautician(e) {
    e.preventDefault();
    try {
      const payload = clean(beauticianForm);
      if (editing.type === "beautician")
        await api(`/admin/beauticians/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      else
        await api("/admin/beauticians", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      setBeauticianForm(emptyBeautician);
      setEditing({});
      setMessage("تم حفظ خبيرة التجميل.");
      await load();
    } catch (e) {
      setMessage(`تعذر حفظ خبيرة التجميل: ${e.message}`);
    }
  }
  async function savePortfolio(e) {
    e.preventDefault();
    try {
      const payload = clean(portfolioForm);
      if (editing.type === "portfolio")
        await api(`/admin/beautician-portfolio/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      else
        await api("/admin/beautician-portfolio", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      setPortfolioForm(emptyPortfolio);
      setEditing({});
      setMessage("تم حفظ نموذج العمل.");
      await load();
    } catch (e) {
      setMessage(`تعذر حفظ نموذج العمل: ${e.message}`);
    }
  }
  async function deleteItem(path, id, label = "العنصر") {
    if (!confirm(`تأكيد حذف ${label}؟`)) return;
    try {
      await api(`${path}/${id}`, { method: "DELETE" });
      setMessage("تم الحذف.");
      await load();
    } catch (e) {
      setMessage(`تعذر الحذف: ${e.message}`);
    }
  }
  function setBookingInState(id, patch) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
    setSelectedBooking((prev) =>
      prev?.id === id ? { ...prev, ...patch } : prev,
    );
  }

  async function refreshBooking(id) {
    try {
      const data = await api(`/admin/bookings/${id}`);
      if (data?.booking)
        setBookingInState(id, { ...data.booking, events: data.events || [] });
      return data?.booking;
    } catch {
      await load();
      return null;
    }
  }

  async function updateStatus(id, status) {
    const key = `status:${id}`;
    const previous =
      bookings.find((b) => b.id === id)?.status || selectedBooking?.status;
    try {
      setMessage("");
      setUpdating((prev) => ({ ...prev, [key]: true }));
      setBookingInState(id, { status });
      const res = await api(`/admin/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const updated = res?.booking || res || {};
      setBookingInState(id, { ...updated, status: updated.status || status });
      await refreshBooking(id);
      setMessage("تم تحديث حالة الطلب وانعكست في الجدول والتفاصيل.");
    } catch (e) {
      if (previous) setBookingInState(id, { status: previous });
      setMessage(`تعذر تحديث حالة الطلب: ${e.message}`);
      await refreshBooking(id);
    } finally {
      setUpdating((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }
  }

  async function updatePayment(id, payment_status) {
    const key = `payment:${id}`;
    const previous =
      bookings.find((b) => b.id === id)?.payment_status ||
      selectedBooking?.payment_status ||
      "unpaid";
    try {
      setMessage("");
      setUpdating((prev) => ({ ...prev, [key]: true }));
      setBookingInState(id, { payment_status });
      const updated = await api(`/admin/bookings/${id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ payment_status }),
      });
      setBookingInState(id, {
        ...updated,
        payment_status: updated?.payment_status || payment_status,
      });
      await refreshBooking(id);
      setMessage("تم تحديث حالة الدفع وانعكست في الجدول والتفاصيل.");
    } catch (e) {
      setBookingInState(id, { payment_status: previous });
      setMessage(`تعذر تحديث حالة الدفع: ${e.message}`);
      await refreshBooking(id);
    } finally {
      setUpdating((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }
  }

  async function updatePaymentDetails(b) {
    const payment_status = prompt(
      "حالة الدفع: unpaid / deposit_paid / paid / refunded",
      b.payment_status || "unpaid",
    );
    if (payment_status === null) return;
    const payment_method = prompt(
      "طريقة الدفع: cash / bank_transfer / stc_pay / mada / card / other",
      b.payment_method || "bank_transfer",
    );
    if (payment_method === null) return;
    const payment_reference = prompt(
      "رقم المرجع / التحويل",
      b.payment_reference || "",
    );
    const payment_proof_url = prompt(
      "رابط إثبات الدفع / الإيصال",
      b.payment_proof_url || "",
    );
    const payment_notes = prompt("ملاحظات الدفع", b.payment_notes || "");
    try {
      const updated = await api(`/admin/bookings/${b.id}/payment-details`, {
        method: "PATCH",
        body: JSON.stringify({
          payment_status,
          payment_method,
          payment_reference,
          payment_proof_url,
          payment_notes,
        }),
      });
      setBookingInState(
        b.id,
        updated || {
          payment_status,
          payment_method,
          payment_reference,
          payment_proof_url,
          payment_notes,
        },
      );
      await refreshBooking(b.id);
      setMessage("تم تحديث تفاصيل الدفع وانعكست في الطلب.");
    } catch (e) {
      setMessage(`تعذر تحديث تفاصيل الدفع: ${e.message}`);
      await refreshBooking(b.id);
    }
  }

  async function assignBeautician(id, artist_id) {
    const key = `assign:${id}`;
    const previous = bookings.find((b) => b.id === id) || selectedBooking || {};
    const artist = beauticians.find((a) => a.id === artist_id);
    try {
      setMessage("");
      setUpdating((prev) => ({ ...prev, [key]: true }));
      setBookingInState(id, {
        assigned_artist_id: artist_id || null,
        artist_name: artist?.name || null,
        status: artist_id ? "beautician_assigned" : previous.status,
      });
      const updated = await api(`/admin/bookings/${id}/assign-artist`, {
        method: "PATCH",
        body: JSON.stringify({ artist_id: artist_id || null, force: true }),
      });
      setBookingInState(id, {
        ...updated,
        artist_name: artist?.name || updated?.artist_name || null,
      });
      await refreshBooking(id);
      setMessage(
        artist_id
          ? "تم تعيين خبيرة التجميل وانعكس التغيير في الطلب."
          : "تم إلغاء تعيين خبيرة التجميل.",
      );
    } catch (e) {
      setBookingInState(id, previous);
      setMessage(`تعذر تعيين خبيرة التجميل: ${e.message}`);
      await refreshBooking(id);
    } finally {
      setUpdating((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }
  }
  async function openBookingDetails(b) {
    try {
      const data = await api(`/admin/bookings/${b.id}`);
      setSelectedBooking({
        ...data.booking,
        history: data.history || [],
        events: data.events || [],
      });
    } catch (e) {
      setMessage(`تعذر فتح تفاصيل الطلب: ${e.message}`);
    }
  }
  async function importSaudiOpenData() {
    try {
      const data = await api("/admin/import/saudi-open-data", {
        method: "POST",
        body: JSON.stringify({ mode: "all" }),
      });
      setMessage(
        `تم الاستيراد: مناطق ${data.summary?.regions || 0}, مدن ${data.summary?.cities || 0}, أحياء ${data.summary?.districts || 0}`,
      );
      await load();
    } catch (e) {
      setMessage(`تعذر الاستيراد: ${e.message}`);
    }
  }
  async function uploadAdminImage(file, setter) {
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = await api("/admin/uploads/image", {
          method: "POST",
          body: JSON.stringify({
            image_data_url: reader.result,
            folder: "beauty-home-service/admin",
          }),
        });
        setter(result.url);
        setMessage("تم رفع الصورة.");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setMessage(`تعذر رفع الصورة: ${e.message}`);
    }
  }
  async function saveTemplate(e) {
    e.preventDefault();
    try {
      const payload = clean(templateForm);
      if (editing.type === "template")
        await api(`/admin/communication-templates/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      else
        await api("/admin/communication-templates", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      setTemplateForm(emptyTemplate);
      setEditing({});
      setMessage("تم حفظ قالب التواصل.");
      await load();
    } catch (e) {
      setMessage(`تعذر حفظ قالب التواصل: ${e.message}`);
    }
  }
  async function prepareWhatsApp(booking, templateId = "") {
    try {
      const data = await api(`/admin/bookings/${booking.id}/whatsapp`, {
        method: "POST",
        body: JSON.stringify({ template_id: templateId || null }),
      });
      window.open(data.url, "_blank");
      await load();
    } catch (e) {
      setMessage(`تعذر تجهيز رسالة واتساب: ${e.message}`);
    }
  }

  function chooseAvailabilityBeautician(id) {
    const a = beauticians.find((x) => x.id === id);
    if (!a) return setAvailabilityForm(emptyAvailability);
    const parseArr = (v) =>
      Array.isArray(v)
        ? v.map(String)
        : (() => {
            try {
              return JSON.parse(v || "[]").map(String);
            } catch {
              return [];
            }
          })();
    setAvailabilityForm({
      beautician_id: a.id,
      availability_status: a.availability_status || "available",
      working_days: parseArr(a.working_days).length
        ? parseArr(a.working_days)
        : ["0", "1", "2", "3", "4", "5"],
      work_start_time: String(a.work_start_time || "10:00").slice(0, 5),
      work_end_time: String(a.work_end_time || "22:00").slice(0, 5),
      max_daily_bookings: a.max_daily_bookings || 3,
      coverage_region_ids: parseArr(a.coverage_region_ids),
      coverage_city_ids: parseArr(a.coverage_city_ids),
      coverage_district_ids: parseArr(a.coverage_district_ids),
    });
  }

  async function saveAvailability(e) {
    e.preventDefault();
    if (!availabilityForm.beautician_id)
      return setMessage("اختر خبيرة التجميل أولاً.");
    try {
      await api(
        `/admin/beauticians/${availabilityForm.beautician_id}/availability`,
        { method: "PATCH", body: JSON.stringify(availabilityForm) },
      );
      setMessage("تم حفظ توفر وتغطية خبيرة التجميل.");
      await load();
    } catch (e) {
      setMessage(`تعذر حفظ التوفر: ${e.message}`);
    }
  }

  async function suggestBeauticians(b) {
    try {
      const data = await api(`/admin/bookings/${b.id}/smart-beauticians`);
      setSmartSuggestions({
        booking_id: b.id,
        booking_number: b.booking_number,
        items: data.suggestions || [],
      });
      const names = (data.suggestions || [])
        .filter((x) => x.is_suitable)
        .slice(0, 5)
        .map((x) => x.name)
        .join("، ");
      setMessage(
        names
          ? `الخبيرات المرشحات للطلب ${b.booking_number || ""}: ${names}`
          : "لا توجد خبيرات مناسبة حسب التوفر والتغطية.",
      );
    } catch (e) {
      setMessage(`تعذر تحميل الترشيح الذكي: ${e.message}`);
    }
  }

  if (!adminToken)
    return (
      <main dir="rtl" className="login-page">
        <section className="login-card">
          <h1>Beauty Home Service</h1>
          <p className="muted">تسجيل دخول لوحة الإدارة</p>
          {message && <div className="message">{message}</div>}
          <form onSubmit={login}>
            <Field label="البريد الإلكتروني">
              <TextInput
                value={loginForm.email}
                onChange={(v) => setLoginForm({ ...loginForm, email: v })}
                required
              />
            </Field>
            <Field label="كلمة المرور">
              <TextInput
                type="password"
                value={loginForm.password}
                onChange={(v) => setLoginForm({ ...loginForm, password: v })}
                required
              />
            </Field>
            <button>دخول</button>
          </form>
          {import.meta.env.DEV && (
            <p className="muted">
              حساب التطوير المحلي موضح في ملف البيئة المحلي.
            </p>
          )}
        </section>
      </main>
    );

  return (
    <div dir="rtl" className="admin-shell">
      <AdminSidebar
        activeView={activeView}
        onNavigate={setActiveView}
        adminUser={adminUser}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onLogout={logout}
      />
      <main className="admin-content">
        <header className="header">
          <button
            className="mobile-menu-button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={21} />
          </button>
          <div>
            <h1>{viewTitles[activeView] || "لوحة المعلومات"}</h1>
            <p>Beauty Home Service</p>
          </div>
          <div className="header-actions">
            <span className="muted">{adminUser?.name || adminUser?.email}</span>
            <button onClick={load}>
              <RefreshCw size={17} /> تحديث
            </button>
            <button className="secondary" onClick={logout}>
              <LogOut size={17} /> خروج
            </button>
          </div>
        </header>
        {message && <div className="message">{message}</div>}
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            beauticians={beauticians}
            updateStatus={updateStatus}
            assignBeautician={assignBeautician}
            updatePayment={updatePayment}
            updatePaymentDetails={updatePaymentDetails}
            updating={updating}
            close={() => setSelectedBooking(null)}
          />
        )}
        {activeView === "overview" && (
          <section className="cards">
            <Card title="كل الطلبات" value={dashboard.total_bookings ?? 0} />
            <Card title="طلبات جديدة" value={dashboard.new_bookings ?? 0} />
            <Card title="طلبات اليوم" value={dashboard.today_bookings ?? 0} />
            <Card
              title="بدون خبيرة"
              value={dashboard.unassigned_bookings ?? 0}
            />
            <Card title="غير مدفوعة" value={dashboard.unpaid_bookings ?? 0} />
            <Card
              title="خبيرات فعالات"
              value={
                dashboard.active_beauticians ?? dashboard.active_artists ?? 0
              }
            />
          </section>
        )}

        {activeView === "analytics" && (
          <AnalyticsPanel
            bookings={bookings}
            beauticians={beauticians}
            portfolio={portfolio}
            reviews={reviews}
            catalog={catalog}
            dashboard={dashboard}
          />
        )}

        {activeView === "notifications" && (
          <NotificationsPanel
            notifications={notifications}
            templates={templates}
            prepareWhatsApp={prepareWhatsApp}
          />
        )}
        {activeView === "templates" && (
          <TemplatesPanel
            templates={templates}
            templateForm={templateForm}
            setTemplateForm={setTemplateForm}
            saveTemplate={saveTemplate}
            setEditing={setEditing}
            deleteItem={deleteItem}
          />
        )}
        {activeView === "payment-operations" && (
          <PaymentOpsPanel
            bookings={bookings}
            updatePaymentDetails={updatePaymentDetails}
          />
        )}

        {activeView === "location-management" && (
          <CatalogPanel
            catalog={catalog}
            load={load}
            api={api}
            setMessage={setMessage}
          />
        )}
        {activeView === "service-management" && (
          <ServicesPanel
            catalog={catalog}
            refreshServiceCatalog={refreshServiceCatalog}
            api={api}
            setMessage={setMessage}
          />
        )}

        {activeView === "location-import" && (
          <section className="panel">
            <h2>استيراد بيانات المواقع</h2>
            <p className="muted">
              استيراد بيانات السعودية الجاهزة للمناطق والمدن والأحياء.
            </p>
            <button onClick={importSaudiOpenData}>
              استيراد بيانات السعودية الجاهزة من GitHub
            </button>
          </section>
        )}

        {activeView === "booking-create" && (
          <section className="panel">
            <h2>إنشاء طلب جديد</h2>
            <form className="grid4" onSubmit={createBooking}>
              <Field label="اسم العميلة">
                <TextInput
                  required
                  value={bookingForm.name}
                  onChange={(v) => setBooking("name", v)}
                />
              </Field>
              <Field label="الجوال">
                <PhoneInput
                  required
                  value={bookingForm.phone}
                  onChange={(v) => setBooking("phone", v)}
                />
              </Field>
              <Field label="المنطقة">
                <Select
                  required
                  value={bookingForm.region_id}
                  onChange={(v) => setBooking("region_id", v)}
                >
                  <OptionList items={catalogRegions} />
                </Select>
              </Field>
              <Field label="المدينة">
                <Select
                  required
                  value={bookingForm.city_id}
                  onChange={(v) => setBooking("city_id", v)}
                >
                  <OptionList items={citiesForBooking} empty={bookingForm.region_id ? "مدن المنطقة المختارة" : "كل المدن"} />
                </Select>
              </Field>
              <Field label="الحي">
                <Select
                  required
                  value={bookingForm.district_id}
                  onChange={(v) => setBooking("district_id", v)}
                >
                  <OptionList items={districtsForBooking} empty={bookingForm.city_id ? "أحياء المدينة المختارة" : bookingForm.region_id ? "أحياء المنطقة المختارة" : "كل الأحياء"} />
                </Select>
              </Field>
              <Field label="قسم الخدمة">
                <Select
                  value={bookingForm.service_category_id}
                  onChange={(v) => setBooking("service_category_id", v)}
                >
                  <OptionList items={serviceCategories} empty="كل الأقسام" />
                </Select>
              </Field>
              <Field label="الخدمة">
                <Select
                  required
                  value={bookingForm.service_id}
                  onChange={(v) => setBooking("service_id", v)}
                >
                  <OptionList
                    items={servicesForBooking}
                    label="display_name"
                    empty={bookingForm.service_category_id ? "خدمات القسم المختار" : "كل الخدمات / اختر الخدمة"}
                  />
                </Select>
              </Field>
              <Field label="خبيرة مفضلة">
                <Select
                  value={bookingForm.preferred_artist_id}
                  onChange={(v) => setBooking("preferred_artist_id", v)}
                >
                  <OptionList
                    items={beauticians.filter((a) => a.status === "active")}
                    label="name"
                    empty="بدون تفضيل"
                  />
                </Select>
              </Field>
              <Field label="نوع المناسبة">
                <TextInput
                  value={bookingForm.event_type}
                  onChange={(v) => setBooking("event_type", v)}
                />
              </Field>
              <Field label="التاريخ">
                <TextInput
                  type="date"
                  required
                  value={bookingForm.booking_date}
                  onChange={(v) => setBooking("booking_date", v)}
                />
              </Field>
              <Field label="الوقت">
                <TextInput
                  type="time"
                  required
                  value={bookingForm.booking_time}
                  onChange={(v) => setBooking("booking_time", v)}
                />
              </Field>
              <Field label="العنوان">
                <TextInput
                  value={bookingForm.address}
                  onChange={(v) => setBooking("address", v)}
                />
              </Field>
              <Field label="صورة التصميم">
                <TextInput
                  value={bookingForm.design_image_url}
                  onChange={(v) => setBooking("design_image_url", v)}
                  placeholder="رابط الصورة أو رفع ملف"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    uploadAdminImage(e.target.files?.[0], (url) =>
                      setBooking("design_image_url", url),
                    )
                  }
                />
              </Field>
              <Field label="طريقة التواصل">
                <Select
                  value={bookingForm.contact_preference || "whatsapp"}
                  onChange={(v) => setBooking("contact_preference", v)}
                >
                  <option value="whatsapp">واتساب</option>
                  <option value="call">اتصال</option>
                  <option value="sms">رسالة SMS</option>
                </Select>
              </Field>
              <Field label="وقت بديل">
                <TextInput
                  value={bookingForm.alternate_time || ""}
                  onChange={(v) => setBooking("alternate_time", v)}
                  placeholder="مثال: بعد المغرب"
                />
              </Field>
              <Field label="ملاحظات">
                <textarea
                  value={bookingForm.customer_notes}
                  onChange={(e) => setBooking("customer_notes", e.target.value)}
                />
              </Field>
              <div className="actions">
                <button>إنشاء الطلب</button>
              </div>
            </form>
          </section>
        )}

        {activeView === "beautician-management" && (
          <section className="panel">
            <h2>إدارة خبيرات التجميل</h2>
            <form className="grid4" onSubmit={saveBeautician}>
              <Field label="اسم خبيرة التجميل">
                <TextInput
                  required
                  value={beauticianForm.name}
                  onChange={(v) => setBeautician("name", v)}
                />
              </Field>
              <Field label="الجوال">
                <PhoneInput
                  required
                  value={beauticianForm.phone}
                  onChange={(v) => setBeautician("phone", v)}
                />
              </Field>
              <Field label="المنطقة الأساسية">
                <Select
                  value={beauticianForm.region_id}
                  onChange={(v) => setBeautician("region_id", v)}
                >
                  <OptionList items={catalogRegions} />
                </Select>
              </Field>
              <Field label="المدينة الأساسية">
                <Select
                  value={beauticianForm.city_id}
                  onChange={(v) => setBeautician("city_id", v)}
                >
                  <OptionList items={citiesForBeautician} />
                </Select>
              </Field>
              <Field label="الخبرة الأساسية">
                <Select
                  value={beauticianForm.main_expertise_category_id}
                  onChange={(v) =>
                    setBeautician("main_expertise_category_id", v)
                  }
                >
                  <OptionList
                    items={serviceCategories}
                    empty="اختر قسم الخبرة الأساسي"
                  />
                </Select>
              </Field>
              <Field label="المهارات">
                <TextInput
                  value={beauticianForm.skills}
                  onChange={(v) => setBeautician("skills", v)}
                />
              </Field>
              <Field label="التقييم">
                <TextInput
                  type="number"
                  value={beauticianForm.rating}
                  onChange={(v) => setBeautician("rating", Number(v) || 5)}
                />
              </Field>
              <Field label="الحالة">
                <Select
                  value={beauticianForm.status}
                  onChange={(v) => setBeautician("status", v)}
                >
                  <option value="active">فعالة</option>
                  <option value="inactive">غير فعالة</option>
                </Select>
              </Field>
              <Field label="نبذة">
                <textarea
                  value={beauticianForm.bio}
                  onChange={(e) => setBeautician("bio", e.target.value)}
                />
              </Field>
              <div className="actions">
                <button>
                  {editing.type === "beautician"
                    ? "حفظ التعديل"
                    : "إضافة خبيرة"}
                </button>
              </div>
            </form>
            <p className="muted">
              تُدار مناطق ومدن وأحياء التغطية من قسم التوفر والتغطية أدناه.
            </p>
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الجوال</th>
                  <th>المدينة</th>
                  <th>الخبرة</th>
                  <th>التوفر</th>
                  <th>التقييم</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {beauticians.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.phone}</td>
                    <td>{a.city_name || "-"}</td>
                    <td>{a.main_expertise_name || "-"}</td>
                    <td>
                      {availabilityLabels[
                        a.availability_status || "available"
                      ] ||
                        a.availability_status ||
                        "متاحة"}
                    </td>
                    <td>{a.review_rating || a.rating || "-"}</td>
                    <td>
                      <button
                        onClick={() => {
                          setBeauticianForm({ ...emptyBeautician, ...a });
                          setEditing({ type: "beautician", id: a.id });
                        }}
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => {
                          chooseAvailabilityBeautician(a.id);
                          setActiveView("beautician-availability");
                        }}
                      >
                        التوفر
                      </button>
                      <button
                        className="danger"
                        onClick={() =>
                          deleteItem(
                            "/admin/beauticians",
                            a.id,
                            "خبيرة التجميل",
                          )
                        }
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeView === "beautician-availability" && (
          <section className="panel">
            <h2>توفر وتغطية خبيرات التجميل</h2>
            <form className="grid4" onSubmit={saveAvailability}>
              <Field label="خبيرة التجميل">
                <Select
                  required
                  value={availabilityForm.beautician_id}
                  onChange={chooseAvailabilityBeautician}
                >
                  <OptionList
                    items={beauticians}
                    label="name"
                    empty="اختر خبيرة"
                  />
                </Select>
              </Field>
              <Field label="حالة التوفر">
                <Select
                  value={availabilityForm.availability_status}
                  onChange={(v) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      availability_status: v,
                    })
                  }
                >
                  <option value="available">متاحة</option>
                  <option value="busy">مشغولة</option>
                  <option value="inactive">موقوفة</option>
                </Select>
              </Field>
              <Field label="بداية العمل">
                <TextInput
                  type="time"
                  value={availabilityForm.work_start_time}
                  onChange={(v) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      work_start_time: v,
                    })
                  }
                />
              </Field>
              <Field label="نهاية العمل">
                <TextInput
                  type="time"
                  value={availabilityForm.work_end_time}
                  onChange={(v) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      work_end_time: v,
                    })
                  }
                />
              </Field>
              <Field label="الحد اليومي للطلبات">
                <TextInput
                  type="number"
                  value={availabilityForm.max_daily_bookings}
                  onChange={(v) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      max_daily_bookings: Number(v) || 1,
                    })
                  }
                />
              </Field>
              <Field label="أيام العمل">
                <select
                  multiple
                  value={availabilityForm.working_days}
                  onChange={(e) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      working_days: Array.from(e.target.selectedOptions).map(
                        (o) => o.value,
                      ),
                    })
                  }
                >
                  {dayLabels.map((d, i) => (
                    <option key={i} value={String(i)}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="المناطق المغطاة">
                <select
                  multiple
                  value={availabilityForm.coverage_region_ids}
                  onChange={(e) => {
                    const regions = Array.from(e.target.selectedOptions).map(
                      (o) => o.value,
                    );
                    setAvailabilityForm((prev) => {
                      const cities = catalog.cities
                        .filter((c) => regions.includes(String(c.region_id)))
                        .map((c) => String(c.id));
                      return {
                        ...prev,
                        coverage_region_ids: regions,
                        coverage_city_ids: (
                          prev.coverage_city_ids || []
                        ).filter(
                          (id) =>
                            !regions.length || cities.includes(String(id)),
                        ),
                        coverage_district_ids: [],
                      };
                    });
                  }}
                >
                  {catalog.regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name_ar}
                    </option>
                  ))}
                </select>
                <small className="muted">
                  اتركها فارغة لتغطية كل المناطق. المعروض:{" "}
                  {catalog.regions.length}
                </small>
              </Field>
              <Field label="المدن المغطاة">
                <select
                  multiple
                  value={availabilityForm.coverage_city_ids}
                  onChange={(e) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      coverage_city_ids: Array.from(
                        e.target.selectedOptions,
                      ).map((o) => o.value),
                      coverage_district_ids: [],
                    })
                  }
                >
                  {availabilityCities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar}
                    </option>
                  ))}
                </select>
                <small className="muted">
                  إذا لم يتم اختيار منطقة تظهر كل المدن. المعروض:{" "}
                  {availabilityCities.length} من {catalogCities.length}
                </small>
              </Field>
              <Field label="الأحياء المغطاة">
                <select
                  multiple
                  value={availabilityForm.coverage_district_ids}
                  onChange={(e) =>
                    setAvailabilityForm({
                      ...availabilityForm,
                      coverage_district_ids: Array.from(
                        e.target.selectedOptions,
                      ).map((o) => o.value),
                    })
                  }
                >
                  {availabilityDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_ar}
                    </option>
                  ))}
                </select>
                <small className="muted">
                  إذا لم يتم اختيار مدينة تظهر الأحياء حسب المناطق المختارة أو
                  كل الأحياء. المعروض: {availabilityDistricts.length} من{" "}
                  {catalogDistricts.length}
                </small>
              </Field>
              <div className="actions">
                <button>حفظ التوفر والتغطية</button>
              </div>
            </form>
            <p className="muted">
              اترك المناطق أو المدن أو الأحياء بدون اختيار لتكون التغطية عامة
              على هذا المستوى. عند اختيار منطقة يتم عرض مدنها فقط، وعند اختيار
              مدينة يتم عرض أحيائها فقط.
            </p>
          </section>
        )}

        {activeView === "booking-list" && smartSuggestions.items.length > 0 && (
          <section className="panel">
            <h2>الترشيح الذكي للطلب {smartSuggestions.booking_number || ""}</h2>
            <div className="portfolio-grid">
              {smartSuggestions.items.slice(0, 8).map((s) => (
                <div className="portfolio-card" key={s.id}>
                  <b>{s.name}</b>
                  <small>
                    {s.main_expertise_name || "-"} •{" "}
                    {s.city_name || "تغطية عامة"}
                  </small>
                  <p>
                    النتيجة: {Math.round(s.suitability_score || 0)} —{" "}
                    {s.is_suitable ? "مناسبة" : "غير مناسبة"}
                  </p>
                  <p>{(s.suitability_reasons || []).join("، ")}</p>
                  {(s.suitability_warnings || []).length > 0 && (
                    <p className="danger-text">
                      {s.suitability_warnings.join("، ")}
                    </p>
                  )}
                  <button
                    onClick={() =>
                      assignBeautician(smartSuggestions.booking_id, s.id)
                    }
                  >
                    تعيين هذه الخبيرة
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeView === "beautician-portfolio" && (
          <section className="panel">
            <h2>معرض أعمال خبيرات التجميل</h2>
            <form className="grid4" onSubmit={savePortfolio}>
              <Field label="خبيرة التجميل">
                <Select
                  required
                  value={portfolioForm.beautician_id}
                  onChange={(v) => setPortfolioField("beautician_id", v)}
                >
                  <OptionList
                    items={beauticians}
                    label="name"
                    empty="اختر خبيرة"
                  />
                </Select>
              </Field>
              <Field label="قسم الخدمة">
                <Select
                  value={portfolioForm.service_category_id}
                  onChange={(v) => setPortfolioField("service_category_id", v)}
                >
                  <OptionList items={serviceCategories} empty="اختر القسم" />
                </Select>
              </Field>
              <Field label="الخدمة">
                <Select
                  value={portfolioForm.service_id}
                  onChange={(v) => setPortfolioField("service_id", v)}
                >
                  <OptionList
                    items={portfolioServices}
                    label="display_name"
                    empty="اختر الخدمة"
                  />
                </Select>
              </Field>
              <Field label="عنوان النموذج">
                <TextInput
                  required
                  value={portfolioForm.title_ar}
                  onChange={(v) => setPortfolioField("title_ar", v)}
                  placeholder="مثال: مكياج سهرة ناعم"
                />
              </Field>
              <Field label="الصورة">
                <TextInput
                  required
                  value={portfolioForm.image_url}
                  onChange={(v) => setPortfolioField("image_url", v)}
                  placeholder="https://..."
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    uploadAdminImage(e.target.files?.[0], (url) =>
                      setPortfolioField("image_url", url),
                    )
                  }
                />
              </Field>
              <Field label="الوصف">
                <textarea
                  value={portfolioForm.description || ""}
                  onChange={(e) =>
                    setPortfolioField("description", e.target.value)
                  }
                />
              </Field>
              <Field label="الحالة">
                <Select
                  value={portfolioForm.status}
                  onChange={(v) => setPortfolioField("status", v)}
                >
                  <option value="published">منشور</option>
                  <option value="draft">مسودة</option>
                  <option value="hidden">مخفي</option>
                </Select>
              </Field>
              <Field label="مميز">
                <Select
                  value={portfolioForm.is_featured ? "1" : "0"}
                  onChange={(v) => setPortfolioField("is_featured", v === "1")}
                >
                  <option value="0">لا</option>
                  <option value="1">نعم</option>
                </Select>
              </Field>
              <div className="actions">
                <button>
                  {editing.type === "portfolio"
                    ? "حفظ تعديل النموذج"
                    : "إضافة نموذج عمل"}
                </button>
              </div>
            </form>
            <div className="portfolio-grid">
              {portfolio.map((p) => (
                <div className="portfolio-card" key={p.id}>
                  {p.image_url && <img src={p.image_url} alt={p.title_ar} />}
                  <b>{p.title_ar}</b>
                  <small>
                    {p.beautician_name || "-"} • {p.category_name || "-"} •{" "}
                    {p.service_name || "-"}
                  </small>
                  <p>{p.description || ""}</p>
                  <div>
                    <button
                      onClick={() => {
                        setPortfolioForm({ ...emptyPortfolio, ...p });
                        setEditing({ type: "portfolio", id: p.id });
                      }}
                    >
                      تعديل
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        deleteItem(
                          "/admin/beautician-portfolio",
                          p.id,
                          "نموذج العمل",
                        )
                      }
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeView === "customer-reviews" && (
          <section className="panel">
            <h2>تقييمات العملاء</h2>
            <table>
              <thead>
                <tr>
                  <th>خبيرة التجميل</th>
                  <th>العميلة</th>
                  <th>التقييم</th>
                  <th>التعليق</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.beautician_name || "-"}</td>
                    <td>{r.customer_name || r.customer_phone || "-"}</td>
                    <td>{"★".repeat(Number(r.rating || 0))}</td>
                    <td>{r.review_text || "-"}</td>
                    <td>{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeView === "booking-list" && (
          <section className="panel">
            <h2>الطلبات</h2>
            <div className="filters">
              <input
                placeholder="بحث"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="">كل الحالات</option>
                {statusOptions.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={filters.payment}
                onChange={(e) =>
                  setFilters({ ...filters, payment: e.target.value })
                }
              >
                <option value="">كل الدفع</option>
                {paymentOptions.map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                value={filters.region_id}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    region_id: e.target.value,
                    city_id: "",
                  })
                }
              >
                <OptionList items={catalogRegions} empty="كل المناطق" />
              </select>
              <select
                value={filters.city_id}
                onChange={(e) =>
                  setFilters({ ...filters, city_id: e.target.value })
                }
              >
                <OptionList
                  items={catalogCities.filter(
                    (c) =>
                      !filters.region_id || sameId(c.region_id, filters.region_id),
                  )}
                  empty="كل المدن"
                />
              </select>
            </div>
            <p className="muted">
              المعروض: {filteredBookings.length} من {bookings.length}
            </p>
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>المصدر</th>
                  <th>العميلة</th>
                  <th>الموقع</th>
                  <th>الخدمة</th>
                  <th>خبيرة مفضلة</th>
                  <th>خبيرة معينة</th>
                  <th>التاريخ</th>
                  <th>الحالة</th>
                  <th>الدفع</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b, i) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.booking_number || `#${i + 1}`}</b>
                      <br />
                      <small>{b.id.slice(0, 8)}</small>
                    </td>
                    <td>{b.booking_source_label || b.booking_source || "-"}</td>
                    <td>
                      {b.customer_name || "-"}
                      <br />
                      <small>{b.customer_phone || "-"}</small>
                    </td>
                    <td>
                      {b.region_name || "-"} / {b.city_name || "-"} /{" "}
                      {b.district_name || "-"}
                    </td>
                    <td>
                      {b.service_category_name || "-"} / {b.service_name || "-"}
                    </td>
                    <td>{b.preferred_artist_name || "-"}</td>
                    <td>{b.artist_name || "-"}</td>
                    <td>
                      {formatDate(b.booking_date)} {formatTime(b.booking_time)}
                    </td>
                    <td>
                      <select
                        value={b.status || "new"}
                        disabled={!!updating[`status:${b.id}`]}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                      >
                        {statusOptions.map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="payment-select"
                        value={b.payment_status || "unpaid"}
                        disabled={!!updating[`payment:${b.id}`]}
                        onChange={(e) => updatePayment(b.id, e.target.value)}
                      >
                        {paymentOptions.map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button onClick={() => openBookingDetails(b)}>
                        تفاصيل
                      </button>
                      <button
                        className="mini"
                        onClick={() => suggestBeauticians(b)}
                      >
                        ترشيح
                      </button>
                      <select
                        value={b.assigned_artist_id || ""}
                        disabled={!!updating[`assign:${b.id}`]}
                        onChange={(e) => assignBeautician(b.id, e.target.value)}
                      >
                        <option value="">بدون تعيين</option>
                        {beauticians
                          .filter((a) => a.status === "active")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                      <button
                        className="mini"
                        onClick={() => prepareWhatsApp(b)}
                      >
                        واتساب
                      </button>
                      <button
                        className="mini"
                        onClick={() => updatePaymentDetails(b)}
                      >
                        تفاصيل الدفع
                      </button>
                      <button
                        className="danger"
                        onClick={() =>
                          deleteItem("/admin/bookings", b.id, "الطلب")
                        }
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}


function numberValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function shortNumber(value) {
  const n = numberValue(value);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}م`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}ك`;
  return String(Math.round(n));
}

function currency(value) {
  return `${shortNumber(value)} ر.س`;
}

function bookingRevenue(booking) {
  return numberValue(
    booking.final_price ||
      booking.estimated_price ||
      booking.deposit_amount ||
      booking.service_price ||
      0,
  );
}

function monthKey(dateValue) {
  const d = dateValue ? new Date(dateValue) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function arabicMonthLabel(key) {
  const [year, month] = String(key || "").split("-").map(Number);
  if (!year || !month) return "-";
  return new Date(year, month - 1, 1).toLocaleDateString("ar-SA", {
    month: "short",
  });
}

function buildLast12Months() {
  const today = new Date();
  return Array.from({ length: 12 }, (_, idx) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - idx), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function groupMetric(items, keyGetter, valueGetter = () => 1) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyGetter(item) || "غير محدد";
    map.set(key, (map.get(key) || 0) + valueGetter(item));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function MiniLineChart({ data }) {
  const values = data.map((x) => numberValue(x.value));
  const max = Math.max(1, ...values);
  const width = 720;
  const height = 210;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((item, idx) => {
      const x = idx * step;
      const y = height - (numberValue(item.value) / max) * (height - 24) - 12;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="analytics-line-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="analytics-line-chart">
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 12 + i * ((height - 24) / 4);
          return <line key={i} x1="0" x2={width} y1={y} y2={y} />;
        })}
        <polygon points={areaPoints} />
        <polyline points={points} />
        {data.map((item, idx) => {
          const x = idx * step;
          const y = height - (numberValue(item.value) / max) * (height - 24) - 12;
          return <circle key={item.label} cx={x} cy={y} r="4" />;
        })}
      </svg>
      <div className="analytics-axis">
        {data.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}

function VerticalBars({ data, valueSuffix = "" }) {
  const max = Math.max(1, ...data.map((x) => numberValue(x.value)));
  return (
    <div className="analytics-bars">
      {data.map((item) => (
        <div className="analytics-bar-item" key={item.label}>
          <div className="analytics-bar-track">
            <span style={{ height: `${Math.max(8, (numberValue(item.value) / max) * 100)}%` }} />
          </div>
          <b>{shortNumber(item.value)}{valueSuffix}</b>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ data, valueFormatter = shortNumber }) {
  const max = Math.max(1, ...data.map((x) => numberValue(x.value)));
  return (
    <div className="analytics-hbars">
      {data.map((item) => (
        <div className="analytics-hbar" key={item.label}>
          <div className="analytics-hbar-head">
            <span>{item.label}</span>
            <b>{valueFormatter(item.value)}</b>
          </div>
          <div className="analytics-hbar-track">
            <span style={{ width: `${Math.max(5, (numberValue(item.value) / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsStatCard({ title, value, sub, icon: Icon }) {
  return (
    <div className="analytics-stat-card">
      <div className="analytics-stat-icon">{Icon && <Icon size={24} />}</div>
      <div>
        <span>{title}</span>
        <b>{value}</b>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

function AnalyticsPanel({ bookings, beauticians, portfolio, reviews, catalog, dashboard }) {
  const analytics = useMemo(() => {
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    const safeBeauticians = Array.isArray(beauticians) ? beauticians : [];
    const totalBookings = safeBookings.length;
    const completed = safeBookings.filter((b) => b.status === "completed").length;
    const newBookings = safeBookings.filter((b) => b.status === "new").length;
    const unassigned = safeBookings.filter(
      (b) => !b.assigned_artist_id && !["completed", "cancelled"].includes(b.status),
    ).length;
    const unpaid = safeBookings.filter((b) => (b.payment_status || "unpaid") !== "paid").length;
    const customers = new Set(safeBookings.map((b) => b.customer_phone || b.phone).filter(Boolean)).size;
    const revenue = safeBookings.reduce((sum, b) => sum + bookingRevenue(b), 0);
    const paidRevenue = safeBookings
      .filter((b) => b.payment_status === "paid")
      .reduce((sum, b) => sum + bookingRevenue(b), 0);
    const activeBeauticians = safeBeauticians.filter((a) => a.status === "active").length;
    const ratingValues = [...safeBeauticians, ...(Array.isArray(reviews) ? reviews : [])]
      .map((x) => numberValue(x.review_rating || x.overall_rating || x.rating))
      .filter((x) => x > 0);
    const avgRating = ratingValues.length
      ? ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length
      : 0;

    const months = buildLast12Months();
    const monthly = months.map((key) => ({
      key,
      label: arabicMonthLabel(key),
      value: safeBookings.filter((b) => monthKey(b.booking_date || b.created_at) === key).length,
      revenue: safeBookings
        .filter((b) => monthKey(b.booking_date || b.created_at) === key)
        .reduce((sum, b) => sum + bookingRevenue(b), 0),
    }));

    const byService = groupMetric(
      safeBookings,
      (b) => b.service_name || b.service_category_name || "غير محدد",
    ).slice(0, 6);
    const byCategory = groupMetric(
      safeBookings,
      (b) => b.service_category_name || b.service_name || "غير محدد",
    ).slice(0, 6);
    const byCity = groupMetric(safeBookings, (b) => b.city_name || b.region_name || "غير محدد").slice(0, 5);
    const byStatus = groupMetric(
      safeBookings,
      (b) => statusLabels[b.status] || b.status_label || b.status || "غير محدد",
    );
    const byPayment = groupMetric(
      safeBookings,
      (b) => paymentLabels[b.payment_status || "unpaid"] || b.payment_status || "غير مدفوع",
    );
    const byBeautician = groupMetric(
      safeBookings.filter((b) => b.artist_name),
      (b) => b.artist_name,
    ).slice(0, 5);
    const serviceRevenue = groupMetric(
      safeBookings,
      (b) => b.service_name || b.service_category_name || "غير محدد",
      bookingRevenue,
    ).slice(0, 5);

    return {
      totalBookings,
      completed,
      newBookings,
      unassigned,
      unpaid,
      customers,
      revenue,
      paidRevenue,
      activeBeauticians,
      avgRating,
      completionRate: totalBookings ? Math.round((completed / totalBookings) * 100) : 0,
      paymentRate: revenue ? Math.round((paidRevenue / revenue) * 100) : 0,
      monthly,
      byService,
      byCategory,
      byCity,
      byStatus,
      byPayment,
      byBeautician,
      serviceRevenue,
      portfolioCount: Array.isArray(portfolio) ? portfolio.length : 0,
      servicesCount: Array.isArray(catalog?.services) ? catalog.services.length : 0,
      categoriesCount: Array.isArray(catalog?.service_categories) ? catalog.service_categories.length : 0,
    };
  }, [bookings, beauticians, portfolio, reviews, catalog]);

  return (
    <section className="analytics-page">
      <div className="analytics-tabs">
        <span className="is-active">ملخص الإدارة</span>
        <span>الخدمات والأسعار</span>
        <span>العملاء</span>
        <span>المحترفون</span>
        <span>الحجوزات</span>
      </div>

      <div className="analytics-stat-grid">
        <AnalyticsStatCard
          title="إجمالي الإيرادات"
          value={currency(analytics.revenue || dashboard?.total_revenue || 0)}
          sub="Quick Stats"
          icon={CreditCard}
        />
        <AnalyticsStatCard title="حجوزات جديدة" value={analytics.newBookings} icon={CalendarDays} />
        <AnalyticsStatCard title="المتخصصون النشطون" value={analytics.activeBeauticians} icon={UserRound} />
        <AnalyticsStatCard title="عملاء جدد" value={analytics.customers} icon={UserRound} />
        <AnalyticsStatCard title="نسبة الإنجاز" value={`${analytics.completionRate}%`} sub="Completed" icon={TrendingUp} />
        <AnalyticsStatCard title="طلبات غير مدفوعة" value={analytics.unpaid} sub="Pending collection" icon={Bell} />
      </div>

      <div className="analytics-grid-main">
        <section className="analytics-card analytics-wide">
          <div className="analytics-card-head">
            <div>
              <h2>حجوزات الشهور</h2>
              <p>اتجاه عدد الحجوزات خلال آخر 12 شهر</p>
            </div>
            <select defaultValue="bookings">
              <option value="bookings">عدد الحجوزات</option>
            </select>
          </div>
          <MiniLineChart data={analytics.monthly} />
        </section>

        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <h2>حالات الطلبات</h2>
              <p>توزيع الطلبات حسب الحالة الحالية</p>
            </div>
          </div>
          <HorizontalBars data={analytics.byStatus.slice(0, 7)} />
        </section>
      </div>

      <div className="analytics-grid-two">
        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <h2>أداء الخدمات</h2>
              <p>أكثر الخدمات طلباً</p>
            </div>
          </div>
          <VerticalBars data={analytics.byService.slice(0, 5)} />
        </section>

        <section className="analytics-card">
          <div className="analytics-card-head">
            <div>
              <h2>إيرادات الخدمات</h2>
              <p>أعلى الخدمات في القيمة المالية</p>
            </div>
          </div>
          <HorizontalBars data={analytics.serviceRevenue} valueFormatter={currency} />
        </section>
      </div>

      <div className="analytics-grid-two compact">
        <section className="analytics-card">
          <h2>المدن الأعلى طلباً</h2>
          <HorizontalBars data={analytics.byCity} />
        </section>
        <section className="analytics-card">
          <h2>أداء الخبيرات</h2>
          <HorizontalBars data={analytics.byBeautician.length ? analytics.byBeautician : [{ label: "لا توجد تعيينات", value: 0 }]} />
        </section>
        <section className="analytics-card">
          <h2>حالة التحصيل</h2>
          <HorizontalBars data={analytics.byPayment} />
        </section>
      </div>

      <section className="analytics-card">
        <div className="analytics-card-head">
          <div>
            <h2>مؤشرات تشغيلية سريعة</h2>
            <p>بيانات مساندة للمتابعة اليومية</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>المؤشر</th>
              <th>القيمة</th>
              <th>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>عدد أقسام الخدمات</td><td>{analytics.categoriesCount}</td><td>من كتالوج الخدمات</td></tr>
            <tr><td>عدد الخدمات</td><td>{analytics.servicesCount}</td><td>الخدمات المتاحة للحجز</td></tr>
            <tr><td>نماذج أعمال الخبيرات</td><td>{analytics.portfolioCount}</td><td>المعرض المنشور والمدار من الإدارة</td></tr>
            <tr><td>متوسط التقييم</td><td>{analytics.avgRating ? analytics.avgRating.toFixed(1) : "-"}</td><td>من تقييمات الخبيرات والعملاء</td></tr>
            <tr><td>نسبة التحصيل من القيمة المسجلة</td><td>{analytics.paymentRate}%</td><td>حسب الطلبات المسجلة لها قيمة مالية</td></tr>
          </tbody>
        </table>
      </section>
    </section>
  );
}

function PaymentOpsPanel({ bookings, updatePaymentDetails }) {
  const pending = bookings.filter(
    (b) => (b.payment_status || "unpaid") !== "paid",
  );
  const paid = bookings.filter(
    (b) => (b.payment_status || "unpaid") === "paid",
  );
  return (
    <section className="panel">
      <h2>إدارة الدفع والتحصيل</h2>
      <div className="cards small">
        <Card title="طلبات غير مدفوعة" value={pending.length} />
        <Card title="طلبات مدفوعة" value={paid.length} />
        <Card
          title="عربون مدفوع"
          value={
            bookings.filter((b) => b.payment_status === "deposit_paid").length
          }
        />
        <Card
          title="مسترجع"
          value={bookings.filter((b) => b.payment_status === "refunded").length}
        />
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>العميلة</th>
            <th>الخدمة</th>
            <th>حالة الدفع</th>
            <th>طريقة الدفع</th>
            <th>المرجع</th>
            <th>الإيصال</th>
            <th>إجراء</th>
          </tr>
        </thead>
        <tbody>
          {bookings.slice(0, 20).map((b) => (
            <tr key={b.id}>
              <td>{b.booking_number || b.id.slice(0, 8)}</td>
              <td>
                {b.customer_name || "-"}
                <br />
                <small>{b.customer_phone || ""}</small>
              </td>
              <td>{b.service_name || "-"}</td>
              <td>{paymentLabels[b.payment_status || "unpaid"]}</td>
              <td>
                {paymentMethodLabels[b.payment_method] ||
                  b.payment_method ||
                  "-"}
              </td>
              <td>{b.payment_reference || "-"}</td>
              <td>
                {b.payment_proof_url ? (
                  <a href={b.payment_proof_url} target="_blank">
                    فتح
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td>
                <button onClick={() => updatePaymentDetails(b)}>
                  تعديل الدفع
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function NotificationsPanel({ notifications, templates, prepareWhatsApp }) {
  const counts = notifications?.counts || {};
  const items = notifications?.items || [];
  return (
    <section className="panel">
      <h2>تنبيهات الطلبات</h2>
      <div className="cards small">
        <Card title="طلبات جديدة" value={counts.new_bookings || 0} />
        <Card title="بدون خبيرة" value={counts.unassigned_bookings || 0} />
        <Card title="غير مدفوعة" value={counts.unpaid_bookings || 0} />
        <Card title="طلبات اليوم" value={counts.today_bookings || 0} />
      </div>
      <table>
        <thead>
          <tr>
            <th>العميلة</th>
            <th>الخدمة</th>
            <th>الحالة</th>
            <th>التواصل</th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 8).map((b) => (
            <tr key={b.id}>
              <td>
                {b.customer_name || "-"}
                <br />
                <small>{b.customer_phone || ""}</small>
              </td>
              <td>{b.service_name || "-"}</td>
              <td>{statusLabels[b.status] || b.status}</td>
              <td>
                <select
                  onChange={(e) =>
                    e.target.value && prepareWhatsApp(b, e.target.value)
                  }
                  defaultValue=""
                >
                  <option value="">اختر قالب واتساب</option>
                  {templates
                    .filter((t) => t.status === "active")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title_ar}
                      </option>
                    ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TemplatesPanel({
  templates,
  templateForm,
  setTemplateForm,
  saveTemplate,
  setEditing,
  deleteItem,
}) {
  return (
    <section className="panel">
      <h2>قوالب رسائل واتساب</h2>
      <form className="grid4" onSubmit={saveTemplate}>
        <Field label="الكود">
          <TextInput
            value={templateForm.code}
            onChange={(v) => setTemplateForm({ ...templateForm, code: v })}
            placeholder="confirm_booking"
          />
        </Field>
        <Field label="العنوان">
          <TextInput
            required
            value={templateForm.title_ar}
            onChange={(v) => setTemplateForm({ ...templateForm, title_ar: v })}
          />
        </Field>
        <Field label="الحالة">
          <Select
            value={templateForm.status}
            onChange={(v) => setTemplateForm({ ...templateForm, status: v })}
          >
            <option value="active">فعال</option>
            <option value="inactive">غير فعال</option>
          </Select>
        </Field>
        <Field label="ترتيب">
          <TextInput
            type="number"
            value={templateForm.sort_order}
            onChange={(v) =>
              setTemplateForm({ ...templateForm, sort_order: Number(v) || 0 })
            }
          />
        </Field>
        <Field label="نص الرسالة">
          <textarea
            value={templateForm.body_ar}
            onChange={(e) =>
              setTemplateForm({ ...templateForm, body_ar: e.target.value })
            }
            placeholder="مرحباً {customer_name} ..."
          />
        </Field>
        <div className="actions">
          <button>حفظ القالب</button>
        </div>
      </form>
      <p className="muted">
        متغيرات متاحة: {"{customer_name}"} {"{booking_id}"} {"{service_name}"}{" "}
        {"{booking_date}"} {"{booking_time}"} {"{payment_status}"}
      </p>
      <div className="listbox">
        {templates.map((t) => (
          <div className="listrow" key={t.id}>
            <span>
              <b>{t.title_ar}</b>
              <small>{t.body_ar}</small>
            </span>
            <span>
              <button
                onClick={() => {
                  setTemplateForm({ ...emptyTemplate, ...t });
                  setEditing({ type: "template", id: t.id });
                }}
              >
                تعديل
              </button>
              <button
                className="danger"
                onClick={() =>
                  deleteItem("/admin/communication-templates", t.id, "القالب")
                }
              >
                حذف
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingDetailsModal({
  booking,
  beauticians,
  updateStatus,
  assignBeautician,
  updatePayment,
  updatePaymentDetails,
  updating = {},
  close,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-head">
          <h2>تفاصيل الطلب {booking.booking_number || ""}</h2>
          <button onClick={close}>إغلاق</button>
        </div>
        <div className="detail-grid">
          <p>
            <b>رقم الطلب:</b> {booking.booking_number || booking.id}
          </p>
          <p>
            <b>مصدر الطلب:</b>{" "}
            {booking.booking_source_label || booking.booking_source || "-"}
          </p>
          <p>
            <b>العميلة:</b> {booking.customer_name || "-"}
          </p>
          <p>
            <b>الجوال:</b> {booking.customer_phone || "-"}
          </p>
          <p>
            <b>الموقع:</b> {booking.region_name || "-"} /{" "}
            {booking.city_name || "-"} / {booking.district_name || "-"}
          </p>
          <p>
            <b>الخدمة:</b> {booking.service_category_name || "-"} /{" "}
            {booking.service_name || "-"}
          </p>
          <p>
            <b>خبيرة مفضلة:</b> {booking.preferred_artist_name || "-"}
          </p>
          <p>
            <b>خبيرة معينة:</b> {booking.artist_name || "-"}
          </p>
          <p>
            <b>التاريخ:</b> {formatDate(booking.booking_date)}{" "}
            {formatTime(booking.booking_time)}
          </p>
          <p>
            <b>ملاحظات العميلة:</b> {booking.customer_notes || "-"}
          </p>
          <p>
            <b>حالة الدفع:</b>{" "}
            {paymentLabels[booking.payment_status || "unpaid"]}
          </p>
          <p>
            <b>طريقة الدفع:</b>{" "}
            {paymentMethodLabels[booking.payment_method] ||
              booking.payment_method ||
              "-"}
          </p>
          <p>
            <b>مرجع الدفع:</b> {booking.payment_reference || "-"}
          </p>
          <p>
            <b>إثبات الدفع:</b>{" "}
            {booking.payment_proof_url ? (
              <a href={booking.payment_proof_url} target="_blank">
                فتح الإيصال
              </a>
            ) : (
              "-"
            )}
          </p>
          <p>
            <b>طريقة التواصل:</b>{" "}
            {contactLabels[booking.contact_preference] ||
              booking.contact_preference ||
              "-"}
          </p>
          <p>
            <b>وقت بديل:</b> {booking.alternate_time || "-"}
          </p>
        </div>
        {booking.design_image_url && (
          <div className="image-box">
            <b>صورة التصميم:</b>
            <br />
            <a href={booking.design_image_url} target="_blank">
              فتح الصورة
            </a>
          </div>
        )}
        <div className="grid3">
          <Field label="تغيير الحالة">
            <Select
              value={booking.status || "new"}
              onChange={(v) => updateStatus(booking.id, v)}
              disabled={!!updating[`status:${booking.id}`]}
            >
              {statusOptions.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="حالة الدفع">
            <Select
              value={booking.payment_status || "unpaid"}
              onChange={(v) => updatePayment(booking.id, v)}
              disabled={!!updating[`payment:${booking.id}`]}
            >
              {paymentOptions.map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="field">
            <span>تفاصيل الدفع</span>
            <button onClick={() => updatePaymentDetails(booking)}>
              تعديل تفاصيل الدفع
            </button>
          </div>
          <Field label="تعيين خبيرة تجميل">
            <Select
              value={booking.assigned_artist_id || ""}
              onChange={(v) => assignBeautician(booking.id, v)}
              disabled={!!updating[`assign:${booking.id}`]}
            >
              <option value="">بدون تعيين</option>
              {beauticians
                .filter((a) => a.status === "active")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <div className="timeline">
          <b>تسلسل الحالة:</b>
          <span>طلب جديد</span>
          <span>جاري المراجعة</span>
          <span>تم التأكيد</span>
          <span>تم التعيين</span>
          <span>مكتمل</span>
        </div>
        <div className="events-box">
          <b>سجل أحداث الطلب</b>
          {(booking.events || []).length ? (
            booking.events.map((ev) => (
              <div className="event-row" key={ev.id}>
                <span>{ev.title || ev.event_type}</span>
                <small>
                  {ev.description || ""} • {formatDate(ev.created_at)}
                </small>
              </div>
            ))
          ) : (
            <small>لا توجد أحداث مسجلة.</small>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogPanel({ catalog, api, load, setMessage }) {
  const safeCatalog = catalog || {};
  const catalogRegions = Array.isArray(safeCatalog.regions)
    ? safeCatalog.regions
    : [];
  const catalogCities = Array.isArray(safeCatalog.cities)
    ? safeCatalog.cities
    : [];
  const catalogDistricts = Array.isArray(safeCatalog.districts)
    ? safeCatalog.districts
    : [];
  const [region, setRegion] = useState(emptyRegion),
    [city, setCity] = useState(emptyCity),
    [district, setDistrict] = useState(emptyDistrict);
  const [edit, setEdit] = useState({});
  const selectedRegionId = city.region_id || "";
  const selectedCityId = district.city_id || "";
  const visibleCities = catalogCities.filter(
    (c) => !selectedRegionId || sameId(c.region_id, selectedRegionId),
  );
  const cityOptionsForDistrict = catalogCities.filter(
    (c) => !selectedRegionId || sameId(c.region_id, selectedRegionId),
  );
  const visibleDistricts = catalogDistricts.filter((d) => {
    if (selectedCityId) return sameId(d.city_id, selectedCityId);
    if (selectedRegionId) {
      const cityForDistrict = catalogCities.find((c) => sameId(c.id, d.city_id));
      return cityForDistrict && sameId(cityForDistrict.region_id, selectedRegionId);
    }
    return true;
  });
  async function save(path, form, reset) {
    try {
      const id = edit[path];
      await api(`/admin/${path}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(clean(form)),
      });
      reset();
      setEdit({});
      setMessage("تم الحفظ.");
      await load();
    } catch (e) {
      setMessage(`تعذر الحفظ: ${e.message}`);
    }
  }
  async function del(path, id, label) {
    if (!confirm(`حذف ${label}؟`)) return;
    try {
      await api(`/admin/${path}/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <section className="panel">
      <h2>إدارة المواقع: المناطق والمدن والأحياء</h2>
      <p className="muted">
        إذا لم تختَر منطقة تظهر كل المدن، وعند اختيار منطقة تظهر مدنها فقط. وإذا
        لم تختَر مدينة تظهر كل الأحياء، وعند اختيار مدينة تظهر أحياؤها فقط.
      </p>
      <div className="three">
        <div>
          <h3>المناطق</h3>
          <Field label="اسم عربي">
            <TextInput
              value={region.name_ar}
              onChange={(v) => setRegion({ ...region, name_ar: v })}
            />
          </Field>
          <Field label="اسم إنجليزي">
            <TextInput
              value={region.name_en}
              onChange={(v) => setRegion({ ...region, name_en: v })}
            />
          </Field>
          <button
            onClick={() =>
              save("regions", region, () => setRegion(emptyRegion))
            }
          >
            {edit.regions ? "حفظ تعديل" : "إضافة منطقة"}
          </button>
          <List
            items={catalogRegions}
            onEdit={(x) => {
              setRegion({ ...emptyRegion, ...x });
              setEdit({ regions: x.id });
            }}
            onDel={(x) => del("regions", x.id, "المنطقة")}
          />
        </div>
        <div>
          <h3>المدن</h3>
          <Field label="المنطقة للمدينة">
            <Select
              value={city.region_id}
              onChange={(v) => {
                setCity({ ...city, region_id: v });
                setDistrict((prev) => ({ ...prev, city_id: "" }));
              }}
            >
              <OptionList items={catalogRegions} empty="كل المناطق" />
            </Select>
          </Field>
          <Field label="اسم عربي">
            <TextInput
              value={city.name_ar}
              onChange={(v) => setCity({ ...city, name_ar: v })}
            />
          </Field>
          <Field label="اسم إنجليزي">
            <TextInput
              value={city.name_en}
              onChange={(v) => setCity({ ...city, name_en: v })}
            />
          </Field>
          <button
            onClick={() => save("cities", city, () => setCity(emptyCity))}
          >
            {edit.cities ? "حفظ تعديل" : "إضافة مدينة"}
          </button>
          <p className="muted">
            المعروض: {visibleCities.length} من {catalogCities.length}
          </p>
          <List
            items={visibleCities}
            sub="region_name"
            onEdit={(x) => {
              setCity({ ...emptyCity, ...x });
              setDistrict((prev) => ({ ...prev, city_id: "" }));
              setEdit({ cities: x.id });
            }}
            onDel={(x) => del("cities", x.id, "المدينة")}
          />
        </div>
        <div>
          <h3>الأحياء</h3>
          <Field label="المدينة للحي">
            <Select
              value={district.city_id}
              onChange={(v) => setDistrict({ ...district, city_id: v })}
            >
              <OptionList items={cityOptionsForDistrict} empty="كل المدن" />
            </Select>
          </Field>
          <Field label="اسم عربي">
            <TextInput
              value={district.name_ar}
              onChange={(v) => setDistrict({ ...district, name_ar: v })}
            />
          </Field>
          <Field label="اسم إنجليزي">
            <TextInput
              value={district.name_en}
              onChange={(v) => setDistrict({ ...district, name_en: v })}
            />
          </Field>
          <button
            onClick={() =>
              save("districts", district, () => setDistrict(emptyDistrict))
            }
          >
            {edit.districts ? "حفظ تعديل" : "إضافة حي"}
          </button>
          <p className="muted">
            المعروض: {visibleDistricts.length} من {catalogDistricts.length}
          </p>
          <List
            items={visibleDistricts}
            sub="city_name"
            onEdit={(x) => {
              const selectedCity = catalogCities.find((c) => sameId(c.id, x.city_id));
              setDistrict({ ...emptyDistrict, ...x });
              if (selectedCity?.region_id) {
                setCity((prev) => ({ ...prev, region_id: selectedCity.region_id }));
              }
              setEdit({ districts: x.id });
            }}
            onDel={(x) => del("districts", x.id, "الحي")}
          />
        </div>
      </div>
    </section>
  );
}

function ServicesPanel({ catalog, api, refreshServiceCatalog, setMessage }) {
  const safeCatalog = catalog || {};
  const catalogServices = Array.isArray(safeCatalog.services)
    ? safeCatalog.services
    : [];
  const serviceCategories = useMemo(
    () =>
      Array.isArray(safeCatalog.service_categories)
        ? safeCatalog.service_categories.filter(Boolean)
        : [],
    [safeCatalog.service_categories],
  );
  const [cat, setCat] = useState(emptyCategory),
    [service, setService] = useState(emptyService),
    [edit, setEdit] = useState({});
  const selectedCategoryId = service.category_id || "";
  const visibleServices = catalogServices.filter(
    (s) => !selectedCategoryId || sameId(s.category_id, selectedCategoryId),
  );
  async function save(path, form, reset) {
    try {
      const id = edit[path];
      await api(`/admin/${path}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(clean(form)),
      });
      await refreshServiceCatalog();
      reset();
      setEdit({});
      setMessage(
        path === "service-categories"
          ? "تم حفظ قسم الخدمة وتحديث قائمة الخبرة الأساسية."
          : "تم حفظ الخدمة.",
      );
    } catch (e) {
      setMessage(`تعذر الحفظ: ${e.message}`);
    }
  }
  async function del(path, id, label) {
    if (!confirm(`حذف ${label}؟`)) return;
    try {
      await api(`/admin/${path}/${id}`, { method: "DELETE" });
      await refreshServiceCatalog();
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <section className="panel">
      <h2>إدارة أقسام الخدمات والخدمات</h2>
      <p className="muted">
        إذا لم تختَر قسم خدمة تظهر كل الخدمات، وعند اختيار قسم تظهر الخدمات
        التابعة له فقط.
      </p>
      <div className="two">
        <div>
          <h3>أقسام الخدمات</h3>
          <Field label="اسم عربي">
            <TextInput
              value={cat.name_ar}
              onChange={(v) => setCat({ ...cat, name_ar: v })}
            />
          </Field>
          <Field label="اسم إنجليزي">
            <TextInput
              value={cat.name_en}
              onChange={(v) => setCat({ ...cat, name_en: v })}
            />
          </Field>
          <Field label="الوصف">
            <TextInput
              value={cat.description}
              onChange={(v) => setCat({ ...cat, description: v })}
            />
          </Field>
          <button
            onClick={() =>
              save("service-categories", cat, () => setCat(emptyCategory))
            }
          >
            {edit["service-categories"] ? "حفظ تعديل" : "إضافة قسم"}
          </button>
          <List
            items={serviceCategories}
            onEdit={(x) => {
              setCat({ ...emptyCategory, ...x });
              setService((prev) => ({ ...prev, category_id: x.id }));
              setEdit({ "service-categories": x.id });
            }}
            onDel={(x) => del("service-categories", x.id, "القسم")}
          />
        </div>
        <div>
          <h3>الخدمات</h3>
          <Field label="القسم للخدمة">
            <Select
              value={service.category_id}
              onChange={(v) => setService({ ...service, category_id: v })}
            >
              <OptionList items={serviceCategories} empty="كل الأقسام" />
            </Select>
          </Field>
          <Field label="اسم عربي">
            <TextInput
              value={service.name_ar}
              onChange={(v) => setService({ ...service, name_ar: v, name: v })}
            />
          </Field>
          <Field label="اسم إنجليزي">
            <TextInput
              value={service.name_en}
              onChange={(v) => setService({ ...service, name_en: v })}
            />
          </Field>
          <div className="grid3">
            <Field label="أقل سعر">
              <TextInput
                type="number"
                value={service.min_price}
                onChange={(v) => setService({ ...service, min_price: v })}
              />
            </Field>
            <Field label="أعلى سعر">
              <TextInput
                type="number"
                value={service.max_price}
                onChange={(v) => setService({ ...service, max_price: v })}
              />
            </Field>
            <Field label="المدة بالدقائق">
              <TextInput
                type="number"
                value={service.duration_minutes}
                onChange={(v) =>
                  setService({ ...service, duration_minutes: v })
                }
              />
            </Field>
          </div>
          <button
            onClick={() =>
              save("services", service, () => setService(emptyService))
            }
          >
            {edit.services ? "حفظ تعديل" : "إضافة خدمة"}
          </button>
          <p className="muted">
            المعروض: {visibleServices.length} من {catalogServices.length}
          </p>
          <List
            items={visibleServices}
            name="display_name"
            sub="category_name"
            onEdit={(x) => {
              setService({ ...emptyService, ...x });
              setEdit({ services: x.id });
            }}
            onDel={(x) => del("services", x.id, "الخدمة")}
          />
        </div>
      </div>
    </section>
  );
}
function List({ items, name = "name_ar", sub, onEdit, onDel }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="listbox">
      {list.map((x) => (
        <div className="listrow" key={x.id}>
          <span>
            <b>{x[name] || x.name_ar || x.display_name || x.name || "-"}</b>
            {sub && <small>{x[sub] || ""}</small>}
          </span>
          <span>
            <button onClick={() => onEdit(x)}>تعديل</button>
            <button className="danger" onClick={() => onDel(x)}>
              حذف
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

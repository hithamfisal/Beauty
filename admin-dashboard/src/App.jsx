import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Clock,
  Database,
  Download,
  HardDrive,
  ClipboardList,
  CreditCard,
  Images,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  NotebookPen,
  PlusCircle,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  UserRound,
  Users,
  Wallet,
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
  stc_pay: "إس تي سي باي",
  mada: "مدى",
  card: "بطاقة",
  other: "أخرى",
};


const paymentLabelToCode = Object.fromEntries(Object.entries(paymentLabels).map(([code, label]) => [label, code]));
const paymentMethodLabelToCode = Object.fromEntries(Object.entries(paymentMethodLabels).map(([code, label]) => [label, code]));
function paymentStatusInputToCode(value, fallback = "unpaid") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return paymentLabels[text] ? text : paymentLabelToCode[text] || fallback;
}
function paymentMethodInputToCode(value, fallback = "bank_transfer") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return paymentMethodLabels[text] ? text : paymentMethodLabelToCode[text] || fallback;
}

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

const bookingWorkflow = [
  { key: "new", label: "جديد" },
  { key: "under_review", label: "مراجعة" },
  { key: "confirmed", label: "مؤكد" },
  { key: "beautician_assigned", label: "تعيين" },
  { key: "in_progress", label: "تنفيذ" },
  { key: "completed", label: "مكتمل" },
];
const statusRank = {
  new: 0,
  under_review: 1,
  waiting_customer_confirmation: 1,
  confirmed: 2,
  beautician_assigned: 3,
  artist_assigned: 3,
  in_progress: 4,
  completed: 5,
  cancelled: -1,
};
function statusTone(status) {
  const key = status || "new";
  if (key === "completed") return "success";
  if (key === "confirmed" || key === "beautician_assigned" || key === "artist_assigned") return "ready";
  if (key === "cancelled") return "danger";
  if (key === "in_progress") return "info";
  if (key === "under_review" || key === "waiting_customer_confirmation") return "warning";
  return "new";
}
function paymentTone(status) {
  if (status === "paid") return "success";
  if (status === "deposit_paid") return "ready";
  if (status === "refunded") return "info";
  return "neutral";
}
function StatusBadge({ status }) {
  return <span className={`status-badge tone-${statusTone(status)}`}>{statusLabels[status || "new"] || status || "-"}</span>;
}
function PaymentBadge({ status }) {
  return <span className={`status-badge tone-${paymentTone(status || "unpaid")}`}>{paymentLabels[status || "unpaid"] || status || "-"}</span>;
}
function StatusStepper({ status }) {
  const rank = statusRank[status || "new"] ?? 0;
  if (status === "cancelled") {
    return <div className="status-stepper is-cancelled"><span>تم إلغاء الطلب</span></div>;
  }
  return (
    <div className="status-stepper">
      {bookingWorkflow.map((step, idx) => (
        <span key={step.key} className={idx <= rank ? "is-done" : ""}>{step.label}</span>
      ))}
    </div>
  );
}

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
      {
        id: "occasion-management",
        label: "أنواع المناسبات",
        icon: CalendarDays,
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
    id: "system",
    label: "مدير النظام",
    icon: Database,
    items: [
      { id: "tenant-settings", label: "هوية الشركة", icon: Sparkles },
      { id: "database-backup", label: "النسخ الاحتياطي", icon: Database },
      { id: "saas-tenants", label: "الشركات والاشتراكات", icon: Users },
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  disabled = false,
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
function TextArea({ value, onChange, placeholder, required = false }) {
  return (
    <textarea
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
            <b>بيوتي هوم سيرفس</b>
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
    occasion_types: [],
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
  const [backups, setBackups] = useState([]);
  const [backupStatus, setBackupStatus] = useState("");
  const [backupLoading, setBackupLoading] = useState("");
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const emptyTenantForm = { business_name: "", slug: "", contact_email: "", contact_phone: "", logo_url: "", cover_image_url: "", tagline_ar: "", description_ar: "", primary_color: "#E6C7C2", secondary_color: "#FFFDF8", accent_color: "#DCC5A3", whatsapp_number: "", support_email: "", subscription_plan: "starter", subscription_status: "active", status: "active", onboarding_status: "pending_setup", onboarding_notes: "", owner_name: "", owner_email: "", owner_password: "" };
  const [tenantForm, setTenantForm] = useState(emptyTenantForm);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantAdminForm, setTenantAdminForm] = useState({ name: "", email: "", password: "", role: "tenant_owner" });
  const [auditLogs, setAuditLogs] = useState([]);

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      ...(options.headers || {}),
    };
    if (adminToken && (path.startsWith("/admin") || path.startsWith("/super-admin")))
      headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch(`${API}${path}`, { ...options, headers });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text?.slice(0, 300) || "استجابة غير صالحة من الخادم" };
    }
    if (!res.ok)
      throw new Error(data?.details || data?.error || "تعذر تنفيذ الطلب");
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
        occasion_types: Array.isArray(c?.occasion_types) ? c.occasion_types : [],
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
  async function loadBackups() {
    try {
      const data = await api("/admin/backups");
      setBackups(Array.isArray(data?.files) ? data.files : []);
    } catch (e) {
      setBackupStatus(`تعذر تحميل قائمة النسخ: ${e.message}`);
    }
  }

  async function createBackup(source) {
    const label = source === "supabase" ? "Supabase السحابي" : "المحلي";
    if (!confirm(`سيتم إنشاء نسخة احتياطية من قاعدة البيانات ${label}. هل تريد المتابعة؟`)) return;
    setBackupLoading(source);
    setBackupStatus(`جاري إنشاء نسخة احتياطية من قاعدة البيانات ${label}...`);
    try {
      const data = await api(`/admin/backups/${source}`, { method: "POST" });
      await loadBackups();
      setBackupStatus(`تم إنشاء النسخة بنجاح: ${data.fileName}`);
      downloadBackup(data.fileName);
    } catch (e) {
      setBackupStatus(`فشل إنشاء النسخة: ${e.message}`);
    } finally {
      setBackupLoading("");
    }
  }

  async function downloadBackup(fileName) {
    if (!fileName) return;
    try {
      const res = await fetch(`${API}/admin/backups/download/${encodeURIComponent(fileName)}`, {
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text?.slice(0, 250) || "تعذر تحميل الملف");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setBackupStatus(`تعذر تحميل النسخة: ${e.message}`);
    }
  }

  async function refreshServiceCatalog() {
    const [categories, services, occasionTypes] = await Promise.all([
      api("/admin/service-categories?all=1"),
      api("/admin/services?all=1"),
      api("/admin/occasion-types?all=1"),
    ]);
    setCatalog((prev) => ({
      ...prev,
      service_categories: Array.isArray(categories) ? categories : [],
      services: Array.isArray(services) ? services : [],
      occasion_types: Array.isArray(occasionTypes) ? occasionTypes : [],
    }));
    return { categories, services, occasionTypes };
  }
  useEffect(() => {
    if (adminToken) load();
  }, [adminToken]);

  useEffect(() => {
    if (adminToken && activeView === "database-backup") loadBackups();
    if (adminToken && activeView === "saas-tenants") loadSaasTenants();
    if (adminToken && activeView === "tenant-settings") loadTenantSettings();
  }, [adminToken, activeView]);

  async function loadSaasTenants() {
    try {
      const [tenantRows, planRows, logsRows] = await Promise.all([api("/super-admin/tenants"), api("/super-admin/plans"), api("/super-admin/audit-logs")]);
      setTenants(Array.isArray(tenantRows) ? tenantRows : []);
      setPlans(Array.isArray(planRows) ? planRows : []);
      setAuditLogs(Array.isArray(logsRows) ? logsRows : []);
    } catch (e) {
      setMessage(`تعذر تحميل شركات SaaS: ${e.message}`);
    }
  }

  async function createTenant(e) {
    e.preventDefault();
    try {
      const created = await api("/super-admin/tenants", { method: "POST", body: JSON.stringify(clean(tenantForm)) });
      setTenantForm(emptyTenantForm);
      await loadSaasTenants();
      if (created?.tenant?.id) await loadTenantDetails(created.tenant.id);
      setMessage("تم إنشاء الشركة وحساب مديرها بنجاح.");
    } catch (e) {
      setMessage(`تعذر إنشاء الشركة: ${e.message}`);
    }
  }

  async function loadTenantDetails(id) {
    try {
      const data = await api(`/super-admin/tenants/${id}`);
      setSelectedTenant(data || null);
      setTenantAdminForm({ name: "", email: "", password: "", role: "tenant_owner" });
    } catch (e) {
      setMessage(`تعذر تحميل تفاصيل الشركة: ${e.message}`);
    }
  }

  async function saveSelectedTenant(e) {
    e.preventDefault();
    if (!selectedTenant?.id) return;
    try {
      const updated = await api(`/super-admin/tenants/${selectedTenant.id}`, { method: "PATCH", body: JSON.stringify(clean(selectedTenant)) });
      setSelectedTenant({ ...(selectedTenant || {}), ...(updated || {}) });
      await loadSaasTenants();
      setMessage("تم تحديث بيانات الشركة بنجاح.");
    } catch (e) {
      setMessage(`تعذر تحديث بيانات الشركة: ${e.message}`);
    }
  }

  async function saveTenantAdmin(e) {
    e.preventDefault();
    if (!selectedTenant?.id) return;
    try {
      await api(`/super-admin/tenants/${selectedTenant.id}/admin-users`, { method: "POST", body: JSON.stringify(clean(tenantAdminForm)) });
      await loadTenantDetails(selectedTenant.id);
      await loadSaasTenants();
      setMessage("تم حفظ حساب مدير الشركة بنجاح.");
    } catch (e) {
      setMessage(`تعذر حفظ حساب مدير الشركة: ${e.message}`);
    }
  }

  async function loadTenantSettings() {
    try {
      const data = await api("/admin/tenant");
      setTenantSettings(data || {});
    } catch (e) {
      setMessage(`تعذر تحميل هوية الشركة: ${e.message}`);
    }
  }

  async function saveTenantSettings(e) {
    e.preventDefault();
    try {
      const updated = await api("/admin/tenant", { method: "PATCH", body: JSON.stringify(clean(tenantSettings || {})) });
      setTenantSettings(updated || {});
      setMessage("تم حفظ هوية الشركة بنجاح.");
    } catch (e) {
      setMessage(`تعذر حفظ هوية الشركة: ${e.message}`);
    }
  }


  async function uploadTenantBrandImage(file, targetField) {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const uploaded = await api("/admin/uploads/image", {
        method: "POST",
        body: JSON.stringify({
          image_data_url: dataUrl,
          folder: targetField === "logo_url" ? "beauty-home-service/branding/logos" : "beauty-home-service/branding/covers",
        }),
      });
      setTenantSettings((prev) => ({ ...(prev || {}), [targetField]: uploaded.url }));
      setMessage(targetField === "logo_url" ? "تم رفع شعار الشركة بنجاح." : "تم رفع خلفية الشركة بنجاح.");
    } catch (e) {
      setMessage(`تعذر رفع الصورة: ${e.message}`);
    }
  }

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
    const currentPaymentStatus = paymentLabels[b.payment_status] || paymentLabels.unpaid;
    const currentPaymentMethod = paymentMethodLabels[b.payment_method] || paymentMethodLabels.bank_transfer;
    const paymentStatusInput = prompt(
      "حالة الدفع: غير مدفوع / عربون مدفوع / مدفوع بالكامل / مسترجع",
      currentPaymentStatus,
    );
    if (paymentStatusInput === null) return;
    const payment_status = paymentStatusInputToCode(paymentStatusInput, b.payment_status || "unpaid");
    const paymentMethodInput = prompt(
      "طريقة الدفع: كاش / تحويل بنكي / إس تي سي باي / مدى / بطاقة / أخرى",
      currentPaymentMethod,
    );
    if (paymentMethodInput === null) return;
    const payment_method = paymentMethodInputToCode(paymentMethodInput, b.payment_method || "bank_transfer");
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

  async function addBookingNote(id, note) {
    const text = String(note || "").trim();
    if (!text) return setMessage("اكتب الملاحظة الإدارية أولاً.");
    try {
      await api(`/admin/bookings/${id}/events`, {
        method: "POST",
        body: JSON.stringify({
          event_type: "admin_note",
          title: "ملاحظة إدارية",
          description: text,
        }),
      });
      await refreshBooking(id);
      setMessage("تم حفظ الملاحظة الإدارية في سجل الطلب.");
    } catch (e) {
      setMessage(`تعذر حفظ الملاحظة الإدارية: ${e.message}`);
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
          <h1>بيوتي هوم سيرفس</h1>
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
            <p>بيوتي هوم سيرفس</p>
          </div>
          <div className="header-actions">
            <span className="muted">{adminUser?.tenant_slug ? `الشركة: ${adminUser.tenant_slug}` : adminUser?.role === 'super_admin' ? 'Super Admin' : ''}</span>
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
            addBookingNote={addBookingNote}
            updating={updating}
            close={() => setSelectedBooking(null)}
          />
        )}
        {activeView === "overview" && (
          <AdminOverview
            dashboard={dashboard}
            bookings={bookings}
            beauticians={beauticians}
            catalog={catalog}
            onOpenBooking={openBookingDetails}
            onGoBookings={() => setActiveView("booking-list")}
            onGoCreate={() => setActiveView("booking-create")}
          />
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
        {activeView === "occasion-management" && (
          <OccasionTypesPanel
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


        {activeView === "database-backup" && (
          <BackupPanel
            backups={backups}
            backupStatus={backupStatus}
            backupLoading={backupLoading}
            createBackup={createBackup}
            loadBackups={loadBackups}
            downloadBackup={downloadBackup}
          />
        )}

        {activeView === "tenant-settings" && (
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>هوية الشركة ورابط الحجز</h2>
                <p className="muted">هذه البيانات تظهر للعميلات في رابط الحجز الخاص بالشركة وتتحكم في الشعار والألوان والخدمات المعروضة.</p>
              </div>
              <button onClick={loadTenantSettings}><RefreshCw size={17} /> تحديث</button>
            </div>
            {!tenantSettings ? <div className="empty-state">جاري تحميل بيانات الشركة...</div> : (
              <form className="form-grid compact-form" onSubmit={saveTenantSettings}>
                <Field label="اسم الشركة"><TextInput value={tenantSettings.business_name || ""} onChange={(v)=>setTenantSettings({...tenantSettings,business_name:v})} /></Field>
                <Field label="Slug / رابط الشركة"><TextInput value={tenantSettings.slug || ""} disabled /></Field>
                <Field label="شعار الشركة">
                  <div className="brand-upload-control">
                    <div className="brand-preview logo-preview">
                      {tenantSettings.logo_url ? <img src={tenantSettings.logo_url} alt="شعار الشركة" /> : <Sparkles size={26} />}
                    </div>
                    <div className="brand-upload-body">
                      <TextInput value={tenantSettings.logo_url || ""} onChange={(v)=>setTenantSettings({...tenantSettings,logo_url:v})} placeholder="سيظهر الرابط هنا بعد الرفع أو يمكن لصق رابط مباشر" />
                      <label className="file-browse-btn">
                        <Upload size={16}/> استعراض ورفع الشعار
                        <input type="file" accept="image/*" onChange={(e)=>uploadTenantBrandImage(e.target.files?.[0], "logo_url")} />
                      </label>
                      <small>يفضل شعار PNG بخلفية شفافة أو صورة مربعة واضحة.</small>
                    </div>
                  </div>
                </Field>
                <Field label="خلفية صفحة الحجز">
                  <div className="brand-upload-control">
                    <div className="brand-preview cover-preview">
                      {tenantSettings.cover_image_url ? <img src={tenantSettings.cover_image_url} alt="خلفية الشركة" /> : <Images size={26} />}
                    </div>
                    <div className="brand-upload-body">
                      <TextInput value={tenantSettings.cover_image_url || ""} onChange={(v)=>setTenantSettings({...tenantSettings,cover_image_url:v})} placeholder="سيظهر الرابط هنا بعد الرفع أو يمكن لصق رابط مباشر" />
                      <label className="file-browse-btn">
                        <Upload size={16}/> استعراض ورفع الخلفية
                        <input type="file" accept="image/*" onChange={(e)=>uploadTenantBrandImage(e.target.files?.[0], "cover_image_url")} />
                      </label>
                      <small>يفضل صورة أفقية ناعمة تناسب صفحة الحجز العامة.</small>
                    </div>
                  </div>
                </Field>
                <Field label="الشعار النصي"><TextInput value={tenantSettings.tagline_ar || ""} onChange={(v)=>setTenantSettings({...tenantSettings,tagline_ar:v})} /></Field>
                <Field label="وصف الشركة"><TextArea value={tenantSettings.description_ar || ""} onChange={(v)=>setTenantSettings({...tenantSettings,description_ar:v})} /></Field>
                <Field label="اللون الرئيسي"><TextInput type="color" value={tenantSettings.primary_color || "#E6C7C2"} onChange={(v)=>setTenantSettings({...tenantSettings,primary_color:v})} /></Field>
                <Field label="لون الخلفية"><TextInput type="color" value={tenantSettings.secondary_color || "#FFFDF8"} onChange={(v)=>setTenantSettings({...tenantSettings,secondary_color:v})} /></Field>
                <Field label="لون مساعد"><TextInput type="color" value={tenantSettings.accent_color || "#DCC5A3"} onChange={(v)=>setTenantSettings({...tenantSettings,accent_color:v})} /></Field>
                <Field label="واتساب"><TextInput value={tenantSettings.whatsapp_number || ""} onChange={(v)=>setTenantSettings({...tenantSettings,whatsapp_number:v})} /></Field>
                <Field label="بريد الدعم"><TextInput value={tenantSettings.support_email || ""} onChange={(v)=>setTenantSettings({...tenantSettings,support_email:v})} /></Field>
                <Field label="رابط الحجز العام"><TextInput value={`${window.location.origin}/${tenantSettings.slug || ""}`} disabled /></Field>
                <div className="form-actions"><button><Save size={17}/> حفظ الهوية</button></div>
              </form>
            )}
          </section>
        )}

        {activeView === "saas-tenants" && (
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>إدارة شركات SaaS والتهيئة</h2>
                <p className="muted">هذه الصفحة مخصصة للـ Super Admin لإنشاء شركة جديدة، إنشاء حساب مديرها، ضبط الباقة، ومتابعة حالة التهيئة.</p>
              </div>
              <button onClick={loadSaasTenants}><RefreshCw size={17} /> تحديث</button>
            </div>
            {adminUser?.role !== 'super_admin' ? (
              <div className="empty-state">هذه الصفحة تتطلب حساب Super Admin. حسابات الشركات ترى بيانات شركتها فقط.</div>
            ) : (
              <>
                <div className="kpi-grid">
                  <div className="kpi-card"><span>إجمالي الشركات</span><strong>{tenants.length}</strong></div>
                  <div className="kpi-card"><span>شركات نشطة</span><strong>{tenants.filter(t=>t.status==='active').length}</strong></div>
                  <div className="kpi-card"><span>تحتاج تهيئة</span><strong>{tenants.filter(t=>t.onboarding_status==='pending_setup').length}</strong></div>
                  <div className="kpi-card"><span>حسابات المدراء</span><strong>{tenants.reduce((sum,t)=>sum+(Number(t.admins_count)||0),0)}</strong></div>
                </div>

                <form className="form-grid compact-form" onSubmit={createTenant}>
                  <Field label="اسم الشركة"><TextInput value={tenantForm.business_name} onChange={(v)=>setTenantForm({...tenantForm,business_name:v})} required /></Field>
                  <Field label="الرابط المختصر slug"><TextInput value={tenantForm.slug} onChange={(v)=>setTenantForm({...tenantForm,slug:v})} required /></Field>
                  <Field label="اسم مدير الشركة"><TextInput value={tenantForm.owner_name} onChange={(v)=>setTenantForm({...tenantForm,owner_name:v})} required /></Field>
                  <Field label="بريد مدير الشركة"><TextInput value={tenantForm.owner_email} onChange={(v)=>setTenantForm({...tenantForm,owner_email:v})} required /></Field>
                  <Field label="كلمة مرور المدير"><TextInput type="password" value={tenantForm.owner_password} onChange={(v)=>setTenantForm({...tenantForm,owner_password:v})} required /></Field>
                  <Field label="جوال الشركة"><TextInput value={tenantForm.contact_phone} onChange={(v)=>setTenantForm({...tenantForm,contact_phone:v})} /></Field>
                  <Field label="رابط الشعار"><TextInput value={tenantForm.logo_url} onChange={(v)=>setTenantForm({...tenantForm,logo_url:v})} /></Field>
                  <Field label="رابط صورة الغلاف"><TextInput value={tenantForm.cover_image_url} onChange={(v)=>setTenantForm({...tenantForm,cover_image_url:v})} /></Field>
                  <Field label="الشعار النصي"><TextInput value={tenantForm.tagline_ar} onChange={(v)=>setTenantForm({...tenantForm,tagline_ar:v})} /></Field>
                  <Field label="لون رئيسي"><TextInput type="color" value={tenantForm.primary_color} onChange={(v)=>setTenantForm({...tenantForm,primary_color:v})} /></Field>
                  <Field label="لون مساعد"><TextInput type="color" value={tenantForm.accent_color} onChange={(v)=>setTenantForm({...tenantForm,accent_color:v})} /></Field>
                  <Field label="الباقة"><Select value={tenantForm.subscription_plan} onChange={(v)=>setTenantForm({...tenantForm,subscription_plan:v})}>{plans.map(p=><option key={p.code} value={p.code}>{p.name_ar} - {p.monthly_price || 0} ريال</option>)}</Select></Field>
                  <Field label="حالة التهيئة"><Select value={tenantForm.onboarding_status} onChange={(v)=>setTenantForm({...tenantForm,onboarding_status:v})}><option value="pending_setup">قيد التهيئة</option><option value="ready">جاهزة</option><option value="needs_review">تحتاج مراجعة</option></Select></Field>
                  <Field label="ملاحظات التهيئة"><TextArea value={tenantForm.onboarding_notes} onChange={(v)=>setTenantForm({...tenantForm,onboarding_notes:v})} /></Field>
                  <div className="form-actions"><button><PlusCircle size={17}/> إنشاء الشركة وحساب مديرها</button></div>
                </form>

                <div className="table-wrap">
                  <table>
                    <thead><tr><th>الشركة</th><th>Slug</th><th>مدير الشركة</th><th>رابط الحجز</th><th>الباقة</th><th>التهيئة</th><th>الحجوزات</th><th>الخدمات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
                    <tbody>{tenants.map(t=><tr key={t.id}><td>{t.business_name}</td><td>{t.slug}</td><td>{t.owner_email || '-'}</td><td><code>/{t.slug}</code></td><td>{t.subscription_plan}</td><td>{t.onboarding_status || '-'}</td><td>{t.bookings_count}</td><td>{t.services_count}</td><td><span className={`status-badge ${t.status === 'active' ? 'active' : 'inactive'}`}>{t.status === 'active' ? 'نشطة' : 'موقوفة'}</span></td><td><button type="button" onClick={()=>loadTenantDetails(t.id)}>إدارة</button></td></tr>)}</tbody>
                  </table>
                </div>

                {selectedTenant && (
                  <div className="details-card">
                    <div className="section-header">
                      <div>
                        <h3>إعدادات العميل: {selectedTenant.business_name}</h3>
                        <p className="muted">يمكن للـ Super Admin ضبط بيانات العميل الأساسية أو إنشاء حساب مدير جديد للشركة.</p>
                      </div>
                      <button type="button" onClick={()=>setSelectedTenant(null)}><X size={16}/> إغلاق</button>
                    </div>
                    <form className="form-grid compact-form" onSubmit={saveSelectedTenant}>
                      <Field label="اسم الشركة"><TextInput value={selectedTenant.business_name || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,business_name:v})} /></Field>
                      <Field label="Slug"><TextInput value={selectedTenant.slug || ""} disabled /></Field>
                      <Field label="رابط الشعار"><TextInput value={selectedTenant.logo_url || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,logo_url:v})} /></Field>
                      <Field label="رابط الغلاف"><TextInput value={selectedTenant.cover_image_url || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,cover_image_url:v})} /></Field>
                      <Field label="الشعار النصي"><TextInput value={selectedTenant.tagline_ar || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,tagline_ar:v})} /></Field>
                      <Field label="وصف الشركة"><TextArea value={selectedTenant.description_ar || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,description_ar:v})} /></Field>
                      <Field label="واتساب"><TextInput value={selectedTenant.whatsapp_number || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,whatsapp_number:v})} /></Field>
                      <Field label="بريد الدعم"><TextInput value={selectedTenant.support_email || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,support_email:v})} /></Field>
                      <Field label="الباقة"><Select value={selectedTenant.subscription_plan || "starter"} onChange={(v)=>setSelectedTenant({...selectedTenant,subscription_plan:v})}>{plans.map(p=><option key={p.code} value={p.code}>{p.name_ar}</option>)}</Select></Field>
                      <Field label="حالة الاشتراك"><Select value={selectedTenant.subscription_status || "active"} onChange={(v)=>setSelectedTenant({...selectedTenant,subscription_status:v})}><option value="active">نشط</option><option value="trial">تجريبي</option><option value="expired">منتهي</option><option value="suspended">موقوف</option></Select></Field>
                      <Field label="حالة الشركة"><Select value={selectedTenant.status || "active"} onChange={(v)=>setSelectedTenant({...selectedTenant,status:v})}><option value="active">نشطة</option><option value="inactive">غير نشطة</option><option value="suspended">موقوفة</option></Select></Field>
                      <Field label="حالة التهيئة"><Select value={selectedTenant.onboarding_status || "pending_setup"} onChange={(v)=>setSelectedTenant({...selectedTenant,onboarding_status:v})}><option value="pending_setup">قيد التهيئة</option><option value="ready">جاهزة</option><option value="needs_review">تحتاج مراجعة</option></Select></Field>
                      <Field label="ملاحظات التهيئة"><TextArea value={selectedTenant.onboarding_notes || ""} onChange={(v)=>setSelectedTenant({...selectedTenant,onboarding_notes:v})} /></Field>
                      <Field label="رابط الحجز"><TextInput value={`${window.location.origin}/${selectedTenant.slug || ""}`} disabled /></Field>
                      <div className="form-actions"><button><Save size={17}/> حفظ إعدادات العميل</button></div>
                    </form>

                    <h3>حسابات مدراء الشركة</h3>
                    <div className="table-wrap compact-table">
                      <table>
                        <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th></tr></thead>
                        <tbody>{(selectedTenant.admins || []).map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.status}</td><td>{formatDate(u.last_login_at)}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <form className="form-grid compact-form" onSubmit={saveTenantAdmin}>
                      <Field label="اسم المدير"><TextInput value={tenantAdminForm.name} onChange={(v)=>setTenantAdminForm({...tenantAdminForm,name:v})} required /></Field>
                      <Field label="بريد المدير"><TextInput value={tenantAdminForm.email} onChange={(v)=>setTenantAdminForm({...tenantAdminForm,email:v})} required /></Field>
                      <Field label="كلمة المرور"><TextInput type="password" value={tenantAdminForm.password} onChange={(v)=>setTenantAdminForm({...tenantAdminForm,password:v})} required /></Field>
                      <Field label="الدور"><Select value={tenantAdminForm.role} onChange={(v)=>setTenantAdminForm({...tenantAdminForm,role:v})}><option value="tenant_owner">مالك الشركة</option><option value="admin">مدير</option><option value="booking_manager">مسؤول حجوزات</option></Select></Field>
                      <div className="form-actions"><button><PlusCircle size={17}/> حفظ حساب المدير</button></div>
                    </form>
                  </div>
                )}

                <div className="details-card">
                  <h3>آخر عمليات Super Admin</h3>
                  <div className="table-wrap compact-table">
                    <table>
                      <thead><tr><th>التاريخ</th><th>الشركة</th><th>المستخدم</th><th>العملية</th><th>الكيان</th></tr></thead>
                      <tbody>{auditLogs.slice(0,20).map(l=><tr key={l.id}><td>{formatDate(l.created_at)}</td><td>{l.tenant_name || '-'}</td><td>{l.actor_email || '-'}</td><td>{l.action}</td><td>{l.entity_type}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
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
                <Select
                  value={bookingForm.event_type}
                  onChange={(v) => setBooking("event_type", v)}
                >
                  <option value="">اختيار نوع المناسبة</option>
                  {(catalog.occasion_types || []).map((o) => (
                    <option key={o.id} value={o.name_ar || o.name_en || o.id}>{o.name_ar || o.name_en}</option>
                  ))}
                </Select>
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
              <BookingSummaryCard
                bookingForm={bookingForm}
                catalog={catalog}
                beauticians={beauticians}
              />
              <div className="actions booking-submit-action">
                <button>تأكيد وإنشاء الطلب</button>
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
          <section className="panel booking-management-panel">
            <div className="panel-title-row">
              <div>
                <h2>إدارة الطلبات</h2>
                <p className="muted">فلترة، متابعة الحالة، تعيين الخبيرة، ومراجعة تفاصيل كل طلب من مكان واحد.</p>
              </div>
              <button onClick={() => setActiveView("booking-create")}>+ إنشاء طلب</button>
            </div>
            <div className="filters booking-filters">
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
            <div className="tableWrap admin-table-wrap">
            <table className="admin-data-table bookings-table">
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
                      <StatusBadge status={b.status || "new"} />
                      <StatusStepper status={b.status || "new"} />
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
                      <PaymentBadge status={b.payment_status || "unpaid"} />
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
            </div>
          </section>
        )}
      </main>
    </div>
  );
}



function AdminOverview({ dashboard, bookings, beauticians, catalog, onOpenBooking, onGoBookings, onGoCreate }) {
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayBookings = safeBookings.filter((b) => String(b.booking_date || "").slice(0, 10) === todayKey);
  const urgentBookings = safeBookings.filter((b) => ["new", "under_review", "waiting_customer_confirmation"].includes(b.status || "new")).slice(0, 6);
  const activeBeauticians = (beauticians || []).filter((a) => a.status === "active").length;
  const serviceCount = Array.isArray(catalog?.services) ? catalog.services.length : 0;
  const monthlyData = buildLast12Months().map((key) => ({
    label: arabicMonthLabel(key),
    value: safeBookings.filter((b) => monthKey(b.booking_date || b.created_at) === key).length,
  }));
  const statusData = groupMetric(safeBookings, (b) => statusLabels[b.status || "new"] || b.status || "جديد").slice(0, 6);
  const cityData = groupMetric(safeBookings, (b) => b.city_name || "غير محدد").slice(0, 5);

  return (
    <section className="admin-overview-page">
      <div className="overview-hero panel">
        <div>
          <span className="eyebrow">Admin Command Center</span>
          <h2>نظرة تشغيلية على الحجوزات والخدمات</h2>
          <p className="muted">متابعة الطلبات الجديدة، تعيين الخبيرات، مؤشرات الدفع، وحركة الحجز من شاشة واحدة.</p>
        </div>
        <div className="overview-actions">
          <button onClick={onGoCreate}>إنشاء طلب جديد</button>
          <button className="secondary" onClick={onGoBookings}>إدارة الطلبات</button>
        </div>
      </div>
      <div className="overview-kpis">
        <AnalyticsStatCard icon={ClipboardList} title="كل الطلبات" value={dashboard.total_bookings ?? safeBookings.length} sub="إجمالي الطلبات المسجلة" />
        <AnalyticsStatCard icon={Bell} title="طلبات جديدة" value={dashboard.new_bookings ?? safeBookings.filter((b) => (b.status || "new") === "new").length} sub="تحتاج مراجعة" />
        <AnalyticsStatCard icon={CalendarDays} title="طلبات اليوم" value={dashboard.today_bookings ?? todayBookings.length} sub="مواعيد اليوم" />
        <AnalyticsStatCard icon={AlertCircle} title="بدون خبيرة" value={dashboard.unassigned_bookings ?? safeBookings.filter((b) => !b.assigned_artist_id).length} sub="تحتاج تعيين" />
        <AnalyticsStatCard icon={Wallet} title="غير مدفوعة" value={dashboard.unpaid_bookings ?? safeBookings.filter((b) => (b.payment_status || "unpaid") === "unpaid").length} sub="متابعة التحصيل" />
        <AnalyticsStatCard icon={Users} title="خبيرات فعالات" value={dashboard.active_beauticians ?? dashboard.active_artists ?? activeBeauticians} sub={`الخدمات: ${serviceCount}`} />
      </div>
      <div className="overview-grid">
        <div className="analytics-card">
          <div className="analytics-card-head">
            <div><h2>حركة الحجوزات الشهرية</h2><p>آخر 12 شهر حسب تاريخ الحجز أو تاريخ الإنشاء.</p></div>
          </div>
          <MiniLineChart data={monthlyData} />
        </div>
        <div className="analytics-card">
          <div className="analytics-card-head">
            <div><h2>الحجوزات حسب الحالة</h2><p>مؤشر سريع لحالة التشغيل الحالية.</p></div>
          </div>
          <HorizontalBars data={statusData} />
        </div>
      </div>
      <div className="overview-grid secondary-grid">
        <div className="analytics-card">
          <div className="analytics-card-head"><div><h2>أكثر المدن طلباً</h2><p>يساعد في تخطيط تغطية الخبيرات.</p></div></div>
          <HorizontalBars data={cityData} />
        </div>
        <div className="analytics-card recent-bookings-card">
          <div className="analytics-card-head"><div><h2>طلبات تحتاج متابعة</h2><p>طلبات جديدة أو قيد المراجعة.</p></div></div>
          <div className="recent-bookings-list">
            {urgentBookings.length === 0 && <p className="muted">لا توجد طلبات عاجلة حالياً.</p>}
            {urgentBookings.map((b) => (
              <button key={b.id} className="recent-booking-item" onClick={() => onOpenBooking(b)}>
                <span><b>{b.customer_name || "عميلة"}</b><small>{b.service_name || "خدمة"} • {b.city_name || "-"}</small></span>
                <StatusBadge status={b.status || "new"} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function findById(list, id) {
  return (Array.isArray(list) ? list : []).find((x) => sameId(x.id, id));
}
function BookingSummaryCard({ bookingForm, catalog, beauticians }) {
  const category = findById(catalog?.service_categories, bookingForm.service_category_id);
  const service = findById(catalog?.services, bookingForm.service_id);
  const region = findById(catalog?.regions, bookingForm.region_id);
  const city = findById(catalog?.cities, bookingForm.city_id);
  const district = findById(catalog?.districts, bookingForm.district_id);
  const artist = findById(beauticians, bookingForm.preferred_artist_id);
  const price = service ? [service.min_price, service.max_price].filter(Boolean).join(" - ") : "-";
  return (
    <div className="booking-summary-card">
      <div className="booking-summary-head">
        <CheckCircle2 size={22} />
        <div><b>ملخص الطلب قبل الإنشاء</b><small>راجع البيانات الأساسية قبل الحفظ.</small></div>
      </div>
      <div className="booking-summary-grid">
        <span><b>العميلة</b>{bookingForm.name || "-"}</span>
        <span><b>الجوال</b>{bookingForm.phone || "-"}</span>
        <span><b>القسم</b>{category?.name_ar || "-"}</span>
        <span><b>الخدمة</b>{service?.display_name || service?.name_ar || "-"}</span>
        <span><b>الموقع</b>{[region?.name_ar, city?.name_ar, district?.name_ar].filter(Boolean).join(" / ") || "-"}</span>
        <span><b>الموعد</b>{bookingForm.booking_date || "-"} {bookingForm.booking_time || ""}</span>
        <span><b>الخبيرة</b>{artist?.name || "بدون تفضيل"}</span>
        <span><b>السعر المتوقع</b>{price !== "-" ? `${price} ر.س` : "-"}</span>
      </div>
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
          sub="إحصائيات سريعة"
          icon={CreditCard}
        />
        <AnalyticsStatCard title="حجوزات جديدة" value={analytics.newBookings} icon={CalendarDays} />
        <AnalyticsStatCard title="المتخصصون النشطون" value={analytics.activeBeauticians} icon={UserRound} />
        <AnalyticsStatCard title="عملاء جدد" value={analytics.customers} icon={UserRound} />
        <AnalyticsStatCard title="نسبة الإنجاز" value={`${analytics.completionRate}%`} sub="مكتمل" icon={TrendingUp} />
        <AnalyticsStatCard title="طلبات غير مدفوعة" value={analytics.unpaid} sub="بانتظار التحصيل" icon={Bell} />
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
  addBookingNote,
  updating = {},
  close,
}) {
  const [note, setNote] = useState("");
  const activeBeauticians = (beauticians || []).filter((a) => a.status === "active");
  const saveNote = async () => {
    await addBookingNote?.(booking.id, note);
    setNote("");
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-card booking-details-card">
        <div className="modal-head booking-modal-head">
          <div>
            <span className="eyebrow">تفاصيل الطلب</span>
            <h2>{booking.booking_number || booking.id}</h2>
            <p className="muted">إدارة الحالة، الخبيرة، الدفع، والملاحظات الإدارية.</p>
          </div>
          <button className="secondary" onClick={close}>إغلاق</button>
        </div>

        <div className="booking-detail-hero">
          <div>
            <StatusBadge status={booking.status || "new"} />
            <StatusStepper status={booking.status || "new"} />
          </div>
          <div>
            <PaymentBadge status={booking.payment_status || "unpaid"} />
            <small>{paymentMethodLabels[booking.payment_method] || booking.payment_method || "لم يتم تحديد طريقة الدفع"}</small>
          </div>
        </div>

        <div className="booking-detail-sections">
          <section className="detail-section">
            <h3>بيانات العميلة</h3>
            <div className="detail-grid compact">
              <p><b>الاسم:</b> {booking.customer_name || "-"}</p>
              <p><b>الجوال:</b> {booking.customer_phone || "-"}</p>
              <p><b>التواصل:</b> {contactLabels[booking.contact_preference] || booking.contact_preference || "-"}</p>
              <p><b>المصدر:</b> {booking.booking_source_label || booking.booking_source || "-"}</p>
            </div>
          </section>
          <section className="detail-section">
            <h3>الخدمة والموقع</h3>
            <div className="detail-grid compact">
              <p><b>القسم:</b> {booking.service_category_name || "-"}</p>
              <p><b>الخدمة:</b> {booking.service_name || "-"}</p>
              <p><b>الموقع:</b> {booking.region_name || "-"} / {booking.city_name || "-"} / {booking.district_name || "-"}</p>
              <p><b>العنوان:</b> {booking.address || "-"}</p>
            </div>
          </section>
          <section className="detail-section">
            <h3>الموعد والخبيرة</h3>
            <div className="detail-grid compact">
              <p><b>التاريخ:</b> {formatDate(booking.booking_date)}</p>
              <p><b>الوقت:</b> {formatTime(booking.booking_time)}</p>
              <p><b>وقت بديل:</b> {booking.alternate_time || "-"}</p>
              <p><b>خبيرة مفضلة:</b> {booking.preferred_artist_name || "-"}</p>
              <p><b>خبيرة معينة:</b> {booking.artist_name || "-"}</p>
            </div>
          </section>
          <section className="detail-section">
            <h3>الملاحظات والدفع</h3>
            <div className="detail-grid compact">
              <p><b>ملاحظات العميلة:</b> {booking.customer_notes || "-"}</p>
              <p><b>ملاحظات الإدارة:</b> {booking.admin_notes || "-"}</p>
              <p><b>مرجع الدفع:</b> {booking.payment_reference || "-"}</p>
              <p><b>إثبات الدفع:</b> {booking.payment_proof_url ? <a href={booking.payment_proof_url} target="_blank">فتح الإيصال</a> : "-"}</p>
            </div>
          </section>
        </div>

        {booking.design_image_url && (
          <div className="image-box">
            <b>صورة التصميم:</b><br />
            <a href={booking.design_image_url} target="_blank">فتح الصورة</a>
          </div>
        )}

        <div className="operations-grid">
          <Field label="تغيير الحالة">
            <Select value={booking.status || "new"} onChange={(v) => updateStatus(booking.id, v)} disabled={!!updating[`status:${booking.id}`]}>
              {statusOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="تعيين خبيرة تجميل">
            <Select value={booking.assigned_artist_id || ""} onChange={(v) => assignBeautician(booking.id, v)} disabled={!!updating[`assign:${booking.id}`]}>
              <option value="">بدون تعيين</option>
              {activeBeauticians.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="حالة الدفع">
            <Select value={booking.payment_status || "unpaid"} onChange={(v) => updatePayment(booking.id, v)} disabled={!!updating[`payment:${booking.id}`]}>
              {paymentOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <div className="field">
            <span>تفاصيل الدفع</span>
            <button className="secondary" onClick={() => updatePaymentDetails(booking)}>تعديل تفاصيل الدفع</button>
          </div>
        </div>

        <div className="admin-note-box">
          <div>
            <h3>ملاحظة إدارية جديدة</h3>
            <p className="muted">تُحفظ الملاحظة في سجل أحداث الطلب ولا تظهر للعميلة إلا إذا تم ربطها لاحقاً بقالب تواصل.</p>
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب ملاحظة داخلية عن الطلب، المكالمة، أو التعيين..." />
          <button onClick={saveNote}>حفظ الملاحظة</button>
        </div>

        <div className="events-box enhanced-events">
          <b>سجل أحداث الطلب</b>
          {(booking.events || []).length ? (
            booking.events.map((ev) => (
              <div className="event-row" key={ev.id}>
                <span>{ev.title || ev.event_type}</span>
                <small>{ev.description || ""} • {formatDate(ev.created_at)}</small>
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


function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!n) return "0 KB";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function BackupPanel({ backups, backupStatus, backupLoading, createBackup, loadBackups, downloadBackup }) {
  const list = Array.isArray(backups) ? backups : [];
  return (
    <section className="panel backup-panel">
      <h2>النسخ الاحتياطي لقاعدة البيانات</h2>
      <p className="muted">
        إنشاء نسخة SQL من قاعدة البيانات المحلية أو قاعدة Supabase السحابية وحفظها في مجلد backups على السيرفر مع تحميلها على الجهاز.
      </p>
      <div className="backup-actions">
        <button disabled={!!backupLoading} onClick={() => createBackup("local")}>
          <HardDrive size={18} />
          {backupLoading === "local" ? "جاري النسخ..." : "نسخة احتياطية من المحلي"}
        </button>
        <button disabled={!!backupLoading} onClick={() => createBackup("supabase")}>
          <Cloud size={18} />
          {backupLoading === "supabase" ? "جاري النسخ..." : "نسخة احتياطية من Supabase"}
        </button>
        <button className="secondary" disabled={!!backupLoading} onClick={loadBackups}>
          <RefreshCw size={18} /> تحديث القائمة
        </button>
      </div>
      {backupStatus && <div className="message">{backupStatus}</div>}
      <div className="backup-note">
        <b>مهم:</b> بيانات الاتصال وكلمات المرور يجب أن تكون داخل ملف backend/.env فقط، ولا يتم وضعها داخل واجهة React.
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>المصدر</th>
              <th>اسم الملف</th>
              <th>الحجم</th>
              <th>تاريخ الإنشاء</th>
              <th>تحميل</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan="5">لا توجد نسخ احتياطية محفوظة حالياً.</td></tr>
            )}
            {list.map((file) => (
              <tr key={file.file_name}>
                <td>{file.source === "supabase" ? "Supabase" : "محلي"}</td>
                <td dir="ltr">{file.file_name}</td>
                <td>{formatBytes(file.size_bytes)}</td>
                <td>{formatDate(file.created_at)}</td>
                <td>
                  <button className="secondary" onClick={() => downloadBackup(file.file_name)}>
                    <Download size={16} /> تحميل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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


const emptyOccasionType = { name_ar: "", name_en: "", description: "", status: "active", sort_order: 0 };
function OccasionTypesPanel({ catalog, api, refreshServiceCatalog, setMessage }) {
  const occasionTypes = Array.isArray(catalog?.occasion_types) ? catalog.occasion_types : [];
  const [form, setForm] = useState(emptyOccasionType);
  const [editId, setEditId] = useState(null);
  async function saveOccasion() {
    try {
      await api(`/admin/occasion-types${editId ? `/${editId}` : ""}`, {
        method: editId ? "PATCH" : "POST",
        body: JSON.stringify(clean(form)),
      });
      await refreshServiceCatalog();
      setForm(emptyOccasionType);
      setEditId(null);
      setMessage("تم حفظ نوع المناسبة وتحديث قوائم الحجز.");
    } catch (e) {
      setMessage(`تعذر حفظ نوع المناسبة: ${e.message}`);
    }
  }
  async function deleteOccasion(item) {
    if (!confirm(`حذف نوع المناسبة: ${item.name_ar || item.name_en}؟`)) return;
    try {
      await api(`/admin/occasion-types/${item.id}`, { method: "DELETE" });
      await refreshServiceCatalog();
      setMessage("تم حذف نوع المناسبة من القائمة.");
    } catch (e) {
      setMessage(`تعذر حذف نوع المناسبة: ${e.message}`);
    }
  }
  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2>إدارة أنواع المناسبات</h2>
          <p className="muted">هذه القائمة تظهر كقائمة منسدلة في طلب الحجز للعميلة ولوحة التحكم. أضف المطلوبات مثل زواج، خطوبة، تخرج، عيد أو مناسبة خاصة.</p>
        </div>
        <button onClick={refreshServiceCatalog}><RefreshCw size={17}/> تحديث</button>
      </div>
      <div className="two">
        <div>
          <h3>{editId ? "تعديل نوع مناسبة" : "إضافة نوع مناسبة"}</h3>
          <Field label="اسم المناسبة عربي"><TextInput value={form.name_ar} onChange={(v)=>setForm({...form,name_ar:v})} placeholder="مثال: زواج" /></Field>
          <Field label="اسم المناسبة إنجليزي"><TextInput value={form.name_en} onChange={(v)=>setForm({...form,name_en:v})} placeholder="Wedding" /></Field>
          <Field label="وصف مختصر"><TextInput value={form.description} onChange={(v)=>setForm({...form,description:v})} placeholder="وصف داخلي اختياري" /></Field>
          <div className="grid3">
            <Field label="الترتيب"><TextInput type="number" value={form.sort_order} onChange={(v)=>setForm({...form,sort_order:v})} /></Field>
            <Field label="الحالة"><Select value={form.status} onChange={(v)=>setForm({...form,status:v})}><option value="active">نشط</option><option value="inactive">غير نشط</option></Select></Field>
          </div>
          <div className="form-actions">
            <button type="button" onClick={saveOccasion}><Save size={17}/> {editId ? "حفظ التعديل" : "إضافة نوع المناسبة"}</button>
            {editId && <button type="button" className="secondary" onClick={()=>{setForm(emptyOccasionType);setEditId(null);}}>إلغاء التعديل</button>}
          </div>
        </div>
        <div>
          <h3>القائمة الحالية</h3>
          <List
            items={occasionTypes}
            sub="description"
            onEdit={(x)=>{setForm({ ...emptyOccasionType, ...x }); setEditId(x.id);}}
            onDel={deleteOccasion}
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

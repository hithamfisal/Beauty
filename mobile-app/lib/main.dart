import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:4000/api',
);

const savedCustomerPhoneKey = 'customer_phone';

String normalizePhone(String value) => value.trim().replaceAll(RegExp(r'\s+'), '');

void main() => runApp(const BeautyHomeServiceApp());

class BeautyHomeServiceApp extends StatelessWidget {
  const BeautyHomeServiceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Beauty Home Service',
      theme: ThemeData(
        fontFamily: 'Arial',
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF8B5A2B)),
        useMaterial3: true,
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: const Color(0xFF6B3F19),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ),
      home: const Directionality(textDirection: TextDirection.rtl, child: HomeScreen()),
    );
  }
}

class ApiClient {
  static Future<dynamic> get(String path) async {
    final response = await http.get(Uri.parse('$apiBaseUrl$path'));
    return _parse(response);
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body) async {
    final response = await http.post(
      Uri.parse('$apiBaseUrl$path'),
      headers: {'Content-Type': 'application/json; charset=utf-8'},
      body: jsonEncode(body),
    );
    return _parse(response);
  }

  static dynamic _parse(http.Response response) {
    final data = response.body.isEmpty ? null : jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = data is Map ? (data['error'] ?? data['details'] ?? 'حدث خطأ') : 'حدث خطأ';
      throw Exception(message);
    }
    return data;
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final phoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    loadSavedPhone();
  }

  Future<void> loadSavedPhone() async {
    final prefs = await SharedPreferences.getInstance();
    final savedPhone = prefs.getString(savedCustomerPhoneKey);
    if (savedPhone != null && savedPhone.isNotEmpty && mounted) {
      phoneController.text = savedPhone;
    }
  }

  @override
  void dispose() {
    phoneController.dispose();
    super.dispose();
  }

  void openBookings() {
    final phone = normalizePhone(phoneController.text);
    Navigator.push(context, MaterialPageRoute(builder: (_) => MyBookingsScreen(phone: phone)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4EA),
      appBar: AppBar(title: const Text('Beauty Home Service'), centerTitle: true),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: const LinearGradient(colors: [Color(0xFF6B3F19), Color(0xFFB88943)]),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('احجزي Beauty Home Service بسهولة', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('ارسلي طلبك والدعم يتواصل معك لتأكيد التوفر والسعر.', style: TextStyle(color: Colors.white, fontSize: 15)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          TextField(controller: phoneController, keyboardType: TextInputType.phone, decoration: inputDecoration('رقم الجوال لمتابعة الطلبات')),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BookingScreen())),
            child: const Text('احجزي الآن', style: TextStyle(fontSize: 18)),
          ),
          const SizedBox(height: 10),
          OutlinedButton(onPressed: openBookings, child: const Text('طلباتي')),
          const SizedBox(height: 14),
          const Text('v1.2: تطبيق عميلة أولي مرتبط بالـ Backend. رمز OTP التجريبي هو 1234 عند استخدام تسجيل الدخول لاحقاً.', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

InputDecoration inputDecoration(String label) => InputDecoration(
  labelText: label,
  filled: true,
  fillColor: Colors.white,
  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
);

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final phone = TextEditingController();
  final district = TextEditingController();
  final eventType = TextEditingController(text: 'زواج');
  final people = TextEditingController(text: '1');
  final address = TextEditingController();
  final notes = TextEditingController();
  DateTime? bookingDate;
  TimeOfDay? bookingTime;
  bool loading = true;
  bool saving = false;
  String? error;
  List cities = [];
  List services = [];
  String? selectedCity;
  String? selectedService;

  @override
  void initState() {
    super.initState();
    loadSavedPhone();
    loadCatalog();
  }

  Future<void> loadSavedPhone() async {
    final prefs = await SharedPreferences.getInstance();
    final savedPhone = prefs.getString(savedCustomerPhoneKey);
    if (savedPhone != null && savedPhone.isNotEmpty && mounted) {
      phone.text = savedPhone;
    }
  }

  @override
  void dispose() {
    name.dispose(); phone.dispose(); district.dispose(); eventType.dispose(); people.dispose(); address.dispose(); notes.dispose();
    super.dispose();
  }

  Future<void> loadCatalog() async {
    setState(() { loading = true; error = null; });
    try {
      final data = await ApiClient.get('/customer/catalog');
      cities = data['cities'] ?? [];
      services = data['services'] ?? [];
      selectedCity = cities.isNotEmpty ? cities.first['name_ar'] : 'الرياض';
      selectedService = services.isNotEmpty ? services.first['name'] : 'حناء عروس';
    } catch (e) {
      error = e.toString();
      selectedCity = 'الرياض';
      selectedService = 'حناء عروس';
    } finally {
      setState(() { loading = false; });
    }
  }

  String dateText() => bookingDate == null ? 'اختيار التاريخ' : '${bookingDate!.year}-${bookingDate!.month.toString().padLeft(2, '0')}-${bookingDate!.day.toString().padLeft(2, '0')}';
  String timeText() => bookingTime == null ? 'اختيار الوقت' : '${bookingTime!.hour.toString().padLeft(2, '0')}:${bookingTime!.minute.toString().padLeft(2, '0')}';

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    if (bookingDate == null || bookingTime == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('اختر التاريخ والوقت')));
      return;
    }
    setState(() => saving = true);
    try {
      final customerPhone = normalizePhone(phone.text);
      final created = await ApiClient.post('/bookings', {
        'name': name.text.trim(),
        'phone': customerPhone,
        'city': selectedCity,
        'district': district.text.trim(),
        'event_type': eventType.text.trim(),
        'service_type': selectedService,
        'booking_date': dateText(),
        'booking_time': timeText(),
        'people_count': int.tryParse(people.text.trim()) ?? 1,
        'address': address.text.trim(),
        'customer_notes': notes.text.trim(),
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerPhoneKey, customerPhone);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => BookingSubmittedScreen(bookingId: created['id']?.toString(), phone: customerPhone)));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تعذر إرسال الطلب: $e')));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4EA),
      appBar: AppBar(title: const Text('طلب حجز Beauty Home Service')),
      body: loading ? const Center(child: CircularProgressIndicator()) : Form(
        key: formKey,
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            if (error != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Text('تنبيه: لم يتم تحميل القوائم من السيرفر، سيتم استخدام القيم الافتراضية.', style: TextStyle(color: Colors.orange.shade900))),
            TextFormField(controller: name, decoration: inputDecoration('اسم العميلة'), validator: requiredValidator),
            const SizedBox(height: 12),
            TextFormField(controller: phone, decoration: inputDecoration('رقم الجوال'), keyboardType: TextInputType.phone, validator: requiredValidator),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: selectedCity,
              decoration: inputDecoration('المدينة'),
              items: (cities.isEmpty ? [{'name_ar':'الرياض'}, {'name_ar':'جدة'}, {'name_ar':'الدمام'}] : cities).map<DropdownMenuItem<String>>((c) => DropdownMenuItem(value: c['name_ar'], child: Text(c['name_ar'] ?? '-'))).toList(),
              onChanged: (v) => setState(() => selectedCity = v),
            ),
            const SizedBox(height: 12),
            TextFormField(controller: district, decoration: inputDecoration('الحي'), validator: requiredValidator),
            const SizedBox(height: 12),
            TextFormField(controller: eventType, decoration: inputDecoration('نوع المناسبة'), validator: requiredValidator),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: selectedService,
              decoration: inputDecoration('نوع خدمة الحناء'),
              items: (services.isEmpty ? [{'name':'حناء عروس'}, {'name':'حناء متوسطة'}] : services).map<DropdownMenuItem<String>>((s) => DropdownMenuItem(value: s['name'], child: Text(s['name'] ?? '-'))).toList(),
              onChanged: (v) => setState(() => selectedService = v),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () async { final d = await showDatePicker(context: context, initialDate: DateTime.now().add(const Duration(days: 1)), firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365))); if (d != null) setState(() => bookingDate = d); }, child: Text(dateText()))),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton(onPressed: () async { final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 18, minute: 0)); if (t != null) setState(() => bookingTime = t); }, child: Text(timeText()))),
            ]),
            const SizedBox(height: 12),
            TextFormField(controller: people, decoration: inputDecoration('عدد الأشخاص'), keyboardType: TextInputType.number, validator: requiredValidator),
            const SizedBox(height: 12),
            TextFormField(controller: address, decoration: inputDecoration('العنوان'), validator: requiredValidator),
            const SizedBox(height: 12),
            TextFormField(controller: notes, decoration: inputDecoration('ملاحظات'), maxLines: 3),
            const SizedBox(height: 20),
            FilledButton(onPressed: saving ? null : submit, child: Text(saving ? 'جاري الإرسال...' : 'إرسال الطلب')),
          ],
        ),
      ),
    );
  }
}

String? requiredValidator(String? value) => value == null || value.trim().isEmpty ? 'هذا الحقل مطلوب' : null;

class BookingSubmittedScreen extends StatelessWidget {
  final String? bookingId;
  final String phone;
  const BookingSubmittedScreen({super.key, this.bookingId, required this.phone});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4EA),
      appBar: AppBar(title: const Text('تم إرسال الطلب')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.check_circle, size: 84, color: Color(0xFF6B3F19)),
            const SizedBox(height: 18),
            const Text('تم استلام طلبك بنجاح. سيقوم الدعم بالتواصل معك لتأكيد التوفر والسعر.', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (bookingId != null) Text('رقم الطلب: $bookingId', textAlign: TextAlign.center),
            const SizedBox(height: 22),
            FilledButton(onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => MyBookingsScreen(phone: phone))), child: const Text('متابعة طلباتي')),
          ]),
        ),
      ),
    );
  }
}

class MyBookingsScreen extends StatefulWidget {
  final String phone;
  const MyBookingsScreen({super.key, required this.phone});

  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  bool loading = true;
  String? error;
  List bookings = [];
  final phoneController = TextEditingController();

  final statusLabels = const {
    'new': 'طلب جديد',
    'under_review': 'جاري المراجعة',
    'waiting_customer_confirmation': 'بانتظار تأكيد العميلة',
    'confirmed': 'تم تأكيد الحجز',
    'artist_assigned': 'تم تعيين الBeauty Home Service',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'unavailable': 'غير متوفر',
  };

  @override
  void initState() {
    super.initState();
    prepareAndLoad();
  }

  @override
  void dispose() {
    phoneController.dispose();
    super.dispose();
  }

  Future<void> prepareAndLoad() async {
    final prefs = await SharedPreferences.getInstance();
    final savedPhone = prefs.getString(savedCustomerPhoneKey) ?? '';
    final initialPhone = normalizePhone(widget.phone.isNotEmpty ? widget.phone : savedPhone);
    phoneController.text = initialPhone;

    if (initialPhone.isEmpty) {
      if (mounted) {
        setState(() {
          loading = false;
          bookings = [];
          error = null;
        });
      }
      return;
    }

    await load(phone: initialPhone);
  }

  Future<void> load({String? phone}) async {
    final searchPhone = normalizePhone(phone ?? phoneController.text);

    if (searchPhone.isEmpty) {
      setState(() {
        loading = false;
        bookings = [];
        error = 'أدخل رقم الجوال لعرض الطلبات';
      });
      return;
    }

    setState(() { loading = true; error = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerPhoneKey, searchPhone);
      phoneController.text = searchPhone;

      dynamic data;
      try {
        data = await ApiClient.get('/customer/bookings?phone=${Uri.encodeComponent(searchPhone)}');
      } catch (_) {
        data = await ApiClient.get('/bookings/my?phone=${Uri.encodeComponent(searchPhone)}');
      }

      bookings = data is List ? data : [];
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  String dateOnly(dynamic value) {
    if (value == null) return '-';
    final d = DateTime.tryParse(value.toString());
    if (d == null) return value.toString();
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  String timeOnly(dynamic value) {
    if (value == null) return '-';
    final text = value.toString();
    if (text.isEmpty) return '-';
    return text.length >= 5 ? text.substring(0, 5) : text;
  }

  Widget bookingsList() {
    if (loading) return const Center(child: CircularProgressIndicator());

    if (error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Text(error!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
        ),
      );
    }

    if (bookings.isEmpty) {
      return const Center(child: Text('لا توجد طلبات لهذا الرقم'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(14),
      itemCount: bookings.length,
      itemBuilder: (_, i) {
        final b = bookings[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b['service_name'] ?? '-', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text('${b['city_name'] ?? '-'} • ${dateOnly(b['booking_date'])} • ${timeOnly(b['booking_time'])}'),
              const SizedBox(height: 6),
              Text('الحالة: ${statusLabels[b['status']] ?? b['status'] ?? '-'}'),
              if (b['artist_name'] != null) Text('الBeauty Home Service: ${b['artist_name']}'),
            ]),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4EA),
      appBar: AppBar(
        title: const Text('طلباتي'),
        actions: [IconButton(onPressed: () => load(), icon: const Icon(Icons.refresh))],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: inputDecoration('رقم الجوال'),
                    onSubmitted: (_) => load(),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: () => load(),
                  child: const Text('بحث'),
                ),
              ],
            ),
          ),
          Expanded(child: bookingsList()),
        ],
      ),
    );
  }
}

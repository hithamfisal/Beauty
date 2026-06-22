// ignore_for_file: deprecated_member_use, use_build_context_synchronously

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000/api');
const savedCustomerPhoneKey = 'customer_phone';
const savedCustomerTokenKey = 'customer_token';
const savedCustomerNameKey = 'customer_name';

String normalizePhone(String value) {
  var digits = value.replaceAll(RegExp(r'\D'), '');
  if (digits.isEmpty) return '';
  if (digits.startsWith('9665')) {
    digits = '0${digits.substring(3)}';
  } else if (digits.startsWith('05')) {
    digits = digits;
  } else if (digits.startsWith('5')) {
    digits = '05${digits.substring(1)}';
  } else if (digits == '0') {
    digits = '05';
  } else if (digits.startsWith('0') && !digits.startsWith('05')) {
    digits = '05${digits.substring(1)}';
  } else if (!digits.startsWith('0')) {
    digits = '05$digits';
  }
  if (digits.length > 10) digits = digits.substring(0, 10);
  return digits;
}

String phoneMask(String value) {
  final digits = normalizePhone(value);
  final tail = digits.startsWith('05') ? digits.substring(2) : '';
  return '05${tail.padRight(8, 'x').substring(0, 8)}';
}

bool isValidSaudiPhone(String value) => RegExp(r'^05\d{8}$').hasMatch(normalizePhone(value));
String? phoneValidator(String? value) => isValidSaudiPhone(value ?? '') ? null : 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx';
String? requiredField(String? v) => (v == null || v.trim().isEmpty) ? 'مطلوب' : null;
String? optionalRequired(bool required, String? v) => required ? requiredField(v) : null;

class SaudiPhoneTextInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final oldDigits = normalizePhone(oldValue.text);
    var digits = normalizePhone(newValue.text);
    final isDeletion = newValue.text.length < oldValue.text.length;
    if (isDeletion && digits == oldDigits && oldDigits.length > 2) digits = oldDigits.substring(0, oldDigits.length - 1);
    final display = phoneMask(digits);
    return TextEditingValue(text: display, selection: TextSelection.collapsed(offset: display.length));
  }
}

final phoneInputFormatters = <TextInputFormatter>[SaudiPhoneTextInputFormatter()];

void main() => runApp(const BeautyHomeServiceApp());

class BeautyHomeServiceApp extends StatelessWidget {
  const BeautyHomeServiceApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Beauty Home Service',
      theme: ThemeData(
        fontFamily: 'Roboto',
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF8B5A2B)),
        useMaterial3: true,
        filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: const Color(0xFF6B3F19), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16))),
        outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16))),
        cardTheme: CardThemeData(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)), color: Colors.white),
      ),
      home: const Directionality(textDirection: TextDirection.rtl, child: HomeScreen()),
    );
  }
}

class ApiClient {
  static Uri uri(String path) {
    final base = apiBaseUrl.endsWith('/') ? apiBaseUrl.substring(0, apiBaseUrl.length - 1) : apiBaseUrl;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$cleanPath');
  }

  static Map<String, String> headers([String? token]) => {
    'Content-Type': 'application/json; charset=utf-8',
    if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
  };

  static Future<dynamic> get(String path, {String? token}) async => _parse(await http.get(uri(path), headers: token == null ? null : headers(token)));
  static Future<dynamic> post(String path, Map<String, dynamic> body, {String? token}) async => _parse(await http.post(uri(path), headers: headers(token), body: jsonEncode(body)));
  static Future<dynamic> delete(String path, {String? token}) async => _parse(await http.delete(uri(path), headers: token == null ? null : headers(token)));

  static dynamic _parse(http.Response response) {
    final text = utf8.decode(response.bodyBytes).trim();
    dynamic data;
    try {
      data = text.isEmpty ? null : jsonDecode(text);
    } catch (_) {
      final shortText = text.length > 180 ? '${text.substring(0, 180)}...' : text;
      throw Exception('استجابة غير صالحة من السيرفر (${response.statusCode}): $shortText');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = data is Map ? (data['error'] ?? data['details'] ?? 'حدث خطأ') : 'حدث خطأ';
      throw Exception(message);
    }
    return data;
  }
}

InputDecoration inputDecoration(String label) => InputDecoration(labelText: label, filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)));
String dateOnly(dynamic v) => v == null ? '-' : DateTime.tryParse(v.toString())?.toString().substring(0, 10) ?? v.toString();
String timeOnly(dynamic v) { final text = v?.toString() ?? ''; return text.isEmpty ? '-' : (text.length >= 5 ? text.substring(0, 5) : text); }
String nameOf(dynamic item) => (item is Map ? (item['name_ar'] ?? item['display_name'] ?? item['name'] ?? '-') : '-').toString();
List safeList(dynamic data) => data is List ? data : [];
Map safeMap(dynamic data) => data is Map ? data : {};
String queryParam(String value) => Uri.encodeQueryComponent(value);

class CustomerSession {
  final String token;
  final Map customer;
  final List addresses;
  const CustomerSession({required this.token, required this.customer, this.addresses = const []});
  String get name => (customer['name'] ?? '').toString();
  String get phone => normalizePhone((customer['phone'] ?? '').toString());
}

class HomeScreen extends StatefulWidget { const HomeScreen({super.key}); @override State<HomeScreen> createState() => _HomeScreenState(); }

class _HomeScreenState extends State<HomeScreen> {
  final authPhone = TextEditingController();
  final authName = TextEditingController();
  final otp = TextEditingController();
  final trackingPhone = TextEditingController();
  String? token;
  Map? customer;
  List addresses = [];
  bool loading = false;
  String? message;
  String authMode = 'guest';

  @override
  void initState() { super.initState(); loadSavedSession(); }

  Future<void> loadSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    final savedPhone = prefs.getString(savedCustomerPhoneKey) ?? '';
    final savedToken = prefs.getString(savedCustomerTokenKey) ?? '';
    final savedName = prefs.getString(savedCustomerNameKey) ?? '';
    authPhone.text = phoneMask(savedPhone);
    trackingPhone.text = phoneMask(savedPhone);
    authName.text = savedName;
    if (savedToken.isNotEmpty) {
      token = savedToken;
      await loadAccount();
    }
    if (mounted) setState(() {});
  }

  CustomerSession? currentSession() => token != null && customer != null ? CustomerSession(token: token!, customer: customer!, addresses: addresses) : null;

  Future<void> loadAccount() async {
    if (token == null || token!.isEmpty) return;
    setState(() { loading = true; message = null; });
    try {
      final me = safeMap(await ApiClient.get('/customer/me', token: token));
      final addr = safeList(await ApiClient.get('/customer/addresses', token: token));
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerTokenKey, token!);
      await prefs.setString(savedCustomerPhoneKey, normalizePhone((me['phone'] ?? '').toString()));
      await prefs.setString(savedCustomerNameKey, (me['name'] ?? '').toString());
      customer = me;
      addresses = addr;
      authMode = 'account';
      authPhone.text = phoneMask((me['phone'] ?? '').toString());
      trackingPhone.text = phoneMask((me['phone'] ?? '').toString());
      authName.text = (me['name'] ?? '').toString();
    } catch (e) {
      await logout(silent: true);
      message = 'انتهت الجلسة. سجّلي الدخول مرة أخرى.';
    } finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> requestOtp() async {
    final phone = normalizePhone(authPhone.text);
    if (!isValidSaudiPhone(phone)) { setState(() => message = 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx'); return; }
    setState(() { loading = true; message = null; });
    try {
      final res = safeMap(await ApiClient.post('/customer/auth/request-otp', {'phone': phone, 'name': authName.text.trim()}));
      otp.text = (res['dev_otp'] ?? '').toString();
      message = res['dev_otp'] != null ? 'تم إرسال رمز التحقق. رمز الاختبار: ${res['dev_otp']}' : 'تم إرسال رمز التحقق.';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerPhoneKey, phone);
      if (authName.text.trim().isNotEmpty) await prefs.setString(savedCustomerNameKey, authName.text.trim());
    } catch (e) { message = 'تعذر إرسال رمز التحقق: $e'; }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> verifyOtp() async {
    final phone = normalizePhone(authPhone.text);
    if (!isValidSaudiPhone(phone)) { setState(() => message = 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx'); return; }
    if (otp.text.trim().isEmpty) { setState(() => message = 'أدخلي رمز التحقق'); return; }
    setState(() { loading = true; message = null; });
    try {
      final res = safeMap(await ApiClient.post('/customer/auth/verify-otp', {'phone': phone, 'otp': otp.text.trim()}));
      token = (res['token'] ?? '').toString();
      customer = safeMap(res['customer']);
      await loadAccount();
      message = 'تم تسجيل الدخول بنجاح.';
    } catch (e) { message = 'تعذر تسجيل الدخول: $e'; }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> logout({bool silent = false}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(savedCustomerTokenKey);
    token = null;
    customer = null;
    addresses = [];
    authMode = 'guest';
    if (!silent && mounted) setState(() => message = 'تم تسجيل الخروج.');
  }

  @override
  void dispose() { authPhone.dispose(); authName.dispose(); otp.dispose(); trackingPhone.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFFBF4EA),
    appBar: AppBar(title: const Text('Beauty Home Service'), centerTitle: true),
    body: ListView(padding: const EdgeInsets.all(18), children: [
      _hero(),
      const SizedBox(height: 16),
      _accountCard(),
      if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!, style: TextStyle(color: message!.startsWith('تم') ? Colors.green.shade800 : Colors.orange.shade900))),
      const SizedBox(height: 16),
      _actionGrid(),
      const SizedBox(height: 18),
      const Text('يمكن استخدام التطبيق أو رابط الويب. كل الطلبات تظهر في نفس لوحة الإدارة.', textAlign: TextAlign.center, style: TextStyle(color: Colors.brown)),
    ]),
  );

  Widget _hero() => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), gradient: const LinearGradient(colors: [Color(0xFF6B3F19), Color(0xFFB88943)])),
    child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('خدمات تجميل منزلية بسهولة', style: TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.bold)),
      SizedBox(height: 8),
      Text('اختاري الخدمة، شاهدي نماذج أعمال الخبيرات، ثم ارسلي طلبك.', style: TextStyle(color: Colors.white, fontSize: 15)),
    ]),
  );

  Widget _accountCard() {
    final signedIn = token != null && customer != null;
    return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const Text('طريقة الاستخدام', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 10),
      SegmentedButton<String>(
        segments: const [ButtonSegment(value: 'account', label: Text('تسجيل / دخول')), ButtonSegment(value: 'guest', label: Text('متابعة كضيف'))],
        selected: {authMode},
        onSelectionChanged: (s) => setState(() => authMode = s.first),
      ),
      const SizedBox(height: 12),
      if (authMode == 'account' && !signedIn) ...[
        TextField(controller: authName, decoration: inputDecoration('الاسم - لأول تسجيل فقط')),
        const SizedBox(height: 10),
        TextField(controller: authPhone, keyboardType: TextInputType.phone, inputFormatters: phoneInputFormatters, decoration: inputDecoration('رقم الجوال 05xxxxxxxx')),
        const SizedBox(height: 10),
        Row(children: [Expanded(child: FilledButton(onPressed: loading ? null : requestOtp, child: const Text('إرسال الرمز'))), const SizedBox(width: 10), Expanded(child: TextField(controller: otp, keyboardType: TextInputType.number, decoration: inputDecoration('رمز OTP')))]),
        const SizedBox(height: 10),
        FilledButton(onPressed: loading ? null : verifyOtp, child: const Text('دخول الحساب')),
      ],
      if (signedIn) ...[
        ListTile(contentPadding: EdgeInsets.zero, leading: const CircleAvatar(child: Icon(Icons.person)), title: Text((customer?['name'] ?? 'عميلة').toString()), subtitle: Text(phoneMask((customer?['phone'] ?? '').toString())), trailing: TextButton(onPressed: logout, child: const Text('خروج'))),
        if (addresses.isNotEmpty) Text('العنوان الافتراضي: ${(addresses.firstWhere((a) => a['is_default'] == true, orElse: () => addresses.first)['address'] ?? '-')}'),
      ],
      if (authMode == 'guest') const Text('كضيف: ستدخل العميلة الاسم ورقم الجوال والعنوان داخل طلب الحجز.', style: TextStyle(color: Colors.brown)),
    ])));
  }

  Widget _actionGrid() => LayoutBuilder(builder: (context, constraints) {
    final wide = constraints.maxWidth > 640;
    final buttons = [
      FilledButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => BookingScreen(session: currentSession(), guestMode: authMode == 'guest'))), icon: const Icon(Icons.add), label: const Text('احجزي الآن')),
      OutlinedButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => MyBookingsScreen(phone: normalizePhone(trackingPhone.text), token: token))), icon: const Icon(Icons.list_alt), label: const Text('طلباتي')),
      OutlinedButton.icon(onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BeauticiansScreen())), icon: const Icon(Icons.brush), label: const Text('خبيرات ونماذج')),
      OutlinedButton.icon(onPressed: token == null ? null : () => Navigator.push(context, MaterialPageRoute(builder: (_) => AccountScreen(token: token!))), icon: const Icon(Icons.account_circle), label: const Text('حسابي')),
    ];
    return GridView.count(crossAxisCount: wide ? 2 : 1, childAspectRatio: wide ? 4.8 : 5.2, mainAxisSpacing: 10, crossAxisSpacing: 10, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), children: buttons);
  });
}

class BookingScreen extends StatefulWidget {
  final CustomerSession? session;
  final bool guestMode;
  const BookingScreen({super.key, this.session, this.guestMode = true});
  @override State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final phone = TextEditingController();
  final eventType = TextEditingController(text: 'زواج');
  final people = TextEditingController(text: '1');
  final address = TextEditingController();
  final notes = TextEditingController();
  final designImageUrl = TextEditingController();
  final alternateTime = TextEditingController();
  DateTime? bookingDate;
  TimeOfDay? bookingTime;
  bool loading = true;
  bool saving = false;
  String? error;
  List regions = [];
  List cities = [];
  List districts = [];
  List categories = [];
  List services = [];
  List beauticians = [];
  List portfolio = [];
  String? selectedRegionId;
  String? selectedCityId;
  String? selectedDistrictId;
  String? selectedCategoryId;
  String? selectedServiceId;
  String? preferredBeauticianId;
  String contactPreference = 'whatsapp';

  bool get isAccountBooking => widget.session != null && !widget.guestMode;

  @override
  void initState() { super.initState(); prefillAccount(); loadSavedPhone(); loadInitialLists(); }

  void prefillAccount() {
    final session = widget.session;
    if (session == null) return;
    name.text = session.name;
    phone.text = phoneMask(session.phone);
    final defaultAddress = session.addresses.cast<dynamic>().firstWhere((a) => a is Map && a['is_default'] == true, orElse: () => session.addresses.isNotEmpty ? session.addresses.first : null);
    if (defaultAddress is Map) {
      selectedRegionId = defaultAddress['region_id']?.toString();
      selectedCityId = defaultAddress['city_id']?.toString();
      selectedDistrictId = defaultAddress['district_id']?.toString();
      address.text = (defaultAddress['address'] ?? '').toString();
    } else {
      selectedRegionId = session.customer['region_id']?.toString();
      selectedCityId = session.customer['city_id']?.toString();
      selectedDistrictId = session.customer['district_id']?.toString();
    }
  }

  Future<void> loadSavedPhone() async {
    if (phone.text.isNotEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(savedCustomerPhoneKey);
    if (saved != null && mounted) phone.text = phoneMask(saved);
  }

  @override
  void dispose() { name.dispose(); phone.dispose(); eventType.dispose(); people.dispose(); address.dispose(); notes.dispose(); designImageUrl.dispose(); alternateTime.dispose(); super.dispose(); }

  Future<void> loadInitialLists() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiClient.get('/regions'),
        ApiClient.get('/service-categories'),
        ApiClient.get((selectedRegionId == null || selectedRegionId!.isEmpty) ? '/cities' : '/cities?region_id=${queryParam(selectedRegionId!)}'),
        ApiClient.get((selectedCityId != null && selectedCityId!.isNotEmpty) ? '/districts?city_id=${queryParam(selectedCityId!)}' : ((selectedRegionId == null || selectedRegionId!.isEmpty) ? '/districts' : '/districts?region_id=${queryParam(selectedRegionId!)}')),
        ApiClient.get('/services'),
        ApiClient.get('/portfolio'),
      ]);
      regions = safeList(results[0]);
      categories = safeList(results[1]);
      cities = safeList(results[2]);
      districts = safeList(results[3]);
      services = safeList(results[4]);
      portfolio = safeList(results[5]);
      await loadBeauticians(refreshState: false);
    } catch (e) { error = e.toString(); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> loadCities(String? regionId) async {
    selectedRegionId = (regionId == null || regionId.isEmpty) ? null : regionId;
    selectedCityId = null;
    selectedDistrictId = null;
    preferredBeauticianId = null;
    setState(() => loading = true);
    try {
      cities = safeList(await ApiClient.get(selectedRegionId == null ? '/cities' : '/cities?region_id=${queryParam(selectedRegionId!)}'));
      districts = safeList(await ApiClient.get(selectedRegionId == null ? '/districts' : '/districts?region_id=${queryParam(selectedRegionId!)}'));
      await loadBeauticians(refreshState: false);
    } catch (e) { error = e.toString(); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> loadDistricts(String? cityId) async {
    selectedCityId = (cityId == null || cityId.isEmpty) ? null : cityId;
    selectedDistrictId = null;
    preferredBeauticianId = null;
    setState(() => loading = true);
    try {
      final path = selectedCityId != null
          ? '/districts?city_id=${queryParam(selectedCityId!)}'
          : (selectedRegionId != null ? '/districts?region_id=${queryParam(selectedRegionId!)}' : '/districts');
      districts = safeList(await ApiClient.get(path));
      await loadBeauticians(refreshState: false);
    } catch (e) { error = e.toString(); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> loadServices(String? categoryId) async {
    selectedCategoryId = (categoryId == null || categoryId.isEmpty) ? null : categoryId;
    selectedServiceId = null;
    preferredBeauticianId = null;
    setState(() => loading = true);
    try {
      services = safeList(await ApiClient.get(selectedCategoryId == null ? '/services' : '/services?category_id=${queryParam(selectedCategoryId!)}'));
      await loadBeauticians(refreshState: false);
    } catch (e) { error = e.toString(); }
    finally { if (mounted) setState(() => loading = false); }
  }

  Future<void> selectService(String? serviceId) async {
    selectedServiceId = (serviceId == null || serviceId.isEmpty) ? null : serviceId;
    preferredBeauticianId = null;
    await loadBeauticians();
  }

  Future<void> loadBeauticians({bool refreshState = true}) async {
    final qs = <String>[];
    if (selectedServiceId != null && selectedServiceId!.isNotEmpty) qs.add('service_id=${queryParam(selectedServiceId!)}');
    if (selectedCategoryId != null && selectedCategoryId!.isNotEmpty && selectedServiceId == null) qs.add('category_id=${queryParam(selectedCategoryId!)}');
    if (selectedRegionId != null && selectedRegionId!.isNotEmpty) qs.add('region_id=${queryParam(selectedRegionId!)}');
    if (selectedCityId != null && selectedCityId!.isNotEmpty) qs.add('city_id=${queryParam(selectedCityId!)}');
    if (selectedDistrictId != null && selectedDistrictId!.isNotEmpty) qs.add('district_id=${queryParam(selectedDistrictId!)}');
    beauticians = safeList(await ApiClient.get(qs.isEmpty ? '/beauticians' : '/beauticians?${qs.join('&')}'));
    if (beauticians.isEmpty && qs.isNotEmpty) beauticians = safeList(await ApiClient.get('/beauticians'));
    if (selectedServiceId != null && selectedServiceId!.isNotEmpty) {
      portfolio = safeList(await ApiClient.get('/portfolio?service_id=${queryParam(selectedServiceId!)}'));
      if (portfolio.isEmpty && selectedCategoryId != null && selectedCategoryId!.isNotEmpty) portfolio = safeList(await ApiClient.get('/portfolio?category_id=${queryParam(selectedCategoryId!)}'));
      if (portfolio.isEmpty) portfolio = safeList(await ApiClient.get('/portfolio'));
    } else if (selectedCategoryId != null && selectedCategoryId!.isNotEmpty) {
      portfolio = safeList(await ApiClient.get('/portfolio?category_id=${queryParam(selectedCategoryId!)}'));
      if (portfolio.isEmpty) portfolio = safeList(await ApiClient.get('/portfolio'));
    } else {
      portfolio = safeList(await ApiClient.get('/portfolio'));
    }
    if (refreshState && mounted) setState(() {});
  }

  String dateText() => bookingDate == null ? 'اختيار التاريخ' : '${bookingDate!.year}-${bookingDate!.month.toString().padLeft(2, '0')}-${bookingDate!.day.toString().padLeft(2, '0')}';
  String timeText() => bookingTime == null ? 'اختيار الوقت' : '${bookingTime!.hour.toString().padLeft(2, '0')}:${bookingTime!.minute.toString().padLeft(2, '0')}';

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    if (bookingDate == null || bookingTime == null) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('اختر التاريخ والوقت'))); return; }
    if ([selectedRegionId, selectedCityId, selectedDistrictId, selectedServiceId].any((e) => e == null || e.toString().isEmpty)) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('أكمل اختيار الموقع والخدمة'))); return; }
    final customerPhone = normalizePhone(phone.text);
    if (!isValidSaudiPhone(customerPhone)) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx'))); return; }
    setState(() => saving = true);
    try {
      final created = await ApiClient.post('/bookings', {
        'name': name.text.trim(),
        'phone': customerPhone,
        'region_id': selectedRegionId,
        'city_id': selectedCityId,
        'district_id': selectedDistrictId,
        'service_category_id': selectedCategoryId,
        'event_type': eventType.text.trim(),
        'service_id': selectedServiceId,
        'preferred_artist_id': preferredBeauticianId,
        'booking_date': dateText(),
        'booking_time': timeText(),
        'people_count': int.tryParse(people.text.trim()) ?? 1,
        'address': address.text.trim(),
        'design_image_url': designImageUrl.text.trim().isEmpty ? null : designImageUrl.text.trim(),
        'customer_notes': notes.text.trim(),
        'contact_preference': contactPreference,
        'alternate_time': alternateTime.text.trim(),
        'booking_source': 'mobile',
        'booking_customer_mode': isAccountBooking ? 'account' : 'guest',
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerPhoneKey, customerPhone);
      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => BookingSubmittedScreen(bookingId: (created['booking_number'] ?? created['id'])?.toString(), phone: customerPhone, token: widget.session?.token)));
    } catch (e) { ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('تعذر إرسال الطلب: $e'))); }
    finally { if (mounted) setState(() => saving = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFFBF4EA),
    appBar: AppBar(title: const Text('طلب حجز Beauty Home Service')),
    body: loading ? const Center(child: CircularProgressIndicator()) : Form(key: formKey, child: ListView(padding: const EdgeInsets.all(18), children: [
      if (error != null) Text('تنبيه: $error', style: TextStyle(color: Colors.orange.shade900)),
      if (isAccountBooking) Card(child: Padding(padding: const EdgeInsets.all(12), child: Text('تم تعبئة بيانات الحساب تلقائياً: ${widget.session?.name ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)))),
      TextFormField(controller: name, enabled: !isAccountBooking, decoration: inputDecoration('اسم العميلة'), validator: requiredField),
      const SizedBox(height: 12),
      TextFormField(controller: phone, enabled: !isAccountBooking, keyboardType: TextInputType.phone, inputFormatters: phoneInputFormatters, decoration: inputDecoration('رقم الجوال 05xxxxxxxx'), validator: phoneValidator),
      const SizedBox(height: 12),
      dropdown('المنطقة', selectedRegionId, regions, loadCities),
      const SizedBox(height: 12),
      dropdown('المدينة', selectedCityId, cities, loadDistricts, emptyLabel: selectedRegionId == null ? 'كل المدن' : 'اختر المدينة'),
      const SizedBox(height: 12),
      dropdown('الحي', selectedDistrictId, districts, (v) => setState(() => selectedDistrictId = (v == null || v.isEmpty) ? null : v), emptyLabel: selectedCityId == null ? 'كل الأحياء' : 'اختر الحي'),
      const SizedBox(height: 12),
      TextFormField(controller: eventType, decoration: inputDecoration('نوع المناسبة'), validator: requiredField),
      const SizedBox(height: 12),
      dropdown('قسم الخدمة', selectedCategoryId, categories, loadServices, required: false, emptyLabel: 'كل الأقسام'),
      const SizedBox(height: 12),
      dropdown('الخدمة', selectedServiceId, services, selectService, emptyLabel: selectedCategoryId == null ? 'كل الخدمات / اختاري الخدمة' : 'خدمات القسم المختار'),
      const SizedBox(height: 12),
      if (portfolio.isNotEmpty) PortfolioStrip(items: portfolio, onTapBeautician: (id) { setState(() => preferredBeauticianId = id); }),
      if (beauticians.isNotEmpty) DropdownButtonFormField<String>(
        value: preferredBeauticianId ?? '',
        decoration: inputDecoration('خبيرة مفضلة - اختياري'),
        items: [const DropdownMenuItem<String>(value: '', child: Text('اتركي الاختيار للدعم')), ...beauticians.map<DropdownMenuItem<String>>((a) => DropdownMenuItem(value: a['id']?.toString(), child: Text('${a['name']} • ${a['review_rating'] ?? a['rating'] ?? '-'}★')))],
        onChanged: (v) => setState(() => preferredBeauticianId = (v == null || v.isEmpty) ? null : v),
      ),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: OutlinedButton(onPressed: () async { final d = await showDatePicker(context: context, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 365)), initialDate: DateTime.now()); if (d != null) setState(() => bookingDate = d); }, child: Text(dateText()))),
        const SizedBox(width: 10),
        Expanded(child: OutlinedButton(onPressed: () async { final t = await showTimePicker(context: context, initialTime: const TimeOfDay(hour: 18, minute: 0)); if (t != null) setState(() => bookingTime = t); }, child: Text(timeText()))),
      ]),
      const SizedBox(height: 12),
      TextFormField(controller: people, keyboardType: TextInputType.number, decoration: inputDecoration('عدد الأشخاص')),
      const SizedBox(height: 12),
      TextFormField(controller: address, decoration: inputDecoration('العنوان'), validator: requiredField),
      const SizedBox(height: 12),
      TextFormField(controller: designImageUrl, decoration: inputDecoration('رابط صورة التصميم - اختياري')),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(value: contactPreference, decoration: inputDecoration('طريقة التواصل المفضلة'), items: const [DropdownMenuItem(value: 'whatsapp', child: Text('واتساب')), DropdownMenuItem(value: 'call', child: Text('اتصال')), DropdownMenuItem(value: 'sms', child: Text('رسالة SMS'))], onChanged: (v) => setState(() => contactPreference = v ?? 'whatsapp')),
      const SizedBox(height: 12),
      TextFormField(controller: alternateTime, decoration: inputDecoration('وقت بديل - اختياري')),
      const SizedBox(height: 12),
      TextFormField(controller: notes, minLines: 2, maxLines: 4, decoration: inputDecoration('ملاحظات')),
      const SizedBox(height: 20),
      FilledButton(onPressed: saving ? null : submit, child: Text(saving ? 'جاري الإرسال...' : 'إرسال الطلب')),
    ])),
  );

  Widget dropdown(String label, String? value, List items, Function(String?) onChanged, {bool required = true, String? emptyLabel}) {
    final normalizedValue = (value != null && items.any((i) => i is Map && i['id']?.toString() == value)) ? value : null;
    return DropdownButtonFormField<String>(
      value: normalizedValue,
      isExpanded: true,
      decoration: inputDecoration(label),
      items: [DropdownMenuItem<String>(value: '', child: Text(emptyLabel ?? 'اختر')), ...items.map<DropdownMenuItem<String>>((i) => DropdownMenuItem(value: i['id']?.toString(), child: Text(nameOf(i), overflow: TextOverflow.ellipsis)))],
      onChanged: onChanged,
      validator: (v) => required && (v == null || v.isEmpty) ? 'مطلوب' : null,
    );
  }
}

class PortfolioStrip extends StatelessWidget {
  final List items;
  final void Function(String?)? onTapBeautician;
  const PortfolioStrip({super.key, required this.items, this.onTapBeautician});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('نماذج أعمال مشابهة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
    const SizedBox(height: 8),
    SizedBox(height: 215, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: items.length, separatorBuilder: (_, __) => const SizedBox(width: 10), itemBuilder: (context, i) {
      final p = items[i];
      return InkWell(onTap: () => onTapBeautician?.call(p['beautician_id']?.toString()), child: Container(width: 180, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFE8D6C3))), padding: const EdgeInsets.all(8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.network(p['image_url'] ?? '', height: 115, width: 164, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(height: 115, color: const Color(0xFFF2E6D9), child: const Icon(Icons.image)))),
        const SizedBox(height: 8),
        Text(p['title_ar'] ?? '-', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold)),
        Text(p['beautician_name'] ?? '-', maxLines: 1, overflow: TextOverflow.ellipsis),
        Text(p['service_name'] ?? '', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Colors.brown)),
      ])));
    })),
    const SizedBox(height: 12),
  ]);
}

class BeauticiansScreen extends StatefulWidget { const BeauticiansScreen({super.key}); @override State<BeauticiansScreen> createState() => _BeauticiansScreenState(); }
class _BeauticiansScreenState extends State<BeauticiansScreen> {
  bool loading = true;
  String? error;
  List beauticians = [];
  @override void initState() { super.initState(); load(); }
  Future<void> load() async { try { beauticians = safeList(await ApiClient.get('/beauticians')); } catch (e) { error = e.toString(); } finally { if (mounted) setState(() => loading = false); } }
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: const Color(0xFFFBF4EA), appBar: AppBar(title: const Text('خبيرات التجميل')), body: loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.all(16), children: [
    if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
    ...beauticians.map((a) => Card(child: ListTile(leading: CircleAvatar(backgroundImage: (a['featured_image_url'] ?? a['first_image_url']) != null ? NetworkImage(a['featured_image_url'] ?? a['first_image_url']) : null, child: (a['featured_image_url'] ?? a['first_image_url']) == null ? const Icon(Icons.person) : null), title: Text(a['name'] ?? '-'), subtitle: Text('${a['main_expertise_name'] ?? '-'} • ${a['city_name'] ?? '-'} • ${a['review_rating'] ?? a['rating'] ?? '-'}★'), trailing: const Icon(Icons.chevron_left), onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => BeauticianDetailsScreen(id: a['id'].toString()))))))
  ]));
}

class BeauticianDetailsScreen extends StatefulWidget { final String id; const BeauticianDetailsScreen({super.key, required this.id}); @override State<BeauticianDetailsScreen> createState() => _BeauticianDetailsScreenState(); }
class _BeauticianDetailsScreenState extends State<BeauticianDetailsScreen> {
  bool loading = true;
  dynamic data;
  String? error;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async { try { data = await ApiClient.get('/beauticians/${widget.id}'); } catch (e) { error = e.toString(); } finally { if (mounted) setState(() => loading = false); } }
  @override Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final b = data?['beautician'] ?? {};
    final p = safeList(data?['portfolio']);
    final r = safeList(data?['reviews']);
    return Scaffold(backgroundColor: const Color(0xFFFBF4EA), appBar: AppBar(title: Text(b['name'] ?? 'خبيرة التجميل')), body: ListView(padding: const EdgeInsets.all(16), children: [
      if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
      Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(b['name'] ?? '-', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
        Text('${b['main_expertise_name'] ?? '-'} • ${b['city_name'] ?? '-'}'),
        Text('التقييم: ${b['review_rating'] ?? b['rating'] ?? '-'} ★ (${b['review_count'] ?? 0})'),
        if ((b['bio'] ?? '').toString().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(b['bio'])),
      ]))),
      PortfolioStrip(items: p),
      const SizedBox(height: 12),
      const Text('التقييمات', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      ...r.map((x) => Card(child: ListTile(title: Text('${x['rating']} ★'), subtitle: Text(x['review_text'] ?? '')))),
    ]));
  }
}

class BookingSubmittedScreen extends StatelessWidget {
  final String? bookingId;
  final String phone;
  final String? token;
  const BookingSubmittedScreen({super.key, this.bookingId, required this.phone, this.token});
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: const Color(0xFFFBF4EA), appBar: AppBar(title: const Text('تم إرسال الطلب')), body: Padding(padding: const EdgeInsets.all(20), child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    const Icon(Icons.check_circle, size: 90, color: Color(0xFF6B3F19)),
    const SizedBox(height: 20),
    const Text('تم إرسال طلبك بنجاح', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
    const SizedBox(height: 12),
    Text('رقم الطلب: ${bookingId ?? '-'}', textAlign: TextAlign.center),
    const SizedBox(height: 30),
    FilledButton(onPressed: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => MyBookingsScreen(phone: phone, token: token))), child: const Text('متابعة طلباتي')),
    const SizedBox(height: 10),
    OutlinedButton(onPressed: () => Navigator.popUntil(context, (r) => r.isFirst), child: const Text('الرئيسية')),
  ])));
}

class MyBookingsScreen extends StatefulWidget {
  final String phone;
  final String? token;
  const MyBookingsScreen({super.key, required this.phone, this.token});
  @override State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  final phoneController = TextEditingController();
  bool loading = false;
  String? error;
  List bookings = [];
  bool get hasToken => widget.token != null && widget.token!.isNotEmpty;
  @override void initState() { super.initState(); phoneController.text = phoneMask(widget.phone); loadInitial(); }
  Future<void> loadInitial() async { if (phoneController.text.trim().isEmpty) { final prefs = await SharedPreferences.getInstance(); phoneController.text = phoneMask(prefs.getString(savedCustomerPhoneKey) ?? ''); } load(); }
  Future<void> load() async {
    final phone = normalizePhone(phoneController.text);
    if (!hasToken && !isValidSaudiPhone(phone)) { setState(() => error = 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx'); return; }
    setState(() { loading = true; error = null; });
    try {
      final data = hasToken ? await ApiClient.get('/customer/my-bookings', token: widget.token) : await ApiClient.get('/customer/bookings?phone=${queryParam(phone)}');
      final prefs = await SharedPreferences.getInstance();
      if (isValidSaudiPhone(phone)) await prefs.setString(savedCustomerPhoneKey, phone);
      bookings = safeList(data);
    } catch (e) { error = e.toString(); }
    finally { if (mounted) setState(() => loading = false); }
  }
  @override void dispose() { phoneController.dispose(); super.dispose(); }
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: const Color(0xFFFBF4EA), appBar: AppBar(title: const Text('طلباتي')), body: ListView(padding: const EdgeInsets.all(18), children: [
    if (!hasToken) TextField(controller: phoneController, keyboardType: TextInputType.phone, inputFormatters: phoneInputFormatters, decoration: inputDecoration('رقم الجوال 05xxxxxxxx')),
    if (!hasToken) const SizedBox(height: 10),
    FilledButton(onPressed: load, child: const Text('تحديث الطلبات')),
    if (error != null) Padding(padding: const EdgeInsets.all(10), child: Text(error!, style: const TextStyle(color: Colors.red))),
    if (loading) const Center(child: CircularProgressIndicator()),
    if (!loading && bookings.isEmpty) const Padding(padding: EdgeInsets.all(25), child: Text('لا توجد طلبات', textAlign: TextAlign.center)),
    ...bookings.map((b) => BookingCard(booking: b, onReload: load)),
  ]));
}

class BookingCard extends StatelessWidget {
  final dynamic booking;
  final VoidCallback onReload;
  const BookingCard({super.key, required this.booking, required this.onReload});
  @override Widget build(BuildContext context) {
    final status = booking['status'];
    return Card(margin: const EdgeInsets.only(bottom: 12), child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('${booking['booking_number'] ?? booking['id'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      const SizedBox(height: 4),
      Text('${booking['service_category_name'] ?? '-'} / ${booking['service_name'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.bold)),
      const SizedBox(height: 6),
      Text('${booking['region_name'] ?? '-'} • ${booking['city_name'] ?? '-'} • ${booking['district_name'] ?? '-'}'),
      if (booking['preferred_artist_name'] != null) Text('الخبيرة المفضلة: ${booking['preferred_artist_name']}'),
      if (booking['artist_name'] != null) Text('الخبيرة المعينة: ${booking['artist_name']}'),
      if ((booking['design_image_url'] ?? '').toString().isNotEmpty) const Text('تم إرفاق صورة تصميم'),
      Text('${dateOnly(booking['booking_date'])} • ${timeOnly(booking['booking_time'])}'),
      const SizedBox(height: 8),
      Text('الحالة: ${statusArabic(status)}'),
      const SizedBox(height: 8),
      TimelineStatus(current: status?.toString() ?? 'new'),
      if (status == 'completed' && booking['customer_review_rating'] == null) Align(alignment: Alignment.centerLeft, child: OutlinedButton(onPressed: () => showDialog(context: context, builder: (_) => ReviewDialog(bookingId: booking['id'], onSaved: onReload)), child: const Text('تقييم الخبيرة'))),
    ])));
  }
}

class ReviewDialog extends StatefulWidget { final String bookingId; final VoidCallback onSaved; const ReviewDialog({super.key, required this.bookingId, required this.onSaved}); @override State<ReviewDialog> createState() => _ReviewDialogState(); }
class _ReviewDialogState extends State<ReviewDialog> {
  int rating = 5;
  final note = TextEditingController();
  bool saving = false;
  @override Widget build(BuildContext context) => AlertDialog(title: const Text('تقييم الخبيرة'), content: Column(mainAxisSize: MainAxisSize.min, children: [
    DropdownButtonFormField<int>(value: rating, decoration: inputDecoration('التقييم'), items: [1, 2, 3, 4, 5].map((x) => DropdownMenuItem(value: x, child: Text('$x نجوم'))).toList(), onChanged: (v) => setState(() => rating = v ?? 5)),
    const SizedBox(height: 10),
    TextField(controller: note, decoration: inputDecoration('تعليق اختياري'), maxLines: 3),
  ]), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')), FilledButton(onPressed: saving ? null : () async { setState(() => saving = true); try { await ApiClient.post('/customer/reviews', {'booking_id': widget.bookingId, 'rating': rating, 'review_text': note.text.trim()}); if (context.mounted) { Navigator.pop(context); widget.onSaved(); } } finally { if (mounted) setState(() => saving = false); } }, child: const Text('حفظ'))]);
}

class TimelineStatus extends StatelessWidget {
  final String current;
  const TimelineStatus({super.key, required this.current});
  @override Widget build(BuildContext context) {
    final steps = ['new', 'under_review', 'confirmed', 'beautician_assigned', 'completed'];
    final labels = ['جديد', 'مراجعة', 'مؤكد', 'خبيرة', 'مكتمل'];
    final index = steps.indexOf(current);
    return Wrap(spacing: 6, runSpacing: 6, children: List.generate(steps.length, (i) { final active = index >= i || (current == 'in_progress' && i <= 3); return Chip(label: Text(labels[i]), backgroundColor: active ? const Color(0xFFD8B37A) : const Color(0xFFF4EEE7)); }));
  }
}

String statusArabic(dynamic status) {
  const labels = {'new': 'طلب جديد', 'under_review': 'جاري المراجعة', 'waiting_customer_confirmation': 'بانتظار تأكيد العميلة', 'confirmed': 'تم تأكيد الحجز', 'beautician_assigned': 'تم تعيين خبيرة التجميل', 'artist_assigned': 'تم تعيين خبيرة التجميل', 'in_progress': 'قيد التنفيذ', 'completed': 'مكتمل', 'cancelled': 'ملغي', 'unavailable': 'غير متوفر'};
  return labels[status?.toString()] ?? status?.toString() ?? '-';
}

class AccountScreen extends StatefulWidget { final String token; const AccountScreen({super.key, required this.token}); @override State<AccountScreen> createState() => _AccountScreenState(); }
class _AccountScreenState extends State<AccountScreen> {
  Map customer = {};
  List addresses = [];
  List favorites = [];
  bool loading = true;
  String? error;
  @override void initState() { super.initState(); load(); }
  Future<void> load() async { try { customer = safeMap(await ApiClient.get('/customer/me', token: widget.token)); addresses = safeList(await ApiClient.get('/customer/addresses', token: widget.token)); favorites = safeList(await ApiClient.get('/customer/favorites', token: widget.token)); } catch (e) { error = e.toString(); } finally { if (mounted) setState(() => loading = false); } }
  @override Widget build(BuildContext context) => Scaffold(backgroundColor: const Color(0xFFFBF4EA), appBar: AppBar(title: const Text('حسابي')), body: loading ? const Center(child: CircularProgressIndicator()) : ListView(padding: const EdgeInsets.all(16), children: [
    if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
    Card(child: ListTile(leading: const CircleAvatar(child: Icon(Icons.person)), title: Text((customer['name'] ?? 'عميلة').toString()), subtitle: Text(phoneMask((customer['phone'] ?? '').toString())))),
    const SizedBox(height: 12),
    const Text('العناوين', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
    if (addresses.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('لا توجد عناوين محفوظة بعد.'))),
    ...addresses.map((a) => Card(child: ListTile(title: Text(a['label'] ?? 'عنوان'), subtitle: Text('${a['region_name'] ?? '-'} • ${a['city_name'] ?? '-'} • ${a['district_name'] ?? '-'}\n${a['address'] ?? ''}')))),
    const SizedBox(height: 12),
    const Text('المفضلة', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
    if (favorites.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('لا توجد خبيرات مفضلة.'))),
    ...favorites.map((f) => Card(child: ListTile(title: Text(f['beautician_name'] ?? '-'), subtitle: Text(f['main_expertise_name'] ?? '-')))),
  ]));
}

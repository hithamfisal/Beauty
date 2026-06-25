// ignore_for_file: deprecated_member_use, use_build_context_synchronously, curly_braces_in_flow_control_structures

import 'dart:async';
import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api');
const tenantSlug =
    String.fromEnvironment('TENANT_SLUG', defaultValue: 'beauty-home-service');
const savedCustomerPhoneKey = 'customer_phone';
const savedCustomerTokenKey = 'customer_token';
const savedCustomerNameKey = 'customer_name';
const savedAdminTokenKey = 'admin_token';
const savedAdminEmailKey = 'admin_email';

class BhsColors {
  static const roseGold = Color(0xFFD4A08A);
  static const roseGoldDeep = Color(0xFFB77D69);
  static const ivory = Color(0xFFFFF8F4);
  static const porcelain = Color(0xFFFFFCFA);
  static const softPink = Color(0xFFF7DDE1);
  static const creamGold = Color(0xFFF4E6D2);
  static const charcoal = Color(0xFF292929);
  static const plum = Color(0xFF563D45);
  static const mocha = Color(0xFFA78678);
  static const mochaDark = Color(0xFF7E5F54);
  static const success = Color(0xFF8BCB97);
  static const info = Color(0xFF6F8FB8);
  static const danger = Color(0xFFE07A5F);
}

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

bool isValidSaudiPhone(String value) =>
    RegExp(r'^05\d{8}$').hasMatch(normalizePhone(value));
String? phoneValidator(String? value) => isValidSaudiPhone(value ?? '')
    ? null
    : 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx';
String? requiredField(String? v) =>
    (v == null || v.trim().isEmpty) ? 'مطلوب' : null;

class SaudiPhoneTextInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    final oldDigits = normalizePhone(oldValue.text);
    var digits = normalizePhone(newValue.text);
    final isDeletion = newValue.text.length < oldValue.text.length;
    if (isDeletion && digits == oldDigits && oldDigits.length > 2)
      digits = oldDigits.substring(0, oldDigits.length - 1);
    final display = phoneMask(digits);
    return TextEditingValue(
        text: display,
        selection: TextSelection.collapsed(offset: display.length));
  }
}

final phoneInputFormatters = <TextInputFormatter>[
  SaudiPhoneTextInputFormatter()
];

void main() => runApp(const BeautyHomeServiceApp());

class BeautyHomeServiceApp extends StatelessWidget {
  const BeautyHomeServiceApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: BhsColors.roseGoldDeep,
      brightness: Brightness.light,
      primary: BhsColors.roseGoldDeep,
      secondary: BhsColors.creamGold,
      background: BhsColors.ivory,
      surface: Colors.white,
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'بيوتي هوم سيرفس',
      theme: ThemeData(
        fontFamily: 'Tajawal',
        colorScheme: scheme,
        scaffoldBackgroundColor: BhsColors.porcelain,
        useMaterial3: true,
        brightness: Brightness.light,
        fontFamilyFallback: const ['Cairo', 'Tajawal', 'Almarai', 'Arial'],
        visualDensity: VisualDensity.adaptivePlatformDensity,
        pageTransitionsTheme: const PageTransitionsTheme(builders: {
          TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        }),
        appBarTheme: const AppBarTheme(
          backgroundColor: BhsColors.porcelain,
          surfaceTintColor: Colors.transparent,
          foregroundColor: BhsColors.charcoal,
          centerTitle: true,
          elevation: 0,
          titleTextStyle: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: BhsColors.charcoal),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: BhsColors.roseGoldDeep,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 18),
            minimumSize: const Size(54, 48),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999)),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: BhsColors.mochaDark,
            side: const BorderSide(color: BhsColors.roseGold),
            padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 18),
            minimumSize: const Size(54, 48),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999)),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: BhsColors.roseGold.withOpacity(.35))),
        ),
        dialogTheme: DialogThemeData(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: BhsColors.roseGoldDeep,
          unselectedItemColor: BhsColors.mocha,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: TextStyle(fontWeight: FontWeight.w900),
          unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w700),
        ),
        navigationBarTheme: NavigationBarThemeData(
          height: 74,
          elevation: 0,
          backgroundColor: Colors.white,
          indicatorColor: BhsColors.softPink,
          indicatorShape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        ),
        listTileTheme: const ListTileThemeData(
          contentPadding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          iconColor: BhsColors.roseGoldDeep,
          textColor: BhsColors.charcoal,
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: BhsColors.plum,
          contentTextStyle:
              const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white.withOpacity(.96),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(18),
              borderSide: const BorderSide(color: BhsColors.roseGold)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(18),
              borderSide:
                  BorderSide(color: BhsColors.roseGold.withOpacity(.52))),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(18),
              borderSide:
                  const BorderSide(color: BhsColors.roseGoldDeep, width: 1.5)),
          labelStyle: const TextStyle(color: BhsColors.mochaDark),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: BhsColors.softPink,
          selectedColor: BhsColors.roseGold,
          labelStyle: const TextStyle(
              color: BhsColors.charcoal, fontWeight: FontWeight.w700),
          side: BorderSide.none,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
      ),
      builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl, child: child ?? const SizedBox()),
      home: const HomeScreen(),
    );
  }
}

class ApiClient {
  static Uri uri(String path) {
    final base = apiBaseUrl.endsWith('/')
        ? apiBaseUrl.substring(0, apiBaseUrl.length - 1)
        : apiBaseUrl;
    final cleanPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$base$cleanPath');
  }

  static Map<String, String> headers([String? token]) => {
        'Content-Type': 'application/json; charset=utf-8',
        'x-tenant-slug': tenantSlug,
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      };

  static final http.Client _client = http.Client();
  static final Map<String, _CacheEntry> _cache = {};
  static const Duration requestTimeout = Duration(seconds: 18);
  static const Duration cacheTtl = Duration(seconds: 90);

  static String _cacheKey(String path, String? token) =>
      '${token == null || token.isEmpty ? 'public' : 'auth'}::$path';

  static Future<dynamic> get(String path,
      {String? token, bool forceRefresh = false}) async {
    final key = _cacheKey(path, token);
    final cached = _cache[key];
    if (!forceRefresh &&
        cached != null &&
        DateTime.now().difference(cached.createdAt) < cacheTtl)
      return cached.data;
    final data = _parse(await _client
        .get(uri(path), headers: headers(token))
        .timeout(requestTimeout));
    _cache[key] = _CacheEntry(data);
    return data;
  }

  static Future<dynamic> post(String path, Map<String, dynamic> body,
      {String? token}) async {
    final data = _parse(await _client
        .post(uri(path), headers: headers(token), body: jsonEncode(body))
        .timeout(requestTimeout));
    clearCache();
    return data;
  }

  static Future<dynamic> patch(String path, Map<String, dynamic> body,
      {String? token}) async {
    final data = _parse(await _client
        .patch(uri(path), headers: headers(token), body: jsonEncode(body))
        .timeout(requestTimeout));
    clearCache();
    return data;
  }

  static Future<dynamic> delete(String path, {String? token}) async {
    final data = _parse(await _client
        .delete(uri(path), headers: headers(token))
        .timeout(requestTimeout));
    clearCache();
    return data;
  }

  static void clearCache() => _cache.clear();

  static dynamic _parse(http.Response response) {
    final text = utf8.decode(response.bodyBytes).trim();
    dynamic data;
    try {
      data = text.isEmpty ? null : jsonDecode(text);
    } catch (_) {
      final shortText =
          text.length > 180 ? '${text.substring(0, 180)}...' : text;
      throw Exception(
          'استجابة غير صالحة من السيرفر (${response.statusCode}): $shortText');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = data is Map
          ? (data['error'] ?? data['details'] ?? 'حدث خطأ')
          : 'حدث خطأ';
      throw Exception(message);
    }
    return data;
  }
}

class _CacheEntry {
  final dynamic data;
  final DateTime createdAt;
  _CacheEntry(this.data) : createdAt = DateTime.now();
}

InputDecoration inputDecoration(String label, {IconData? icon}) =>
    InputDecoration(
        labelText: label, prefixIcon: icon == null ? null : Icon(icon));
String dateOnly(dynamic v) => v == null
    ? '-'
    : DateTime.tryParse(v.toString())?.toString().substring(0, 10) ??
        v.toString();
String timeOnly(dynamic v) {
  final text = v?.toString() ?? '';
  return text.isEmpty ? '-' : (text.length >= 5 ? text.substring(0, 5) : text);
}

String nameOf(dynamic item) => (item is Map
        ? (item['name_ar'] ?? item['display_name'] ?? item['name'] ?? '-')
        : '-')
    .toString();
List safeList(dynamic data) => data is List ? data : [];
Map safeMap(dynamic data) => data is Map ? data : {};
String queryParam(String value) => Uri.encodeQueryComponent(value);

class CustomerSession {
  final String token;
  final Map customer;
  final List addresses;
  const CustomerSession(
      {required this.token, required this.customer, this.addresses = const []});
  String get name => (customer['name'] ?? '').toString();
  String get phone => normalizePhone((customer['phone'] ?? '').toString());
}

class LuxuryCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  const LuxuryCard(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(16),
      this.margin = const EdgeInsets.only(bottom: 14)});

  @override
  Widget build(BuildContext context) => Container(
        margin: margin,
        padding: padding,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Colors.white.withOpacity(.98),
              const Color(0xFFFFF7F3).withOpacity(.94)
            ],
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
          ),
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: BhsColors.roseGold.withOpacity(.30)),
          boxShadow: [
            BoxShadow(
                color: BhsColors.mocha.withOpacity(.10),
                blurRadius: 24,
                offset: const Offset(0, 12)),
            BoxShadow(
                color: Colors.white.withOpacity(.72),
                blurRadius: 0,
                spreadRadius: 1),
          ],
        ),
        child: child,
      );
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? action;
  const SectionTitle(this.title, {super.key, this.subtitle, this.action});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12, top: 8),
        child: Row(children: [
          Container(
            width: 4,
            height: subtitle == null ? 26 : 42,
            margin: const EdgeInsets.only(left: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              gradient: const LinearGradient(
                  colors: [BhsColors.roseGoldDeep, BhsColors.softPink],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter),
            ),
          ),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    style: const TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                        color: BhsColors.charcoal,
                        height: 1.15)),
                if (subtitle != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Text(subtitle!,
                        style: const TextStyle(
                            color: BhsColors.mochaDark,
                            fontWeight: FontWeight.w700,
                            height: 1.35)),
                  ),
              ])),
          if (action != null) action!,
        ]),
      );
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final authPhone = TextEditingController();
  final authName = TextEditingController();
  final otp = TextEditingController();
  final trackingPhone = TextEditingController();
  String? token;
  Map? customer;
  List addresses = [];
  List categories = [];
  List services = [];
  List portfolio = [];
  bool loading = false;
  bool dataLoading = true;
  String? message;
  String authMode = 'guest';
  int tabIndex = 0;

  @override
  void initState() {
    super.initState();
    loadSavedSession();
    loadHomeData();
  }

  Future<void> loadHomeData() async {
    try {
      final results = await Future.wait([
        ApiClient.get('/service-categories', forceRefresh: true),
        ApiClient.get('/services', forceRefresh: true),
        ApiClient.get('/portfolio', forceRefresh: true)
      ]);
      categories = safeList(results[0]);
      services = safeList(results[1]);
      portfolio = safeList(results[2]);
    } catch (_) {
      // Keep home usable even when backend is offline.
    } finally {
      if (mounted) setState(() => dataLoading = false);
    }
  }

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

  CustomerSession? currentSession() => token != null && customer != null
      ? CustomerSession(
          token: token!, customer: customer!, addresses: addresses)
      : null;

  Future<void> loadAccount() async {
    if (token == null || token!.isEmpty) return;
    setState(() {
      loading = true;
      message = null;
    });
    try {
      final me = safeMap(await ApiClient.get('/customer/me', token: token));
      final addr =
          safeList(await ApiClient.get('/customer/addresses', token: token));
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerTokenKey, token!);
      await prefs.setString(savedCustomerPhoneKey,
          normalizePhone((me['phone'] ?? '').toString()));
      await prefs.setString(
          savedCustomerNameKey, (me['name'] ?? '').toString());
      customer = me;
      addresses = addr;
      authMode = 'account';
      authPhone.text = phoneMask((me['phone'] ?? '').toString());
      trackingPhone.text = phoneMask((me['phone'] ?? '').toString());
      authName.text = (me['name'] ?? '').toString();
    } catch (_) {
      await logout(silent: true);
      message = 'انتهت الجلسة. سجّلي الدخول مرة أخرى.';
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> requestOtp() async {
    final phone = normalizePhone(authPhone.text);
    if (!isValidSaudiPhone(phone)) {
      setState(() => message = 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx');
      return;
    }
    setState(() {
      loading = true;
      message = null;
    });
    try {
      final res = safeMap(await ApiClient.post('/customer/auth/request-otp',
          {'phone': phone, 'name': authName.text.trim()}));
      message = res['dev_otp'] != null
          ? 'تم إرسال رمز التحقق. رمز الاختبار: ${res['dev_otp']}'
          : 'تم إرسال رمز التحقق.';
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerPhoneKey, phone);
      if (authName.text.trim().isNotEmpty)
        await prefs.setString(savedCustomerNameKey, authName.text.trim());
    } catch (e) {
      message = 'تعذر إرسال رمز التحقق: $e';
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> verifyOtp() async {
    final phone = normalizePhone(authPhone.text);
    if (!isValidSaudiPhone(phone)) {
      setState(() => message = 'رقم الجوال يجب أن يكون بصيغة 05xxxxxxxx');
      return;
    }
    if (otp.text.trim().isEmpty) {
      setState(() => message = 'أدخلي رمز التحقق');
      return;
    }
    setState(() {
      loading = true;
      message = null;
    });
    try {
      final res = safeMap(await ApiClient.post('/customer/auth/verify-otp',
          {'phone': phone, 'otp': otp.text.trim()}));
      token = (res['token'] ?? '').toString();
      customer = safeMap(res['customer']);
      await loadAccount();
      message = 'تم تسجيل الدخول بنجاح.';
    } catch (e) {
      message = 'تعذر تسجيل الدخول: $e';
    } finally {
      if (mounted) setState(() => loading = false);
    }
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
  void dispose() {
    authPhone.dispose();
    authName.dispose();
    otp.dispose();
    trackingPhone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _homePage(),
      _categoriesPage(),
      _quickBookingPage(),
      _accountPage()
    ];
    return Scaffold(
      body: SafeArea(child: IndexedStack(index: tabIndex, children: pages)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tabIndex,
        onDestinationSelected: (i) => setState(() => tabIndex = i),
        height: 76,
        elevation: 0,
        backgroundColor: Colors.white.withOpacity(.98),
        indicatorColor: BhsColors.softPink,
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'الرئيسية'),
          NavigationDestination(
              icon: Icon(Icons.spa_outlined),
              selectedIcon: Icon(Icons.spa),
              label: 'الخدمات'),
          NavigationDestination(
              icon: Icon(Icons.add_circle_outline),
              selectedIcon: Icon(Icons.add_circle),
              label: 'حجز'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'حسابي'),
        ],
      ),
    );
  }

  Widget _homePage() => RefreshIndicator(
        onRefresh: loadHomeData,
        child: ListView(padding: const EdgeInsets.all(18), children: [
          _hero(),
          const SizedBox(height: 16),
          _quickActions(),
          SectionTitle('الأقسام',
              subtitle: 'اختاري نوع الخدمة المناسبة',
              action: TextButton(
                  onPressed: () => setState(() => tabIndex = 1),
                  child: const Text('عرض الكل'))),
          _categoryStrip(),
          SectionTitle('خدمات مقترحة', subtitle: 'أكثر الخدمات طلباً'),
          _serviceList(limit: 4),
          if (portfolio.isNotEmpty) ...[
            SectionTitle('نماذج أعمال', subtitle: 'إلهام لاختيار التصميم'),
            PortfolioStrip(items: portfolio.take(8).toList())
          ],
        ]),
      );

  Widget _hero() => Container(
        padding: const EdgeInsets.all(22),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(34),
          gradient: const LinearGradient(
              colors: [Colors.white, BhsColors.softPink, Color(0xFFFFF0E8)],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft),
          border: Border.all(color: Colors.white),
          boxShadow: [
            BoxShadow(
                color: BhsColors.roseGoldDeep.withOpacity(.18),
                blurRadius: 34,
                offset: const Offset(0, 16)),
            BoxShadow(
                color: Colors.white.withOpacity(.82),
                blurRadius: 0,
                spreadRadius: 1),
          ],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(
                    shape: BoxShape.circle, color: BhsColors.roseGold),
                child: const Icon(Icons.auto_awesome, color: Colors.white)),
            const SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(
                      token != null
                          ? 'مرحباً ${customer?['name'] ?? 'بكِ'}'
                          : 'بيوتي هوم سيرفس',
                      style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: BhsColors.charcoal)),
                  const Text('جمالكِ يبدأ من منزلكِ',
                      style: TextStyle(
                          color: BhsColors.mochaDark,
                          fontWeight: FontWeight.w700)),
                ])),
          ]),
          const SizedBox(height: 18),
          const Text(
              'احجزي خدمة تجميل منزلية بخطوات بسيطة، وسيقوم فريقنا بتأكيد الموعد والموقع معكِ.',
              style: TextStyle(
                  fontSize: 15, height: 1.55, color: BhsColors.charcoal)),
          const SizedBox(height: 18),
          Row(children: [
            Expanded(
                child: FilledButton.icon(
                    onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => BookingScreen(
                                session: currentSession(),
                                guestMode: authMode == 'guest'))),
                    icon: const Icon(Icons.calendar_month),
                    label: const Text('احجزي الآن'))),
            const SizedBox(width: 10),
            OutlinedButton.icon(
                onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => MyBookingsScreen(
                            phone: normalizePhone(trackingPhone.text),
                            token: token))),
                icon: const Icon(Icons.receipt_long),
                label: const Text('طلباتي')),
          ]),
        ]),
      );

  Widget _quickActions() => GridView.count(
        crossAxisCount: 2,
        childAspectRatio: 2.7,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          _miniAction(
              Icons.spa, 'اختيار خدمة', () => setState(() => tabIndex = 1)),
          _miniAction(
              Icons.brush,
              'الخبيرات',
              () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => const BeauticiansScreen()))),
          _miniAction(
              Icons.receipt_long,
              'متابعة الطلب',
              () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => MyBookingsScreen(
                          phone: normalizePhone(trackingPhone.text),
                          token: token)))),
          _miniAction(Icons.account_circle, 'حسابي',
              () => setState(() => tabIndex = 3)),
        ],
      );

  Widget _miniAction(IconData icon, String label, VoidCallback onTap) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: LuxuryCard(
          margin: EdgeInsets.zero,
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            CircleAvatar(
                backgroundColor: BhsColors.softPink,
                foregroundColor: BhsColors.roseGoldDeep,
                child: Icon(icon)),
            const SizedBox(width: 10),
            Expanded(
                child: Text(label,
                    style: const TextStyle(fontWeight: FontWeight.w900))),
          ]),
        ),
      );

  Widget _categoryStrip() {
    if (dataLoading)
      return const Center(
          child: Padding(
              padding: EdgeInsets.all(16), child: CircularProgressIndicator()));
    if (categories.isEmpty)
      return const LuxuryCard(child: Text('لم يتم العثور على أقسام حالياً.'));
    return SizedBox(
      height: 118,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, i) {
          final c = categories[i];
          return InkWell(
            onTap: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => ServicesScreen(category: c))),
            borderRadius: BorderRadius.circular(22),
            child: Container(
              width: 118,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                    colors: [Colors.white, BhsColors.softPink.withOpacity(.34)],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: BhsColors.roseGold.withOpacity(.30)),
                boxShadow: [
                  BoxShadow(
                      color: BhsColors.mocha.withOpacity(.08),
                      blurRadius: 16,
                      offset: const Offset(0, 8))
                ],
              ),
              child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircleAvatar(
                        radius: 24,
                        backgroundColor: BhsColors.softPink,
                        foregroundColor: BhsColors.roseGoldDeep,
                        child: Icon(_categoryIcon(nameOf(c)))),
                    const SizedBox(height: 8),
                    Text(nameOf(c),
                        maxLines: 2,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 12)),
                  ]),
            ),
          );
        },
      ),
    );
  }

  Widget _serviceList({int? limit}) {
    final list = limit == null ? services : services.take(limit).toList();
    if (dataLoading)
      return const Center(
          child: Padding(
              padding: EdgeInsets.all(16), child: CircularProgressIndicator()));
    if (list.isEmpty)
      return const LuxuryCard(child: Text('لا توجد خدمات متاحة حالياً.'));
    return Column(
        children: list
            .take(20)
            .map((s) => ServiceCard(
                service: s,
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => ServiceDetailsScreen(
                            service: s,
                            session: currentSession(),
                            guestMode: authMode == 'guest')))))
            .toList());
  }

  Widget _categoriesPage() =>
      ListView(padding: const EdgeInsets.all(18), children: [
        const SectionTitle('الخدمات والأقسام',
            subtitle: 'تصميم جديد ببطاقات ناعمة وصور/أيقونات'),
        _categoryGrid(),
        const SectionTitle('كل الخدمات'),
        _serviceList(),
      ]);

  Widget _categoryGrid() {
    if (dataLoading)
      return const Center(
          child: Padding(
              padding: EdgeInsets.all(16), child: CircularProgressIndicator()));
    return GridView.count(
      crossAxisCount: 2,
      childAspectRatio: 1.25,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      children: categories
          .map((c) => InkWell(
                onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => ServicesScreen(category: c))),
                borderRadius: BorderRadius.circular(24),
                child: LuxuryCard(
                  margin: EdgeInsets.zero,
                  child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircleAvatar(
                            radius: 30,
                            backgroundColor: BhsColors.softPink,
                            foregroundColor: BhsColors.roseGoldDeep,
                            child: Icon(_categoryIcon(nameOf(c)), size: 30)),
                        const SizedBox(height: 12),
                        Text(nameOf(c),
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w900)),
                        const SizedBox(height: 4),
                        const Text('عرض الخدمات',
                            style: TextStyle(
                                color: BhsColors.mochaDark, fontSize: 12)),
                      ]),
                ),
              ))
          .toList(),
    );
  }

  Widget _quickBookingPage() => BookingScreen(
      session: currentSession(),
      guestMode: authMode == 'guest',
      embedded: true);

  Widget _accountPage() =>
      ListView(padding: const EdgeInsets.all(18), children: [
        _accountCard(),
        if (message != null) _messageCard(),
        const SizedBox(height: 10),
        if (token != null)
          FilledButton.icon(
              onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => AccountScreen(token: token!))),
              icon: const Icon(Icons.manage_accounts),
              label: const Text('إدارة الحساب والعناوين')),
        const SizedBox(height: 12),
        LuxuryCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionTitle('مدير النظام',
                subtitle: 'واجهة جوال منفصلة لإدارة الطلبات والتشغيل'),
            FilledButton.icon(
              onPressed: () => Navigator.push(context,
                  MaterialPageRoute(builder: (_) => const AdminLoginScreen())),
              icon: const Icon(Icons.admin_panel_settings_outlined),
              label: const Text('فتح تطبيق مدير النظام'),
            ),
          ]),
        ),
      ]);

  Widget _messageCard() => LuxuryCard(
      padding: const EdgeInsets.all(12),
      child: Text(message!,
          style: TextStyle(
              color: message!.startsWith('تم')
                  ? Colors.green.shade800
                  : Colors.orange.shade900,
              fontWeight: FontWeight.w800)));

  Widget _accountCard() {
    final signedIn = token != null && customer != null;
    return LuxuryCard(
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const SectionTitle('حساب العميلة', subtitle: 'دخول سريع أو متابعة كضيف'),
      SegmentedButton<String>(
        segments: const [
          ButtonSegment(
              value: 'account',
              label: Text('تسجيل / دخول'),
              icon: Icon(Icons.verified_user_outlined)),
          ButtonSegment(
              value: 'guest',
              label: Text('ضيف'),
              icon: Icon(Icons.person_outline))
        ],
        selected: {authMode},
        onSelectionChanged: (s) => setState(() => authMode = s.first),
      ),
      const SizedBox(height: 14),
      if (authMode == 'account' && !signedIn) ...[
        TextField(
            controller: authName,
            decoration: inputDecoration('الاسم - لأول تسجيل فقط',
                icon: Icons.person_outline)),
        const SizedBox(height: 10),
        TextField(
            controller: authPhone,
            keyboardType: TextInputType.phone,
            inputFormatters: phoneInputFormatters,
            decoration: inputDecoration('رقم الجوال 05xxxxxxxx',
                icon: Icons.phone_iphone)),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: FilledButton(
                  onPressed: loading ? null : requestOtp,
                  child: const Text('إرسال الرمز'))),
          const SizedBox(width: 10),
          Expanded(
              child: TextField(
                  controller: otp,
                  keyboardType: TextInputType.number,
                  decoration: inputDecoration('رمز OTP')))
        ]),
        const SizedBox(height: 10),
        FilledButton(
            onPressed: loading ? null : verifyOtp,
            child: const Text('دخول الحساب')),
      ],
      if (signedIn)
        ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(
                backgroundColor: BhsColors.softPink,
                foregroundColor: BhsColors.roseGoldDeep,
                child: Icon(Icons.person)),
            title: Text((customer?['name'] ?? 'عميلة').toString(),
                style: const TextStyle(fontWeight: FontWeight.w900)),
            subtitle: Text(phoneMask((customer?['phone'] ?? '').toString())),
            trailing: TextButton(onPressed: logout, child: const Text('خروج'))),
      if (authMode == 'guest')
        const Text(
            'كضيف: ستدخل العميلة الاسم ورقم الجوال والعنوان داخل طلب الحجز.',
            style: TextStyle(color: BhsColors.mochaDark, height: 1.5)),
    ]));
  }
}

IconData _categoryIcon(String name) {
  if (name.contains('حن')) return Icons.gesture;
  if (name.contains('مك')) return Icons.face_retouching_natural;
  if (name.contains('شعر')) return Icons.content_cut;
  if (name.contains('أظ') || name.contains('اظ'))
    return Icons.back_hand_outlined;
  return Icons.spa_outlined;
}

class ServiceCard extends StatelessWidget {
  final dynamic service;
  final VoidCallback onTap;
  const ServiceCard({super.key, required this.service, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final price =
        service['base_price'] ?? service['min_price'] ?? service['price'];
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: LuxuryCard(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                  color: BhsColors.softPink,
                  borderRadius: BorderRadius.circular(20)),
              child: Icon(
                  _categoryIcon(
                      '${service['category_name'] ?? service['name_ar'] ?? ''}'),
                  color: BhsColors.roseGoldDeep,
                  size: 34)),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(nameOf(service),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: BhsColors.charcoal)),
                if ((service['description'] ?? '').toString().isNotEmpty)
                  Text(service['description'].toString(),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          color: BhsColors.mochaDark, fontSize: 12)),
                const SizedBox(height: 7),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  if (price != null) _miniBadge('من $price ريال'),
                  if (service['duration_minutes'] != null)
                    _miniBadge('${service['duration_minutes']} دقيقة'),
                ]),
              ])),
          const Icon(Icons.chevron_left, color: BhsColors.mocha),
        ]),
      ),
    );
  }
}

Widget _miniBadge(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
        color: BhsColors.softPink, borderRadius: BorderRadius.circular(999)),
    child: Text(text,
        style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: BhsColors.mochaDark)));

class ServicesScreen extends StatefulWidget {
  final dynamic category;
  const ServicesScreen({super.key, this.category});
  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  bool loading = true;
  List services = [];
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final id =
          widget.category is Map ? widget.category['id']?.toString() : null;
      services = safeList(await ApiClient.get(
          id == null ? '/services' : '/services?category_id=${queryParam(id)}',
          forceRefresh: true));
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Text(
                widget.category == null ? 'الخدمات' : nameOf(widget.category))),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView.builder(
                padding: const EdgeInsets.all(18),
                itemCount: services.isEmpty ? 3 : services.length + 2,
                itemBuilder: (context, i) {
                  if (i == 0)
                    return error != null
                        ? LuxuryCard(
                            child: Text(error!,
                                style:
                                    const TextStyle(color: BhsColors.danger)))
                        : const SizedBox.shrink();
                  if (i == 1)
                    return SectionTitle(
                        widget.category == null
                            ? 'كل الخدمات'
                            : 'خدمات ${nameOf(widget.category)}',
                        subtitle: 'اختاري الخدمة لمشاهدة التفاصيل والحجز');
                  if (services.isEmpty)
                    return const LuxuryCard(
                        child: Text('لا توجد خدمات متاحة في هذا القسم.'));
                  final service = services[i - 2];
                  return ServiceCard(
                      service: service,
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  ServiceDetailsScreen(service: service))));
                },
              ),
      );
}

class ServiceDetailsScreen extends StatelessWidget {
  final dynamic service;
  final CustomerSession? session;
  final bool guestMode;
  const ServiceDetailsScreen(
      {super.key, required this.service, this.session, this.guestMode = true});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(nameOf(service))),
        body: ListView(padding: const EdgeInsets.all(18), children: [
          Container(
            height: 180,
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(30),
                gradient: const LinearGradient(colors: [
                  BhsColors.softPink,
                  BhsColors.roseGold,
                  BhsColors.creamGold
                ]),
                boxShadow: [
                  BoxShadow(
                      color: BhsColors.roseGold.withOpacity(.25),
                      blurRadius: 24,
                      offset: const Offset(0, 12))
                ]),
            child: Center(
                child: Icon(
                    _categoryIcon(
                        '${service['category_name'] ?? service['name_ar'] ?? ''}'),
                    color: Colors.white,
                    size: 82)),
          ),
          const SizedBox(height: 16),
          LuxuryCard(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(nameOf(service),
                    style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: BhsColors.charcoal)),
                const SizedBox(height: 8),
                if ((service['description'] ?? '').toString().isNotEmpty)
                  Text(service['description'].toString(),
                      style: const TextStyle(
                          height: 1.6, color: BhsColors.mochaDark)),
                const SizedBox(height: 14),
                Wrap(spacing: 8, runSpacing: 8, children: [
                  if (service['min_price'] != null)
                    _miniBadge('السعر من ${service['min_price']} ريال'),
                  if (service['base_price'] != null)
                    _miniBadge('الأساسي ${service['base_price']} ريال'),
                  if (service['max_price'] != null)
                    _miniBadge('حتى ${service['max_price']} ريال'),
                  if (service['duration_minutes'] != null)
                    _miniBadge('${service['duration_minutes']} دقيقة'),
                ]),
              ])),
          FilledButton.icon(
              onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => BookingScreen(
                          session: session,
                          guestMode: guestMode,
                          initialService: service))),
              icon: const Icon(Icons.calendar_month),
              label: const Text('احجزي هذه الخدمة')),
        ]),
      );
}

class AdminLoginScreen extends StatelessWidget {
  const AdminLoginScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('تطبيق مدير النظام')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(18),
            children: [
              LuxuryCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                            colors: [BhsColors.plum, BhsColors.roseGoldDeep]),
                      ),
                      child: const Icon(Icons.admin_panel_settings_outlined,
                          color: Colors.white, size: 38),
                    ),
                    const SizedBox(height: 16),
                    const SectionTitle('تطبيق المدير منفصل',
                        subtitle:
                            'استخدمي تطبيق الإدارة المخصص لمتابعة الحجوزات والخبيرات والنظام.'),
                    const Text(
                      'هذه شاشة توجيه داخل تطبيق العميل فقط حتى تبقى تجربة العميل نظيفة، بينما تبقى مهام الإدارة داخل تطبيق المدير المستقل.',
                      style: TextStyle(
                          color: BhsColors.mochaDark,
                          height: 1.6,
                          fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('العودة لتطبيق العميل'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

class BookingScreen extends StatefulWidget {
  final CustomerSession? session;
  final bool guestMode;
  final bool embedded;
  final dynamic initialService;
  const BookingScreen(
      {super.key,
      this.session,
      this.guestMode = true,
      this.embedded = false,
      this.initialService});
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final phone = TextEditingController();
  final eventType = TextEditingController(text: 'مناسبة خاصة');
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
  List occasionTypes = [];
  List beauticians = [];
  List portfolio = [];
  String? selectedRegionId;
  String? selectedCityId;
  String? selectedDistrictId;
  String? selectedCategoryId;
  String? selectedServiceId;
  String? preferredBeauticianId;
  String contactPreference = 'whatsapp';
  int step = 0;

  bool get isAccountBooking => widget.session != null && !widget.guestMode;

  @override
  void initState() {
    super.initState();
    prefillAccount();
    if (widget.initialService is Map) {
      selectedServiceId = widget.initialService['id']?.toString();
      selectedCategoryId = widget.initialService['category_id']?.toString();
    }
    loadSavedPhone();
    loadInitialLists();
  }

  void prefillAccount() {
    final session = widget.session;
    if (session == null) return;
    name.text = session.name;
    phone.text = phoneMask(session.phone);
    final defaultAddress = session.addresses.cast<dynamic>().firstWhere(
        (a) => a is Map && a['is_default'] == true,
        orElse: () =>
            session.addresses.isNotEmpty ? session.addresses.first : null);
    if (defaultAddress is Map) {
      selectedRegionId = defaultAddress['region_id']?.toString();
      selectedCityId = defaultAddress['city_id']?.toString();
      selectedDistrictId = defaultAddress['district_id']?.toString();
      address.text = (defaultAddress['address'] ?? '').toString();
    }
  }

  Future<void> loadSavedPhone() async {
    if (phone.text.isNotEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(savedCustomerPhoneKey);
    if (saved != null && mounted) phone.text = phoneMask(saved);
  }

  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    eventType.dispose();
    people.dispose();
    address.dispose();
    notes.dispose();
    designImageUrl.dispose();
    alternateTime.dispose();
    super.dispose();
  }

  Future<void> loadInitialLists() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([
        ApiClient.get('/regions'),
        ApiClient.get('/service-categories'),
        ApiClient.get((selectedRegionId == null || selectedRegionId!.isEmpty)
            ? '/cities'
            : '/cities?region_id=${queryParam(selectedRegionId!)}'),
        ApiClient.get((selectedCityId != null && selectedCityId!.isNotEmpty)
            ? '/districts?city_id=${queryParam(selectedCityId!)}'
            : ((selectedRegionId == null || selectedRegionId!.isEmpty)
                ? '/districts'
                : '/districts?region_id=${queryParam(selectedRegionId!)}')),
        ApiClient.get(selectedCategoryId == null
            ? '/services'
            : '/services?category_id=${queryParam(selectedCategoryId!)}'),
        ApiClient.get('/portfolio'),
        ApiClient.get('/occasion-types'),
      ]);
      regions = safeList(results[0]);
      categories = safeList(results[1]);
      cities = safeList(results[2]);
      districts = safeList(results[3]);
      services = safeList(results[4]);
      portfolio = safeList(results[5]);
      occasionTypes = safeList(results[6]);
      if (eventType.text.trim().isEmpty && occasionTypes.isNotEmpty)
        eventType.text = nameOf(occasionTypes.first);
      await loadBeauticians(refreshState: false);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadCities(String? regionId) async {
    selectedRegionId = (regionId == null || regionId.isEmpty) ? null : regionId;
    selectedCityId = null;
    selectedDistrictId = null;
    preferredBeauticianId = null;
    setState(() => loading = true);
    try {
      cities = safeList(await ApiClient.get(selectedRegionId == null
          ? '/cities'
          : '/cities?region_id=${queryParam(selectedRegionId!)}'));
      districts = safeList(await ApiClient.get(selectedRegionId == null
          ? '/districts'
          : '/districts?region_id=${queryParam(selectedRegionId!)}'));
      await loadBeauticians(refreshState: false);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadDistricts(String? cityId) async {
    selectedCityId = (cityId == null || cityId.isEmpty) ? null : cityId;
    selectedDistrictId = null;
    preferredBeauticianId = null;
    setState(() => loading = true);
    try {
      final path = selectedCityId != null
          ? '/districts?city_id=${queryParam(selectedCityId!)}'
          : (selectedRegionId != null
              ? '/districts?region_id=${queryParam(selectedRegionId!)}'
              : '/districts');
      districts = safeList(await ApiClient.get(path));
      await loadBeauticians(refreshState: false);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> loadServices(String? categoryId) async {
    selectedCategoryId =
        (categoryId == null || categoryId.isEmpty) ? null : categoryId;
    selectedServiceId = null;
    preferredBeauticianId = null;
    setState(() => loading = true);
    try {
      services = safeList(await ApiClient.get(selectedCategoryId == null
          ? '/services'
          : '/services?category_id=${queryParam(selectedCategoryId!)}'));
      await loadBeauticians(refreshState: false);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> selectService(String? serviceId) async {
    selectedServiceId =
        (serviceId == null || serviceId.isEmpty) ? null : serviceId;
    preferredBeauticianId = null;
    await loadBeauticians();
  }

  Future<void> loadBeauticians({bool refreshState = true}) async {
    final qs = <String>[];
    if (selectedServiceId != null && selectedServiceId!.isNotEmpty)
      qs.add('service_id=${queryParam(selectedServiceId!)}');
    if (selectedCategoryId != null &&
        selectedCategoryId!.isNotEmpty &&
        selectedServiceId == null)
      qs.add('category_id=${queryParam(selectedCategoryId!)}');
    if (selectedRegionId != null && selectedRegionId!.isNotEmpty)
      qs.add('region_id=${queryParam(selectedRegionId!)}');
    if (selectedCityId != null && selectedCityId!.isNotEmpty)
      qs.add('city_id=${queryParam(selectedCityId!)}');
    if (selectedDistrictId != null && selectedDistrictId!.isNotEmpty)
      qs.add('district_id=${queryParam(selectedDistrictId!)}');
    beauticians = safeList(await ApiClient.get(
        qs.isEmpty ? '/beauticians' : '/beauticians?${qs.join('&')}'));
    if (beauticians.isEmpty && qs.isNotEmpty)
      beauticians =
          safeList(await ApiClient.get('/beauticians', forceRefresh: true));
    if (selectedServiceId != null && selectedServiceId!.isNotEmpty) {
      portfolio = safeList(await ApiClient.get(
          '/portfolio?service_id=${queryParam(selectedServiceId!)}'));
      if (portfolio.isEmpty)
        portfolio = safeList(await ApiClient.get('/portfolio'));
    }
    if (refreshState && mounted) setState(() {});
  }

  String dateText() => bookingDate == null
      ? 'اختيار التاريخ'
      : '${bookingDate!.year}-${bookingDate!.month.toString().padLeft(2, '0')}-${bookingDate!.day.toString().padLeft(2, '0')}';
  String timeText() => bookingTime == null
      ? 'اختيار الوقت'
      : '${bookingTime!.hour.toString().padLeft(2, '0')}:${bookingTime!.minute.toString().padLeft(2, '0')}';

  Future<void> submit() async {
    if (!formKey.currentState!.validate()) return;
    if (bookingDate == null || bookingTime == null) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('اختر التاريخ والوقت')));
      return;
    }
    if ([
      selectedRegionId,
      selectedCityId,
      selectedDistrictId,
      selectedServiceId
    ].any((e) => e == null || e.toString().isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('أكمل اختيار الموقع والخدمة')));
      return;
    }
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BookingSummarySheet(
          summary: buildSummary(),
          onConfirm: () => Navigator.pop(context, true)),
    );
    if (confirmed != true) return;
    final customerPhone = normalizePhone(phone.text);
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
        'design_image_url': designImageUrl.text.trim().isEmpty
            ? null
            : designImageUrl.text.trim(),
        'customer_notes': notes.text.trim(),
        'contact_preference': contactPreference,
        'alternate_time': alternateTime.text.trim(),
        'booking_source': 'mobile_apk',
        'booking_customer_mode': isAccountBooking ? 'account' : 'guest',
      });
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedCustomerPhoneKey, customerPhone);
      if (!mounted) return;
      Navigator.pushReplacement(
          context,
          MaterialPageRoute(
              builder: (_) => BookingSubmittedScreen(
                  bookingId:
                      (created['booking_number'] ?? created['id'])?.toString(),
                  phone: customerPhone,
                  token: widget.session?.token)));
    } catch (e) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('تعذر إرسال الطلب: $e')));
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Map<String, String> buildSummary() => {
        'العميلة': name.text.trim(),
        'الجوال': normalizePhone(phone.text),
        'الخدمة': nameOf(services.firstWhere(
            (s) => s is Map && s['id']?.toString() == selectedServiceId,
            orElse: () => widget.initialService ?? {})),
        'نوع المناسبة': eventType.text.trim(),
        'المنطقة': nameOf(regions.firstWhere(
            (x) => x is Map && x['id']?.toString() == selectedRegionId,
            orElse: () => {})),
        'المدينة': nameOf(cities.firstWhere(
            (x) => x is Map && x['id']?.toString() == selectedCityId,
            orElse: () => {})),
        'الحي': nameOf(districts.firstWhere(
            (x) => x is Map && x['id']?.toString() == selectedDistrictId,
            orElse: () => {})),
        'التاريخ': dateText(),
        'الوقت': timeText(),
        'الخبيرة': preferredBeauticianId == null
            ? 'أي خبيرة متاحة'
            : nameOf(beauticians.firstWhere(
                (x) => x is Map && x['id']?.toString() == preferredBeauticianId,
                orElse: () => {})),
      };

  @override
  Widget build(BuildContext context) {
    final content = loading
        ? const Center(
            child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator()))
        : Form(
            key: formKey,
            child: ListView(
                padding: EdgeInsets.all(widget.embedded ? 18 : 18),
                children: [
                  if (error != null)
                    LuxuryCard(
                        child: Text('تنبيه: $error',
                            style: TextStyle(color: Colors.orange.shade900))),
                  if (!widget.embedded)
                    const SectionTitle('طلب حجز جديد',
                        subtitle: 'خطوات بسيطة لتأكيد الخدمة والموقع والموعد'),
                  _stepHeader(),
                  const SizedBox(height: 12),
                  if (step == 0) _customerStep(),
                  if (step == 1) _serviceLocationStep(),
                  if (step == 2) _dateArtistStep(),
                  if (step == 3) _summaryStep(),
                  const SizedBox(height: 14),
                  _stepActions(),
                ]),
          );
    if (widget.embedded) return content;
    return Scaffold(
        appBar: AppBar(title: const Text('حجز خدمة')), body: content);
  }

  Widget _stepHeader() {
    final labels = ['البيانات', 'الخدمة', 'الموعد', 'الملخص'];
    return LuxuryCard(
      padding: const EdgeInsets.all(12),
      child: Row(
          children: List.generate(labels.length, (i) {
        final active = i <= step;
        return Expanded(
            child: Column(children: [
          CircleAvatar(
              radius: 16,
              backgroundColor:
                  active ? BhsColors.roseGoldDeep : BhsColors.softPink,
              foregroundColor: active ? Colors.white : BhsColors.mochaDark,
              child: Text('${i + 1}',
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w900))),
          const SizedBox(height: 5),
          Text(labels[i],
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: active ? BhsColors.charcoal : BhsColors.mocha)),
        ]));
      })),
    );
  }

  Widget _customerStep() => LuxuryCard(
          child: Column(children: [
        if (isAccountBooking)
          Text('تم تعبئة بيانات الحساب تلقائياً: ${widget.session?.name ?? ''}',
              style: const TextStyle(
                  fontWeight: FontWeight.w900, color: BhsColors.charcoal)),
        TextFormField(
            controller: name,
            enabled: !isAccountBooking,
            decoration:
                inputDecoration('اسم العميلة', icon: Icons.person_outline),
            validator: requiredField),
        const SizedBox(height: 12),
        TextFormField(
            controller: phone,
            enabled: !isAccountBooking,
            keyboardType: TextInputType.phone,
            inputFormatters: phoneInputFormatters,
            decoration: inputDecoration('رقم الجوال 05xxxxxxxx',
                icon: Icons.phone_iphone),
            validator: phoneValidator),
        const SizedBox(height: 12),
        occasionTypeDropdown(),
      ]));

  Widget occasionTypeDropdown() {
    final current = eventType.text.trim();
    final values = occasionTypes
        .whereType<Map>()
        .map(nameOf)
        .where((v) => v.trim().isNotEmpty)
        .toSet()
        .toList();
    final selected = values.contains(current) ? current : null;
    return DropdownButtonFormField<String>(
      value: selected,
      isExpanded: true,
      decoration:
          inputDecoration('نوع المناسبة', icon: Icons.celebration_outlined),
      items: [
        const DropdownMenuItem<String>(
            value: '', child: Text('اختاري نوع المناسبة')),
        ...values.map((v) => DropdownMenuItem<String>(
            value: v, child: Text(v, overflow: TextOverflow.ellipsis))),
      ],
      onChanged: (v) => setState(() => eventType.text = v ?? ''),
      validator: (v) =>
          (eventType.text.trim().isEmpty && (v == null || v.isEmpty))
              ? 'مطلوب'
              : null,
    );
  }

  Widget _serviceLocationStep() => LuxuryCard(
          child: Column(children: [
        dropdown('المنطقة', selectedRegionId, regions, loadCities,
            icon: Icons.map_outlined),
        const SizedBox(height: 12),
        dropdown('المدينة', selectedCityId, cities, loadDistricts,
            emptyLabel: selectedRegionId == null ? 'كل المدن' : 'اختر المدينة',
            icon: Icons.location_city_outlined),
        const SizedBox(height: 12),
        dropdown(
            'الحي',
            selectedDistrictId,
            districts,
            (v) => setState(
                () => selectedDistrictId = (v == null || v.isEmpty) ? null : v),
            emptyLabel: selectedCityId == null ? 'كل الأحياء' : 'اختر الحي',
            icon: Icons.place_outlined),
        const SizedBox(height: 12),
        dropdown('قسم الخدمة', selectedCategoryId, categories, loadServices,
            required: false,
            emptyLabel: 'كل الأقسام',
            icon: Icons.category_outlined),
        const SizedBox(height: 12),
        dropdown('الخدمة', selectedServiceId, services, selectService,
            emptyLabel: selectedCategoryId == null
                ? 'كل الخدمات / اختاري الخدمة'
                : 'خدمات القسم المختار',
            icon: Icons.spa_outlined),
        const SizedBox(height: 12),
        TextFormField(
            controller: address,
            decoration:
                inputDecoration('العنوان التفصيلي', icon: Icons.home_outlined),
            validator: requiredField),
      ]));

  Widget _dateArtistStep() => LuxuryCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: () async {
                    final d = await showDatePicker(
                        context: context,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 365)),
                        initialDate: DateTime.now());
                    if (d != null) setState(() => bookingDate = d);
                  },
                  icon: const Icon(Icons.calendar_month),
                  label: Text(dateText()))),
          const SizedBox(width: 10),
          Expanded(
              child: OutlinedButton.icon(
                  onPressed: () async {
                    final t = await showTimePicker(
                        context: context,
                        initialTime: const TimeOfDay(hour: 18, minute: 0));
                    if (t != null) setState(() => bookingTime = t);
                  },
                  icon: const Icon(Icons.schedule),
                  label: Text(timeText()))),
        ]),
        const SizedBox(height: 12),
        TextFormField(
            controller: people,
            keyboardType: TextInputType.number,
            decoration:
                inputDecoration('عدد الأشخاص', icon: Icons.groups_outlined)),
        const SizedBox(height: 12),
        if (beauticians.isNotEmpty)
          DropdownButtonFormField<String>(
            value: preferredBeauticianId ?? '',
            decoration: inputDecoration('خبيرة مفضلة - اختياري',
                icon: Icons.brush_outlined),
            items: [
              const DropdownMenuItem<String>(
                  value: '', child: Text('اتركي الاختيار للدعم')),
              ...beauticians.map<
                  DropdownMenuItem<
                      String>>((a) => DropdownMenuItem(
                  value: a['id']?.toString(),
                  child: Text(
                      '${a['name']} • ${a['review_rating'] ?? a['rating'] ?? '-'}★',
                      overflow: TextOverflow.ellipsis)))
            ],
            onChanged: (v) => setState(() =>
                preferredBeauticianId = (v == null || v.isEmpty) ? null : v),
          ),
        if (portfolio.isNotEmpty) ...[
          const SizedBox(height: 12),
          PortfolioStrip(
              items: portfolio,
              onTapBeautician: (id) =>
                  setState(() => preferredBeauticianId = id))
        ],
      ]));

  Widget _summaryStep() => LuxuryCard(
          child: Column(children: [
        TextFormField(
            controller: designImageUrl,
            decoration: inputDecoration('رابط صورة التصميم - اختياري',
                icon: Icons.image_outlined)),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
            value: contactPreference,
            decoration: inputDecoration('طريقة التواصل المفضلة',
                icon: Icons.chat_outlined),
            items: const [
              DropdownMenuItem(value: 'whatsapp', child: Text('واتساب')),
              DropdownMenuItem(value: 'call', child: Text('اتصال')),
              DropdownMenuItem(value: 'sms', child: Text('رسالة SMS'))
            ],
            onChanged: (v) =>
                setState(() => contactPreference = v ?? 'whatsapp')),
        const SizedBox(height: 12),
        TextFormField(
            controller: alternateTime,
            decoration:
                inputDecoration('وقت بديل - اختياري', icon: Icons.more_time)),
        const SizedBox(height: 12),
        TextFormField(
            controller: notes,
            minLines: 2,
            maxLines: 4,
            decoration: inputDecoration('ملاحظات', icon: Icons.notes_outlined)),
        const SizedBox(height: 16),
        _summaryPreview(),
      ]));

  Widget _summaryPreview() => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: buildSummary()
          .entries
          .map((e) => Padding(
              padding: const EdgeInsets.only(bottom: 7),
              child:
                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(
                    width: 78,
                    child: Text(e.key,
                        style: const TextStyle(
                            color: BhsColors.mochaDark,
                            fontWeight: FontWeight.w800))),
                Expanded(
                    child: Text(e.value.isEmpty ? '-' : e.value,
                        style: const TextStyle(fontWeight: FontWeight.w900)))
              ])))
          .toList());

  Widget _stepActions() => Row(children: [
        if (step > 0)
          Expanded(
              child: OutlinedButton(
                  onPressed: () => setState(() => step--),
                  child: const Text('السابق'))),
        if (step > 0) const SizedBox(width: 10),
        Expanded(
            child: FilledButton(
                onPressed: saving
                    ? null
                    : () {
                        if (step < 3) {
                          setState(() => step++);
                        } else {
                          submit();
                        }
                      },
                child: Text(step < 3
                    ? 'التالي'
                    : (saving ? 'جاري الإرسال...' : 'تأكيد وإرسال')))),
      ]);

  Widget dropdown(
      String label, String? value, List items, Function(String?) onChanged,
      {bool required = true, String? emptyLabel, IconData? icon}) {
    final normalizedValue = (value != null &&
            items.any((i) => i is Map && i['id']?.toString() == value))
        ? value
        : null;
    return DropdownButtonFormField<String>(
      value: normalizedValue,
      isExpanded: true,
      decoration: inputDecoration(label, icon: icon),
      items: [
        DropdownMenuItem<String>(value: '', child: Text(emptyLabel ?? 'اختر')),
        ...items.map<DropdownMenuItem<String>>((i) => DropdownMenuItem(
            value: i['id']?.toString(),
            child: Text(nameOf(i), overflow: TextOverflow.ellipsis)))
      ],
      onChanged: onChanged,
      validator: (v) => required && (v == null || v.isEmpty) ? 'مطلوب' : null,
    );
  }
}

class BookingSummarySheet extends StatelessWidget {
  final Map<String, String> summary;
  final VoidCallback onConfirm;
  const BookingSummarySheet(
      {super.key, required this.summary, required this.onConfirm});
  @override
  Widget build(BuildContext context) => Container(
        padding: EdgeInsets.only(
            left: 18,
            right: 18,
            top: 18,
            bottom: MediaQuery.of(context).viewInsets.bottom + 22),
        decoration: const BoxDecoration(
            color: BhsColors.ivory,
            borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
        child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SectionTitle('تأكيد ملخص الحجز',
                  subtitle: 'راجعي البيانات قبل إرسال الطلب'),
              LuxuryCard(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: summary.entries
                          .map((e) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    SizedBox(
                                        width: 80,
                                        child: Text(e.key,
                                            style: const TextStyle(
                                                color: BhsColors.mochaDark))),
                                    Expanded(
                                        child: Text(e.value,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w900)))
                                  ])))
                          .toList())),
              FilledButton.icon(
                  onPressed: onConfirm,
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('تأكيد وإرسال الطلب')),
              const SizedBox(height: 8),
              OutlinedButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('تعديل البيانات')),
            ]),
      );
}

class OptimizedNetworkImage extends StatelessWidget {
  final String? url;
  final double width;
  final double height;
  final BoxFit fit;
  final BorderRadius borderRadius;
  const OptimizedNetworkImage(
      {super.key,
      required this.url,
      required this.width,
      required this.height,
      this.fit = BoxFit.cover,
      this.borderRadius = const BorderRadius.all(Radius.circular(16))});

  @override
  Widget build(BuildContext context) {
    final clean = (url ?? '').trim();
    final fallback = Container(
        width: width,
        height: height,
        color: BhsColors.softPink,
        child: const Icon(Icons.image, color: BhsColors.roseGoldDeep));
    if (clean.isEmpty)
      return ClipRRect(borderRadius: borderRadius, child: fallback);
    final dpr = MediaQuery.of(context).devicePixelRatio.clamp(1, 3).toDouble();
    return ClipRRect(
      borderRadius: borderRadius,
      child: Image.network(
        clean,
        width: width,
        height: height,
        fit: fit,
        cacheWidth: (width * dpr).round(),
        cacheHeight: (height * dpr).round(),
        filterQuality: FilterQuality.low,
        gaplessPlayback: true,
        frameBuilder: (context, child, frame, wasSynchronouslyLoaded) =>
            wasSynchronouslyLoaded || frame != null ? child : fallback,
        errorBuilder: (_, __, ___) => fallback,
      ),
    );
  }
}

class PortfolioStrip extends StatelessWidget {
  final List items;
  final void Function(String?)? onTapBeautician;
  const PortfolioStrip({super.key, required this.items, this.onTapBeautician});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(
          height: 215,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, i) {
              final p = items[i];
              return InkWell(
                onTap: () =>
                    onTapBeautician?.call(p['beautician_id']?.toString()),
                child: Container(
                  width: 180,
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                          color: BhsColors.roseGold.withOpacity(.45))),
                  padding: const EdgeInsets.all(8),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        OptimizedNetworkImage(
                            url: p['image_url']?.toString(),
                            height: 115,
                            width: 164),
                        const SizedBox(height: 8),
                        Text(p['title_ar'] ?? '-',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        Text(p['beautician_name'] ?? '-',
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(p['service_name'] ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12, color: BhsColors.mochaDark)),
                      ]),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
      ]);
}

class BeauticiansScreen extends StatefulWidget {
  const BeauticiansScreen({super.key});
  @override
  State<BeauticiansScreen> createState() => _BeauticiansScreenState();
}

class _BeauticiansScreenState extends State<BeauticiansScreen> {
  bool loading = true;
  String? error;
  List beauticians = [];
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      beauticians =
          safeList(await ApiClient.get('/beauticians', forceRefresh: true));
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('خبيرات التجميل')),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: beauticians.length + 2,
                itemBuilder: (context, i) {
                  if (i == 0)
                    return error != null
                        ? LuxuryCard(
                            child: Text(error!,
                                style:
                                    const TextStyle(color: BhsColors.danger)))
                        : const SizedBox.shrink();
                  if (i == 1)
                    return const SectionTitle('الخبيرات',
                        subtitle: 'اختاري خبيرة أو اتركي الاختيار للدعم');
                  final a = beauticians[i - 2];
                  return LuxuryCard(
                    child: ListTile(
                      leading: const CircleAvatar(
                          backgroundColor: BhsColors.softPink,
                          foregroundColor: BhsColors.roseGoldDeep,
                          child: Icon(Icons.person,
                              color: BhsColors.roseGoldDeep)),
                      title: Text(a['name'] ?? '-',
                          style: const TextStyle(fontWeight: FontWeight.w900)),
                      subtitle: Text(
                          '${a['main_expertise_name'] ?? '-'} • ${a['city_name'] ?? '-'} • ${a['review_rating'] ?? a['rating'] ?? '-'}★'),
                      trailing: const Icon(Icons.chevron_left),
                      onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => BeauticianDetailsScreen(
                                  id: a['id'].toString()))),
                    ),
                  );
                },
              ),
      );
}

class BeauticianDetailsScreen extends StatefulWidget {
  final String id;
  const BeauticianDetailsScreen({super.key, required this.id});
  @override
  State<BeauticianDetailsScreen> createState() =>
      _BeauticianDetailsScreenState();
}

class _BeauticianDetailsScreenState extends State<BeauticianDetailsScreen> {
  bool loading = true;
  dynamic data;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      data =
          await ApiClient.get('/beauticians/${widget.id}', forceRefresh: true);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading)
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final b = data?['beautician'] ?? {};
    final p = safeList(data?['portfolio']);
    final r = safeList(data?['reviews']);
    return Scaffold(
      appBar: AppBar(title: Text(b['name'] ?? 'خبيرة التجميل')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        if (error != null)
          LuxuryCard(
              child: Text(error!,
                  style: const TextStyle(color: BhsColors.danger))),
        LuxuryCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(b['name'] ?? '-',
              style:
                  const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text('${b['main_expertise_name'] ?? '-'} • ${b['city_name'] ?? '-'}',
              style: const TextStyle(color: BhsColors.mochaDark)),
          Text(
              'التقييم: ${b['review_rating'] ?? b['rating'] ?? '-'} ★ (${b['review_count'] ?? 0})',
              style: const TextStyle(fontWeight: FontWeight.w800)),
          if ((b['bio'] ?? '').toString().isNotEmpty)
            Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(b['bio'], style: const TextStyle(height: 1.5))),
        ])),
        if (p.isNotEmpty) ...[
          const SectionTitle('نماذج الأعمال'),
          PortfolioStrip(items: p)
        ],
        const SectionTitle('التقييمات'),
        if (r.isEmpty) const LuxuryCard(child: Text('لا توجد تقييمات بعد.')),
        ...r.map((x) => LuxuryCard(
            child: ListTile(
                title: Text('${x['rating']} ★'),
                subtitle: Text(x['review_text'] ?? '')))),
      ]),
    );
  }
}

class BookingSubmittedScreen extends StatelessWidget {
  final String? bookingId;
  final String phone;
  final String? token;
  const BookingSubmittedScreen(
      {super.key, this.bookingId, required this.phone, this.token});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('تم إرسال الطلب')),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                    width: 104,
                    height: 104,
                    decoration: const BoxDecoration(
                        shape: BoxShape.circle, color: BhsColors.softPink),
                    child: const Icon(Icons.check_circle,
                        size: 82, color: BhsColors.roseGoldDeep)),
                const SizedBox(height: 20),
                const Text('تم إرسال طلبك بنجاح',
                    textAlign: TextAlign.center,
                    style:
                        TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                Text('رقم الطلب: ${bookingId ?? '-'}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: BhsColors.mochaDark)),
                const SizedBox(height: 8),
                const Text('سيتم التواصل معكِ لتأكيد الموعد والتفاصيل.',
                    textAlign: TextAlign.center),
                const SizedBox(height: 30),
                FilledButton(
                    onPressed: () => Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                            builder: (_) =>
                                MyBookingsScreen(phone: phone, token: token))),
                    child: const Text('متابعة طلباتي')),
                const SizedBox(height: 10),
                OutlinedButton(
                    onPressed: () =>
                        Navigator.popUntil(context, (r) => r.isFirst),
                    child: const Text('الرئيسية')),
              ]),
        ),
      );
}

class MyBookingsScreen extends StatefulWidget {
  final String phone;
  final String? token;
  const MyBookingsScreen({super.key, required this.phone, this.token});
  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  final phoneController = TextEditingController();
  bool loading = false;
  String? error;
  List bookings = [];
  bool get hasToken => widget.token != null && widget.token!.isNotEmpty;
  @override
  void initState() {
    super.initState();
    phoneController.text = phoneMask(widget.phone);
    loadInitial();
  }

  Future<void> loadInitial() async {
    if (phoneController.text.trim().isEmpty) {
      final prefs = await SharedPreferences.getInstance();
      phoneController.text =
          phoneMask(prefs.getString(savedCustomerPhoneKey) ?? '');
    }
    load();
  }

  Future<void> load() async {
    final phone = normalizePhone(phoneController.text);
    if (!hasToken) {
      setState(() => error = 'سجلي الدخول أولاً لعرض طلباتك بأمان.');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = await ApiClient.get('/customer/my-bookings',
          token: widget.token, forceRefresh: true);
      final prefs = await SharedPreferences.getInstance();
      if (isValidSaudiPhone(phone))
        await prefs.setString(savedCustomerPhoneKey, phone);
      bookings = safeList(data);
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('طلباتي')),
        body: ListView.builder(
          padding: const EdgeInsets.all(18),
          itemCount: bookings.length + 5,
          itemBuilder: (context, i) {
            if (i == 0)
              return !hasToken
                  ? TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      inputFormatters: phoneInputFormatters,
                      decoration: inputDecoration('رقم الجوال 05xxxxxxxx',
                          icon: Icons.phone_iphone))
                  : const SizedBox.shrink();
            if (i == 1)
              return !hasToken
                  ? const SizedBox(height: 10)
                  : const SizedBox.shrink();
            if (i == 2)
              return FilledButton.icon(
                  onPressed: load,
                  icon: const Icon(Icons.refresh),
                  label: const Text('تحديث الطلبات'));
            if (i == 3)
              return error != null
                  ? LuxuryCard(
                      child: Text(error!,
                          style: const TextStyle(color: BhsColors.danger)))
                  : const SizedBox.shrink();
            if (i == 4) {
              if (loading)
                return const Center(
                    child: Padding(
                        padding: EdgeInsets.all(18),
                        child: CircularProgressIndicator()));
              if (bookings.isEmpty)
                return const LuxuryCard(
                    child: Text('لا توجد طلبات', textAlign: TextAlign.center));
              return const SizedBox.shrink();
            }
            return BookingCard(
                booking: bookings[i - 5], token: widget.token, onReload: load);
          },
        ),
      );
}

class BookingCard extends StatelessWidget {
  final dynamic booking;
  final String? token;
  final VoidCallback onReload;
  const BookingCard(
      {super.key, required this.booking, this.token, required this.onReload});
  @override
  Widget build(BuildContext context) {
    final status = booking['status'];
    return LuxuryCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(
            child: Text('${booking['booking_number'] ?? booking['id'] ?? '-'}',
                style: const TextStyle(
                    fontWeight: FontWeight.w900, fontSize: 16))),
        StatusPill(status: status),
      ]),
      const SizedBox(height: 8),
      Text(
          '${booking['service_category_name'] ?? '-'} / ${booking['service_name'] ?? '-'}',
          style: const TextStyle(fontWeight: FontWeight.w900)),
      const SizedBox(height: 6),
      Text(
          '${booking['region_name'] ?? '-'} • ${booking['city_name'] ?? '-'} • ${booking['district_name'] ?? '-'}',
          style: const TextStyle(color: BhsColors.mochaDark)),
      if (booking['preferred_artist_name'] != null)
        Text('الخبيرة المفضلة: ${booking['preferred_artist_name']}'),
      if (booking['artist_name'] != null)
        Text('الخبيرة المعينة: ${booking['artist_name']}'),
      Text(
          '${dateOnly(booking['booking_date'])} • ${timeOnly(booking['booking_time'])}'),
      const SizedBox(height: 10),
      TimelineStatus(current: status?.toString() ?? 'new'),
      if (status == 'completed' && booking['customer_review_rating'] == null)
        Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton(
                onPressed: () => showDialog(
                    context: context,
                    builder: (_) => ReviewDialog(
                        bookingId: booking['id'],
                        token: token,
                        onSaved: onReload)),
                child: const Text('تقييم الخبيرة'))),
    ]));
  }
}

class StatusPill extends StatelessWidget {
  final dynamic status;
  const StatusPill({super.key, this.status});
  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(.26)),
      ),
      child: Text(statusArabic(status),
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w900, color: color)),
    );
  }
}

Color _statusColor(dynamic status) {
  switch (status?.toString()) {
    case 'completed':
      return Colors.green.shade700;
    case 'cancelled':
    case 'unavailable':
      return BhsColors.danger;
    case 'confirmed':
    case 'beautician_assigned':
    case 'artist_assigned':
      return BhsColors.roseGoldDeep;
    default:
      return BhsColors.mochaDark;
  }
}

class ReviewDialog extends StatefulWidget {
  final String bookingId;
  final String? token;
  final VoidCallback onSaved;
  const ReviewDialog(
      {super.key, required this.bookingId, this.token, required this.onSaved});
  @override
  State<ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<ReviewDialog> {
  int rating = 5;
  final note = TextEditingController();
  bool saving = false;
  @override
  Widget build(BuildContext context) => AlertDialog(
        title: const Text('تقييم الخبيرة'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<int>(
              value: rating,
              decoration: inputDecoration('التقييم'),
              items: [1, 2, 3, 4, 5]
                  .map(
                      (x) => DropdownMenuItem(value: x, child: Text('$x نجوم')))
                  .toList(),
              onChanged: (v) => setState(() => rating = v ?? 5)),
          const SizedBox(height: 10),
          TextField(
              controller: note,
              decoration: inputDecoration('تعليق اختياري'),
              maxLines: 3),
        ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('إلغاء')),
          FilledButton(
              onPressed: saving
                  ? null
                  : () async {
                      setState(() => saving = true);
                      try {
                        await ApiClient.post(
                            '/customer/reviews',
                            {
                              'booking_id': widget.bookingId,
                              'rating': rating,
                              'review_text': note.text.trim()
                            },
                            token: widget.token);
                        if (context.mounted) {
                          Navigator.pop(context);
                          widget.onSaved();
                        }
                      } finally {
                        if (mounted) setState(() => saving = false);
                      }
                    },
              child: const Text('حفظ'))
        ],
      );
}

class TimelineStatus extends StatelessWidget {
  final String current;
  const TimelineStatus({super.key, required this.current});
  @override
  Widget build(BuildContext context) {
    final steps = [
      'new',
      'under_review',
      'confirmed',
      'beautician_assigned',
      'completed'
    ];
    final labels = ['جديد', 'مراجعة', 'مؤكد', 'خبيرة', 'مكتمل'];
    var index = steps.indexOf(current);
    if (current == 'artist_assigned') index = 3;
    if (current == 'in_progress') index = 3;
    return Wrap(
        spacing: 6,
        runSpacing: 6,
        children: List.generate(steps.length, (i) {
          final active = index >= i;
          return Chip(
            label: Text(labels[i]),
            backgroundColor: active
                ? BhsColors.success.withOpacity(.22)
                : BhsColors.softPink.withOpacity(.65),
            side: BorderSide(
                color: active
                    ? BhsColors.success.withOpacity(.38)
                    : BhsColors.roseGold.withOpacity(.20)),
          );
        }));
  }
}

String statusArabic(dynamic status) {
  const labels = {
    'new': 'طلب جديد',
    'under_review': 'جاري المراجعة',
    'waiting_customer_confirmation': 'بانتظار تأكيد العميلة',
    'confirmed': 'تم تأكيد الحجز',
    'beautician_assigned': 'تم تعيين الخبيرة',
    'artist_assigned': 'تم تعيين الخبيرة',
    'in_progress': 'قيد التنفيذ',
    'completed': 'مكتمل',
    'cancelled': 'ملغي',
    'unavailable': 'غير متوفر'
  };
  return labels[status?.toString()] ?? status?.toString() ?? '-';
}

class AccountScreen extends StatefulWidget {
  final String token;
  const AccountScreen({super.key, required this.token});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Map customer = {};
  List addresses = [];
  List favorites = [];
  bool loading = true;
  String? error;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      customer =
          safeMap(await ApiClient.get('/customer/me', token: widget.token));
      addresses = safeList(
          await ApiClient.get('/customer/addresses', token: widget.token));
      favorites = safeList(
          await ApiClient.get('/customer/favorites', token: widget.token));
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('حسابي')),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(padding: const EdgeInsets.all(16), children: [
                if (error != null)
                  LuxuryCard(
                      child: Text(error!,
                          style: const TextStyle(color: BhsColors.danger))),
                LuxuryCard(
                    child: ListTile(
                        leading: const CircleAvatar(
                            backgroundColor: BhsColors.softPink,
                            foregroundColor: BhsColors.roseGoldDeep,
                            child: Icon(Icons.person)),
                        title: Text((customer['name'] ?? 'عميلة').toString(),
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        subtitle: Text(
                            phoneMask((customer['phone'] ?? '').toString())))),
                const SectionTitle('العناوين'),
                if (addresses.isEmpty)
                  const LuxuryCard(child: Text('لا توجد عناوين محفوظة بعد.')),
                ...addresses.map((a) => LuxuryCard(
                    child: ListTile(
                        title: Text(a['label'] ?? 'عنوان',
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        subtitle: Text(
                            '${a['region_name'] ?? '-'} • ${a['city_name'] ?? '-'} • ${a['district_name'] ?? '-'}\n${a['address'] ?? ''}')))),
                const SectionTitle('المفضلة'),
                if (favorites.isEmpty)
                  const LuxuryCard(child: Text('لا توجد خبيرات مفضلة.')),
                ...favorites.map((f) => LuxuryCard(
                    child: ListTile(
                        title: Text(f['beautician_name'] ?? '-',
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        subtitle: Text(f['main_expertise_name'] ?? '-')))),
              ]),
      );
}

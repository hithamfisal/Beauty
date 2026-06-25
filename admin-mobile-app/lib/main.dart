// ignore_for_file: deprecated_member_use, use_build_context_synchronously, curly_braces_in_flow_control_structures

import 'dart:async';
import 'dart:convert';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api');
const tenantSlug =
    String.fromEnvironment('TENANT_SLUG', defaultValue: 'beauty-home-service');
const savedAdminTokenKey = 'bhs_admin_mobile_token';
const savedAdminEmailKey = 'bhs_admin_mobile_email';
const savedAdminNameKey = 'bhs_admin_mobile_name';

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
  static const success = Color(0xFF68A97A);
  static const warning = Color(0xFFE3A047);
  static const danger = Color(0xFFE07A5F);
  static const info = Color(0xFF6F8FB8);
}

void main() => runApp(const BeautyAdminMobileApp());

class BeautyAdminMobileApp extends StatelessWidget {
  const BeautyAdminMobileApp({super.key});

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
      title: 'إدارة بيوتي',
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
              fontWeight: FontWeight.w900,
              color: BhsColors.charcoal),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: BhsColors.roseGoldDeep,
            foregroundColor: Colors.white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
            minimumSize: const Size(54, 48),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999)),
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: BhsColors.mochaDark,
            side: const BorderSide(color: BhsColors.roseGold),
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
            minimumSize: const Size(54, 48),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999)),
            textStyle: const TextStyle(fontWeight: FontWeight.w900),
          ),
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
      ),
      builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl, child: child ?? const SizedBox()),
      home: const AdminGate(),
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

String txt(dynamic v, [String fallback = '-']) {
  final s = (v ?? '').toString().trim();
  return s.isEmpty ? fallback : s;
}

String dateOnly(dynamic v) {
  final s = txt(v, '');
  if (s.isEmpty) return '-';
  return DateTime.tryParse(s)?.toString().substring(0, 10) ??
      (s.length >= 10 ? s.substring(0, 10) : s);
}

String timeOnly(dynamic v) {
  final s = txt(v, '');
  if (s.isEmpty) return '-';
  return s.length >= 5 ? s.substring(0, 5) : s;
}

List listOf(dynamic data) => data is List ? data : const [];
Map mapOf(dynamic data) => data is Map ? data : const {};

String bookingStatusLabel(String status) {
  switch (status) {
    case 'new':
      return 'طلب جديد';
    case 'under_review':
      return 'قيد المراجعة';
    case 'waiting_customer_confirmation':
      return 'بانتظار تأكيد العميلة';
    case 'confirmed':
      return 'تم التأكيد';
    case 'beautician_assigned':
    case 'artist_assigned':
      return 'تم تعيين خبيرة';
    case 'in_progress':
      return 'قيد التنفيذ';
    case 'completed':
      return 'مكتمل';
    case 'cancelled':
      return 'ملغي';
    default:
      return status.isEmpty ? '-' : status;
  }
}

String paymentLabel(String status) {
  switch (status) {
    case 'paid':
      return 'مدفوع بالكامل';
    case 'deposit_paid':
      return 'عربون مدفوع';
    case 'refunded':
      return 'مسترجع';
    case 'unpaid':
    default:
      return 'غير مدفوع';
  }
}

Color statusColor(String status) {
  switch (status) {
    case 'completed':
    case 'paid':
      return BhsColors.success;
    case 'cancelled':
    case 'unavailable':
    case 'refunded':
      return BhsColors.danger;
    case 'confirmed':
    case 'beautician_assigned':
    case 'artist_assigned':
      return BhsColors.info;
    case 'under_review':
    case 'waiting_customer_confirmation':
    case 'deposit_paid':
      return BhsColors.warning;
    default:
      return BhsColors.roseGoldDeep;
  }
}

void showToast(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating));
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

class StatusPill extends StatelessWidget {
  final String label;
  final String status;
  const StatusPill({super.key, required this.label, required this.status});

  @override
  Widget build(BuildContext context) {
    final color = statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
          color: color.withOpacity(.14),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withOpacity(.30))),
      child: Text(label,
          style: TextStyle(
              color: color, fontWeight: FontWeight.w900, fontSize: 12)),
    );
  }
}

class AdminGate extends StatefulWidget {
  const AdminGate({super.key});

  @override
  State<AdminGate> createState() => _AdminGateState();
}

class _AdminGateState extends State<AdminGate> {
  String? token;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      token = prefs.getString(savedAdminTokenKey);
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const SplashLoading();
    return token == null || token!.isEmpty
        ? const AdminLoginScreen()
        : AdminShell(token: token!);
  }
}

class SplashLoading extends StatelessWidget {
  const SplashLoading({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: LuxuryCard(
            margin: EdgeInsets.zero,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                Icon(Icons.admin_panel_settings_outlined,
                    color: BhsColors.roseGoldDeep, size: 48),
                SizedBox(height: 12),
                Text('إدارة بيوتي',
                    style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: BhsColors.charcoal)),
                SizedBox(height: 12),
                CircularProgressIndicator(),
              ],
            ),
          ),
        ),
      );
}

class AdminLoginScreen extends StatefulWidget {
  const AdminLoginScreen({super.key});

  @override
  State<AdminLoginScreen> createState() => _AdminLoginScreenState();
}

class _AdminLoginScreenState extends State<AdminLoginScreen> {
  final formKey = GlobalKey<FormState>();
  final email = TextEditingController();
  final password = TextEditingController();
  bool loading = false;
  bool obscure = true;

  Future<void> login() async {
    if (!formKey.currentState!.validate()) return;
    setState(() => loading = true);
    try {
      final data = mapOf(await ApiClient.post('/admin/login',
          {'email': email.text.trim(), 'password': password.text.trim()}));
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(savedAdminTokenKey, txt(data['token'], ''));
      final user = mapOf(data['user']);
      await prefs.setString(
          savedAdminEmailKey, txt(user['email'], email.text.trim()));
      await prefs.setString(savedAdminNameKey, txt(user['name'], 'Admin'));
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(
          builder: (_) => AdminShell(token: txt(data['token'], ''))));
    } catch (e) {
      showToast(context, 'فشل تسجيل الدخول: $e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Container(
                    width: 82,
                    height: 82,
                    decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                            colors: [BhsColors.roseGold, BhsColors.creamGold])),
                    child: const Icon(Icons.admin_panel_settings_outlined,
                        color: Colors.white, size: 42),
                  ),
                  const SizedBox(height: 16),
                  const Text('تطبيق مدير النظام',
                      style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: BhsColors.charcoal)),
                  const SizedBox(height: 6),
                  const Text('تطبيق مدير نظام بيوتي هوم سيرفس',
                      style: TextStyle(
                          color: BhsColors.mochaDark,
                          fontWeight: FontWeight.w700)),
                  const SizedBox(height: 22),
                  LuxuryCard(
                    margin: EdgeInsets.zero,
                    child: Form(
                      key: formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          TextFormField(
                            controller: email,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                                labelText: 'بريد المدير',
                                prefixIcon: Icon(Icons.email_outlined)),
                            validator: (v) => txt(v, '').contains('@')
                                ? null
                                : 'أدخل بريد المدير',
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: password,
                            obscureText: obscure,
                            decoration: InputDecoration(
                              labelText: 'كلمة المرور',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                  onPressed: () =>
                                      setState(() => obscure = !obscure),
                                  icon: Icon(obscure
                                      ? Icons.visibility_outlined
                                      : Icons.visibility_off_outlined)),
                            ),
                            validator: (v) => txt(v, '').length >= 4
                                ? null
                                : 'أدخل كلمة المرور',
                          ),
                          const SizedBox(height: 16),
                          FilledButton.icon(
                            onPressed: loading ? null : login,
                            icon: loading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.login),
                            label: const Text('دخول مدير النظام'),
                          ),
                          const SizedBox(height: 12),
                          Text('API: $apiBaseUrl',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontSize: 11, color: BhsColors.mocha)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
}

class AdminShell extends StatefulWidget {
  final String token;
  const AdminShell({super.key, required this.token});

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int index = 0;

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(savedAdminTokenKey);
    await prefs.remove(savedAdminEmailKey);
    await prefs.remove(savedAdminNameKey);
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AdminLoginScreen()),
        (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      OverviewScreen(token: widget.token),
      BookingsScreen(token: widget.token),
      CatalogScreen(token: widget.token),
      ArtistsScreen(token: widget.token),
      SystemToolsScreen(token: widget.token, onLogout: logout),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text([
          'نظرة عامة',
          'الحجوزات',
          'الخدمات والمناطق',
          'الخبيرات',
          'النظام'
        ][index]),
        actions: [
          IconButton(
              onPressed: logout,
              tooltip: 'خروج',
              icon: const Icon(Icons.logout))
        ],
      ),
      body: pages[index],
      bottomNavigationBar: NavigationBar(
        height: 76,
        elevation: 0,
        backgroundColor: Colors.white.withOpacity(.98),
        indicatorColor: BhsColors.softPink,
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'الرئيسية'),
          NavigationDestination(
              icon: Icon(Icons.event_note_outlined),
              selectedIcon: Icon(Icons.event_note),
              label: 'الحجوزات'),
          NavigationDestination(
              icon: Icon(Icons.spa_outlined),
              selectedIcon: Icon(Icons.spa),
              label: 'الخدمات'),
          NavigationDestination(
              icon: Icon(Icons.groups_outlined),
              selectedIcon: Icon(Icons.groups),
              label: 'الخبيرات'),
          NavigationDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings),
              label: 'النظام'),
        ],
      ),
    );
  }
}

class OverviewScreen extends StatefulWidget {
  final String token;
  const OverviewScreen({super.key, required this.token});

  @override
  State<OverviewScreen> createState() => _OverviewScreenState();
}

class _OverviewScreenState extends State<OverviewScreen> {
  bool loading = true;
  Map dashboard = {};
  List bookings = [];
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final d = mapOf(await ApiClient.get('/admin/dashboard',
          token: widget.token, forceRefresh: true));
      final b = listOf(await ApiClient.get('/admin/bookings?limit=6',
          token: widget.token, forceRefresh: true));
      setState(() {
        dashboard = d;
        bookings = b.take(6).toList();
      });
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: load,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null) ErrorCard(message: error!, onRetry: load),
                  HeroAdminCard(
                      name: txt(dashboard['admin_name'], 'مدير النظام')),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.25,
                    children: [
                      KpiCard(
                          title: 'كل الحجوزات',
                          value: txt(dashboard['total_bookings'], '0'),
                          icon: Icons.event_note_outlined),
                      KpiCard(
                          title: 'طلبات جديدة',
                          value: txt(dashboard['new_bookings'], '0'),
                          icon: Icons.fiber_new_outlined),
                      KpiCard(
                          title: 'طلبات اليوم',
                          value: txt(dashboard['today_bookings'], '0'),
                          icon: Icons.today_outlined),
                      KpiCard(
                          title: 'بدون خبيرة',
                          value: txt(dashboard['unassigned_bookings'], '0'),
                          icon: Icons.person_search_outlined),
                      KpiCard(
                          title: 'غير مدفوعة',
                          value: txt(dashboard['unpaid_bookings'], '0'),
                          icon: Icons.payments_outlined),
                      KpiCard(
                          title: 'خبيرات فعالات',
                          value: txt(
                              dashboard['active_artists'] ??
                                  dashboard['active_beauticians'],
                              '0'),
                          icon: Icons.groups_outlined),
                    ],
                  ),
                  const SizedBox(height: 14),
                  LuxuryCard(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SectionTitle('طلبات تحتاج متابعة'),
                          if (bookings.isEmpty)
                            const EmptyState('لا توجد حجوزات حالياً'),
                          ...bookings.map((b) => BookingMiniTile(
                              booking: mapOf(b),
                              token: widget.token,
                              onChanged: load)),
                        ]),
                  ),
                ],
              ),
      );
}

class HeroAdminCard extends StatelessWidget {
  final String name;
  const HeroAdminCard({super.key, required this.name});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          gradient: const LinearGradient(colors: [
            BhsColors.plum,
            BhsColors.roseGoldDeep,
            BhsColors.creamGold
          ], begin: Alignment.topRight, end: Alignment.bottomLeft),
          border: Border.all(color: Colors.white.withOpacity(.55)),
          boxShadow: [
            BoxShadow(
                color: BhsColors.roseGoldDeep.withOpacity(.24),
                blurRadius: 30,
                offset: const Offset(0, 14))
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                  color: Colors.white.withOpacity(.24), shape: BoxShape.circle),
              child: const Icon(Icons.admin_panel_settings_outlined,
                  color: Colors.white, size: 32),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('مرحباً، $name',
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text('متابعة الحجوزات والتشغيل من الجوال',
                        style: TextStyle(
                            color: Colors.white.withOpacity(.86),
                            fontWeight: FontWeight.w700)),
                  ]),
            ),
          ],
        ),
      );
}

class KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  const KpiCard(
      {super.key,
      required this.title,
      required this.value,
      required this.icon});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          gradient: LinearGradient(
              colors: [Colors.white, BhsColors.softPink.withOpacity(.30)],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: BhsColors.roseGold.withOpacity(.28)),
          boxShadow: [
            BoxShadow(
                color: BhsColors.mocha.withOpacity(.08),
                blurRadius: 18,
                offset: const Offset(0, 9))
          ],
        ),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                    color: BhsColors.softPink.withOpacity(.84),
                    borderRadius: BorderRadius.circular(15)),
                child: Icon(icon, color: BhsColors.roseGoldDeep, size: 21),
              ),
              Text(value,
                  style: const TextStyle(
                      color: BhsColors.charcoal,
                      fontSize: 24,
                      fontWeight: FontWeight.w900)),
              Text(title,
                  style: const TextStyle(
                      color: BhsColors.mochaDark, fontWeight: FontWeight.w800)),
            ]),
      );
}

class BookingsScreen extends StatefulWidget {
  final String token;
  const BookingsScreen({super.key, required this.token});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  bool loading = true;
  List all = [];
  String query = '';
  String status = 'all';
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final b = listOf(await ApiClient.get('/admin/bookings?limit=120',
          token: widget.token, forceRefresh: true));
      setState(() => all = b);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  List get filtered => all.where((raw) {
        final b = mapOf(raw);
        final s = txt(b['status'], 'new');
        final hay =
            '${b['booking_number']} ${b['customer_name']} ${b['customer_phone']} ${b['service_name']} ${b['city_name']}'
                .toLowerCase();
        return (status == 'all' || s == status) &&
            hay.contains(query.toLowerCase());
      }).toList();

  @override
  Widget build(BuildContext context) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
            child: Column(children: [
              TextField(
                onChanged: (v) => setState(() => query = v),
                decoration: const InputDecoration(
                    labelText: 'بحث برقم الحجز / العميلة / الخدمة',
                    prefixIcon: Icon(Icons.search)),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: status,
                decoration: const InputDecoration(
                    labelText: 'الحالة', prefixIcon: Icon(Icons.tune)),
                items: const [
                  DropdownMenuItem(value: 'all', child: Text('كل الحالات')),
                  DropdownMenuItem(value: 'new', child: Text('طلب جديد')),
                  DropdownMenuItem(
                      value: 'under_review', child: Text('قيد المراجعة')),
                  DropdownMenuItem(
                      value: 'confirmed', child: Text('تم التأكيد')),
                  DropdownMenuItem(
                      value: 'beautician_assigned',
                      child: Text('تم تعيين خبيرة')),
                  DropdownMenuItem(value: 'completed', child: Text('مكتمل')),
                  DropdownMenuItem(value: 'cancelled', child: Text('ملغي')),
                ],
                onChanged: (v) => setState(() => status = v ?? 'all'),
              ),
            ]),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: load,
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      itemCount: filtered.length + 2,
                      itemBuilder: (context, i) {
                        if (i == 0)
                          return error != null
                              ? ErrorCard(message: error!, onRetry: load)
                              : const SizedBox.shrink();
                        if (i == 1)
                          return filtered.isEmpty
                              ? const EmptyState('لا توجد حجوزات مطابقة')
                              : const SizedBox.shrink();
                        return BookingCard(
                            booking: mapOf(filtered[i - 2]),
                            token: widget.token,
                            onChanged: load);
                      },
                    ),
            ),
          ),
        ],
      );
}

class BookingMiniTile extends StatelessWidget {
  final Map booking;
  final String token;
  final VoidCallback onChanged;
  const BookingMiniTile(
      {super.key,
      required this.booking,
      required this.token,
      required this.onChanged});

  @override
  Widget build(BuildContext context) => ListTile(
        contentPadding: EdgeInsets.zero,
        leading: const CircleAvatar(
            backgroundColor: BhsColors.softPink,
            foregroundColor: BhsColors.roseGoldDeep,
            child: Icon(Icons.event_note)),
        title: Text(txt(booking['customer_name'], 'عميلة'),
            style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text(
            '${txt(booking['service_name'])} • ${dateOnly(booking['booking_date'])} ${timeOnly(booking['booking_time'])}'),
        trailing: const Icon(Icons.chevron_left),
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute(
              builder: (_) =>
                  BookingDetailsScreen(id: txt(booking['id']), token: token)));
          onChanged();
        },
      );
}

class BookingCard extends StatelessWidget {
  final Map booking;
  final String token;
  final VoidCallback onChanged;
  const BookingCard(
      {super.key,
      required this.booking,
      required this.token,
      required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final status = txt(booking['status'], 'new');
    final payment = txt(booking['payment_status'], 'unpaid');
    return LuxuryCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Text(
                  '#${txt(booking['booking_number'], txt(booking['id']).substring(0, txt(booking['id']).length > 8 ? 8 : txt(booking['id']).length))}',
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: BhsColors.charcoal))),
          StatusPill(label: bookingStatusLabel(status), status: status),
        ]),
        const SizedBox(height: 10),
        InfoLine(
            icon: Icons.person_outline,
            label: txt(booking['customer_name'], 'عميلة'),
            value: txt(booking['customer_phone'])),
        InfoLine(
            icon: Icons.spa_outlined,
            label: txt(booking['service_name']),
            value: txt(booking['service_category_name'])),
        InfoLine(
            icon: Icons.location_on_outlined,
            label: txt(booking['city_name']),
            value: txt(booking['district_name'])),
        InfoLine(
            icon: Icons.schedule_outlined,
            label: dateOnly(booking['booking_date']),
            value: timeOnly(booking['booking_time'])),
        const SizedBox(height: 10),
        Row(children: [
          StatusPill(label: paymentLabel(payment), status: payment),
          const Spacer(),
          TextButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => BookingDetailsScreen(
                      id: txt(booking['id']), token: token)));
              onChanged();
            },
            icon: const Icon(Icons.open_in_new),
            label: const Text('تفاصيل'),
          ),
        ]),
      ]),
    );
  }
}

class BookingDetailsScreen extends StatefulWidget {
  final String id;
  final String token;
  const BookingDetailsScreen(
      {super.key, required this.id, required this.token});

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  bool loading = true;
  bool saving = false;
  Map booking = {};
  List history = [];
  List events = [];
  List artists = [];
  String? error;
  String status = 'new';
  String paymentStatus = 'unpaid';
  String artistId = '';
  final adminNotes = TextEditingController();
  final estimatedPrice = TextEditingController();
  final finalPrice = TextEditingController();
  final depositAmount = TextEditingController();

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = mapOf(await ApiClient.get('/admin/bookings/${widget.id}',
          token: widget.token));
      final b = mapOf(data['booking']);
      final a = listOf(await ApiClient.get('/admin/artists',
          token: widget.token, forceRefresh: true));
      booking = b;
      history = listOf(data['history']);
      events = listOf(data['events']);
      artists = a;
      status = txt(b['status'], 'new');
      paymentStatus = txt(b['payment_status'], 'unpaid');
      artistId = txt(b['assigned_artist_id'], '');
      adminNotes.text = txt(b['admin_notes'], '');
      estimatedPrice.text = txt(b['estimated_price'], '');
      finalPrice.text = txt(b['final_price'], '');
      depositAmount.text = txt(b['deposit_amount'], '');
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> saveStatus() async {
    setState(() => saving = true);
    try {
      await ApiClient.patch(
          '/admin/bookings/${widget.id}/status', {'status': status},
          token: widget.token);
      showToast(context, 'تم تحديث حالة الحجز');
      await load();
    } catch (e) {
      showToast(context, 'تعذر تحديث الحالة: $e');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> saveDetails() async {
    setState(() => saving = true);
    try {
      await ApiClient.patch(
          '/admin/bookings/${widget.id}/details',
          {
            'estimated_price': estimatedPrice.text.trim().isEmpty
                ? null
                : estimatedPrice.text.trim(),
            'final_price':
                finalPrice.text.trim().isEmpty ? null : finalPrice.text.trim(),
            'deposit_amount': depositAmount.text.trim().isEmpty
                ? null
                : depositAmount.text.trim(),
            'payment_status': paymentStatus,
            'admin_notes': adminNotes.text.trim(),
          },
          token: widget.token);
      showToast(context, 'تم حفظ الملاحظات والدفع');
      await load();
    } catch (e) {
      showToast(context, 'تعذر الحفظ: $e');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  Future<void> assignArtist() async {
    setState(() => saving = true);
    try {
      await ApiClient.patch('/admin/bookings/${widget.id}/assign-artist',
          {'artist_id': artistId.isEmpty ? null : artistId, 'force': true},
          token: widget.token);
      showToast(context,
          artistId.isEmpty ? 'تم إلغاء تعيين الخبيرة' : 'تم تعيين الخبيرة');
      await load();
    } catch (e) {
      showToast(context, 'تعذر تعيين الخبيرة: $e');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('تفاصيل الحجز')),
        body: loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: load,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (error != null)
                      ErrorCard(message: error!, onRetry: load),
                    LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(children: [
                              Expanded(
                                  child: Text(
                                      '#${txt(booking['booking_number'], widget.id.substring(0, widget.id.length > 8 ? 8 : widget.id.length))}',
                                      style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w900,
                                          color: BhsColors.charcoal))),
                              StatusPill(
                                  label: bookingStatusLabel(
                                      txt(booking['status'], 'new')),
                                  status: txt(booking['status'], 'new')),
                            ]),
                            const SizedBox(height: 12),
                            InfoLine(
                                icon: Icons.person_outline,
                                label: 'العميلة',
                                value:
                                    '${txt(booking['customer_name'])} / ${txt(booking['customer_phone'])}'),
                            InfoLine(
                                icon: Icons.spa_outlined,
                                label: 'الخدمة',
                                value: txt(booking['service_name'])),
                            InfoLine(
                                icon: Icons.location_on_outlined,
                                label: 'الموقع',
                                value:
                                    '${txt(booking['city_name'])} - ${txt(booking['district_name'])}'),
                            InfoLine(
                                icon: Icons.schedule_outlined,
                                label: 'الموعد',
                                value:
                                    '${dateOnly(booking['booking_date'])} ${timeOnly(booking['booking_time'])}'),
                            InfoLine(
                                icon: Icons.groups_outlined,
                                label: 'الخبيرة',
                                value: txt(
                                    booking['artist_name'], 'لم يتم التعيين')),
                          ]),
                    ),
                    LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SectionTitle('متابعة الحالة'),
                            DropdownButtonFormField<String>(
                              value: status,
                              decoration: const InputDecoration(
                                  labelText: 'حالة الحجز'),
                              items: const [
                                DropdownMenuItem(
                                    value: 'new', child: Text('طلب جديد')),
                                DropdownMenuItem(
                                    value: 'under_review',
                                    child: Text('قيد المراجعة')),
                                DropdownMenuItem(
                                    value: 'waiting_customer_confirmation',
                                    child: Text('بانتظار تأكيد العميلة')),
                                DropdownMenuItem(
                                    value: 'confirmed',
                                    child: Text('تم التأكيد')),
                                DropdownMenuItem(
                                    value: 'beautician_assigned',
                                    child: Text('تم تعيين خبيرة')),
                                DropdownMenuItem(
                                    value: 'in_progress',
                                    child: Text('قيد التنفيذ')),
                                DropdownMenuItem(
                                    value: 'completed', child: Text('مكتمل')),
                                DropdownMenuItem(
                                    value: 'cancelled', child: Text('ملغي')),
                              ],
                              onChanged: (v) =>
                                  setState(() => status = v ?? status),
                            ),
                            const SizedBox(height: 10),
                            FilledButton.icon(
                                onPressed: saving ? null : saveStatus,
                                icon: const Icon(Icons.save_outlined),
                                label: const Text('حفظ الحالة')),
                          ]),
                    ),
                    LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SectionTitle('تعيين خبيرة'),
                            DropdownButtonFormField<String>(
                              value: artists.any(
                                      (a) => txt(mapOf(a)['id']) == artistId)
                                  ? artistId
                                  : '',
                              decoration: const InputDecoration(
                                  labelText: 'الخبيرة المعينة'),
                              items: [
                                const DropdownMenuItem(
                                    value: '', child: Text('بدون تعيين')),
                                ...artists.map((a) {
                                  final m = mapOf(a);
                                  return DropdownMenuItem(
                                      value: txt(m['id']),
                                      child: Text(
                                          '${txt(m['name'])} - ${txt(m['phone'])}'));
                                }),
                              ],
                              onChanged: (v) =>
                                  setState(() => artistId = v ?? ''),
                            ),
                            const SizedBox(height: 10),
                            FilledButton.icon(
                                onPressed: saving ? null : assignArtist,
                                icon: const Icon(Icons.person_add_alt),
                                label: const Text('حفظ تعيين الخبيرة')),
                          ]),
                    ),
                    LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SectionTitle('الدفع والملاحظات'),
                            DropdownButtonFormField<String>(
                              value: paymentStatus,
                              decoration: const InputDecoration(
                                  labelText: 'حالة الدفع'),
                              items: const [
                                DropdownMenuItem(
                                    value: 'unpaid', child: Text('غير مدفوع')),
                                DropdownMenuItem(
                                    value: 'deposit_paid',
                                    child: Text('عربون مدفوع')),
                                DropdownMenuItem(
                                    value: 'paid',
                                    child: Text('مدفوع بالكامل')),
                                DropdownMenuItem(
                                    value: 'refunded', child: Text('مسترجع')),
                              ],
                              onChanged: (v) => setState(
                                  () => paymentStatus = v ?? paymentStatus),
                            ),
                            const SizedBox(height: 10),
                            Row(children: [
                              Expanded(
                                  child: TextField(
                                      controller: estimatedPrice,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                          labelText: 'السعر المتوقع'))),
                              const SizedBox(width: 8),
                              Expanded(
                                  child: TextField(
                                      controller: finalPrice,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                          labelText: 'السعر النهائي'))),
                            ]),
                            const SizedBox(height: 10),
                            TextField(
                                controller: depositAmount,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                    labelText: 'العربون')),
                            const SizedBox(height: 10),
                            TextField(
                                controller: adminNotes,
                                minLines: 3,
                                maxLines: 5,
                                decoration: const InputDecoration(
                                    labelText: 'ملاحظات الإدارة')),
                            const SizedBox(height: 10),
                            FilledButton.icon(
                                onPressed: saving ? null : saveDetails,
                                icon: const Icon(Icons.note_add_outlined),
                                label: const Text('حفظ الدفع والملاحظات')),
                          ]),
                    ),
                    LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SectionTitle('سجل الحالة والأحداث'),
                            if (history.isEmpty && events.isEmpty)
                              const EmptyState('لا توجد أحداث مسجلة'),
                            ...history.map((h) => TimelineTile(
                                title: bookingStatusLabel(
                                    txt(mapOf(h)['new_status'])),
                                subtitle: txt(mapOf(h)['note']),
                                date: dateOnly(mapOf(h)['created_at']))),
                            ...events.map((e) => TimelineTile(
                                title: txt(mapOf(e)['title'],
                                    txt(mapOf(e)['event_type'])),
                                subtitle: txt(mapOf(e)['description']),
                                date: dateOnly(mapOf(e)['created_at']))),
                          ]),
                    ),
                  ],
                ),
              ),
      );
}

class CatalogScreen extends StatefulWidget {
  final String token;
  const CatalogScreen({super.key, required this.token});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  bool loading = true;
  Map catalog = {};
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      catalog = mapOf(await ApiClient.get('/admin/catalog?all=1',
          token: widget.token, forceRefresh: true));
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: load,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null) ErrorCard(message: error!, onRetry: load),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.28,
                    children: [
                      KpiCard(
                          title: 'الأقسام',
                          value:
                              '${listOf(catalog['service_categories']).length}',
                          icon: Icons.category_outlined),
                      KpiCard(
                          title: 'الخدمات',
                          value: '${listOf(catalog['services']).length}',
                          icon: Icons.spa_outlined),
                      KpiCard(
                          title: 'المناطق',
                          value: '${listOf(catalog['regions']).length}',
                          icon: Icons.map_outlined),
                      KpiCard(
                          title: 'المدن',
                          value: '${listOf(catalog['cities']).length}',
                          icon: Icons.location_city_outlined),
                    ],
                  ),
                  const SizedBox(height: 14),
                  CatalogGroup(
                      title: 'أقسام الخدمات',
                      items: listOf(catalog['service_categories']),
                      icon: Icons.category_outlined),
                  CatalogGroup(
                      title: 'الخدمات',
                      items: listOf(catalog['services']),
                      icon: Icons.spa_outlined,
                      subtitleKey: 'base_price'),
                  CatalogGroup(
                      title: 'المدن',
                      items: listOf(catalog['cities']),
                      icon: Icons.location_city_outlined),
                  CatalogGroup(
                      title: 'الأحياء',
                      items: listOf(catalog['districts']),
                      icon: Icons.pin_drop_outlined),
                ],
              ),
      );
}

class CatalogGroup extends StatelessWidget {
  final String title;
  final List items;
  final IconData icon;
  final String subtitleKey;
  const CatalogGroup(
      {super.key,
      required this.title,
      required this.items,
      required this.icon,
      this.subtitleKey = 'status'});

  @override
  Widget build(BuildContext context) => LuxuryCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SectionTitle(title),
          if (items.isEmpty) const EmptyState('لا توجد بيانات'),
          ...items.take(12).map((raw) {
            final item = mapOf(raw);
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                  backgroundColor: BhsColors.softPink,
                  foregroundColor: BhsColors.roseGoldDeep,
                  child: Icon(icon, size: 20)),
              title: Text(txt(item['name_ar'] ?? item['name']),
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              subtitle: Text(subtitleKey == 'base_price'
                  ? 'السعر الأساسي: ${txt(item['base_price'], '-')}'
                  : 'الحالة: ${txt(item['status'], '-')}'),
            );
          }),
          if (items.length > 12)
            Text('و ${items.length - 12} عنصر آخر...',
                style: const TextStyle(
                    color: BhsColors.mochaDark, fontWeight: FontWeight.w700)),
        ]),
      );
}

class ArtistsScreen extends StatefulWidget {
  final String token;
  const ArtistsScreen({super.key, required this.token});

  @override
  State<ArtistsScreen> createState() => _ArtistsScreenState();
}

class _ArtistsScreenState extends State<ArtistsScreen> {
  bool loading = true;
  List artists = [];
  String query = '';
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      artists = listOf(await ApiClient.get('/admin/artists',
          token: widget.token, forceRefresh: true));
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  List get filtered => artists.where((raw) {
        final a = mapOf(raw);
        final hay =
            '${a['name']} ${a['phone']} ${a['city_name']} ${a['main_expertise_category_name']}'
                .toLowerCase();
        return hay.contains(query.toLowerCase());
      }).toList();

  @override
  Widget build(BuildContext context) => Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
              onChanged: (v) => setState(() => query = v),
              decoration: const InputDecoration(
                  labelText: 'بحث عن خبيرة', prefixIcon: Icon(Icons.search))),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: load,
            child: loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: filtered.length + 2,
                    itemBuilder: (context, i) {
                      if (i == 0)
                        return error != null
                            ? ErrorCard(message: error!, onRetry: load)
                            : const SizedBox.shrink();
                      if (i == 1)
                        return filtered.isEmpty
                            ? const EmptyState('لا توجد خبيرات')
                            : const SizedBox.shrink();
                      final a = mapOf(filtered[i - 2]);
                      final status = txt(a['status'], 'active');
                      return LuxuryCard(
                          child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                            Row(children: [
                              const CircleAvatar(
                                  backgroundColor: BhsColors.softPink,
                                  foregroundColor: BhsColors.roseGoldDeep,
                                  child: Icon(Icons.person_outline)),
                              const SizedBox(width: 10),
                              Expanded(
                                  child: Text(txt(a['name']),
                                      style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w900,
                                          color: BhsColors.charcoal))),
                              StatusPill(
                                  label: status == 'active'
                                      ? 'فعالة'
                                      : 'غير فعالة',
                                  status: status == 'active'
                                      ? 'paid'
                                      : 'cancelled'),
                            ]),
                            const SizedBox(height: 10),
                            InfoLine(
                                icon: Icons.phone_outlined,
                                label: 'الجوال',
                                value: txt(a['phone'])),
                            InfoLine(
                                icon: Icons.location_city_outlined,
                                label: 'المدينة',
                                value: txt(a['city_name'])),
                            InfoLine(
                                icon: Icons.spa_outlined,
                                label: 'التخصص',
                                value: txt(a['main_expertise_category_name'])),
                            InfoLine(
                                icon: Icons.star_outline,
                                label: 'التقييم',
                                value: txt(a['rating'], '0')),
                          ]));
                    },
                  ),
          ),
        ),
      ]);
}

class SystemToolsScreen extends StatefulWidget {
  final String token;
  final VoidCallback onLogout;
  const SystemToolsScreen(
      {super.key, required this.token, required this.onLogout});

  @override
  State<SystemToolsScreen> createState() => _SystemToolsScreenState();
}

class _SystemToolsScreenState extends State<SystemToolsScreen> {
  bool loading = true;
  bool working = false;
  List files = [];
  String backupDir = '';
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final data = mapOf(await ApiClient.get('/admin/backups',
          token: widget.token, forceRefresh: true));
      files = listOf(data['files']);
      backupDir = txt(data['backup_dir'], '');
    } catch (e) {
      if (e.toString().contains('Super Admin access required')) {
        files = [];
        backupDir = '';
        error = null;
      } else {
        error = e.toString();
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> createBackup(String type) async {
    setState(() => working = true);
    try {
      await ApiClient.get('/admin/exports/tenant-data',
          token: widget.token, forceRefresh: true);
      showToast(context, 'تم تجهيز تصدير بيانات الشركة بنجاح');
      await load();
    } catch (e) {
      showToast(context, 'تعذر تصدير بيانات الشركة: $e');
    } finally {
      if (mounted) setState(() => working = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: load,
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (error != null) ErrorCard(message: error!, onRetry: load),
                  LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        const SectionTitle('النسخ والتصدير'),
                        const Text(
                            'تصدير بيانات الشركة فقط. نسخة SQL الكاملة متاحة للـ Super Admin من لوحة الويب.',
                            style: TextStyle(
                                color: BhsColors.mochaDark,
                                fontWeight: FontWeight.w700)),
                        const SizedBox(height: 14),
                        FilledButton.icon(
                            onPressed:
                                working ? null : () => createBackup('local'),
                            icon: const Icon(Icons.download_outlined),
                            label: const Text('تصدير بيانات الشركة')),
                        if (working)
                          const Padding(
                              padding: EdgeInsets.only(top: 12),
                              child: LinearProgressIndicator()),
                        if (backupDir.isNotEmpty)
                          Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Text('مجلد النسخ: $backupDir',
                                  style: const TextStyle(
                                      fontSize: 12, color: BhsColors.mocha))),
                      ])),
                  LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        const SectionTitle('آخر النسخ'),
                        if (files.isEmpty)
                          const EmptyState('لا توجد نسخ محفوظة'),
                        ...files.map((raw) {
                          final f = mapOf(raw);
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const CircleAvatar(
                                backgroundColor: BhsColors.softPink,
                                foregroundColor: BhsColors.roseGoldDeep,
                                child: Icon(Icons.description_outlined)),
                            title: Text(txt(f['fileName'] ?? f['name']),
                                style: const TextStyle(
                                    fontWeight: FontWeight.w900)),
                            subtitle: Text(
                                '${txt(f['sizeLabel'] ?? f['size'])} • ${txt(f['modifiedAt'] ?? f['created_at'])}'),
                          );
                        }),
                      ])),
                  LuxuryCard(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        const SectionTitle('إعدادات التطبيق'),
                        InfoLine(
                            icon: Icons.link_outlined,
                            label: 'API',
                            value: apiBaseUrl),
                        const SizedBox(height: 10),
                        OutlinedButton.icon(
                            onPressed: widget.onLogout,
                            icon: const Icon(Icons.logout),
                            label: const Text('تسجيل خروج')),
                      ])),
                ],
              ),
      );
}

class SectionTitle extends StatelessWidget {
  final String text;
  const SectionTitle(this.text, {super.key});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 12, top: 4),
        child: Row(children: [
          Container(
            width: 4,
            height: 28,
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
              child: Text(text,
                  style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w900,
                      color: BhsColors.charcoal,
                      height: 1.2))),
        ]),
      );
}

class InfoLine extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const InfoLine(
      {super.key,
      required this.icon,
      required this.label,
      required this.value});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Icon(icon, size: 18, color: BhsColors.roseGoldDeep),
          const SizedBox(width: 8),
          Text('$label: ',
              style: const TextStyle(
                  color: BhsColors.mochaDark, fontWeight: FontWeight.w800)),
          Expanded(
              child: Text(value,
                  style: const TextStyle(
                      color: BhsColors.charcoal, fontWeight: FontWeight.w800))),
        ]),
      );
}

class TimelineTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final String date;
  const TimelineTile(
      {super.key,
      required this.title,
      required this.subtitle,
      required this.date});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: BhsColors.softPink.withOpacity(.48),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: BhsColors.roseGold.withOpacity(.22)),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.radio_button_checked,
              color: BhsColors.roseGoldDeep, size: 18),
          const SizedBox(width: 8),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        color: BhsColors.charcoal)),
                if (subtitle != '-')
                  Text(subtitle,
                      style: const TextStyle(
                          color: BhsColors.mochaDark,
                          fontWeight: FontWeight.w700)),
                Text(date,
                    style:
                        const TextStyle(color: BhsColors.mocha, fontSize: 12)),
              ])),
        ]),
      );
}

class EmptyState extends StatelessWidget {
  final String message;
  const EmptyState(this.message, {super.key});

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [
            BhsColors.softPink.withOpacity(.42),
            Colors.white.withOpacity(.88)
          ], begin: Alignment.topRight, end: Alignment.bottomLeft),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: BhsColors.roseGold.withOpacity(.24)),
        ),
        child: Column(children: [
          const Icon(Icons.inbox_outlined,
              color: BhsColors.roseGoldDeep, size: 34),
          const SizedBox(height: 8),
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: BhsColors.mochaDark, fontWeight: FontWeight.w800)),
        ]),
      );
}

class ErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorCard({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => LuxuryCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('حدث خطأ',
              style: TextStyle(
                  color: BhsColors.danger,
                  fontSize: 18,
                  fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(message, style: const TextStyle(color: BhsColors.mochaDark)),
          const SizedBox(height: 10),
          OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('إعادة المحاولة')),
        ]),
      );
}

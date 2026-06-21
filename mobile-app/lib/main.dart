import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:4000/api');
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
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF8B5A2B)),
        useMaterial3: true,
        filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: const Color(0xFF6B3F19), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14))),
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
  static Future<dynamic> get(String path) async => _parse(await http.get(uri(path)));
  static Future<dynamic> post(String path, Map<String, dynamic> body) async => _parse(await http.post(uri(path), headers: {'Content-Type': 'application/json; charset=utf-8'}, body: jsonEncode(body)));
  static dynamic _parse(http.Response response) {
    final text = utf8.decode(response.bodyBytes).trim();
    dynamic data;
    try { data = text.isEmpty ? null : jsonDecode(text); }
    catch (_) { final shortText = text.length > 180 ? '${text.substring(0, 180)}...' : text; throw Exception('استجابة غير صالحة من السيرفر (${response.statusCode}): $shortText'); }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = data is Map ? (data['error'] ?? data['details'] ?? 'حدث خطأ') : 'حدث خطأ';
      throw Exception(message);
    }
    return data;
  }
}

InputDecoration inputDecoration(String label) => InputDecoration(labelText: label, filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)));
String requiredValidator(String? v) => (v == null || v.trim().isEmpty) ? 'مطلوب' : '';
String dateOnly(dynamic v) => v == null ? '-' : DateTime.tryParse(v.toString())?.toString().substring(0, 10) ?? v.toString();
String timeOnly(dynamic v) { final text = v?.toString() ?? ''; return text.isEmpty ? '-' : (text.length >= 5 ? text.substring(0,5) : text); }
String nameOf(dynamic item) => (item is Map ? (item['name_ar'] ?? item['display_name'] ?? item['name'] ?? '-') : '-').toString();
List safeList(dynamic data) => data is List ? data : [];

class HomeScreen extends StatefulWidget { const HomeScreen({super.key}); @override State<HomeScreen> createState() => _HomeScreenState(); }
class _HomeScreenState extends State<HomeScreen> {
  final phoneController = TextEditingController();
  @override void initState() { super.initState(); loadSavedPhone(); }
  Future<void> loadSavedPhone() async { final prefs = await SharedPreferences.getInstance(); final saved = prefs.getString(savedCustomerPhoneKey); if (saved != null && mounted) phoneController.text = saved; }
  @override void dispose() { phoneController.dispose(); super.dispose(); }
  void openBookings() { Navigator.push(context, MaterialPageRoute(builder: (_) => MyBookingsScreen(phone: normalizePhone(phoneController.text)))); }
  @override Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFFBF4EA),
    appBar: AppBar(title: const Text('Beauty Home Service'), centerTitle: true),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      Container(padding: const EdgeInsets.all(24), decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), gradient: const LinearGradient(colors:[Color(0xFF6B3F19), Color(0xFFB88943)])), child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('خدمات تجميل منزلية بسهولة', style: TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.bold)), SizedBox(height:8), Text('اختاري الموقع والخدمة، وسيقوم الدعم بتأكيد التوفر والسعر.', style: TextStyle(color: Colors.white, fontSize: 15))])),
      const SizedBox(height:20),
      TextField(controller: phoneController, keyboardType: TextInputType.phone, decoration: inputDecoration('رقم الجوال لمتابعة الطلبات')),
      const SizedBox(height:12), FilledButton(onPressed:()=>Navigator.push(context, MaterialPageRoute(builder:(_)=>const BookingScreen())), child: const Text('احجزي الآن', style: TextStyle(fontSize:18))),
      const SizedBox(height:10), OutlinedButton(onPressed:openBookings, child: const Text('طلباتي')),
      const SizedBox(height:14), const Text('v1.5: تحميل تدريجي للمناطق والمدن والأحياء، وتتبع الطلبات، وصورة تصميم اختيارية.', textAlign: TextAlign.center),
    ])
  );
}

class BookingScreen extends StatefulWidget { const BookingScreen({super.key}); @override State<BookingScreen> createState()=>_BookingScreenState(); }
class _BookingScreenState extends State<BookingScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController(); final phone = TextEditingController(); final eventType = TextEditingController(text:'زواج'); final people = TextEditingController(text:'1'); final address = TextEditingController(); final notes = TextEditingController(); final designImageUrl = TextEditingController();
  DateTime? bookingDate; TimeOfDay? bookingTime; bool loading = true; bool saving = false; String? error;
  List regions=[]; List cities=[]; List districts=[]; List categories=[]; List services=[];
  String? selectedRegionId; String? selectedCityId; String? selectedDistrictId; String? selectedCategoryId; String? selectedServiceId;

  @override void initState(){ super.initState(); loadSavedPhone(); loadInitialLists(); }
  Future<void> loadSavedPhone() async { final prefs=await SharedPreferences.getInstance(); final saved=prefs.getString(savedCustomerPhoneKey); if(saved!=null&&mounted) phone.text=saved; }
  @override void dispose(){ name.dispose();phone.dispose();eventType.dispose();people.dispose();address.dispose();notes.dispose();designImageUrl.dispose();super.dispose(); }

  Future<void> loadInitialLists() async {
    setState(() => loading = true);
    try {
      final results = await Future.wait([ApiClient.get('/regions'), ApiClient.get('/service-categories')]);
      regions = safeList(results[0]); categories = safeList(results[1]);
      cities = []; districts = []; services = [];
      selectedRegionId = null; selectedCityId = null; selectedDistrictId = null; selectedCategoryId = null; selectedServiceId = null;
    } catch (e) { error = e.toString(); }
    finally { if (mounted) setState(() => loading = false); }
  }
  Future<void> loadCities(String? regionId) async {
    selectedRegionId = regionId; selectedCityId = null; selectedDistrictId = null; cities = []; districts = [];
    if (regionId == null || regionId.isEmpty) { setState((){}); return; }
    setState(() => loading = true);
    try { cities = safeList(await ApiClient.get('/cities?region_id=$regionId')); }
    catch(e){ error = e.toString(); }
    finally { if(mounted) setState(()=>loading=false); }
  }
  Future<void> loadDistricts(String? cityId) async {
    selectedCityId = cityId; selectedDistrictId = null; districts = [];
    if (cityId == null || cityId.isEmpty) { setState((){}); return; }
    setState(() => loading = true);
    try { districts = safeList(await ApiClient.get('/districts?city_id=$cityId')); }
    catch(e){ error = e.toString(); }
    finally { if(mounted) setState(()=>loading=false); }
  }
  Future<void> loadServices(String? categoryId) async {
    selectedCategoryId = categoryId; selectedServiceId = null; services = [];
    if (categoryId == null || categoryId.isEmpty) { setState((){}); return; }
    setState(() => loading = true);
    try { services = safeList(await ApiClient.get('/services?category_id=$categoryId')); }
    catch(e){ error = e.toString(); }
    finally { if(mounted) setState(()=>loading=false); }
  }

  String dateText()=> bookingDate==null ? 'اختيار التاريخ' : '${bookingDate!.year}-${bookingDate!.month.toString().padLeft(2,'0')}-${bookingDate!.day.toString().padLeft(2,'0')}';
  String timeText()=> bookingTime==null ? 'اختيار الوقت' : '${bookingTime!.hour.toString().padLeft(2,'0')}:${bookingTime!.minute.toString().padLeft(2,'0')}';

  Future<void> submit() async {
    if(!formKey.currentState!.validate()) return;
    if(bookingDate==null||bookingTime==null){ ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('اختر التاريخ والوقت'))); return; }
    if([selectedRegionId,selectedCityId,selectedDistrictId,selectedCategoryId,selectedServiceId].any((e)=>e==null||e.toString().isEmpty)){ ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('أكمل اختيار الموقع والخدمة'))); return; }
    setState(()=>saving=true);
    try {
      final customerPhone=normalizePhone(phone.text);
      final created=await ApiClient.post('/bookings', {'name':name.text.trim(),'phone':customerPhone,'region_id':selectedRegionId,'city_id':selectedCityId,'district_id':selectedDistrictId,'service_category_id':selectedCategoryId,'event_type':eventType.text.trim(),'service_id':selectedServiceId,'booking_date':dateText(),'booking_time':timeText(),'people_count':int.tryParse(people.text.trim())??1,'address':address.text.trim(),'design_image_url':designImageUrl.text.trim().isEmpty?null:designImageUrl.text.trim(),'customer_notes':notes.text.trim()});
      final prefs=await SharedPreferences.getInstance(); await prefs.setString(savedCustomerPhoneKey, customerPhone);
      if(!mounted)return; Navigator.pushReplacement(context, MaterialPageRoute(builder:(_)=>BookingSubmittedScreen(bookingId:created['id']?.toString(), phone:customerPhone)));
    } catch(e){ ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('تعذر إرسال الطلب: $e'))); }
    finally { if(mounted)setState(()=>saving=false); }
  }

  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFFBF4EA), appBar:AppBar(title:const Text('طلب حجز Beauty Home Service')), body: loading?const Center(child:CircularProgressIndicator()):Form(key:formKey, child:ListView(padding:const EdgeInsets.all(18), children:[
    if(error!=null) Text('تنبيه: $error', style:TextStyle(color:Colors.orange.shade900)),
    TextFormField(controller:name, decoration:inputDecoration('اسم العميلة'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    TextFormField(controller:phone, keyboardType:TextInputType.phone, decoration:inputDecoration('رقم الجوال'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    dropdown('المنطقة', selectedRegionId, regions, (v)=>loadCities(v)), const SizedBox(height:12),
    dropdown('المدينة', selectedCityId, cities, (v)=>loadDistricts(v)), const SizedBox(height:12),
    dropdown('الحي', selectedDistrictId, districts, (v)=>setState(()=>selectedDistrictId=v)), const SizedBox(height:12),
    TextFormField(controller:eventType, decoration:inputDecoration('نوع المناسبة'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    dropdown('قسم الخدمة', selectedCategoryId, categories, (v)=>loadServices(v)), const SizedBox(height:12),
    dropdown('الخدمة', selectedServiceId, services, (v)=>setState(()=>selectedServiceId=v)), const SizedBox(height:12),
    Row(children:[Expanded(child:OutlinedButton(onPressed:()async{final d=await showDatePicker(context:context, firstDate:DateTime.now(), lastDate:DateTime.now().add(const Duration(days:365)), initialDate:DateTime.now()); if(d!=null)setState(()=>bookingDate=d);}, child:Text(dateText()))), const SizedBox(width:10), Expanded(child:OutlinedButton(onPressed:()async{final t=await showTimePicker(context:context, initialTime:const TimeOfDay(hour:18,minute:0)); if(t!=null)setState(()=>bookingTime=t);}, child:Text(timeText()))) ]), const SizedBox(height:12),
    TextFormField(controller:people, keyboardType:TextInputType.number, decoration:inputDecoration('عدد الأشخاص')), const SizedBox(height:12),
    TextFormField(controller:address, decoration:inputDecoration('العنوان'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    TextFormField(controller:designImageUrl, decoration:inputDecoration('رابط صورة التصميم - اختياري')), const SizedBox(height:12),
    TextFormField(controller:notes, minLines:2, maxLines:4, decoration:inputDecoration('ملاحظات')), const SizedBox(height:20),
    FilledButton(onPressed:saving?null:submit, child:Text(saving?'جاري الإرسال...':'إرسال الطلب'))
  ])));
  Widget dropdown(String label, String? value, List items, Function(String?) onChanged) => DropdownButtonFormField<String>(value:(value!=null && items.any((i)=>i['id']?.toString()==value))?value:null, decoration:inputDecoration(label), items:items.map<DropdownMenuItem<String>>((i)=>DropdownMenuItem(value:i['id']?.toString(), child:Text(nameOf(i)))).toList(), onChanged:onChanged, validator:(v)=>(v==null||v.isEmpty)?'مطلوب':null);
}

class BookingSubmittedScreen extends StatelessWidget { final String? bookingId; final String phone; const BookingSubmittedScreen({super.key, this.bookingId, required this.phone}); @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFFBF4EA), appBar:AppBar(title:const Text('تم إرسال الطلب')), body:Padding(padding:const EdgeInsets.all(20), child:Column(mainAxisAlignment:MainAxisAlignment.center, crossAxisAlignment:CrossAxisAlignment.stretch, children:[const Icon(Icons.check_circle, size:90, color:Color(0xFF6B3F19)), const SizedBox(height:20), const Text('تم إرسال طلبك بنجاح', textAlign:TextAlign.center, style:TextStyle(fontSize:24,fontWeight:FontWeight.bold)), const SizedBox(height:12), Text('رقم الطلب: ${bookingId ?? '-'}', textAlign:TextAlign.center), const SizedBox(height:30), FilledButton(onPressed:()=>Navigator.pushReplacement(context, MaterialPageRoute(builder:(_)=>MyBookingsScreen(phone:phone))), child:const Text('متابعة طلباتي')), const SizedBox(height:10), OutlinedButton(onPressed:()=>Navigator.popUntil(context,(r)=>r.isFirst), child:const Text('الرئيسية'))]))); }

class MyBookingsScreen extends StatefulWidget { final String phone; const MyBookingsScreen({super.key, required this.phone}); @override State<MyBookingsScreen> createState()=>_MyBookingsScreenState(); }
class _MyBookingsScreenState extends State<MyBookingsScreen> { final phoneController=TextEditingController(); bool loading=false; String? error; List bookings=[]; @override void initState(){ super.initState(); phoneController.text=widget.phone; loadInitial(); } Future<void> loadInitial() async { if(phoneController.text.trim().isEmpty){ final prefs=await SharedPreferences.getInstance(); phoneController.text=prefs.getString(savedCustomerPhoneKey)??''; } if(phoneController.text.trim().isNotEmpty) load(); } Future<void> load() async { final phone=normalizePhone(phoneController.text); if(phone.isEmpty){ setState(()=>error='أدخل رقم الجوال'); return; } setState((){loading=true;error=null;}); try{ final data=await ApiClient.get('/customer/bookings?phone=$phone'); final prefs=await SharedPreferences.getInstance(); await prefs.setString(savedCustomerPhoneKey, phone); bookings=safeList(data); }catch(e){error=e.toString();}finally{if(mounted)setState(()=>loading=false);} } @override void dispose(){phoneController.dispose();super.dispose();}
  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFFBF4EA), appBar:AppBar(title:const Text('طلباتي')), body:ListView(padding:const EdgeInsets.all(18), children:[TextField(controller:phoneController, keyboardType:TextInputType.phone, decoration:inputDecoration('رقم الجوال')), const SizedBox(height:10), FilledButton(onPressed:load, child:const Text('بحث')), if(error!=null) Padding(padding:const EdgeInsets.all(10), child:Text(error!, style:const TextStyle(color:Colors.red))), if(loading) const Center(child:CircularProgressIndicator()), if(!loading&&bookings.isEmpty) const Padding(padding:EdgeInsets.all(25), child:Text('لا توجد طلبات', textAlign:TextAlign.center)), ...bookings.map((b)=>BookingCard(booking:b))])); }
}

class BookingCard extends StatelessWidget { final dynamic booking; const BookingCard({super.key, required this.booking}); @override Widget build(BuildContext context){ final status=booking['status']; return Card(margin:const EdgeInsets.only(bottom:12), child:Padding(padding:const EdgeInsets.all(12), child:Column(crossAxisAlignment:CrossAxisAlignment.start, children:[Text('${booking['service_category_name'] ?? '-'} / ${booking['service_name'] ?? '-'}', style:const TextStyle(fontWeight:FontWeight.bold,fontSize:16)), const SizedBox(height:6), Text('${booking['region_name'] ?? '-'} • ${booking['city_name'] ?? '-'} • ${booking['district_name'] ?? '-'}'), Text('${dateOnly(booking['booking_date'])} • ${timeOnly(booking['booking_time'])}'), const SizedBox(height:8), Text('الحالة: ${statusArabic(status)}'), const SizedBox(height:8), TimelineStatus(current: status?.toString() ?? 'new')]))) ; } }

class TimelineStatus extends StatelessWidget { final String current; const TimelineStatus({super.key, required this.current}); @override Widget build(BuildContext context){ final steps=['new','under_review','confirmed','artist_assigned','completed']; final labels=['جديد','مراجعة','مؤكد','خبيرة','مكتمل']; final index=steps.indexOf(current); return Wrap(spacing:6, runSpacing:6, children:List.generate(steps.length,(i){ final active = index >= i || (current=='in_progress' && i<=3); return Chip(label:Text(labels[i]), backgroundColor:active?const Color(0xFFD8B37A):const Color(0xFFF4EEE7)); })); } }

String statusArabic(dynamic status){ const labels={'new':'طلب جديد','under_review':'جاري المراجعة','waiting_customer_confirmation':'بانتظار تأكيد العميلة','confirmed':'تم تأكيد الحجز','artist_assigned':'تم تعيين خبيرة التجميل','in_progress':'قيد التنفيذ','completed':'مكتمل','cancelled':'ملغي','unavailable':'غير متوفر'}; return labels[status?.toString()] ?? status?.toString() ?? '-'; }

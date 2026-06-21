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
        fontFamily: 'Arial',
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF8B5A2B)),
        useMaterial3: true,
        filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: const Color(0xFF6B3F19), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14))),
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
    final response = await http.post(Uri.parse('$apiBaseUrl$path'), headers: {'Content-Type': 'application/json; charset=utf-8'}, body: jsonEncode(body));
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

InputDecoration inputDecoration(String label) => InputDecoration(labelText: label, filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)));
String requiredValidator(String? v) => (v == null || v.trim().isEmpty) ? 'مطلوب' : '';
String dateOnly(dynamic v) => v == null ? '-' : DateTime.tryParse(v.toString())?.toString().substring(0, 10) ?? v.toString();
String timeOnly(dynamic v) { final text = v?.toString() ?? ''; return text.isEmpty ? '-' : (text.length >= 5 ? text.substring(0,5) : text); }
String nameOf(dynamic item) => (item is Map ? (item['name_ar'] ?? item['display_name'] ?? item['name'] ?? '-') : '-').toString();

class HomeScreen extends StatefulWidget { const HomeScreen({super.key}); @override State<HomeScreen> createState() => _HomeScreenState(); }
class _HomeScreenState extends State<HomeScreen> {
  final phoneController = TextEditingController();
  @override void initState() { super.initState(); loadSavedPhone(); }
  Future<void> loadSavedPhone() async { final prefs = await SharedPreferences.getInstance(); final saved = prefs.getString(savedCustomerPhoneKey); if (saved != null && mounted) phoneController.text = saved; }
  @override void dispose() { phoneController.dispose(); super.dispose(); }
  void openBookings() { Navigator.push(context, MaterialPageRoute(builder: (_) => MyBookingsScreen(phone: normalizePhone(phoneController.text)))); }
  @override Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFFBF4EA), appBar: AppBar(title: const Text('Beauty Home Service'), centerTitle: true),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      Container(padding: const EdgeInsets.all(24), decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), gradient: const LinearGradient(colors:[Color(0xFF6B3F19), Color(0xFFB88943)])), child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('خدمات تجميل منزلية بسهولة', style: TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.bold)), SizedBox(height:8), Text('اختاري الموقع والخدمة، وسيقوم الدعم بتأكيد التوفر والسعر.', style: TextStyle(color: Colors.white, fontSize: 15))])),
      const SizedBox(height:20), TextField(controller: phoneController, keyboardType: TextInputType.phone, decoration: inputDecoration('رقم الجوال لمتابعة الطلبات')),
      const SizedBox(height:12), FilledButton(onPressed:()=>Navigator.push(context, MaterialPageRoute(builder:(_)=>const BookingScreen())), child: const Text('احجزي الآن', style: TextStyle(fontSize:18))),
      const SizedBox(height:10), OutlinedButton(onPressed:openBookings, child: const Text('طلباتي')),
      const SizedBox(height:14), const Text('v1.4: المناطق > المدن > الأحياء، وأقسام الخدمات > الخدمات، وخبيرات التجميل.', textAlign: TextAlign.center),
    ])
  );
}

class BookingScreen extends StatefulWidget { const BookingScreen({super.key}); @override State<BookingScreen> createState()=>_BookingScreenState(); }
class _BookingScreenState extends State<BookingScreen> {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController(); final phone = TextEditingController(); final eventType = TextEditingController(text:'زواج'); final people = TextEditingController(text:'1'); final address = TextEditingController(); final notes = TextEditingController();
  DateTime? bookingDate; TimeOfDay? bookingTime; bool loading = true; bool saving = false; String? error;
  List regions=[]; List cities=[]; List districts=[]; List categories=[]; List services=[];
  String? selectedRegionId; String? selectedCityId; String? selectedDistrictId; String? selectedCategoryId; String? selectedServiceId;
  @override void initState(){ super.initState(); loadSavedPhone(); loadCatalog(); }
  Future<void> loadSavedPhone() async { final prefs=await SharedPreferences.getInstance(); final saved=prefs.getString(savedCustomerPhoneKey); if(saved!=null&&mounted) phone.text=saved; }
  @override void dispose(){ name.dispose();phone.dispose();eventType.dispose();people.dispose();address.dispose();notes.dispose();super.dispose(); }
  Future<void> loadCatalog() async { setState(()=>loading=true); try { final data=await ApiClient.get('/customer/catalog'); regions=data['regions']??[]; cities=data['cities']??[]; districts=data['districts']??[]; categories=data['service_categories']??[]; services=data['services']??[]; selectedRegionId=null; selectedCityId=null; selectedDistrictId=null; if(categories.isNotEmpty) selectedCategoryId=categories.first['id']; _setDefaultService(); } catch(e){ error=e.toString(); } finally { if(mounted) setState(()=>loading=false); } }
  List get filteredCities => cities.where((c)=>selectedRegionId==null || c['region_id']==selectedRegionId).toList();
  List get filteredDistricts => districts.where((d)=>selectedCityId==null || d['city_id']==selectedCityId).toList();
  List get filteredServices => services.where((s)=>selectedCategoryId==null || s['category_id']==selectedCategoryId).toList();
  void _setDefaultCity(){ final list=filteredCities; selectedCityId=list.isNotEmpty?list.first['id']:null; }
  void _setDefaultDistrict(){ final list=filteredDistricts; selectedDistrictId=list.isNotEmpty?list.first['id']:null; }
  void _setDefaultService(){ final list=filteredServices; selectedServiceId=list.isNotEmpty?list.first['id']:null; }
  String dateText()=> bookingDate==null ? 'اختيار التاريخ' : '${bookingDate!.year}-${bookingDate!.month.toString().padLeft(2,'0')}-${bookingDate!.day.toString().padLeft(2,'0')}';
  String timeText()=> bookingTime==null ? 'اختيار الوقت' : '${bookingTime!.hour.toString().padLeft(2,'0')}:${bookingTime!.minute.toString().padLeft(2,'0')}';
  Future<void> submit() async { if(!formKey.currentState!.validate()) return; if(bookingDate==null||bookingTime==null){ ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('اختر التاريخ والوقت'))); return; } if([selectedRegionId,selectedCityId,selectedDistrictId,selectedCategoryId,selectedServiceId].any((e)=>e==null||e.toString().isEmpty)){ ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('أكمل اختيار الموقع والخدمة'))); return; } setState(()=>saving=true); try { final customerPhone=normalizePhone(phone.text); final created=await ApiClient.post('/bookings', {'name':name.text.trim(),'phone':customerPhone,'region_id':selectedRegionId,'city_id':selectedCityId,'district_id':selectedDistrictId,'service_category_id':selectedCategoryId,'event_type':eventType.text.trim(),'service_id':selectedServiceId,'booking_date':dateText(),'booking_time':timeText(),'people_count':int.tryParse(people.text.trim())??1,'address':address.text.trim(),'customer_notes':notes.text.trim()}); final prefs=await SharedPreferences.getInstance(); await prefs.setString(savedCustomerPhoneKey, customerPhone); if(!mounted)return; Navigator.pushReplacement(context, MaterialPageRoute(builder:(_)=>BookingSubmittedScreen(bookingId:created['id']?.toString(), phone:customerPhone))); } catch(e){ ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text('تعذر إرسال الطلب: $e'))); } finally { if(mounted)setState(()=>saving=false); } }
  @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFFBF4EA), appBar:AppBar(title:const Text('طلب حجز Beauty Home Service')), body: loading?const Center(child:CircularProgressIndicator()):Form(key:formKey, child:ListView(padding:const EdgeInsets.all(18), children:[
    if(error!=null) Text('تنبيه: $error', style:TextStyle(color:Colors.orange.shade900)),
    TextFormField(controller:name, decoration:inputDecoration('اسم العميلة'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    TextFormField(controller:phone, keyboardType:TextInputType.phone, decoration:inputDecoration('رقم الجوال'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    dropdown('المنطقة', selectedRegionId, regions, (v){setState((){selectedRegionId=v; selectedCityId=null; selectedDistrictId=null;});}), const SizedBox(height:12),
    dropdown('المدينة', selectedCityId, filteredCities, (v){setState((){selectedCityId=v; selectedDistrictId=null;});}), const SizedBox(height:12),
    dropdown('الحي', selectedDistrictId, filteredDistricts, (v)=>setState(()=>selectedDistrictId=v)), const SizedBox(height:12),
    TextFormField(controller:eventType, decoration:inputDecoration('نوع المناسبة'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    dropdown('قسم الخدمة', selectedCategoryId, categories, (v){setState(()=>selectedCategoryId=v); _setDefaultService();}), const SizedBox(height:12),
    dropdown('الخدمة', selectedServiceId, filteredServices, (v)=>setState(()=>selectedServiceId=v)), const SizedBox(height:12),
    Row(children:[Expanded(child:OutlinedButton(onPressed:()async{final d=await showDatePicker(context:context, firstDate:DateTime.now(), lastDate:DateTime.now().add(const Duration(days:365)), initialDate:DateTime.now()); if(d!=null)setState(()=>bookingDate=d);}, child:Text(dateText()))), const SizedBox(width:10), Expanded(child:OutlinedButton(onPressed:()async{final t=await showTimePicker(context:context, initialTime:const TimeOfDay(hour:18,minute:0)); if(t!=null)setState(()=>bookingTime=t);}, child:Text(timeText()))) ]), const SizedBox(height:12),
    TextFormField(controller:people, keyboardType:TextInputType.number, decoration:inputDecoration('عدد الأشخاص')), const SizedBox(height:12),
    TextFormField(controller:address, decoration:inputDecoration('العنوان'), validator:(v)=>requiredValidator(v).isEmpty?null:requiredValidator(v)), const SizedBox(height:12),
    TextFormField(controller:notes, minLines:2, maxLines:4, decoration:inputDecoration('ملاحظات')), const SizedBox(height:20),
    FilledButton(onPressed:saving?null:submit, child:Text(saving?'جاري الإرسال...':'إرسال الطلب'))
  ])));
  Widget dropdown(String label, String? value, List items, Function(String?) onChanged) => DropdownButtonFormField<String>(value:(value!=null && items.any((i)=>i['id']==value))?value:null, decoration:inputDecoration(label), items:items.map<DropdownMenuItem<String>>((i)=>DropdownMenuItem(value:i['id']?.toString(), child:Text(nameOf(i)))).toList(), onChanged:onChanged, validator:(v)=>(v==null||v.isEmpty)?'مطلوب':null);
}

class BookingSubmittedScreen extends StatelessWidget { final String? bookingId; final String phone; const BookingSubmittedScreen({super.key, this.bookingId, required this.phone}); @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFFBF4EA), appBar:AppBar(title:const Text('تم إرسال الطلب')), body:Padding(padding:const EdgeInsets.all(20), child:Column(mainAxisAlignment:MainAxisAlignment.center, crossAxisAlignment:CrossAxisAlignment.stretch, children:[const Icon(Icons.check_circle, size:90, color:Color(0xFF6B3F19)), const SizedBox(height:20), const Text('تم إرسال طلبك بنجاح', textAlign:TextAlign.center, style:TextStyle(fontSize:24,fontWeight:FontWeight.bold)), const SizedBox(height:12), Text('رقم الطلب: ${bookingId ?? '-'}', textAlign:TextAlign.center), const SizedBox(height:30), FilledButton(onPressed:()=>Navigator.pushReplacement(context, MaterialPageRoute(builder:(_)=>MyBookingsScreen(phone:phone))), child:const Text('متابعة طلباتي')), const SizedBox(height:10), OutlinedButton(onPressed:()=>Navigator.popUntil(context,(r)=>r.isFirst), child:const Text('الرئيسية'))]))); }

class MyBookingsScreen extends StatefulWidget { final String phone; const MyBookingsScreen({super.key, required this.phone}); @override State<MyBookingsScreen> createState()=>_MyBookingsScreenState(); }
class _MyBookingsScreenState extends State<MyBookingsScreen> { final phoneController=TextEditingController(); bool loading=false; String? error; List bookings=[]; @override void initState(){ super.initState(); phoneController.text=widget.phone; loadInitial(); } Future<void> loadInitial() async { if(phoneController.text.trim().isEmpty){ final prefs=await SharedPreferences.getInstance(); phoneController.text=prefs.getString(savedCustomerPhoneKey)??''; } if(phoneController.text.trim().isNotEmpty) load(); } Future<void> load() async { final phone=normalizePhone(phoneController.text); if(phone.isEmpty){ setState(()=>error='أدخل رقم الجوال'); return; } setState((){loading=true;error=null;}); try{ final data=await ApiClient.get('/customer/bookings?phone=$phone'); final prefs=await SharedPreferences.getInstance(); await prefs.setString(savedCustomerPhoneKey, phone); bookings=ArraySafe.list(data); }catch(e){error=e.toString();}finally{if(mounted)setState(()=>loading=false);} } @override void dispose(){phoneController.dispose();super.dispose();} @override Widget build(BuildContext context)=>Scaffold(backgroundColor:const Color(0xFFFBF4EA), appBar:AppBar(title:const Text('طلباتي')), body:ListView(padding:const EdgeInsets.all(18), children:[TextField(controller:phoneController, keyboardType:TextInputType.phone, decoration:inputDecoration('رقم الجوال')), const SizedBox(height:10), FilledButton(onPressed:load, child:const Text('بحث')), if(error!=null) Padding(padding:const EdgeInsets.all(10), child:Text(error!, style:const TextStyle(color:Colors.red))), if(loading) const Center(child:CircularProgressIndicator()), if(!loading&&bookings.isEmpty) const Padding(padding:EdgeInsets.all(25), child:Text('لا توجد طلبات', textAlign:TextAlign.center)), ...bookings.map((b)=>Card(margin:const EdgeInsets.only(bottom:12), child:ListTile(title:Text('${b['service_category_name'] ?? '-'} / ${b['service_name'] ?? '-'}'), subtitle:Text('${b['region_name'] ?? '-'} • ${b['city_name'] ?? '-'} • ${b['district_name'] ?? '-'}\n${dateOnly(b['booking_date'])} • ${timeOnly(b['booking_time'])}\nالحالة: ${statusArabic(b['status'])}'), isThreeLine:true))) ])); }
class ArraySafe { static List list(dynamic data)=> data is List ? data : []; }
String statusArabic(dynamic status){ const labels={'new':'طلب جديد','under_review':'جاري المراجعة','waiting_customer_confirmation':'بانتظار تأكيد العميلة','confirmed':'تم تأكيد الحجز','artist_assigned':'تم تعيين خبيرة التجميل','in_progress':'قيد التنفيذ','completed':'مكتمل','cancelled':'ملغي','unavailable':'غير متوفر'}; return labels[status?.toString()] ?? status?.toString() ?? '-'; }

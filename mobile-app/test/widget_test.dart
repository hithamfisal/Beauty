import 'package:beauty_home_service/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Beauty Home Service home screen renders', (tester) async {
    await tester.pumpWidget(const BeautyHomeServiceApp());
    await tester.pumpAndSettle();

    expect(find.text('Beauty Home Service'), findsOneWidget);
  });
}

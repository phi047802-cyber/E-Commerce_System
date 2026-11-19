import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers/fake_backend.dart';

/// G7 — Onboarding 3 câu hỏi cho Renter mới → Khám phá lọc sẵn.
void main() {
  Map<String, dynamic> social(String id, String name, String serviceId, {required bool online, required int rate}) => {
        ...FakeBackend.companionJson(id: id),
        'user': {'display_name': name},
        'availability': online ? 'ONLINE' : 'OFFLINE',
        'hourly_rate': rate,
        'game': {'game_id': serviceId, 'game_name': serviceId, 'genre': 'Giải trí', 'category': 'SOCIAL'},
      };

  FakeBackend withMovieCompanions() => FakeBackend()
    ..extraSocialCompanions = [
      social('prof-m-1', 'Phim Online Rẻ', 'SOCIAL_MOVIE', online: true, rate: 90000),
      social('prof-m-2', 'Phim Offline', 'SOCIAL_MOVIE', online: false, rate: 70000),
      social('prof-m-3', 'Phim Online Đắt', 'SOCIAL_MOVIE', online: true, rate: 150000),
    ];

  Future<void> tap(WidgetTester tester, Key key) async {
    await tester.ensureVisible(find.byKey(key));
    await tester.tap(find.byKey(key));
    await tester.pumpAndSettle();
  }

  testWidgets('Renter mới: 3 câu hỏi → Khám phá tab Trò chuyện lọc đúng dịch vụ / trực tuyến / ngân sách; "Bỏ lọc" hiện tất cả', (tester) async {
    usePhoneSize(tester);
    final fb = withMovieCompanions();
    await fb.pumpApp(tester, onboarded: false);
    expect(find.text('Câu 1/3'), findsOneWidget);
    expect(find.text('Bạn muốn làm gì hôm nay?'), findsOneWidget);

    // Chưa chọn thì không đi tiếp được
    expect(tester.widget<FilledButton>(find.byKey(const Key('onboarding-next'))).onPressed, isNull);

    await tap(tester, const Key('onboarding-activity-movie'));
    await tap(tester, const Key('onboarding-next'));
    await tap(tester, const Key('onboarding-now'));
    await tap(tester, const Key('onboarding-next'));
    await tap(tester, const Key('onboarding-budget-1')); // ≤ 100.000 đ
    await tap(tester, const Key('onboarding-next'));

    expect(find.byKey(const Key('onboarding-filter-bar')), findsOneWidget);
    expect(find.textContaining('Xem phim · đang trực tuyến · ≤ 100.000 đ/giờ'), findsOneWidget);
    expect(find.text('Phim Online Rẻ'), findsOneWidget);
    expect(find.text('Phim Offline'), findsNothing);
    expect(find.text('Phim Online Đắt'), findsNothing);
    expect(find.text('Lan Chi'), findsNothing, reason: 'Lan Chi là SOCIAL_TALK, không phải Xem phim');

    await tap(tester, const Key('onboarding-filter-clear'));
    expect(find.byKey(const Key('onboarding-filter-bar')), findsNothing);
    for (final name in ['Lan Chi', 'Phim Online Rẻ', 'Phim Offline', 'Phim Online Đắt']) {
      expect(find.text(name, skipOffstage: false), findsOneWidget, reason: '$name phải có trong danh sách khi bỏ lọc');
    }

    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('onboarding_done:u-renter-01'), isTrue);
    expect(prefs.getString('onboarding_prefs:u-renter-01'), contains('"activity":"movie"'));
  });

  testWidgets('Bỏ qua → vào Khám phá không lọc, đánh dấu đã hỏi để không hỏi lại', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, onboarded: false);
    await tap(tester, const Key('onboarding-skip'));
    expect(find.text('Khám phá'), findsOneWidget);
    expect(find.byKey(const Key('onboarding-filter-bar')), findsNothing);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('onboarding_done:u-renter-01'), isTrue);
    expect(prefs.getString('onboarding_prefs:u-renter-01'), isNull);
  });

  testWidgets('Đã onboarding với lựa chọn "Chơi game" → mở App vào thẳng Khám phá, tab Trò chuyện không bị lọc', (tester) async {
    usePhoneSize(tester);
    final fb = withMovieCompanions();
    await fb.pumpApp(tester, initialLocation: '/discover?c=social', extraPrefs: {
      'onboarding_prefs:u-renter-01': '{"activity":"game","online_now":true,"max_rate":60000}',
    });
    expect(find.text('Câu 1/3'), findsNothing);
    expect(find.byKey(const Key('onboarding-filter-bar')), findsNothing);
    expect(find.text('Lan Chi'), findsOneWidget);
  });

  testWidgets('Deep link được giữ: onboarding xong mở đúng hồ sơ Companion', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, onboarded: false, initialLocation: '/companion/prof-comp-03');
    expect(find.text('Câu 1/3'), findsOneWidget);
    await tap(tester, const Key('onboarding-activity-talk'));
    await tap(tester, const Key('onboarding-next'));
    await tap(tester, const Key('onboarding-later'));
    await tap(tester, const Key('onboarding-next'));
    await tap(tester, const Key('onboarding-budget-3'));
    await tap(tester, const Key('onboarding-next'));
    expect(find.text('Hồ sơ Companion'), findsOneWidget);
  });

  testWidgets('Companion không phải trả lời onboarding', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend(role: 'COMPANION');
    await fb.pumpApp(tester, onboarded: false, initialLocation: '/bookings');
    expect(find.text('Câu 1/3'), findsNothing);
    expect(find.text('Đơn của tôi'), findsWidgets);
  });
}

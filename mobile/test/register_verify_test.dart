import 'package:flutter_test/flutter_test.dart';
import 'package:instasquad_mobile/app.dart';
import 'package:material_ui/material_ui.dart';

import 'helpers/fake_backend.dart';

/// UC01 trên App: đăng ký (chấp thuận điều khoản kênh MOBILE) → xác minh email bằng OTP.
void main() {
  Future<void> tapVisible(WidgetTester tester, Finder f) async {
    await tester.ensureVisible(f);
    await tester.pumpAndSettle();
    await tester.tap(f);
    await tester.pumpAndSettle();
  }

  Future<void> fillRegisterForm(WidgetTester tester, {String email = 'new.user@instasquad.test'}) async {
    await tester.enterText(find.byKey(const Key('register-name')), 'Người Dùng Mới');
    await tester.enterText(find.byKey(const Key('register-email')), email);
    await tester.enterText(find.byKey(const Key('register-password')), 'MatKhau#2026');
    await tester.enterText(find.byKey(const Key('register-confirm')), 'MatKhau#2026');
  }

  testWidgets('Đăng ký: bắt buộc đủ 18 tuổi + chấp thuận điều khoản, gửi kênh MOBILE, chuyển sang xác minh → nhập sai rồi đúng mã',
      (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/login');

    await tapVisible(tester, find.byKey(const Key('login-register')));
    expect(find.text('Tạo tài khoản'), findsWidgets);

    await fillRegisterForm(tester);
    await tapVisible(tester, find.byKey(const Key('register-submit')));
    expect(find.text('Bắt buộc để tham gia nền tảng'), findsOneWidget);
    expect(find.text('Cần chấp thuận điều khoản để tạo tài khoản'), findsOneWidget);
    expect(fb.calls, isNot(contains('POST /api/auth/register')), reason: 'không gửi khi chưa tick 2 ô bắt buộc');

    await tapVisible(tester, find.byKey(const Key('register-over18')));
    await tapVisible(tester, find.byKey(const Key('register-terms')));
    await tapVisible(tester, find.byKey(const Key('register-submit')));

    final body = fb.posted['/api/auth/register'] as Map;
    expect(body['email'], 'new.user@instasquad.test');
    expect(body['role'], 'RENTER');
    expect(body['is_over_18'], isTrue);
    expect(body['accept_terms_version'], 'TOS-2026.11');
    expect(body['channel'], 'MOBILE');

    // Router đưa sang màn xác minh email
    expect(find.text('Xác minh email'), findsOneWidget);
    expect(find.textContaining('new.user@instasquad.test'), findsOneWidget);

    await tapVisible(tester, find.byKey(const Key('otp-send')));
    expect(fb.calls, contains('POST /api/auth/send-verification-otp'));
    expect(find.textContaining('Gửi lại sau'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('otp-input')), '000000');
    await tapVisible(tester, find.byKey(const Key('otp-verify')));
    expect(find.textContaining('Mã xác nhận không chính xác'), findsOneWidget);
    expect(find.text('Xác minh email'), findsOneWidget, reason: 'sai mã thì ở lại màn xác minh');

    await tester.enterText(find.byKey(const Key('otp-input')), FakeBackend.validOtp);
    await tapVisible(tester, find.byKey(const Key('otp-verify')));
    expect((fb.posted['/api/auth/verify-email'] as Map)['otp'], FakeBackend.validOtp);
    expect(find.text('Lan Chi'), findsNothing, reason: 'đang ở tab Game');
    expect(find.text('Khám phá'), findsOneWidget);
    expect(find.byKey(const Key('verify-banner')), findsNothing);
  });

  testWidgets('Deep link được giữ qua Đăng ký → Xác minh email → mở đúng hồ sơ Companion', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/companion/prof-comp-03');
    await tapVisible(tester, find.byKey(const Key('login-register')));
    await fillRegisterForm(tester);
    await tapVisible(tester, find.byKey(const Key('register-over18')));
    await tapVisible(tester, find.byKey(const Key('register-terms')));
    await tapVisible(tester, find.byKey(const Key('register-submit')));

    await tapVisible(tester, find.byKey(const Key('otp-send')));
    await tester.enterText(find.byKey(const Key('otp-input')), FakeBackend.validOtp);
    await tapVisible(tester, find.byKey(const Key('otp-verify')));

    expect(find.text('Hồ sơ Companion'), findsOneWidget);
    expect(find.text('Lan Chi'), findsOneWidget);
  });

  testWidgets('Chưa xác minh: banner nhắc, đặt lịch bị EMAIL_NOT_VERIFIED → hộp thoại (trên sheet) → đóng sheet, mở màn xác minh',
      (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend()..emailVerified = false;
    await fb.pumpApp(tester, initialLocation: '/discover?c=social');
    expect(find.byKey(const Key('verify-banner')), findsOneWidget);

    await tester.tap(find.text('Lan Chi'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('20:00 19/11/2026'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('booking-confirm')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Cần xác minh email'), findsOneWidget);
    expect(find.textContaining('chưa xác minh email'), findsOneWidget);
    expect(fb.calls, isNot(contains(startsWith('POST /api/bookings/'))), reason: 'không ký quỹ khi đặt lịch thất bại');
    await tester.tap(find.text('Xác minh ngay'));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('booking-confirm')), findsNothing, reason: 'sheet đặt lịch đã đóng');
    expect(find.text('Xác minh email'), findsWidgets);
    expect(find.byKey(const Key('otp-send')), findsOneWidget);

    // Quay lại vẫn ở hồ sơ Companion
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('Hồ sơ Companion'), findsOneWidget);
  });

  testWidgets('Gửi lại OTP quá sớm: hiển thị lỗi server, vẫn cho nhập mã và đếm đúng số giây server yêu cầu', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend()
      ..emailVerified = false
      ..otpRateLimited = true;
    await fb.pumpApp(tester, initialLocation: '/verify-email');
    await tapVisible(tester, find.byKey(const Key('otp-send')));
    expect(find.textContaining('Vui lòng đợi 42 giây'), findsOneWidget);
    expect(find.text('Gửi lại sau 42s'), findsOneWidget);
    expect(tester.widget<TextField>(find.byKey(const Key('otp-input'))).enabled, isTrue);
  });

  testWidgets('Email đã tồn tại: báo lỗi, ở lại màn đăng ký, không đăng nhập', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/register');
    await fillRegisterForm(tester, email: 'taken@instasquad.test');
    await tapVisible(tester, find.byKey(const Key('register-over18')));
    await tapVisible(tester, find.byKey(const Key('register-terms')));
    await tapVisible(tester, find.byKey(const Key('register-submit')));
    expect(find.textContaining('Email này đã được sử dụng'), findsOneWidget);
    expect(find.byKey(const Key('register-submit')), findsOneWidget);
    expect(fb.calls, isNot(contains('GET /api/auth/me')));
  });

  testWidgets('Chọn vai trò Companion: nhắc hoàn tất hồ sơ/eKYC trên Web, gửi role COMPANION', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend(role: 'COMPANION');
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/register');
    await tester.tap(find.text('Companion'));
    await tester.pumpAndSettle();
    expect(find.textContaining('eKYC'), findsOneWidget);
    await fillRegisterForm(tester);
    await tapVisible(tester, find.byKey(const Key('register-over18')));
    await tapVisible(tester, find.byKey(const Key('register-terms')));
    await tapVisible(tester, find.byKey(const Key('register-submit')));
    expect((fb.posted['/api/auth/register'] as Map)['role'], 'COMPANION');
  });

  testWidgets('G9: đăng ký gửi kèm kênh nguồn first-touch đã lưu từ deep link', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/register', extraPrefs: {
      'first_touch_utm': '{"utm_source":"tiktok","utm_campaign":"xem-phim-cung"}',
    });
    await fillRegisterForm(tester);
    await tapVisible(tester, find.byKey(const Key('register-over18')));
    await tapVisible(tester, find.byKey(const Key('register-terms')));
    await tapVisible(tester, find.byKey(const Key('register-submit')));
    final body = fb.posted['/api/auth/register'] as Map;
    expect(body['utm_source'], 'tiktok');
    expect(body['utm_campaign'], 'xem-phim-cung');
    expect(body.containsKey('utm_medium'), isFalse);
  });

  test('safeNext chỉ nhận đích đến nội bộ', () {
    expect(safeNext('/companion/prof-comp-03'), '/companion/prof-comp-03');
    expect(safeNext('/discover?c=social'), '/discover?c=social');
    expect(safeNext(null), isNull);
    expect(safeNext('https://evil.example/x'), isNull);
    expect(safeNext('//evil.example'), isNull);
    expect(safeNext('javascript:alert(1)'), isNull);
  });
}

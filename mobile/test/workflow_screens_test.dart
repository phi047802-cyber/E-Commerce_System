import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers/fake_backend.dart';

/// G4: mỗi bước của UNIFIED_WORKFLOW (trừ 6b chỉ Web) có màn hình trên App và được widget test.
void main() {
  testWidgets('Chưa đăng nhập: deep link /companion/:id → Login, đăng nhập xong quay lại đúng hồ sơ', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/companion/prof-comp-03');
    expect(find.text('Đăng nhập'), findsOneWidget);

    await tester.enterText(find.byKey(const Key('login-email')), 'renter1@instasquad.test');
    await tester.enterText(find.byKey(const Key('login-password')), 'secret');
    await tester.tap(find.byKey(const Key('login-submit')));
    await tester.pumpAndSettle();

    expect(find.text('Hồ sơ Companion'), findsOneWidget);
    expect(find.text('Lan Chi'), findsOneWidget);
    expect(fb.calls, contains('POST /api/auth/login'));
  });

  testWidgets('Bước 1 — Khám phá: tab Trò chuyện liệt kê Companion SOCIAL', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, initialLocation: '/discover?c=social');
    expect(find.text('Lan Chi'), findsOneWidget);
    expect(find.text('Xem phim cùng'), findsOneWidget);
    expect(find.text('60.000 đ'), findsOneWidget);
    expect(find.text('1 slot trống'), findsOneWidget);
  });

  testWidgets('Bước 2+3 — Đặt lịch: TERMS_NOT_ACCEPTED → chấp thuận → giữ slot với request_key → ký quỹ', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend()..termsAccepted = false;
    await fb.pumpApp(tester, initialLocation: '/companion/prof-comp-03');

    await tester.tap(find.text('20:00 19/11/2026'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('booking-confirm')));
    // Nút đặt lịch hiện vòng xoay (vô hạn) trong lúc chờ hộp thoại điều khoản → không dùng pumpAndSettle ở đây.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Server yêu cầu chấp thuận điều khoản trước giao dịch đầu tiên
    expect(find.text('Chấp thuận điều khoản'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Chấp thuận'));
    await tester.pumpAndSettle();

    expect((fb.posted['/api/legal/accept'] as Map)['channel'], 'MOBILE');
    final bookingPosts = fb.calls.where((c) => c == 'POST /api/bookings').length;
    expect(bookingPosts, 2, reason: 'gửi lại sau khi chấp thuận');
    final body = fb.posted['/api/bookings'] as Map;
    expect(body['slot_id'], 'slot-c3-01');
    expect(body['request_key'], startsWith('mob-'));
    expect(fb.calls, contains('POST /api/bookings/28ce635c-45be-4e00-993f-e328fe06fa54/hold-escrow'));
    expect(find.text('Chi tiết đơn'), findsOneWidget);
  });

  testWidgets('Bước 4 — Companion thấy đồng hồ 180s và nút Chấp nhận/Từ chối', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend(role: 'COMPANION');
    await fb.pumpApp(tester, initialLocation: '/booking/28ce635c-45be-4e00-993f-e328fe06fa54');
    expect(find.textContaining('Companion phản hồi trong: 0'), findsOneWidget);
    expect(find.text('Từ chối'), findsOneWidget);
    await tester.tap(find.byKey(const Key('accept-booking')));
    await tester.pumpAndSettle();
    expect(fb.calls, contains('POST /api/bookings/28ce635c-45be-4e00-993f-e328fe06fa54/accept'));
  });

  testWidgets('Bước 3/4b — Renter chưa ký quỹ thấy nút Ký quỹ và Hủy đơn', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    fb.bookingOverride = fb.bookingJson(escrow: null);
    await fb.pumpApp(tester, initialLocation: '/booking/28ce635c-45be-4e00-993f-e328fe06fa54');
    expect(find.text('Ký quỹ 60.000 đ'), findsOneWidget);
    expect(find.text('Hủy đơn'), findsOneWidget);
    expect(find.text('Chấp nhận'), findsNothing);
  });

  testWidgets('Đơn của tôi: tách Đang xử lý / Đã kết thúc', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, initialLocation: '/bookings');
    expect(find.text('Đang xử lý'), findsOneWidget);
    expect(find.text('Đã kết thúc'), findsOneWidget);
    expect(find.text('Chờ xác nhận (180s)'), findsOneWidget);
    expect(find.text('Hoàn tất'), findsOneWidget);
  });

  testWidgets('Bước 5 — Phòng phiên: tin nhắn, nhãn che thông tin, gửi tin', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, initialLocation: '/session/sess-1');
    expect(find.text('Chào bạn!'), findsOneWidget);
    expect(find.text('Đã che thông tin liên lạc'), findsOneWidget);
    expect(find.byKey(const Key('session-end')), findsOneWidget);

    await tester.enterText(find.byKey(const Key('chat-input')), 'Hello');
    await tester.tap(find.byTooltip('Gửi'));
    await tester.pumpAndSettle();
    expect((fb.posted['/api/sessions/sess-1/messages'] as Map)['content'], 'Hello');
  });

  testWidgets('Bước 6 — Sau khi kết thúc: Renter nghiệm thu hoặc báo sự cố', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend()..sessionStatus = 'ENDED';
    await fb.pumpApp(tester, initialLocation: '/session/sess-1');
    expect(find.byKey(const Key('accept-fulfillment')), findsOneWidget);
    expect(find.textContaining('Tự nghiệm thu sau'), findsOneWidget);

    await tester.tap(find.byKey(const Key('report-issue')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Companion không có mặt'));
    await tester.enterText(find.byKey(const Key('issue-description')), 'Companion không vào phòng sau 15 phút.');
    await tester.tap(find.byKey(const Key('issue-submit')));
    await tester.pumpAndSettle();
    final body = fb.posted['/api/bookings/28ce635c-45be-4e00-993f-e328fe06fa54/report-issue'] as Map;
    expect(body['reason_category'], 'NO_SHOW');
  });

  testWidgets('Bước 3/7 — Ví: số dư, sổ cái, nạp tiền mô phỏng', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, initialLocation: '/wallet');
    expect(find.text('440.000 đ'), findsWidgets);
    expect(find.text('Ký quỹ đặt lịch'), findsOneWidget);
    expect(find.text('−60.000 đ'), findsOneWidget);

    await tester.tap(find.byKey(const Key('topup-open')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('topup-create')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('topup-success')));
    await tester.pumpAndSettle();
    expect(fb.posted['/api/payments/simulate'], {'payment_id': 'pay-1', 'outcome': 'SUCCESS'});
  });

  testWidgets('Bước 8 — Đánh giá đơn hoàn tất', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    fb.bookingOverride = fb.bookingJson(status: 'COMPLETED', escrow: 'RELEASED');
    await fb.pumpApp(tester, initialLocation: '/booking/28ce635c-45be-4e00-993f-e328fe06fa54');
    await tester.tap(find.byKey(const Key('open-review')));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('4 sao'));
    await tester.tap(find.byKey(const Key('review-submit')));
    await tester.pumpAndSettle();
    final body = fb.posted['/api/reviews'] as Map;
    expect(body['rating'], 4);
    expect(body['booking_id'], '28ce635c-45be-4e00-993f-e328fe06fa54');
  });

  testWidgets('Quy trình 8 bước & Điều khoản mở được khi chưa đăng nhập', (tester) async {
    usePhoneSize(tester);
    final fb = FakeBackend();
    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/workflow');
    expect(find.text('Quy trình 8 bước'), findsOneWidget);
    expect(find.text('Ký quỹ Escrow'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Đánh giá 2 chiều'), 200);
    expect(find.text('Đánh giá 2 chiều'), findsOneWidget);

    await fb.pumpApp(tester, loggedIn: false, initialLocation: '/terms');
    expect(find.textContaining('TOS-2026.11'), findsOneWidget);
    expect(find.text('V01'), findsOneWidget);
  });
}

import 'dart:convert';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:instasquad_mobile/app.dart';
import 'package:instasquad_mobile/core/api_client.dart';
import 'package:instasquad_mobile/core/auth_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Backend giả: JSON theo đúng hình dạng API thật (đã đối chiếu với server :4000 ngày 2026-11-18).
class FakeBackend {
  FakeBackend({this.role = 'RENTER'});

  final String role;
  final List<String> calls = [];
  final Map<String, Object?> posted = {};
  bool termsAccepted = true;
  bool emailVerified = true;

  /// Lần gửi OTP tiếp theo bị giới hạn tần suất (server: 1 lần / 60 giây).
  bool otpRateLimited = false;

  /// Mã OTP hợp lệ trong backend giả (server thật gửi qua email / log máy chủ).
  static const validOtp = '482913';

  String? registeredEmail;

  String get userId => role == 'RENTER' ? 'u-renter-01' : 'u-comp-03';

  Map<String, dynamic> get me => {
        'user_id': userId,
        'email': registeredEmail ?? (role == 'RENTER' ? 'renter1@instasquad.test' : 'companion3@instasquad.test'),
        'display_name': role == 'RENTER' ? 'Minh Hoàng' : 'Lan Chi',
        'role': role,
        'is_email_verified': emailVerified,
      };

  static Map<String, dynamic> companionJson({String id = 'prof-comp-03', String category = 'SOCIAL'}) => {
        'profile_id': id,
        'user_id': 'u-comp-03',
        'hourly_rate': 60000,
        'trust_score': 90,
        'availability': 'ONLINE',
        'verification_status': 'VERIFIED',
        'user': {'display_name': 'Lan Chi'},
        'game': {
          'game_id': 'SOCIAL_TALK',
          'game_name': 'Tâm sự & Lắng nghe',
          'genre': 'Trò chuyện',
          'category': category,
          'description': 'Trò chuyện, chia sẻ áp lực học tập/công việc.',
        },
        'tier': null,
        'slots': [
          {'slot_id': 'slot-c3-01', 'start_time': '2026-11-19T13:00:00.000Z', 'end_time': '2026-11-19T14:00:00.000Z', 'status': 'AVAILABLE'},
          {'slot_id': 'slot-c3-02', 'start_time': '2026-11-19T15:00:00.000Z', 'end_time': '2026-11-19T16:00:00.000Z', 'status': 'BOOKED'},
        ],
      };

  Map<String, dynamic> bookingJson({
    String status = 'PENDING_ACCEPTANCE',
    String? escrow = 'HELD',
    String? sessionId,
    List<Map<String, dynamic>> reviews = const [],
  }) =>
      {
        'booking_id': '28ce635c-45be-4e00-993f-e328fe06fa54',
        'renter_id': 'u-renter-01',
        'profile_id': 'prof-comp-03',
        'start_time': '2026-11-19T13:00:00.000Z',
        'duration_hours': 1,
        'total_fee_snapshot': 60000,
        'status': status,
        'response_deadline': DateTime.now().toUtc().add(const Duration(seconds: 150)).toIso8601String(),
        'confirm_deadline': null,
        'cancel_reason': null,
        'escrow': escrow == null ? null : {'amount': 60000, 'status': escrow},
        'session': sessionId == null ? null : {'session_id': sessionId, 'status': 'SCHEDULED'},
        'companion': {
          'user_id': 'u-comp-03',
          'user': {'display_name': 'Lan Chi'},
          'game': {'game_id': 'SOCIAL_TALK', 'game_name': 'Tâm sự & Lắng nghe', 'category': 'SOCIAL'},
        },
        'renter': {'user_id': 'u-renter-01', 'display_name': 'Minh Hoàng'},
        'reviews': reviews,
        'dispute': null,
      };

  Map<String, dynamic>? bookingOverride;
  String sessionStatus = 'ACTIVE';

  http.Response _ok(Object? data, [int status = 200]) =>
      http.Response.bytes(utf8.encode(jsonEncode({'success': true, 'data': data})), status,
          headers: {'content-type': 'application/json; charset=utf-8'});

  http.Response _err(String code, String message, int status) =>
      http.Response.bytes(utf8.encode(jsonEncode({'success': false, 'error': {'code': code, 'message': message}})), status,
          headers: {'content-type': 'application/json; charset=utf-8'});

  late final MockClient client = MockClient((req) async {
    final path = req.url.path;
    final key = '${req.method} $path';
    calls.add(key);
    if (req.method == 'POST') posted[path] = req.body.isEmpty ? null : jsonDecode(req.body);

    switch (key) {
      case 'POST /api/auth/login':
        // Đăng nhập thật trả kèm is_email_verified; đăng ký thì không (đối chiếu server :4100 ngày 2026-11-19)
        return _ok({'token': 'test-token', 'user': me});
      case 'GET /api/auth/me':
        return _ok(me);
      case 'POST /api/auth/register':
        final body = jsonDecode(req.body) as Map<String, dynamic>;
        if (body['email'] == 'taken@instasquad.test') return _err('EMAIL_ALREADY_EXISTS', 'Email này đã được sử dụng.', 409);
        registeredEmail = body['email'] as String;
        emailVerified = false;
        termsAccepted = body['accept_terms_version'] == 'TOS-2026.11';
        return _ok({
          'token': 'test-token',
          'user': {'user_id': userId, 'email': registeredEmail, 'display_name': body['display_name'], 'role': body['role']},
        }, 201);
      case 'POST /api/auth/send-verification-otp':
        if (otpRateLimited) return _err('OTP_RATE_LIMITED', 'Vui lòng đợi 42 giây trước khi yêu cầu gửi lại mã OTP.', 422);
        return _ok({'message': 'Nếu email tồn tại trong hệ thống và chưa xác minh, mã xác nhận OTP đã được gửi.'});
      case 'POST /api/auth/verify-email':
        final otp = (jsonDecode(req.body) as Map<String, dynamic>)['otp'];
        if (otp != validOtp) return _err('OTP_INVALID', 'Mã xác nhận không chính xác. Bạn còn 4 lần thử.', 422);
        emailVerified = true;
        return _ok({'message': 'Xác minh email thành công!', 'is_email_verified': true});
      case 'GET /api/games':
        final c = req.url.queryParameters['category'] ?? 'GAME';
        return _ok([
          if (c == 'SOCIAL') {'game_id': 'SOCIAL_MOVIE', 'game_name': 'Xem phim cùng', 'category': 'SOCIAL', 'genre': 'Giải trí'},
          if (c == 'GAME') {'game_id': 'LMHT', 'game_name': 'Liên Minh Huyền Thoại', 'category': 'GAME', 'genre': 'MOBA'},
        ]);
      case 'GET /api/companions':
        final c = req.url.queryParameters['category'] ?? 'GAME';
        return _ok(c == 'SOCIAL' ? [companionJson()] : <Object>[]);
      case 'GET /api/companions/prof-comp-03':
        return _ok(companionJson());
      case 'POST /api/bookings':
        // Thứ tự kiểm tra giống server thật: email (UC01) trước điều khoản (D39)
        if (!emailVerified) return _err('EMAIL_NOT_VERIFIED', 'Tài khoản chưa xác minh email (UC01). Vui lòng xác minh email để đặt lịch.', 403);
        if (!termsAccepted) return _err('TERMS_NOT_ACCEPTED', 'Bạn cần chấp thuận Điều khoản TOS-2026.11.', 403);
        return _ok(bookingJson(escrow: null), 201);
      case 'POST /api/legal/accept':
        termsAccepted = true;
        return _ok({'current_version': 'TOS-2026.11', 'accepted': true}, 201);
      case 'GET /api/bookings':
        return _ok([bookingJson(), bookingJson(status: 'COMPLETED')..['booking_id'] = 'b-done-0001']);
      case 'GET /api/legal/terms':
        return _ok({
          'version': 'TOS-2026.11',
          'effective_date': '2026-11-18',
          'key_clauses': ['Hợp đồng hình thành khi Escrow HELD thành công.'],
          'violations': [
            {'code': 'V01', 'title': 'Chia sẻ liên lạc / lôi kéo giao dịch ngoài', 'severity': 'MEDIUM', 'trust_delta': -10, 'money_note': '—'},
          ],
        });
      case 'GET /api/wallet/me':
        return _ok({
          'available_balance': 440000,
          'escrow_balance': 60000,
          'entries': [
            {
              'entry_id': 'e1',
              'direction': 'DEBIT',
              'balance_type': 'AVAILABLE',
              'amount': 60000,
              'balance_after': 440000,
              'created_at': '2026-11-18T14:22:14.626Z',
              'transaction': {'txn_type': 'ESCROW_HOLD', 'booking_id': 'b1'},
            },
          ],
        });
      case 'POST /api/payments/create-topup':
        return _ok({'payment_id': 'pay-1', 'amount': 100000, 'status': 'PENDING'}, 201);
      case 'POST /api/payments/simulate':
        return _ok({'status': 'SUCCESS'});
      case 'GET /api/sessions/sess-1':
        return _ok({
          'session': {
            'session_id': 'sess-1',
            'status': sessionStatus,
            'booking': {
              'booking_id': '28ce635c-45be-4e00-993f-e328fe06fa54',
              'status': 'IN_SESSION',
              'total_fee_snapshot': 60000,
              'confirm_deadline': sessionStatus == 'ENDED'
                  ? DateTime.now().toUtc().add(const Duration(minutes: 14)).toIso8601String()
                  : null,
              'renter': {'user_id': 'u-renter-01', 'display_name': 'Minh Hoàng'},
              'companion': {'user_id': 'u-comp-03', 'display_name': 'Lan Chi'},
            },
          },
          'is_staff': false,
        });
      case 'GET /api/sessions/sess-1/messages':
        if (req.url.queryParameters['afterId'] != null) return _ok(<Object>[]);
        return _ok([
          {'message_id': 1, 'sender_id': 'u-comp-03', 'sender_name': 'Lan Chi', 'content': 'Chào bạn!', 'is_censored': false, 'created_at': '2026-11-19T13:01:00.000Z'},
          {'message_id': 2, 'sender_id': 'u-renter-01', 'sender_name': 'Minh Hoàng', 'content': 'Số mình là [đã ẩn]', 'is_censored': true, 'created_at': '2026-11-19T13:02:00.000Z'},
        ]);
    }
    if (req.method == 'GET' && path.startsWith('/api/bookings/')) {
      return _ok(bookingOverride ?? bookingJson());
    }
    if (req.method == 'POST' && (path.startsWith('/api/bookings/') || path.startsWith('/api/sessions/') || path == '/api/reviews')) {
      return _ok({'ok': true});
    }
    return _err('NOT_FOUND', 'Không tìm thấy $key', 404);
  });

  /// Dựng App đầy đủ (router + AppScope) với backend giả.
  Future<void> pumpApp(WidgetTester tester, {bool loggedIn = true, String initialLocation = '/discover'}) async {
    SharedPreferences.setMockInitialValues(loggedIn ? {'token': 'test-token'} : {});
    final api = ApiClient(httpClient: client, baseUrl: 'http://test');
    final auth = AuthState(api);
    await tester.runAsync(auth.restore);
    // UniqueKey: gọi pumpApp lần 2 trong cùng test dựng router mới thay vì tái dùng State cũ.
    await tester.pumpWidget(
        InstaSquadApp(key: UniqueKey(), api: api, auth: auth, enableDeepLinks: false, initialLocation: initialLocation));
    await tester.pumpAndSettle();
  }
}

/// Màn hình điện thoại nhỏ (360×800) để bắt lỗi tràn bố cục.
void usePhoneSize(WidgetTester tester) {
  tester.view.physicalSize = const Size(360 * 3, 800 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

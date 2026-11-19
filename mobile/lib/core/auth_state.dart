import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'config.dart';

class AppUser {
  AppUser({required this.id, required this.email, required this.displayName, required this.role, this.emailVerified});

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['user_id'] as String,
        email: j['email'] as String,
        displayName: j['display_name'] as String,
        role: j['role'] as String,
        emailVerified: j['is_email_verified'] as bool?,
      );

  final String id;
  final String email;
  final String displayName;
  final String role;

  /// `null` khi server chưa trả trường này (vd. phản hồi đăng nhập) — chỉ coi là chưa xác minh khi bằng `false`.
  final bool? emailVerified;

  bool get isRenter => role == 'RENTER';
  bool get isCompanion => role == 'COMPANION';
  bool get needsEmailVerification => emailVerified == false;
}

/// Trạng thái đăng nhập (token JWT lưu cục bộ). Mobile hỗ trợ Renter & Companion; CS/Admin dùng Web Portal.
class AuthState extends ChangeNotifier {
  AuthState(this.api, {SharedPreferences? prefs}) : _prefs = prefs;

  final ApiClient api;
  SharedPreferences? _prefs;
  AppUser? user;
  bool restoring = true;

  bool get isLoggedIn => user != null;

  Future<void> restore() async {
    _prefs ??= await SharedPreferences.getInstance();
    final saved = _prefs!.getString('token');
    if (saved != null) {
      api.token = saved;
      try {
        user = await _fetchMe();
      } on Exception {
        api.token = null;
        await _prefs!.remove('token');
      }
    }
    restoring = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final data = await api.post('/api/auth/login', body: {'email': email.trim().toLowerCase(), 'password': password})
        as Map<String, dynamic>;
    await _adopt(data);
  }

  /// Đăng ký tài khoản mới (UC01) từ App: chấp thuận điều khoản hiện hành ngay lúc đăng ký (kênh MOBILE).
  /// Server tạo tài khoản ở trạng thái chưa xác minh email; xác minh bằng OTP ở [sendVerificationOtp] / [verifyEmail].
  Future<void> register({
    required String email,
    required String password,
    required String displayName,
    required String role,
  }) async {
    final data = await api.post('/api/auth/register', body: {
      'email': email.trim().toLowerCase(),
      'password': password,
      'display_name': displayName.trim(),
      'role': role,
      'is_over_18': true,
      'accept_terms_version': AppConfig.termsVersion,
      'channel': 'MOBILE',
    }) as Map<String, dynamic>;
    await _adopt(data);
  }

  /// Gửi mã OTP 6 số tới email đang đăng nhập (server giới hạn 1 lần / 60 giây, mã hết hạn sau 10 phút).
  Future<void> sendVerificationOtp() async {
    final email = user?.email;
    if (email == null) return;
    await api.post('/api/auth/send-verification-otp', body: {'email': email});
  }

  /// Xác minh email bằng OTP rồi làm mới thông tin người dùng.
  Future<void> verifyEmail(String otp) async {
    final email = user?.email;
    if (email == null) return;
    await api.post('/api/auth/verify-email', body: {'email': email, 'otp': otp.trim()});
    await refresh();
  }

  Future<void> refresh() async {
    if (api.token == null) return;
    user = await _fetchMe();
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    user = null;
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.remove('token');
    notifyListeners();
  }

  Future<AppUser> _fetchMe() async => AppUser.fromJson(await api.get('/api/auth/me') as Map<String, dynamic>);

  /// Nhận token + user từ đăng nhập/đăng ký. Phản hồi đăng nhập có sẵn `is_email_verified`; phản hồi đăng ký thì không
  /// (đã đối chiếu server thật) → khi thiếu, lấy hồ sơ đầy đủ từ /api/auth/me.
  Future<void> _adopt(Map<String, dynamic> data) async {
    final basic = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    if (!basic.isRenter && !basic.isCompanion) {
      throw ApiException('ROLE_NOT_SUPPORTED_ON_MOBILE', 'Vai trò ${basic.role} vui lòng dùng Web Portal.');
    }
    api.token = data['token'] as String;
    var full = basic;
    if (basic.emailVerified == null) {
      try {
        full = await _fetchMe();
      } on Exception {
        full = basic;
      }
    }
    user = full;
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.setString('token', api.token!);
    notifyListeners();
  }
}

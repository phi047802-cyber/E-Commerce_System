import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

class AppUser {
  AppUser({required this.id, required this.email, required this.displayName, required this.role});

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        id: j['user_id'] as String,
        email: j['email'] as String,
        displayName: j['display_name'] as String,
        role: j['role'] as String,
      );

  final String id;
  final String email;
  final String displayName;
  final String role;

  bool get isRenter => role == 'RENTER';
  bool get isCompanion => role == 'COMPANION';
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
        final me = await api.get('/api/auth/me') as Map<String, dynamic>;
        user = AppUser.fromJson(me);
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
    final u = AppUser.fromJson(data['user'] as Map<String, dynamic>);
    if (!u.isRenter && !u.isCompanion) {
      throw ApiException('ROLE_NOT_SUPPORTED_ON_MOBILE', 'Vai trò ${u.role} vui lòng dùng Web Portal.');
    }
    api.token = data['token'] as String;
    user = u;
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.setString('token', api.token!);
    notifyListeners();
  }

  Future<void> logout() async {
    api.token = null;
    user = null;
    _prefs ??= await SharedPreferences.getInstance();
    await _prefs!.remove('token');
    notifyListeners();
  }
}

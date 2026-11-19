import 'package:flutter/widgets.dart';

import 'api_client.dart';
import 'auth_state.dart';

/// Cung cấp ApiClient + AuthState cho cây widget (không cần package quản lý state ngoài).
class AppScope extends InheritedNotifier<AuthState> {
  const AppScope({super.key, required this.api, required AuthState auth, required super.child}) : super(notifier: auth);

  final ApiClient api;

  AuthState get auth => notifier!;

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope không có trong cây widget');
    return scope!;
  }
}

import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import 'core/api_client.dart';
import 'core/auth_state.dart';
import 'core/deep_links.dart';
import 'core/scope.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/register_screen.dart';
import 'features/auth/verify_email_screen.dart';
import 'features/booking/booking_detail_screen.dart';
import 'features/booking/bookings_screen.dart';
import 'features/discover/companion_detail_screen.dart';
import 'features/discover/discover_screen.dart';
import 'features/home/home_shell.dart';
import 'features/legal/terms_screen.dart';
import 'features/session/session_room_screen.dart';
import 'features/wallet/wallet_screen.dart';
import 'features/workflow/workflow_screen.dart';

/// Màu chủ đạo đồng bộ Web (#E11D2E trên nền tối).
ThemeData buildTheme() {
  const red = Color(0xFFE11D2E);
  final scheme = ColorScheme.fromSeed(seedColor: red, brightness: Brightness.dark, primary: red, surface: const Color(0xFF141414));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: const Color(0xFF0B0B0B),
    appBarTheme: const AppBarTheme(backgroundColor: Color(0xFF0B0B0B), centerTitle: false),
    cardTheme: const CardThemeData(color: Color(0xFF141414), margin: EdgeInsets.zero),
  );
}

/// Chỉ chấp nhận đích đến nội bộ của App (`/…`), không nhận URL tuyệt đối hay `//host`.
String? safeNext(String? next) {
  if (next == null || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

GoRouter buildRouter(AuthState auth, {String initialLocation = '/discover'}) {
  const publicPaths = {'/login', '/register', '/workflow', '/terms'};
  return GoRouter(
    initialLocation: initialLocation,
    refreshListenable: auth,
    redirect: (context, state) {
      if (auth.restoring) return null;
      final loc = state.matchedLocation;
      if (!auth.isLoggedIn && !publicPaths.contains(loc)) {
        // Giữ đích đến (vd. từ deep link) để quay lại sau khi đăng nhập
        return '/login?next=${Uri.encodeComponent(state.uri.toString())}';
      }
      final next = safeNext(state.uri.queryParameters['next']);
      if (auth.isLoggedIn && loc == '/login') return next ?? '/discover';
      // Vừa đăng ký xong → xác minh email (UC01)
      if (auth.isLoggedIn && loc == '/register') {
        return next == null ? '/verify-email' : '/verify-email?next=${Uri.encodeComponent(next)}';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/', redirect: (_, __) => '/discover'),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/verify-email',
        builder: (_, s) => VerifyEmailScreen(next: safeNext(s.uri.queryParameters['next'])),
      ),
      GoRoute(path: '/workflow', builder: (_, __) => const WorkflowScreen()),
      GoRoute(path: '/terms', builder: (_, __) => const TermsScreen()),
      ShellRoute(
        builder: (context, state, child) => HomeShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: '/discover',
            builder: (_, state) => DiscoverScreen(initialCategory: state.uri.queryParameters['c'] == 'social' ? 'SOCIAL' : 'GAME'),
          ),
          GoRoute(path: '/bookings', builder: (_, __) => const BookingsScreen()),
          GoRoute(path: '/wallet', builder: (_, __) => const WalletScreen()),
        ],
      ),
      GoRoute(path: '/companion/:id', builder: (_, s) => CompanionDetailScreen(profileId: s.pathParameters['id']!)),
      GoRoute(path: '/booking/:id', builder: (_, s) => BookingDetailScreen(bookingId: s.pathParameters['id']!)),
      GoRoute(path: '/session/:id', builder: (_, s) => SessionRoomScreen(sessionId: s.pathParameters['id']!)),
    ],
  );
}

class InstaSquadApp extends StatefulWidget {
  const InstaSquadApp({
    super.key,
    required this.api,
    required this.auth,
    this.enableDeepLinks = true,
    this.initialLocation = '/discover',
  });

  final ApiClient api;
  final AuthState auth;
  final bool enableDeepLinks;

  /// Màn hình mở đầu tiên (test dùng để mở thẳng một route).
  final String initialLocation;

  @override
  State<InstaSquadApp> createState() => _InstaSquadAppState();
}

class _InstaSquadAppState extends State<InstaSquadApp> {
  late final GoRouter _router = buildRouter(widget.auth, initialLocation: widget.initialLocation);
  StreamSubscription<Uri>? _linkSub;

  @override
  void initState() {
    super.initState();
    if (widget.enableDeepLinks) {
      // Nhận cả link mở App lúc khởi động lẫn khi App đang chạy (Android App Links / iOS Universal Links / instasquad://)
      _linkSub = AppLinks().uriLinkStream.listen((uri) {
        // G9: giữ kênh nguồn của link đầu tiên mở App để gửi kèm khi đăng ký
        widget.auth.rememberFirstTouchUtm(utmFromUri(uri));
        final location = deepLinkToLocation(uri);
        if (location != null) _router.go(location);
      });
    }
  }

  @override
  void dispose() {
    _linkSub?.cancel();
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScope(
      api: widget.api,
      auth: widget.auth,
      child: MaterialApp.router(
        title: 'INSTASQUAD',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        routerConfig: _router,
      ),
    );
  }
}

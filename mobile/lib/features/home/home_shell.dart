import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/scope.dart';

/// Khung chính sau đăng nhập: 3 tab Khám phá / Đơn của tôi / Ví.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  static const _tabs = ['/discover', '/bookings', '/wallet'];

  int get _index {
    final i = _tabs.indexWhere((t) => location.startsWith(t));
    return i < 0 ? 0 : i;
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    final user = auth.user;
    return Scaffold(
      appBar: AppBar(
        title: const Text('INSTASQUAD', style: TextStyle(fontWeight: FontWeight.w800)),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Tài khoản',
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (v) async {
              switch (v) {
                case 'workflow':
                  context.push('/workflow');
                case 'terms':
                  context.push('/terms');
                case 'verify':
                  context.push('/verify-email');
                case 'logout':
                  await auth.logout();
              }
            },
            itemBuilder: (_) => [
              if (user != null)
                PopupMenuItem(
                  enabled: false,
                  child: Text('${user.displayName} · ${user.isCompanion ? 'Companion' : 'Renter'}'),
                ),
              if (user?.needsEmailVerification ?? false) const PopupMenuItem(value: 'verify', child: Text('Xác minh email')),
              const PopupMenuItem(value: 'workflow', child: Text('Quy trình 8 bước')),
              const PopupMenuItem(value: 'terms', child: Text('Điều khoản & vi phạm')),
              const PopupMenuItem(value: 'logout', child: Text('Đăng xuất')),
            ],
          ),
        ],
      ),
      body: Column(children: [
        if (user?.needsEmailVerification ?? false)
          Material(
            key: const Key('verify-banner'),
            color: const Color(0xFF3B2A06),
            child: InkWell(
              onTap: () => context.push('/verify-email'),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(children: [
                  Icon(Icons.mark_email_unread_outlined, color: Color(0xFFF59E0B), size: 20),
                  SizedBox(width: 10),
                  Expanded(child: Text('Xác minh email để đặt lịch và nạp tiền.')),
                  Text('Xác minh', style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w700)),
                ]),
              ),
            ),
          ),
        Expanded(child: child),
      ]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => context.go(_tabs[i]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Khám phá'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Đơn của tôi'),
          NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined), selectedIcon: Icon(Icons.account_balance_wallet), label: 'Ví'),
        ],
      ),
    );
  }
}

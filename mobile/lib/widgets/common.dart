import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../core/api_client.dart';

const kMuted = Color(0xFFA3A3A3);
const kBorder = Color(0xFF2A2A2A);
const kGreen = Color(0xFF22C55E);
const kAmber = Color(0xFFF59E0B);

void showApiError(BuildContext context, Object error) {
  if (error is ApiException && error.code == 'EMAIL_NOT_VERIFIED') {
    _promptEmailVerification(context, error.message);
    return;
  }
  final msg = error is ApiException ? error.toString() : 'Lỗi kết nối: $error';
  // Ẩn thông báo đang hiện để lỗi mới không phải xếp hàng chờ 4 giây.
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg), backgroundColor: const Color(0xFF7F1D1D)));
}

void showInfo(BuildContext context, String msg) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg)));
}

/// Tài khoản chưa xác minh email (UC01). Dùng hộp thoại (nằm trên bottom sheet đặt lịch / nạp tiền) thay vì SnackBar
/// vốn bị sheet che; "Xác minh ngay" đóng các popup đang mở rồi mở màn xác minh.
void _promptEmailVerification(BuildContext context, String message) {
  final router = GoRouter.maybeOf(context);
  final navigator = Navigator.of(context, rootNavigator: true);
  showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      icon: const Icon(Icons.mark_email_unread_outlined, color: kAmber),
      title: const Text('Cần xác minh email'),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Để sau')),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Xác minh ngay')),
      ],
    ),
  ).then((go) {
    if (go != true || router == null) return;
    navigator.popUntil((route) => route is! PopupRoute);
    router.push('/verify-email');
  });
}

/// Khối tải dữ liệu với 3 trạng thái loading / error (có nút thử lại) / data.
class AsyncView<T> extends StatelessWidget {
  const AsyncView({super.key, required this.future, required this.builder, required this.onRetry});

  final Future<T> future;
  final Widget Function(BuildContext, T) builder;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
        }
        if (snap.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.cloud_off, color: kMuted, size: 40),
                const SizedBox(height: 12),
                Text('${snap.error}', textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
                const SizedBox(height: 12),
                OutlinedButton(onPressed: onRetry, child: const Text('Thử lại')),
              ]),
            ),
          );
        }
        return builder(context, snap.data as T);
      },
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.label, {super.key, this.color = kMuted});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(6)),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

/// Đồng hồ đếm ngược theo hạn server trả về (180 giây phản hồi / 15 phút nghiệm thu) — không quyết định trạng thái.
class CountdownText extends StatefulWidget {
  const CountdownText({super.key, required this.deadline, required this.prefix});

  final DateTime deadline;
  final String prefix;

  @override
  State<CountdownText> createState() => _CountdownTextState();
}

class _CountdownTextState extends State<CountdownText> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final left = widget.deadline.difference(DateTime.now());
    if (left.isNegative) return Text('${widget.prefix}: đã hết hạn', style: const TextStyle(color: kMuted));
    final m = left.inMinutes.toString().padLeft(2, '0');
    final s = (left.inSeconds % 60).toString().padLeft(2, '0');
    return Text('${widget.prefix}: $m:$s', style: const TextStyle(color: kAmber, fontFeatures: [FontFeature.tabularFigures()]));
  }
}

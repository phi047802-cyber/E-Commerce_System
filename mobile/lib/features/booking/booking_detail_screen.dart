import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/booking_states.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';
import '../review/review_sheet.dart';

/// Bước 3–4b, 8: ký quỹ (Renter), chấp nhận/từ chối 180s (Companion), hủy trước giờ, vào phòng phiên, đánh giá.
class BookingDetailScreen extends StatefulWidget {
  const BookingDetailScreen({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen> {
  Future<Booking>? _future;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<Booking> _load() async {
    final data = await AppScope.of(context).api.get('/api/bookings/${widget.bookingId}');
    return Booking.fromJson(data as Map<String, dynamic>);
  }

  void _reload() => setState(() { _future = _load(); });

  Future<void> _act(String path, {Object? body, required String success}) async {
    setState(() => _busy = true);
    try {
      await AppScope.of(context).api.post('/api/bookings/${widget.bookingId}/$path', body: body);
      if (mounted) showInfo(context, success);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        _reload();
      }
    }
  }

  Future<String?> _askReason(String title, String hint) {
    final ctrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(controller: ctrl, maxLength: 255, decoration: InputDecoration(hintText: hint)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Đóng')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim()), child: const Text('Xác nhận')),
        ],
      ),
    ).whenComplete(ctrl.dispose);
  }

  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết đơn')),
      body: AsyncView<Booking>(
        future: _future!,
        onRetry: _reload,
        builder: (context, b) {
          final isRenter = user?.id == b.renterId;
          final isCompanion = user?.id == b.companionUserId;
          final label = bookingStatusLabel(b.status, disputeStatus: b.disputeStatus);
          final reviewed = user != null && b.reviewerIds.contains(user.id);
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(padding: const EdgeInsets.all(16), children: [
              Row(children: [
                Expanded(
                  child: Text('#${b.shortId}',
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleLarge),
                ),
                const SizedBox(width: 8),
                StatusChip(label.label, color: label.color),
              ]),
              const SizedBox(height: 16),
              _info('Companion', b.companionName ?? '—'),
              _info('Renter', b.renterName ?? '—'),
              _info('Dịch vụ', b.serviceName ?? '—'),
              _info('Bắt đầu', formatVnDateTime(b.startTime)),
              _info('Thời lượng', '${b.durationHours} giờ'),
              _info('Tổng phí (chốt)', formatVnd(b.totalFee)),
              _info('Ký quỹ', b.escrowStatus == null ? 'Chưa ký quỹ' : '${formatVnd(b.escrowAmount ?? b.totalFee)} · ${b.escrowStatus}'),
              if (b.cancelReason != null) _info('Lý do hủy', b.cancelReason!),
              const SizedBox(height: 12),
              if (b.status == 'PENDING_ACCEPTANCE' && b.escrowStatus != null)
                CountdownText(deadline: b.responseDeadline, prefix: 'Companion phản hồi trong'),
              if (b.status == 'IN_SESSION' && b.confirmDeadline != null)
                CountdownText(deadline: b.confirmDeadline!, prefix: 'Hạn nghiệm thu'),
              const SizedBox(height: 16),

              // Bước 3 — Renter ký quỹ (nếu chưa ký quỹ lúc đặt)
              if (isRenter && b.needsEscrow) ...[
                FilledButton.icon(
                  key: const Key('hold-escrow'),
                  onPressed: _busy ? null : () => _act('hold-escrow', success: 'Đã ký quỹ. Companion có 180 giây để phản hồi.'),
                  icon: const Icon(Icons.lock_outline),
                  label: Text('Ký quỹ ${formatVnd(b.totalFee)}'),
                ),
                TextButton(onPressed: () => context.go('/wallet'), child: const Text('Thiếu số dư? Nạp tiền vào ví')),
              ],

              // Bước 4 — Companion phản hồi
              if (isCompanion && b.status == 'PENDING_ACCEPTANCE' && b.escrowStatus == 'HELD')
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy
                          ? null
                          : () async {
                              final reason = await _askReason('Từ chối đơn', 'Lý do (không bắt buộc)');
                              if (reason != null) {
                                await _act('reject',
                                    body: {if (reason.isNotEmpty) 'reason': reason}, success: 'Đã từ chối. Renter được hoàn 100%.');
                              }
                            },
                      child: const Text('Từ chối'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      key: const Key('accept-booking'),
                      onPressed: _busy ? null : () => _act('accept', success: 'Đã chấp nhận đơn.'),
                      child: const Text('Chấp nhận'),
                    ),
                  ),
                ]),

              // Bước 5 — vào phòng phiên
              if (b.sessionId != null && (b.status == 'ACCEPTED' || b.status == 'IN_SESSION' || b.status == 'DISPUTED'))
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: FilledButton.icon(
                    key: const Key('open-session'),
                    onPressed: () async {
                      await context.push('/session/${b.sessionId}');
                      _reload();
                    },
                    icon: const Icon(Icons.chat_bubble_outline),
                    label: const Text('Vào phòng phiên'),
                  ),
                ),

              // Bước 4b — Renter hủy trước giờ (server tính phí theo mốc 30p/10p)
              if (isRenter && (b.status == 'PENDING_ACCEPTANCE' || b.status == 'ACCEPTED'))
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: TextButton(
                    onPressed: _busy
                        ? null
                        : () async {
                            final reason = await _askReason(
                                'Hủy đơn', 'Hủy ≥30 phút trước giờ: hoàn 100%; 10–30 phút: hoàn 70%; <10 phút: không hoàn.');
                            if (reason != null) {
                              await _act('cancel', body: {if (reason.isNotEmpty) 'reason': reason}, success: 'Đã hủy đơn.');
                            }
                          },
                    child: const Text('Hủy đơn'),
                  ),
                ),

              // Bước 8 — đánh giá 2 chiều
              if (b.status == 'COMPLETED' && (isRenter || isCompanion))
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: reviewed
                      ? const Text('Bạn đã đánh giá đơn này.', textAlign: TextAlign.center, style: TextStyle(color: kMuted))
                      : FilledButton.tonalIcon(
                          key: const Key('open-review'),
                          onPressed: () async {
                            final done = await showReviewSheet(context, bookingId: b.id);
                            if (done == true) _reload();
                          },
                          icon: const Icon(Icons.star_outline),
                          label: const Text('Đánh giá'),
                        ),
                ),
              const SizedBox(height: 24),
              const Text(
                'Số tiền, phí hủy và giải ngân 88/12 do máy chủ tính và ghi sổ cái; App chỉ hiển thị kết quả.',
                style: TextStyle(color: kMuted, fontSize: 12),
              ),
            ]),
          );
        },
      ),
    );
  }

  Widget _info(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 130, child: Text(k, style: const TextStyle(color: kMuted))),
          Expanded(child: Text(v, style: const TextStyle(fontWeight: FontWeight.w600))),
        ]),
      );
}

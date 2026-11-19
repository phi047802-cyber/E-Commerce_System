import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/booking_states.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// "Đơn của tôi" — dùng chung cho Renter và Companion (server lọc theo vai trò).
class BookingsScreen extends StatefulWidget {
  const BookingsScreen({super.key});

  @override
  State<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends State<BookingsScreen> {
  Future<List<Booking>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<List<Booking>> _load() async {
    final data = await AppScope.of(context).api.get('/api/bookings') as List;
    return data.map((e) => Booking.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> _refresh() async {
    final f = _load();
    setState(() { _future = f; });
    await f.catchError((_) => <Booking>[]);
  }

  @override
  Widget build(BuildContext context) {
    final isCompanion = AppScope.of(context).auth.user?.isCompanion ?? false;
    return AsyncView<List<Booking>>(
      future: _future!,
      onRetry: _refresh,
      builder: (context, items) {
        final active = items.where((b) => isBookingActive(b.status, disputeStatus: b.disputeStatus)).toList();
        final past = items.where((b) => !isBookingActive(b.status, disputeStatus: b.disputeStatus)).toList();
        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(padding: const EdgeInsets.all(16), children: [
            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Text(isCompanion ? 'Chưa có đơn nào gửi đến bạn.' : 'Bạn chưa có đơn nào. Hãy khám phá Companion!',
                    textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
              ),
            if (active.isNotEmpty) ...[
              const _Header('Đang xử lý'),
              for (final b in active) BookingTile(booking: b, isCompanion: isCompanion, onReturn: _refresh),
            ],
            if (past.isNotEmpty) ...[
              const _Header('Đã kết thúc'),
              for (final b in past) BookingTile(booking: b, isCompanion: isCompanion, onReturn: _refresh),
            ],
          ]),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 8, bottom: 8),
        child: Text(text, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: kMuted)),
      );
}

class BookingTile extends StatelessWidget {
  const BookingTile({super.key, required this.booking, required this.isCompanion, required this.onReturn});

  final Booking booking;
  final bool isCompanion;
  final Future<void> Function() onReturn;

  @override
  Widget build(BuildContext context) {
    final b = booking;
    final label = bookingStatusLabel(b.status, disputeStatus: b.disputeStatus);
    final counterpart = isCompanion ? b.renterName : b.companionName;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        title: Text('${counterpart ?? '—'} · ${b.serviceName ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text('#${b.shortId} · ${formatVnDateTime(b.startTime)}'),
        ),
        trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(formatVnd(b.totalFee), style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          StatusChip(label.label, color: label.color),
        ]),
        onTap: () async {
          await context.push('/booking/${b.id}');
          await onReturn();
        },
      ),
    );
  }
}

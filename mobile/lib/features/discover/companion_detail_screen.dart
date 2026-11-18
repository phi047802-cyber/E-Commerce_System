import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';
import '../legal/terms_screen.dart';

/// Bước 1→2: hồ sơ Companion + chọn slot (BookingSheet).
class CompanionDetailScreen extends StatefulWidget {
  const CompanionDetailScreen({super.key, required this.profileId});

  final String profileId;

  @override
  State<CompanionDetailScreen> createState() => _CompanionDetailScreenState();
}

class _CompanionDetailScreenState extends State<CompanionDetailScreen> {
  Future<Companion>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<Companion> _load() async {
    final data = await AppScope.of(context).api.get('/api/companions/${widget.profileId}');
    return Companion.fromJson(data as Map<String, dynamic>);
  }

  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).auth.user;
    return Scaffold(
      appBar: AppBar(title: const Text('Hồ sơ Companion')),
      body: AsyncView<Companion>(
        future: _future!,
        onRetry: () => setState(() { _future = _load(); }),
        builder: (context, c) => ListView(padding: const EdgeInsets.all(16), children: [
          Row(children: [
            CircleAvatar(
              radius: 34,
              backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
              child: Text(c.displayName.isEmpty ? '?' : c.displayName.characters.first.toUpperCase(),
                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.displayName, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text([c.service?.name, c.tierName].whereType<String>().join(' · '), style: const TextStyle(color: kMuted)),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          Wrap(spacing: 8, runSpacing: 6, children: [
            if (c.verified) const StatusChip('eKYC đã xác minh', color: kGreen),
            StatusChip(c.online ? 'Trực tuyến' : 'Ngoại tuyến', color: c.online ? kGreen : kMuted),
            StatusChip('TrustScore ${c.trustScore.round()}', color: kAmber),
            if (c.service?.isSocial ?? false) const StatusChip('Non-gamer'),
          ]),
          if (c.service?.description != null) ...[
            const SizedBox(height: 16),
            Text(c.service!.description!, style: const TextStyle(color: kMuted, height: 1.4)),
          ],
          const SizedBox(height: 20),
          Row(children: [
            Text('Đơn giá', style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            Text('${formatVnd(c.hourlyRate)}/giờ', style: Theme.of(context).textTheme.titleMedium),
          ]),
          const SizedBox(height: 20),
          Text('Khung giờ trống', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (c.slots.isEmpty) const Text('Chưa có khung giờ trống.', style: TextStyle(color: kMuted)),
          for (final s in c.slots)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: kBorder)),
              child: ListTile(
                leading: const Icon(Icons.schedule),
                title: Text(formatVnDateTime(s.start)),
                subtitle: Text('${s.hours} giờ · ${formatVnd(c.hourlyRate * s.hours)} (ước tính, server chốt giá)'),
                trailing: (user?.isRenter ?? false) ? const Icon(Icons.chevron_right) : null,
                onTap: (user?.isRenter ?? false) ? () => showBookingSheet(context, c, s) : null,
              ),
            ),
          if (user != null && !user.isRenter)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Chỉ tài khoản Renter có thể đặt lịch.', style: TextStyle(color: kMuted)),
            ),
        ]),
      ),
    );
  }
}

/// Bước 2 + 3: giữ slot (POST /api/bookings với request_key) rồi ký quỹ Escrow.
Future<void> showBookingSheet(BuildContext context, Companion c, Slot slot) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => BookingSheet(companion: c, slot: slot),
  );
}

class BookingSheet extends StatefulWidget {
  const BookingSheet({super.key, required this.companion, required this.slot});

  final Companion companion;
  final Slot slot;

  @override
  State<BookingSheet> createState() => _BookingSheetState();
}

class _BookingSheetState extends State<BookingSheet> {
  // Một khóa cho mỗi lần mở sheet: bấm lặp/mạng chập chờn không tạo đơn trùng (BR-01).
  final String _requestKey = ApiClient.newRequestKey('mob');
  bool _busy = false;

  Future<void> _book() async {
    setState(() => _busy = true);
    final api = AppScope.of(context).api;
    final router = GoRouter.of(context);
    try {
      final data = await _createBooking(api);
      final bookingId = data['booking_id'] as String;
      try {
        await api.post('/api/bookings/$bookingId/hold-escrow');
        if (mounted) showInfo(context, 'Đã ký quỹ. Companion có 180 giây để phản hồi.');
      } on ApiException catch (e) {
        // Giữ slot thành công nhưng chưa ký quỹ được (vd. INSUFFICIENT_BALANCE): ký quỹ lại ở chi tiết đơn trong 10 phút.
        if (mounted) showApiError(context, e);
      }
      if (mounted) Navigator.pop(context);
      router.push('/booking/$bookingId');
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<Map<String, dynamic>> _createBooking(ApiClient api) async {
    Future<Map<String, dynamic>> send() async => await api.post(
          '/api/bookings',
          body: {'slot_id': widget.slot.id, 'request_key': _requestKey},
          headers: {'Idempotency-Key': _requestKey},
        ) as Map<String, dynamic>;
    try {
      return await send();
    } on ApiException catch (e) {
      if (e.code != 'TERMS_NOT_ACCEPTED' || !mounted) rethrow;
      final accepted = await promptTermsAcceptance(context, e);
      if (!accepted) rethrow;
      return send();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.companion;
    final s = widget.slot;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Xác nhận đặt lịch', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          _row('Companion', c.displayName),
          _row('Dịch vụ', c.service?.name ?? '—'),
          _row('Bắt đầu', formatVnDateTime(s.start)),
          _row('Thời lượng', '${s.hours} giờ'),
          _row('Tạm tính', formatVnd(c.hourlyRate * s.hours)),
          const SizedBox(height: 12),
          const Text(
            'Số tiền được giữ an toàn (Escrow) và chỉ giải ngân khi bạn nghiệm thu. '
            'Companion có 180 giây để phản hồi; quá hạn hoặc từ chối bạn được hoàn 100%.',
            style: TextStyle(color: kMuted, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 16),
          FilledButton(
            key: const Key('booking-confirm'),
            onPressed: _busy ? null : _book,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            child: _busy
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Đặt lịch & ký quỹ'),
          ),
        ]),
      ),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Text(k, style: const TextStyle(color: kMuted)),
          const Spacer(),
          Flexible(child: Text(v, textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w600))),
        ]),
      );
}

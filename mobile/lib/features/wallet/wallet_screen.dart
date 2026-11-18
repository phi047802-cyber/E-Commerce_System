import 'package:material_ui/material_ui.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// Bước 3 & 7 — Ví: số dư khả dụng / ký quỹ, nạp tiền mô phỏng (MOCKED), lịch sử sổ cái.
class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  Future<WalletInfo>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<WalletInfo> _load() async =>
      WalletInfo.fromJson(await AppScope.of(context).api.get('/api/wallet/me') as Map<String, dynamic>);

  Future<void> _refresh() async {
    final f = _load();
    setState(() { _future = f; });
    await f.then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    return AsyncView<WalletInfo>(
      future: _future!,
      onRetry: _refresh,
      builder: (context, w) => RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Row(children: [
            Expanded(child: _Balance(label: 'Khả dụng', amount: w.available, key: const Key('wallet-available'))),
            const SizedBox(width: 12),
            Expanded(child: _Balance(label: 'Đang ký quỹ', amount: w.escrow)),
          ]),
          const SizedBox(height: 12),
          FilledButton.icon(
            key: const Key('topup-open'),
            onPressed: () async {
              final done = await showTopupSheet(context);
              if (done == true) await _refresh();
            },
            icon: const Icon(Icons.add),
            label: const Text('Nạp tiền (mô phỏng)'),
          ),
          const SizedBox(height: 24),
          Text('Biến động số dư', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 4),
          const Text('Mỗi giao dịch gồm bút toán ghi kép trên sổ cái (Nợ = Có).', style: TextStyle(color: kMuted, fontSize: 12)),
          const SizedBox(height: 8),
          if (w.entries.isEmpty) const Text('Chưa có giao dịch.', style: TextStyle(color: kMuted)),
          for (final e in w.entries) _EntryTile(entry: e),
        ]),
      ),
    );
  }
}

class _Balance extends StatelessWidget {
  const _Balance({super.key, required this.label, required this.amount});

  final String label;
  final int amount;

  @override
  Widget build(BuildContext context) => Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(color: kMuted)),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(formatVnd(amount), style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
            ),
          ]),
        ),
      );
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry});

  final LedgerEntry entry;

  @override
  Widget build(BuildContext context) {
    final e = entry;
    final sign = e.isCredit ? '+' : '−';
    final color = e.isCredit ? kGreen : const Color(0xFFF43F5E);
    final bucket = e.balanceType == 'ESCROW' ? 'Ký quỹ' : (e.balanceType == 'AVAILABLE' ? 'Khả dụng' : e.balanceType);
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(ledgerTxnLabels[e.txnType] ?? e.txnType),
      subtitle: Text('$bucket · ${formatVnDateTime(e.createdAt)}'),
      trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text('$sign${formatVnd(e.amount)}', style: TextStyle(color: color, fontWeight: FontWeight.w700)),
        Text('Số dư ${formatVnd(e.balanceAfter)}', style: const TextStyle(color: kMuted, fontSize: 12)),
      ]),
    );
  }
}

/// Nạp tiền mô phỏng: tạo yêu cầu PENDING rồi chọn kết quả webhook (SUCCESS/FAILED/PENDING) — MOCKED.
Future<bool?> showTopupSheet(BuildContext context) => showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const TopupSheet(),
    );

class TopupSheet extends StatefulWidget {
  const TopupSheet({super.key});

  @override
  State<TopupSheet> createState() => _TopupSheetState();
}

class _TopupSheetState extends State<TopupSheet> {
  static const _presets = [100000, 200000, 500000];
  int _amount = 100000;
  Map<String, dynamic>? _payment;
  bool _busy = false;

  Future<void> _create() async {
    setState(() => _busy = true);
    try {
      final p = await AppScope.of(context).api.post('/api/payments/create-topup', body: {'amount': _amount, 'provider': 'SIMULATOR'});
      setState(() => _payment = p as Map<String, dynamic>);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _simulate(String outcome) async {
    setState(() => _busy = true);
    try {
      await AppScope.of(context).api.post('/api/payments/simulate', body: {'payment_id': _payment!['payment_id'], 'outcome': outcome});
      if (!mounted) return;
      showInfo(
          context,
          outcome == 'SUCCESS'
              ? 'Nạp ${formatVnd(_amount)} thành công.'
              : outcome == 'FAILED'
                  ? 'Giao dịch thất bại, số dư không đổi.'
                  : 'Giao dịch đang chờ xử lý.');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Nạp tiền vào ví', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          const Text('Cổng thanh toán mô phỏng (MOCKED) — không phát sinh tiền thật.', style: TextStyle(color: kMuted)),
          const SizedBox(height: 16),
          if (_payment == null) ...[
            SegmentedButton<int>(
              segments: [for (final p in _presets) ButtonSegment(value: p, label: Text(formatVnd(p)))],
              selected: {_amount},
              onSelectionChanged: (s) => setState(() => _amount = s.first),
            ),
            const SizedBox(height: 16),
            FilledButton(
              key: const Key('topup-create'),
              onPressed: _busy ? null : _create,
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
              child: const Text('Tạo yêu cầu nạp tiền'),
            ),
          ] else ...[
            Text('Yêu cầu ${formatVnd(_amount)} đang chờ. Chọn kết quả phản hồi từ cổng thanh toán:'),
            const SizedBox(height: 12),
            FilledButton(
              key: const Key('topup-success'),
              onPressed: _busy ? null : () => _simulate('SUCCESS'),
              style: FilledButton.styleFrom(backgroundColor: kGreen),
              child: const Text('Thành công'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: _busy ? null : () => _simulate('FAILED'), child: const Text('Thất bại')),
            const SizedBox(height: 8),
            TextButton(onPressed: _busy ? null : () => _simulate('PENDING'), child: const Text('Vẫn đang chờ')),
          ],
        ]),
      ),
    );
  }
}

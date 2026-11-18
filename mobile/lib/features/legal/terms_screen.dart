import 'package:material_ui/material_ui.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// Điều khoản hiện hành + bảng vi phạm/chế tài (GET /api/legal/terms, dùng chung với Web).
class TermsScreen extends StatefulWidget {
  const TermsScreen({super.key});

  @override
  State<TermsScreen> createState() => _TermsScreenState();
}

class _TermsScreenState extends State<TermsScreen> {
  Future<Map<String, dynamic>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<Map<String, dynamic>> _load() async =>
      await AppScope.of(context).api.get('/api/legal/terms') as Map<String, dynamic>;

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    return Scaffold(
      appBar: AppBar(title: const Text('Điều khoản sử dụng')),
      body: AsyncView<Map<String, dynamic>>(
        future: _future!,
        onRetry: () => setState(() { _future = _load(); }),
        builder: (context, t) {
          final clauses = ((t['key_clauses'] as List?) ?? const []).cast<String>();
          final violations = ((t['violations'] as List?) ?? const []).cast<Map<String, dynamic>>();
          return ListView(padding: const EdgeInsets.all(16), children: [
            Text('Phiên bản ${t['version']} · hiệu lực ${t['effective_date']}', style: const TextStyle(color: kMuted)),
            const SizedBox(height: 16),
            Text('Điều khoản chính', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final c in clauses)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('•  '),
                  Expanded(child: Text(c)),
                ]),
              ),
            const SizedBox(height: 16),
            Text('Vi phạm & chế tài', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final v in violations)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: const BorderSide(color: kBorder)),
                child: ListTile(
                  leading: Text('${v['code']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  title: Text('${v['title']}'),
                  subtitle: Text('TrustScore ${v['trust_delta']} · Mức độ ${v['severity']}'
                      '${v['money_note'] != null && v['money_note'] != '—' ? ' · ${v['money_note']}' : ''}'),
                ),
              ),
            if (auth.isLoggedIn) ...[
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () async {
                  final ok = await acceptCurrentTerms(context);
                  if (ok && context.mounted) showInfo(context, 'Đã ghi nhận chấp thuận điều khoản ${AppConfig.termsVersion}.');
                },
                child: const Text('Tôi đã đọc và chấp thuận'),
              ),
            ],
          ]);
        },
      ),
    );
  }
}

/// Gửi chấp thuận phiên bản điều khoản hiện hành (kênh MOBILE). Idempotent phía server.
Future<bool> acceptCurrentTerms(BuildContext context) async {
  try {
    await AppScope.of(context).api.post('/api/legal/accept', body: {
      'terms_version': AppConfig.termsVersion,
      'channel': 'MOBILE',
    });
    return true;
  } catch (e) {
    if (context.mounted) showApiError(context, e);
    return false;
  }
}

/// Hiện khi server trả `TERMS_NOT_ACCEPTED` (D39): hỏi chấp thuận rồi trả `true` để thao tác được thử lại.
Future<bool> promptTermsAcceptance(BuildContext context, ApiException error) async {
  final agree = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Chấp thuận điều khoản'),
      content: Text('${error.message}\n\nTóm tắt: tiền được giữ Escrow đến khi nghiệm thu; '
          'hủy càng sát giờ phí càng cao; nghiêm cấm giao dịch ngoài nền tảng và quấy rối.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Để sau')),
        TextButton(
          onPressed: () {
            Navigator.pop(ctx, false);
            Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const TermsScreen()));
          },
          child: const Text('Đọc đầy đủ'),
        ),
        FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Chấp thuận')),
      ],
    ),
  );
  if (agree != true || !context.mounted) return false;
  return acceptCurrentTerms(context);
}

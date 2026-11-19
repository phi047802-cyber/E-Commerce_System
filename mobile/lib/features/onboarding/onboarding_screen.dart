import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/format.dart';
import '../../core/onboarding.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// G7 — Onboarding 3 câu hỏi cho Renter mới (NON_GAMER_GROWTH_STRATEGY.md §2.1): trả lời xong → Khám phá đã lọc sẵn.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, this.next});

  /// Đích đến sau onboarding (vd. deep link mở App); null → Khám phá theo câu trả lời.
  final String? next;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 0;
  String? _activity;
  bool? _onlineNow;
  int? _budgetIndex;
  bool _saving = false;

  bool get _canContinue => switch (_step) {
        0 => _activity != null,
        1 => _onlineNow != null,
        _ => _budgetIndex != null,
      };

  Future<void> _finish({required bool skipped}) async {
    setState(() => _saving = true);
    final auth = AppScope.of(context).auth;
    final router = GoRouter.of(context);
    final answers = skipped
        ? null
        : OnboardingPrefs(activityKey: _activity!, onlineNow: _onlineNow!, maxRate: onboardingBudgets[_budgetIndex!]);
    await auth.completeOnboarding(answers);
    if (!mounted) return;
    final category = answers?.activity.category == 'SOCIAL' ? 'social' : 'game';
    router.go(widget.next ?? (answers == null ? '/discover' : '/discover?c=$category'));
  }

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text('Câu ${_step + 1}/3'),
        actions: [
          TextButton(
            key: const Key('onboarding-skip'),
            onPressed: _saving ? null : () => _finish(skipped: true),
            child: const Text('Bỏ qua'),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            LinearProgressIndicator(value: (_step + 1) / 3, color: primary, backgroundColor: kBorder),
            const SizedBox(height: 24),
            Expanded(child: SingleChildScrollView(child: _question(context))),
            Row(children: [
              if (_step > 0)
                TextButton(
                  onPressed: _saving ? null : () => setState(() => _step -= 1),
                  child: const Text('Quay lại'),
                ),
              const Spacer(),
              FilledButton(
                key: const Key('onboarding-next'),
                onPressed: !_canContinue || _saving
                    ? null
                    : () => _step < 2 ? setState(() => _step += 1) : _finish(skipped: false),
                style: FilledButton.styleFrom(minimumSize: const Size(140, 48)),
                child: Text(_step < 2 ? 'Tiếp tục' : 'Xem gợi ý'),
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _question(BuildContext context) {
    final title = Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700);
    switch (_step) {
      case 0:
        return _block(
          title: Text('Bạn muốn làm gì hôm nay?', style: title),
          subtitle: 'Không cần mê game — có người cùng trò chuyện, xem phim, nghe nhạc hay chơi party.',
          options: [
            for (final a in onboardingActivities)
              _Option(
                key: Key('onboarding-activity-${a.key}'),
                label: a.label,
                selected: _activity == a.key,
                onTap: () => setState(() => _activity = a.key),
              ),
          ],
        );
      case 1:
        return _block(
          title: Text('Bạn muốn bắt đầu khi nào?', style: title),
          subtitle: 'Chọn "Ngay bây giờ" để ưu tiên Companion đang trực tuyến.',
          options: [
            _Option(key: const Key('onboarding-now'), label: 'Ngay bây giờ', selected: _onlineNow == true, onTap: () => setState(() => _onlineNow = true)),
            _Option(key: const Key('onboarding-later'), label: 'Hẹn giờ sau', selected: _onlineNow == false, onTap: () => setState(() => _onlineNow = false)),
          ],
        );
      default:
        return _block(
          title: Text('Ngân sách mỗi giờ của bạn?', style: title),
          subtitle: 'Tiền được giữ an toàn (ký quỹ) và chỉ chuyển cho Companion khi bạn hài lòng.',
          options: [
            for (var i = 0; i < onboardingBudgets.length; i++)
              _Option(
                key: Key('onboarding-budget-$i'),
                label: onboardingBudgets[i] == null ? 'Không giới hạn' : 'Tối đa ${formatVnd(onboardingBudgets[i]!)}',
                selected: _budgetIndex == i,
                onTap: () => setState(() => _budgetIndex = i),
              ),
          ],
        );
    }
  }

  Widget _block({required Widget title, required String subtitle, required List<Widget> options}) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          title,
          const SizedBox(height: 8),
          Text(subtitle, style: const TextStyle(color: kMuted, height: 1.4)),
          const SizedBox(height: 20),
          ...options.expand((o) => [o, const SizedBox(height: 10)]),
        ],
      );
}

class _Option extends StatelessWidget {
  const _Option({super.key, required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? primary.withValues(alpha: 0.15) : const Color(0xFF141414),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: selected ? primary : kBorder, width: selected ? 1.5 : 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(children: [
              Expanded(child: Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600))),
              Icon(selected ? Icons.check_circle : Icons.circle_outlined, color: selected ? primary : kMuted),
            ]),
          ),
        ),
      ),
    );
  }
}

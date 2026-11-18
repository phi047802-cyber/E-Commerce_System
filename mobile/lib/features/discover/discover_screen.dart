import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// Bước 1 — Tìm kiếm: tab Game / Trò chuyện (Non-gamer, D35). Server đã lọc Companion ACTIVE, TrustScore ≥ 40.
class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key, this.initialCategory = 'GAME'});

  final String initialCategory;

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(
    length: 2,
    vsync: this,
    initialIndex: widget.initialCategory == 'SOCIAL' ? 1 : 0,
  );

  @override
  void didUpdateWidget(covariant DiscoverScreen old) {
    super.didUpdateWidget(old);
    // Deep link `/discover?c=social` khi App đang mở tab khác
    if (old.initialCategory != widget.initialCategory) {
      _tabs.animateTo(widget.initialCategory == 'SOCIAL' ? 1 : 0);
    }
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      TabBar(controller: _tabs, tabs: const [
        Tab(icon: Icon(Icons.sports_esports_outlined), text: 'Game'),
        Tab(icon: Icon(Icons.forum_outlined), text: 'Trò chuyện & Giải trí'),
      ]),
      Expanded(
        child: TabBarView(controller: _tabs, children: const [
          _CompanionList(category: 'GAME'),
          _CompanionList(category: 'SOCIAL'),
        ]),
      ),
    ]);
  }
}

class _CompanionList extends StatefulWidget {
  const _CompanionList({required this.category});

  final String category;

  @override
  State<_CompanionList> createState() => _CompanionListState();
}

class _CompanionListState extends State<_CompanionList> with AutomaticKeepAliveClientMixin {
  Future<_DiscoverData>? _future;

  @override
  bool get wantKeepAlive => true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  Future<_DiscoverData> _load() async {
    final api = AppScope.of(context).api;
    final q = {'category': widget.category};
    final results = await Future.wait([api.get('/api/games', query: q), api.get('/api/companions', query: q)]);
    return _DiscoverData(
      services: (results[0] as List).map((e) => ServiceItem.fromJson(e as Map<String, dynamic>)).toList(),
      companions: (results[1] as List).map((e) => Companion.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }

  Future<void> _refresh() async {
    final f = _load();
    setState(() { _future = f; });
    await f.catchError((_) => _DiscoverData(services: const [], companions: const []));
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return AsyncView<_DiscoverData>(
      future: _future!,
      onRetry: _refresh,
      builder: (context, data) => RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (data.services.isNotEmpty) ...[
              SizedBox(
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: data.services.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => Chip(label: Text(data.services[i].name), visualDensity: VisualDensity.compact),
                ),
              ),
              const SizedBox(height: 16),
            ],
            if (data.companions.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Text('Chưa có Companion phù hợp. Kéo xuống để tải lại.',
                    textAlign: TextAlign.center, style: TextStyle(color: kMuted)),
              ),
            for (final c in data.companions) ...[CompanionCard(companion: c), const SizedBox(height: 12)],
          ],
        ),
      ),
    );
  }
}

class _DiscoverData {
  _DiscoverData({required this.services, required this.companions});

  final List<ServiceItem> services;
  final List<Companion> companions;
}

class CompanionCard extends StatelessWidget {
  const CompanionCard({super.key, required this.companion});

  final Companion companion;

  @override
  Widget build(BuildContext context) {
    final c = companion;
    return Card(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
      child: InkWell(
        onTap: () => context.push('/companion/${c.profileId}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2),
              child: Text(c.displayName.isEmpty ? '?' : c.displayName.characters.first.toUpperCase(),
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(
                    child: Text(c.displayName,
                        overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                  ),
                  if (c.verified) ...[
                    const SizedBox(width: 6),
                    const Icon(Icons.verified, size: 16, color: kGreen, semanticLabel: 'Đã xác minh eKYC'),
                  ],
                ]),
                const SizedBox(height: 4),
                Text([c.service?.name, c.tierName].whereType<String>().join(' · '),
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: kMuted)),
                const SizedBox(height: 6),
                Wrap(spacing: 6, runSpacing: 4, children: [
                  StatusChip(c.online ? 'Trực tuyến' : 'Ngoại tuyến', color: c.online ? kGreen : kMuted),
                  StatusChip('TrustScore ${c.trustScore.round()}', color: kAmber),
                  StatusChip('${c.slots.length} slot trống'),
                ]),
              ]),
            ),
            const SizedBox(width: 8),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(formatVnd(c.hourlyRate), style: const TextStyle(fontWeight: FontWeight.w700)),
              const Text('/giờ', style: TextStyle(color: kMuted, fontSize: 12)),
            ]),
          ]),
        ),
      ),
    );
  }
}

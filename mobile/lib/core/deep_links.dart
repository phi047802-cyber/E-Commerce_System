/// Tham số UTM của link đã mở App (G9 — kênh nguồn first-touch). Server làm sạch lại khi nhận.
Map<String, String> utmFromUri(Uri uri) {
  final out = <String, String>{};
  for (final k in const ['utm_source', 'utm_medium', 'utm_campaign']) {
    final v = uri.queryParameters[k]?.trim();
    if (v != null && v.isNotEmpty) out[k] = v.length > 200 ? v.substring(0, 200) : v;
  }
  return out;
}

/// Chuyển link Social/Web sang route nội bộ của App (NON_GAMER_GROWTH_STRATEGY.md §4).
///
/// Hỗ trợ:
///  - Custom scheme: `instasquad://companion/prof-comp-03`, `instasquad://discover?c=social`
///  - Universal/App Links: `https://<domain>/go/companion/prof-comp-03?utm_source=tiktok`, `https://<domain>/app/wallet`
/// Trả `null` nếu link không hợp lệ (App giữ nguyên màn hình hiện tại).
String? deepLinkToLocation(Uri uri) {
  final List<String> segments;
  if (uri.scheme == 'instasquad') {
    // instasquad://companion/abc → host = companion, path = /abc
    segments = [if (uri.host.isNotEmpty) uri.host, ...uri.pathSegments];
  } else if (uri.scheme == 'https' || uri.scheme == 'http') {
    final p = uri.pathSegments;
    if (p.isEmpty || (p.first != 'go' && p.first != 'app')) return null;
    segments = p.sublist(1);
  } else {
    return null;
  }
  if (segments.isEmpty) return '/';

  final idPattern = RegExp(r'^[A-Za-z0-9_-]{1,64}$');
  final target = segments.first;
  final id = segments.length > 1 ? segments[1] : null;

  switch (target) {
    case 'discover':
      final c = (uri.queryParameters['c'] ?? 'game').toLowerCase();
      return '/discover?c=${c == 'social' ? 'social' : 'game'}';
    case 'companion':
      return (id != null && idPattern.hasMatch(id)) ? '/companion/$id' : null;
    case 'booking':
      return (id != null && idPattern.hasMatch(id)) ? '/booking/$id' : null;
    case 'wallet':
      return '/wallet';
    case 'terms':
      return '/terms';
    default:
      return null;
  }
}

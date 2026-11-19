import 'dart:convert';

/// G7 — Onboarding 3 câu hỏi (NON_GAMER_GROWTH_STRATEGY.md §2.1): lọc sẵn danh mục cho người mới.
/// Câu 1 do tài liệu chiến lược quy định; câu 2–3 cùng mục đích "lọc sẵn".
class OnboardingActivity {
  const OnboardingActivity(this.key, this.label, this.category, this.serviceId);

  final String key;
  final String label;
  final String category; // GAME | SOCIAL
  final String? serviceId; // game_id của dịch vụ SOCIAL (null = mọi game)
}

const onboardingActivities = <OnboardingActivity>[
  OnboardingActivity('game', 'Chơi game', 'GAME', null),
  OnboardingActivity('talk', 'Trò chuyện', 'SOCIAL', 'SOCIAL_TALK'),
  OnboardingActivity('movie', 'Xem phim', 'SOCIAL', 'SOCIAL_MOVIE'),
  OnboardingActivity('music', 'Nghe nhạc', 'SOCIAL', 'SOCIAL_MUSIC'),
  OnboardingActivity('party', 'Chơi party', 'SOCIAL', 'SOCIAL_PARTY'),
];

/// Câu 3 — ngân sách tối đa mỗi giờ (null = không giới hạn).
const onboardingBudgets = <int?>[60000, 100000, 150000, null];

class OnboardingPrefs {
  const OnboardingPrefs({required this.activityKey, required this.onlineNow, this.maxRate});

  factory OnboardingPrefs.fromJson(Map<String, dynamic> j) => OnboardingPrefs(
        activityKey: j['activity'] as String,
        onlineNow: (j['online_now'] as bool?) ?? false,
        maxRate: (j['max_rate'] as num?)?.toInt(),
      );

  final String activityKey;
  final bool onlineNow;
  final int? maxRate;

  OnboardingActivity get activity =>
      onboardingActivities.firstWhere((a) => a.key == activityKey, orElse: () => onboardingActivities.first);

  Map<String, dynamic> toJson() => {'activity': activityKey, 'online_now': onlineNow, 'max_rate': maxRate};

  String encode() => jsonEncode(toJson());

  static OnboardingPrefs? decode(String? raw) {
    if (raw == null) return null;
    try {
      return OnboardingPrefs.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } on Object {
      return null;
    }
  }
}

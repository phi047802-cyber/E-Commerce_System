/// Model tối giản ánh xạ đúng JSON của Backend (docs/API_CONTRACT.md). Không tính tiền phía App.
class ServiceItem {
  ServiceItem({required this.id, required this.name, required this.category, this.description, required this.genre});

  factory ServiceItem.fromJson(Map<String, dynamic> j) => ServiceItem(
        id: j['game_id'] as String,
        name: j['game_name'] as String,
        category: (j['category'] as String?) ?? 'GAME',
        description: j['description'] as String?,
        genre: (j['genre'] as String?) ?? '',
      );

  final String id;
  final String name;
  final String category;
  final String? description;
  final String genre;

  bool get isSocial => category == 'SOCIAL';
}

class Slot {
  Slot({required this.id, required this.start, required this.end, required this.status});

  factory Slot.fromJson(Map<String, dynamic> j) => Slot(
        id: j['slot_id'] as String,
        start: DateTime.parse(j['start_time'] as String),
        end: DateTime.parse(j['end_time'] as String),
        status: j['status'] as String,
      );

  final String id;
  final DateTime start;
  final DateTime end;
  final String status;

  int get hours => end.difference(start).inMinutes ~/ 60;
}

class Companion {
  Companion({
    required this.profileId,
    required this.displayName,
    required this.hourlyRate,
    required this.trustScore,
    required this.online,
    required this.verified,
    this.service,
    this.tierName,
    this.slots = const [],
  });

  factory Companion.fromJson(Map<String, dynamic> j) {
    final user = (j['user'] as Map<String, dynamic>?) ?? const {};
    final game = j['game'] as Map<String, dynamic>?;
    final tier = j['tier'] as Map<String, dynamic>?;
    return Companion(
      profileId: j['profile_id'] as String,
      displayName: (user['display_name'] as String?) ?? 'Companion',
      hourlyRate: (j['hourly_rate'] as num?)?.toInt() ?? 0,
      trustScore: (j['trust_score'] as num?)?.toDouble() ?? 0,
      online: j['availability'] == 'ONLINE',
      verified: j['verification_status'] == 'VERIFIED',
      service: game == null ? null : ServiceItem.fromJson(game),
      tierName: tier?['tier_name'] as String?,
      slots: ((j['slots'] as List?) ?? const [])
          .map((s) => Slot.fromJson(s as Map<String, dynamic>))
          .where((s) => s.status == 'AVAILABLE')
          .toList(),
    );
  }

  final String profileId;
  final String displayName;
  final int hourlyRate;
  final double trustScore;
  final bool online;
  final bool verified;
  final ServiceItem? service;
  final String? tierName;
  final List<Slot> slots;
}

class Booking {
  Booking({
    required this.id,
    required this.status,
    required this.totalFee,
    required this.startTime,
    required this.responseDeadline,
    this.confirmDeadline,
    this.escrowStatus,
    this.sessionId,
    this.sessionStatus,
    this.companionName,
    this.renterName,
    this.serviceName,
    this.renterId,
    this.companionUserId,
    this.profileId,
    this.durationHours = 1,
    this.escrowAmount,
    this.disputeStatus,
    this.cancelReason,
    this.reviewerIds = const [],
  });

  factory Booking.fromJson(Map<String, dynamic> j) {
    final escrow = j['escrow'] as Map<String, dynamic>?;
    final session = j['session'] as Map<String, dynamic>?;
    final companion = j['companion'] as Map<String, dynamic>?;
    final renter = j['renter'] as Map<String, dynamic>?;
    final dispute = j['dispute'] as Map<String, dynamic>?;
    DateTime? parse(Object? v) => v == null ? null : DateTime.parse(v as String);
    return Booking(
      renterId: j['renter_id'] as String?,
      companionUserId: companion?['user_id'] as String?,
      profileId: j['profile_id'] as String?,
      durationHours: (j['duration_hours'] as num?)?.toInt() ?? 1,
      escrowAmount: (escrow?['amount'] as num?)?.toInt(),
      disputeStatus: dispute?['status'] as String?,
      cancelReason: j['cancel_reason'] as String?,
      reviewerIds: ((j['reviews'] as List?) ?? const [])
          .map((r) => (r as Map<String, dynamic>)['reviewer_id'] as String?)
          .whereType<String>()
          .toList(),
      id: j['booking_id'] as String,
      status: j['status'] as String,
      totalFee: (j['total_fee_snapshot'] as num).toInt(),
      startTime: DateTime.parse(j['start_time'] as String),
      responseDeadline: DateTime.parse(j['response_deadline'] as String),
      confirmDeadline: parse(j['confirm_deadline']),
      escrowStatus: escrow?['status'] as String?,
      sessionId: session?['session_id'] as String?,
      sessionStatus: session?['status'] as String?,
      companionName: (companion?['user'] as Map<String, dynamic>?)?['display_name'] as String?,
      renterName: renter?['display_name'] as String?,
      serviceName: (companion?['game'] as Map<String, dynamic>?)?['game_name'] as String?,
    );
  }

  final String id;
  final String status;
  final int totalFee;
  final DateTime startTime;
  final DateTime responseDeadline;
  final DateTime? confirmDeadline;
  final String? escrowStatus;
  final String? sessionId;
  final String? sessionStatus;
  final String? companionName;
  final String? renterName;
  final String? serviceName;
  final String? renterId;
  final String? companionUserId;
  final String? profileId;
  final int durationHours;
  final int? escrowAmount;
  final String? disputeStatus;
  final String? cancelReason;
  final List<String> reviewerIds;

  /// Renter phải ký quỹ trong 10 phút sau khi giữ slot (UNIFIED_WORKFLOW bước 3).
  bool get needsEscrow => status == 'PENDING_ACCEPTANCE' && escrowStatus == null;

  String get shortId => id.length > 8 ? id.substring(0, 8) : id;
}

class LedgerEntry {
  LedgerEntry({
    required this.id,
    required this.direction,
    required this.balanceType,
    required this.amount,
    required this.balanceAfter,
    required this.createdAt,
    required this.txnType,
    this.bookingId,
  });

  factory LedgerEntry.fromJson(Map<String, dynamic> j) {
    final txn = (j['transaction'] as Map<String, dynamic>?) ?? const {};
    return LedgerEntry(
      id: j['entry_id'] as String,
      direction: j['direction'] as String,
      balanceType: j['balance_type'] as String,
      amount: (j['amount'] as num).toInt(),
      balanceAfter: (j['balance_after'] as num).toInt(),
      createdAt: DateTime.parse(j['created_at'] as String),
      txnType: (txn['txn_type'] as String?) ?? '',
      bookingId: txn['booking_id'] as String?,
    );
  }

  final String id;
  final String direction;
  final String balanceType;
  final int amount;
  final int balanceAfter;
  final DateTime createdAt;
  final String txnType;
  final String? bookingId;

  bool get isCredit => direction == 'CREDIT';
}

class WalletInfo {
  WalletInfo({required this.available, required this.escrow, required this.entries});

  factory WalletInfo.fromJson(Map<String, dynamic> j) => WalletInfo(
        available: (j['available_balance'] as num).toInt(),
        escrow: (j['escrow_balance'] as num).toInt(),
        entries: ((j['entries'] as List?) ?? const [])
            .map((e) => LedgerEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
      );

  final int available;
  final int escrow;
  final List<LedgerEntry> entries;
}

class ChatMessage {
  ChatMessage({
    required this.id,
    required this.senderId,
    required this.content,
    required this.createdAt,
    this.senderName = '',
    this.censored = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['message_id'].toString(),
        senderId: j['sender_id'] as String,
        senderName: (j['sender_name'] as String?) ?? '',
        content: j['content'] as String,
        createdAt: DateTime.parse(j['created_at'] as String),
        censored: (j['is_censored'] as bool?) ?? false,
      );

  final String id;
  final String senderId;
  final String senderName;
  final String content;
  final DateTime createdAt;
  final bool censored;
}

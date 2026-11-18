import 'package:material_ui/material_ui.dart';

/// Nhãn & nhóm trạng thái đơn — đồng bộ `client/src/common/bookingStates.ts` (UNIFIED_WORKFLOW.md §3).
/// Chỉ dùng để HIỂN THỊ; mọi chuyển trạng thái do server quyết định.

enum BookingGroup { active, completed, disputed, closed }

const _terminal = {'COMPLETED', 'REFUNDED', 'CANCELLED', 'REJECTED', 'TIMEOUT'};
const _activeStatuses = {
  'PENDING_ACCEPTANCE',
  'WAITING_COMPANION_RESPONSE',
  'ACCEPTED',
  'CONFIRMED',
  'IN_SESSION',
  'WAITING_RENTER_CONFIRM',
};

bool isBookingActive(String status, {String? disputeStatus}) {
  final s = status.toUpperCase();
  if (_terminal.contains(s)) return false;
  if (s == 'DISPUTED') return (disputeStatus ?? '').toUpperCase() != 'RESOLVED';
  return _activeStatuses.contains(s);
}

BookingGroup bookingGroup(String status, {String? disputeStatus}) {
  final s = status.toUpperCase();
  if (s == 'COMPLETED') return BookingGroup.completed;
  if (s == 'DISPUTED') {
    return (disputeStatus ?? '').toUpperCase() == 'RESOLVED' ? BookingGroup.closed : BookingGroup.disputed;
  }
  if (isBookingActive(s)) return BookingGroup.active;
  return BookingGroup.closed;
}

class StatusLabel {
  const StatusLabel(this.label, this.color);

  final String label;
  final Color color;
}

const _amber = Color(0xFFF59E0B);
const _blue = Color(0xFF3B82F6);
const _indigo = Color(0xFF6366F1);
const _purple = Color(0xFFA855F7);
const _emerald = Color(0xFF10B981);
const _rose = Color(0xFFF43F5E);
const _slate = Color(0xFF94A3B8);

StatusLabel bookingStatusLabel(String status, {String? disputeStatus}) {
  switch (status.toUpperCase()) {
    case 'PENDING_ACCEPTANCE':
    case 'WAITING_COMPANION_RESPONSE':
      return const StatusLabel('Chờ xác nhận (180s)', _amber);
    case 'ACCEPTED':
    case 'CONFIRMED':
      return const StatusLabel('Đã xác nhận', _blue);
    case 'IN_SESSION':
      return const StatusLabel('Đang trong phiên', _indigo);
    case 'WAITING_RENTER_CONFIRM':
      return const StatusLabel('Chờ nghiệm thu (15p)', _purple);
    case 'COMPLETED':
      return const StatusLabel('Hoàn tất', _emerald);
    case 'CANCELLED':
      return const StatusLabel('Đã hủy', _rose);
    case 'REFUNDED':
      return const StatusLabel('Đã hoàn tiền', _slate);
    case 'REJECTED':
      return const StatusLabel('Từ chối nhận', _rose);
    case 'TIMEOUT':
      return const StatusLabel('Hết giờ phản hồi', _rose);
    case 'DISPUTED':
      final d = (disputeStatus ?? '').toUpperCase();
      if (d == 'RESOLVED') return const StatusLabel('Khiếu nại đã giải quyết', _slate);
      if (d == 'EVIDENCE_PENDING') return const StatusLabel('Chờ bổ sung chứng cứ', _amber);
      return const StatusLabel('Đang khiếu nại', _rose);
    default:
      return StatusLabel(status, _slate);
  }
}

/// Lý do khiếu nại hợp lệ (server `reportIssueSchema`).
const Map<String, String> issueReasonLabels = {
  'NO_SHOW': 'Companion không có mặt',
  'HARASSMENT': 'Quấy rối / thái độ không phù hợp',
  'SKILL_MISMATCH': 'Không đúng kỹ năng / dịch vụ mô tả',
  'TECHNICAL_ISSUE': 'Sự cố kỹ thuật',
};

/// Định dạng tiền VND số nguyên: 176000 → "176.000 đ" (giống Web).
String formatVnd(num amount) {
  final n = amount.round();
  final negative = n < 0;
  final digits = n.abs().toString();
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write('.');
    buf.write(digits[i]);
  }
  return '${negative ? '-' : ''}$buf đ';
}

/// Giờ Việt Nam (UTC+7) cho hiển thị, server lưu UTC.
String formatVnDateTime(DateTime utc) {
  final t = utc.toUtc().add(const Duration(hours: 7));
  String two(int v) => v.toString().padLeft(2, '0');
  return '${two(t.hour)}:${two(t.minute)} ${two(t.day)}/${two(t.month)}/${t.year}';
}

// Nhãn trạng thái đơn: xem `booking_states.dart`.

/// Nhãn loại giao dịch sổ cái (FINANCIAL_RULES.md) — giống WalletLedgerPanel trên Web.
const Map<String, String> ledgerTxnLabels = {
  'TOPUP': 'Nạp tiền',
  'ESCROW_HOLD': 'Ký quỹ đặt lịch',
  'ESCROW_RELEASE': 'Giải ngân 88/12',
  'ESCROW_REFUND': 'Hoàn ký quỹ',
  'CANCEL_PENALTY': 'Phí hủy đơn',
  'DISPUTE_SETTLE': 'Phán quyết khiếu nại',
  'WITHDRAW_RESERVE': 'Giữ tiền rút',
  'WITHDRAW_SETTLE': 'Rút tiền hoàn tất',
  'WITHDRAW_REJECT': 'Hoàn tiền rút bị từ chối',
};

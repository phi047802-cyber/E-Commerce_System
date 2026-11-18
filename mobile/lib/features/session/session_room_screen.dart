import 'dart:async';

import 'package:material_ui/material_ui.dart';

import '../../core/booking_states.dart';
import '../../core/format.dart';
import '../../core/models.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// Bước 5–6: phòng phiên chat chữ (server che SĐT/URL/STK — BR-20), kết thúc phiên,
/// nghiệm thu trong 15 phút hoặc báo sự cố (ReportIssueSheet → Escrow FROZEN).
class SessionRoomScreen extends StatefulWidget {
  const SessionRoomScreen({super.key, required this.sessionId, this.pollInterval = const Duration(seconds: 3)});

  final String sessionId;
  final Duration pollInterval;

  @override
  State<SessionRoomScreen> createState() => _SessionRoomScreenState();
}

class _SessionInfo {
  _SessionInfo(Map<String, dynamic> j)
      : status = j['status'] as String,
        bookingId = (j['booking'] as Map<String, dynamic>)['booking_id'] as String,
        bookingStatus = (j['booking'] as Map<String, dynamic>)['status'] as String,
        totalFee = ((j['booking'] as Map<String, dynamic>)['total_fee_snapshot'] as num).toInt(),
        confirmDeadline = (j['booking'] as Map<String, dynamic>)['confirm_deadline'] == null
            ? null
            : DateTime.parse((j['booking'] as Map<String, dynamic>)['confirm_deadline'] as String),
        renterId = ((j['booking'] as Map<String, dynamic>)['renter'] as Map<String, dynamic>)['user_id'] as String,
        renterName = ((j['booking'] as Map<String, dynamic>)['renter'] as Map<String, dynamic>)['display_name'] as String,
        companionName =
            ((j['booking'] as Map<String, dynamic>)['companion'] as Map<String, dynamic>)['display_name'] as String;

  final String status; // SCHEDULED | ACTIVE | ENDED | CLOSED
  final String bookingId;
  final String bookingStatus;
  final int totalFee;
  final DateTime? confirmDeadline;
  final String renterId;
  final String renterName;
  final String companionName;
}

class _SessionRoomScreenState extends State<SessionRoomScreen> {
  _SessionInfo? _info;
  Object? _error;
  final List<ChatMessage> _messages = [];
  final _input = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_info == null && _error == null) {
      _refresh();
      _poll = Timer.periodic(widget.pollInterval, (_) => _refresh(silent: true));
    }
  }

  @override
  void dispose() {
    _poll?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _refresh({bool silent = false}) async {
    final api = AppScope.of(context).api;
    try {
      final s = await api.get('/api/sessions/${widget.sessionId}') as Map<String, dynamic>;
      final afterId = _messages.isEmpty ? null : _messages.last.id;
      final msgs = await api.get('/api/sessions/${widget.sessionId}/messages',
          query: afterId == null ? null : {'afterId': afterId}) as List;
      if (!mounted) return;
      final known = _messages.map((m) => m.id).toSet();
      final fresh = msgs.map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).where((m) => !known.contains(m.id));
      setState(() {
        _info = _SessionInfo(s['session'] as Map<String, dynamic>);
        _error = null;
        _messages.addAll(fresh);
      });
      if (fresh.isNotEmpty) _scrollToEnd();
    } catch (e) {
      if (!mounted) return;
      if (!silent || _info == null) setState(() => _error = e);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  Future<void> _run(Future<void> Function() action, String success) async {
    setState(() => _busy = true);
    try {
      await action();
      if (mounted) showInfo(context, success);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
      await _refresh(silent: true);
    }
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    final api = AppScope.of(context).api;
    try {
      await api.post('/api/sessions/${widget.sessionId}/messages', body: {'content': text});
      _input.clear();
      await _refresh(silent: true);
    } catch (e) {
      if (mounted) showApiError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = AppScope.of(context).api;
    final me = AppScope.of(context).auth.user;
    final info = _info;
    if (info == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Phòng phiên')),
        body: _error == null
            ? const Center(child: CircularProgressIndicator())
            : Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text('$_error', textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: _refresh, child: const Text('Thử lại')),
                ]),
              ),
      );
    }
    final isRenter = me?.id == info.renterId;
    final label = bookingStatusLabel(info.bookingStatus);
    final canChat = info.status == 'SCHEDULED' || info.status == 'ACTIVE';
    final awaitingConfirm = info.status == 'ENDED' && info.bookingStatus == 'IN_SESSION';

    return Scaffold(
      appBar: AppBar(
        title: Text(isRenter ? info.companionName : info.renterName),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(28),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              StatusChip(label.label, color: label.color),
              const SizedBox(width: 8),
              Text(formatVnd(info.totalFee), style: const TextStyle(color: kMuted)),
            ]),
          ),
        ),
      ),
      body: Column(children: [
        // Thanh hành động theo trạng thái phiên
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
            if (info.status == 'SCHEDULED')
              FilledButton(
                key: const Key('session-start'),
                onPressed: _busy ? null : () => _run(() => api.post('/api/sessions/${widget.sessionId}/start'), 'Phiên đã bắt đầu.'),
                child: const Text('Bắt đầu phiên'),
              ),
            if (info.status == 'ACTIVE')
              OutlinedButton(
                key: const Key('session-end'),
                onPressed: _busy
                    ? null
                    : () => _run(() => api.post('/api/sessions/${widget.sessionId}/end'), 'Đã kết thúc. Renter có 15 phút để nghiệm thu.'),
                child: const Text('Kết thúc phiên'),
              ),
            if (isRenter && awaitingConfirm)
              FilledButton(
                key: const Key('accept-fulfillment'),
                onPressed: _busy
                    ? null
                    : () => _run(() => api.post('/api/bookings/${info.bookingId}/accept-fulfillment'),
                        'Đã nghiệm thu. Tiền được giải ngân cho Companion.'),
                child: const Text('Nghiệm thu'),
              ),
            if (isRenter && (info.status == 'ACTIVE' || awaitingConfirm))
              TextButton.icon(
                key: const Key('report-issue'),
                onPressed: _busy
                    ? null
                    : () async {
                        final ok = await showReportIssueSheet(context, bookingId: info.bookingId);
                        if (ok == true) await _refresh(silent: true);
                      },
                icon: const Icon(Icons.flag_outlined, color: Color(0xFFF43F5E)),
                label: const Text('Báo sự cố'),
              ),
          ]),
        ),
        if (awaitingConfirm && info.confirmDeadline != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: CountdownText(deadline: info.confirmDeadline!, prefix: 'Tự nghiệm thu sau'),
          ),
        const Divider(height: 16),
        Expanded(
          child: _messages.isEmpty
              ? const Center(child: Text('Chưa có tin nhắn.', style: TextStyle(color: kMuted)))
              : ListView.builder(
                  controller: _scroll,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemCount: _messages.length,
                  itemBuilder: (_, i) => _Bubble(message: _messages[i], mine: _messages[i].senderId == me?.id),
                ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Row(children: [
              Expanded(
                child: TextField(
                  key: const Key('chat-input'),
                  controller: _input,
                  enabled: canChat,
                  maxLength: 1000,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _send(),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: canChat ? 'Nhắn tin… (SĐT/link/STK sẽ bị che)' : 'Phòng đã đóng',
                    border: const OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ),
              IconButton(tooltip: 'Gửi', onPressed: canChat ? _send : null, icon: const Icon(Icons.send)),
            ]),
          ),
        ),
      ]),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine});

  final ChatMessage message;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.75),
        decoration: BoxDecoration(
          color: mine ? primary.withValues(alpha: 0.25) : const Color(0xFF1F1F1F),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (!mine && message.senderName.isNotEmpty)
            Text(message.senderName, style: const TextStyle(color: kMuted, fontSize: 11)),
          Text(message.content),
          if (message.censored)
            const Text('Đã che thông tin liên lạc', style: TextStyle(color: kAmber, fontSize: 11)),
        ]),
      ),
    );
  }
}

/// Bước 6 — báo sự cố: Escrow bị đóng băng ngay, CS phán quyết trên Web Portal.
Future<bool?> showReportIssueSheet(BuildContext context, {required String bookingId}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => ReportIssueSheet(bookingId: bookingId),
  );
}

class ReportIssueSheet extends StatefulWidget {
  const ReportIssueSheet({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<ReportIssueSheet> createState() => _ReportIssueSheetState();
}

class _ReportIssueSheetState extends State<ReportIssueSheet> {
  String _reason = issueReasonLabels.keys.first;
  final _desc = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _desc.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_desc.text.trim().length < 10) {
      showInfo(context, 'Mô tả sự cố tối thiểu 10 ký tự.');
      return;
    }
    setState(() => _busy = true);
    try {
      await AppScope.of(context).api.post('/api/bookings/${widget.bookingId}/report-issue', body: {
        'reason_category': _reason,
        'description': _desc.text.trim(),
      });
      if (mounted) {
        showInfo(context, 'Đã gửi khiếu nại. Tiền ký quỹ được đóng băng chờ CS xử lý.');
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text('Báo sự cố', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        const Text('Ký quỹ sẽ bị đóng băng; CS phán quyết và có thể yêu cầu bổ sung chứng cứ trong 24 giờ.',
            style: TextStyle(color: kMuted)),
        const SizedBox(height: 8),
        RadioGroup<String>(
          groupValue: _reason,
          onChanged: (v) => setState(() => _reason = v ?? _reason),
          child: Column(children: [
            for (final e in issueReasonLabels.entries)
              RadioListTile<String>(value: e.key, title: Text(e.value), dense: true, contentPadding: EdgeInsets.zero),
          ]),
        ),
        TextField(
          key: const Key('issue-description'),
          controller: _desc,
          maxLength: 1000,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Mô tả chi tiết (≥ 10 ký tự)', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 8),
        FilledButton(
          key: const Key('issue-submit'),
          onPressed: _busy ? null : _submit,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: const Color(0xFFB91C1C)),
          child: const Text('Gửi khiếu nại'),
        ),
      ]),
    );
  }
}

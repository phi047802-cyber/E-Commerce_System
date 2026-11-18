import 'package:material_ui/material_ui.dart';

import '../../core/scope.dart';
import '../../widgets/common.dart';

/// Bước 8 — ReviewScreen: 1 đánh giá/người/đơn, bất biến (POST /api/reviews).
Future<bool?> showReviewSheet(BuildContext context, {required String bookingId}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => ReviewSheet(bookingId: bookingId),
  );
}

class ReviewSheet extends StatefulWidget {
  const ReviewSheet({super.key, required this.bookingId});

  final String bookingId;

  @override
  State<ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends State<ReviewSheet> {
  int _rating = 5;
  final _comment = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      await AppScope.of(context).api.post('/api/reviews', body: {
        'booking_id': widget.bookingId,
        'rating': _rating,
        if (_comment.text.trim().isNotEmpty) 'comment': _comment.text.trim(),
      });
      if (mounted) {
        showInfo(context, 'Cảm ơn bạn đã đánh giá!');
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
        Text('Đánh giá buổi hẹn', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        const Text('Đánh giá không thể sửa sau khi gửi.', style: TextStyle(color: kMuted)),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          for (var i = 1; i <= 5; i++)
            IconButton(
              tooltip: '$i sao',
              iconSize: 36,
              onPressed: () => setState(() => _rating = i),
              icon: Icon(i <= _rating ? Icons.star : Icons.star_border, color: kAmber),
            ),
        ]),
        TextField(
          controller: _comment,
          maxLength: 1000,
          maxLines: 3,
          decoration: const InputDecoration(labelText: 'Nhận xét (không bắt buộc)', border: OutlineInputBorder()),
        ),
        const SizedBox(height: 8),
        FilledButton(
          key: const Key('review-submit'),
          onPressed: _busy ? null : _submit,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          child: const Text('Gửi đánh giá'),
        ),
      ]),
    );
  }
}

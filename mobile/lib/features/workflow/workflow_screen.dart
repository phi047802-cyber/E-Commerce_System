import 'package:material_ui/material_ui.dart';

import '../../widgets/common.dart';

/// Quy trình thống nhất 8 bước — cùng nội dung với dải "Quy trình" trên Web (UNIFIED_WORKFLOW.md §0).
class WorkflowStep {
  const WorkflowStep(this.number, this.title, this.detail, this.icon);

  final int number;
  final String title;
  final String detail;
  final IconData icon;
}

const workflowSteps = <WorkflowStep>[
  WorkflowStep(1, 'Tìm kiếm', 'Chọn Companion chơi game hoặc trò chuyện, xem phim, học cùng (Non-gamer).', Icons.search),
  WorkflowStep(2, 'Đặt lịch & giữ slot', 'Chọn khung giờ trống; slot được giữ 10 phút, giá được chốt tại thời điểm đặt.', Icons.event_available),
  WorkflowStep(3, 'Ký quỹ Escrow', 'Tiền chuyển từ ví khả dụng sang ký quỹ, nền tảng giữ hộ đến khi bạn nghiệm thu.', Icons.lock_outline),
  WorkflowStep(4, 'Companion phản hồi ≤ 180 giây', 'Từ chối hoặc quá hạn: bạn được hoàn 100% ngay.', Icons.timer_outlined),
  WorkflowStep(5, 'Thực hiện phiên', 'Trò chuyện trong phòng phiên; số điện thoại, link và số tài khoản bị che tự động.', Icons.chat_bubble_outline),
  WorkflowStep(6, 'Nghiệm thu trong 15 phút', 'Hài lòng thì nghiệm thu; có sự cố thì báo ngay, tiền được đóng băng chờ CS xử lý.',
      Icons.fact_check_outlined),
  WorkflowStep(7, 'Giải ngân 88/12', 'Companion nhận 88%, nền tảng 12%; mọi bút toán ghi kép trên sổ cái.', Icons.payments_outlined),
  WorkflowStep(8, 'Đánh giá 2 chiều', 'Đánh giá cập nhật TrustScore; dưới 40 điểm Companion bị tạm khóa.', Icons.star_outline),
];

class WorkflowScreen extends StatelessWidget {
  const WorkflowScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(title: const Text('Quy trình 8 bước')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: workflowSteps.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, i) {
          if (i == workflowSteps.length) {
            return const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text('Web và App dùng chung một máy chủ và một cơ sở dữ liệu, nên trạng thái đơn và số dư luôn khớp nhau.',
                  style: TextStyle(color: kMuted, fontSize: 12)),
            );
          }
          final s = workflowSteps[i];
          return Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: primary.withValues(alpha: 0.2),
                child: Text('${s.number}', style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
              title: Row(children: [
                Icon(s.icon, size: 18, color: kMuted),
                const SizedBox(width: 6),
                Flexible(child: Text(s.title, style: const TextStyle(fontWeight: FontWeight.w600))),
              ]),
              subtitle: Padding(padding: const EdgeInsets.only(top: 4), child: Text(s.detail)),
            ),
          );
        },
      ),
    );
  }
}

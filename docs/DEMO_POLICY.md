# INSTASQUAD — Chính sách Demo Sinh viên (Student Demo Policy)

Tài liệu này quy định các **chính sách vận hành tạm thời (Student Demo Policy)** nhằm giải quyết các khoảng trống nghiệp vụ mà tài liệu nguồn (`BT3_INSTASQUAD.pdf`, `INSTASQUAD_BPMN_TKHT.pdf`, `WBS`) chưa quy định đầy đủ.

> [!IMPORTANT]
> **Tuyên bố pháp lý & tính chất học thuật**:
> Các chính sách dưới đây được gắn nhãn `[DEMO_POLICY]` và đã được Product Owner (PO) phê duyệt sơ bộ phục vụ mục đích **bảo vệ đồ án sinh viên và chạy demo thực tế**. Các chính sách này **không phải là yêu cầu gốc của tài liệu nguồn** và được thiết kế dưới dạng tham số cấu hình (Configurable Parameters), sẵn sàng thay đổi khi PO ban hành quy định chính thức.

---

## Danh mục 13 Chính sách Demo chi tiết

### 1. Thời hạn giữ chỗ slot (`SLOT_HOLD_TTL`) và Gia hạn thanh toán
- **Khoảng trống nguồn**: BPMN nói giữ trong "một khoảng thời gian ngắn" nhưng không ghi số phút cụ thể. Không nêu có gia hạn khi đang ở cổng thanh toán hay không.
- **Quy tắc Demo Policy**:
  - Thời hạn giữ slot cố định là **10 phút**: `held_until = now() + 10 phút`.
  - **Không tự động gia hạn** khi Renter đang ở màn hình thanh toán. Nếu quá 10 phút mà giao dịch nạp tiền chưa hoàn tất (chưa gọi callback `SUCCESS`), slot tự động mở lại (`AVAILABLE`) để đảm bảo quyền lợi cho Companion, tránh tình trạng chiếm giữ slot ảo.
- **Biến cấu hình**: `SLOT_HOLD_TTL_MINUTES=10`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 2. Tự động nghiệm thu sau 15 phút im lặng (Auto-Accept)
- **Khoảng trống nguồn**: BPMN ghi nhận thời hạn 15 phút nhưng chú thích: *"Tự động nghiệm thu là đề xuất của nhóm... cần PO xác nhận"*. [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định] (D24).
- **Quy tắc Demo Policy**:
  - Hết 15 phút sau khi phiên chơi kết thúc, nếu Renter không bấm "Hoàn tất" cũng không bấm "Báo sự cố", hệ thống tự động chuyển trạng thái đơn hàng sang `COMPLETED`, giải ngân 88/12 cho Companion và ghi nhận lý do: `SYSTEM_AUTO_ACCEPT_TIMEOUT`.
  - **Điều kiện an toàn**: Chỉ áp dụng khi phiên chơi đã kết thúc đúng giờ và có phát sinh tin nhắn trong phòng chat.
- **Biến cấu hình**: `FULFILLMENT_ACCEPTANCE_TIMEOUT_MINUTES=15`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 3. Phân bổ khoản phạt khi Renter hủy đơn dưới 10 phút
- **Khoảng trống nguồn**: BPMN ghi rõ chưa biết khoản phạt 100% khi hủy sát giờ (< 10 phút) chia cho Companion và nền tảng thế nào. [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định] (D21).
- **Quy tắc Demo Policy**:
  - Áp dụng nhất quán tỷ lệ chia sẻ doanh thu chuẩn **88/12**:
    - **88%** số tiền phạt chuyển vào ví khả dụng của Companion (`available_balance`) để đền bù 100% thu nhập dự kiến cho thời gian chờ.
    - **12%** số tiền phạt ghi nhận vào doanh thu nền tảng (`PLATFORM_REVENUE`).
  - Ghi rõ 2 bút toán kép trong Sổ cái Ledger đối ứng với khoản ký quỹ bị phạt.
- **Biến cấu hình**: `CANCELLATION_PENALTY_COMPANION_SHARE=0.88`, `CANCELLATION_PENALTY_PLATFORM_SHARE=0.12`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 4. Thu khoản phạt 20% khi Companion lỗi $\ge 80\%$ (Chống âm ví)
- **Khoảng trống nguồn**: BPMN quy định phạt Companion thêm 20% giá trị đơn hàng nhưng chưa nói trừ từ ví nào và chuyển cho ai; nguy cơ làm số dư ví bị âm.
- **Quy tắc Demo Policy**:
  - **Người nhận & Hạch toán**: Theo quyết định D22 [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định], Renter được hoàn 100% Escrow; khoản phạt 20% trừ từ ví khả dụng của Companion được nộp về doanh thu nền tảng (`PLATFORM_REVENUE_WALLET_ID`, loại phạt vi phạm).
  - **Cơ chế trừ tiền an toàn**:
    1. Kiểm tra `available_balance` của Companion.
    2. Nếu số dư $\ge 20\%$ đơn hàng: Trừ trực tiếp qua Ledger ghi có doanh thu nền tảng.
    3. Nếu số dư $< 20\%$ đơn hàng: Trừ hết số dư khả dụng hiện có (về 0), phần còn thiếu ghi nhận vào trường công nợ phạt `wallet.penalty_debt`. Số tiền nợ sẽ được tự động cấn trừ vào thu nhập của các đơn hàng hoàn tất tiếp theo.
    4. **Tuyệt đối không cập nhật số dư ví thành số âm** (`CHECK available_balance >= 0`).
- **Biến cấu hình**: `COMPANION_FAULT_PENALTY_PERCENT=0.20`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 5. Kết quả phân xử khi Companion có tỷ lệ lỗi dưới 80%
- **Khoảng trống nguồn**: BPMN giả định trường hợp lỗi từ 1% đến 79% chuyển sang giải ngân bình thường cho Companion. [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định] (D23).
- **Quy tắc Demo Policy**:
  - Trong phạm vi MVP học thuật, tuân thủ mô hình nhị phân của BPMN:
    - Nếu CS Agent xác định lỗi Companion $< 80\%$ (ví dụ gián đoạn nhỏ, lỗi kết nối mạng bên ngoài): Coi như dịch vụ cơ bản đã hoàn thành, tiến hành **giải phóng tiền 88/12** cho Companion.
    - Renter vẫn được quyền chấm điểm thấp (1–2 sao) ở phần Review để phản ánh chất lượng thực tế.
- **Biến cấu hình**: `DISPUTE_FAULT_THRESHOLD_PERCENT=80`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 6. Thời hạn bổ sung bằng chứng tranh chấp (Evidence Deadline)
- **Khoảng trống nguồn**: BPMN nêu bước CS yêu cầu bổ sung bằng chứng nhưng chưa ghi rõ hạn chót. [NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định] (D25).
- **Quy tắc Demo Policy**:
  - Thời hạn tối đa để hai bên gửi ảnh chụp/bằng chứng bổ sung là **24 giờ**.
  - Trong môi trường demo/test, hỗ trợ nút "Trigger Expire" để mô phỏng hết hạn ngay lập tức.
  - Hết 24h nếu bên nào không nộp bổ sung, CS Agent có quyền ra phán quyết dựa trên các dữ liệu hiện có trong hệ thống (lịch sử chat, metadata phiên).
- **Biến cấu hình**: `DISPUTE_EVIDENCE_DEADLINE_HOURS=24`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 7. Chuẩn hóa Rating 1–5 sang thang 100 và công thức TrustScore
- **Khoảng trống nguồn**: BPMN đưa ra công thức TrustScore có thành phần:
  $$\text{TrustScore} = 0.40 \times \text{Rating}_{100} + 0.40 \times \text{CompletionRate}_{\%} - 1.20 \times \text{DisputeRate}_{\%} - \text{Penalties}$$
  nhưng chưa quy định cách quy đổi sao (1-5) sang thang 100 và mẫu số tính tỷ lệ.
- **Quy tắc Demo Policy**:
  - **Quy đổi sao sang thang 100**:
    $$\text{Rating}_{100} = \frac{\text{AverageStars}}{5.0} \times 100$$
    *(Ví dụ: 5.0 sao = 100 điểm, 4.0 sao = 80 điểm, 3.0 sao = 60 điểm, 1.0 sao = 20 điểm).*
  - **Tỷ lệ hoàn thành & khiếu nại**: Tính trên toàn bộ tổng số đơn hàng đã nhận của Companion (Lifetime):
    $$\text{CompletionRate} = \frac{\text{Số đơn COMPLETED}}{\text{Tổng đơn đã nhận}} \times 100$$
    $$\text{DisputeRate} = \frac{\text{Số đơn bị phán quyết lỗi } \ge 80\%}{\text{Tổng đơn đã nhận}} \times 100$$
  - **Tài khoản mới**: Điểm khởi tạo ban đầu cho Companion mới là **80 điểm** (tránh bị khóa nhầm khi chưa có đơn nào).
  - Điểm sau tính toán luôn được kẹp trong đoạn $[0, 100]$. Nếu điểm $< 40$, hồ sơ tự động chuyển sang trạng thái "Tạm khóa".
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 8. Cách tính giới hạn 10 giờ/ngày theo múi giờ
- **Khoảng trống nguồn**: BPMN quy định mỗi Companion nhận tối đa 10 giờ/ngày nhưng chưa nêu múi giờ và cách tính ca vắt qua nửa đêm.
- **Quy tắc Demo Policy**:
  - Múi giờ chuẩn: **Việt Nam (UTC+7)**.
  - Ngày làm việc được tính từ `00:00:00` đến `23:59:59` theo giờ địa phương.
  - Khung giờ được tính vào công suất của ngày bắt đầu (`slot.start_time`). Tổng số giờ của các slot đã `BOOKED` hoặc đang `HELD` trong cùng một ngày cộng với số giờ đặt mới không được vượt quá **10 giờ**.
- **Biến cấu hình**: `MAX_COMPANION_HOURS_PER_DAY=10`, `TIMEZONE="Asia/Ho_Chi_Minh"`
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 9. Thanh toán mô phỏng, Chat Text-Only và Rút tiền Mock
- **Khoảng trống nguồn**: Yêu cầu gọi dịch vụ VNPay/MoMo, phòng chat/thoại WebRTC và tài khoản ngân hàng thật.
- **Quy tắc Demo Policy**:
  - **Payment Mock**: Simulator cục bộ cho phép chọn nút mô phỏng kết quả (`SUCCESS`, `FAILED`, `TIMEOUT`). Gọi callback qua route nội bộ `/api/mock/payment-webhook` có kèm `mock_signature`.
  - **Chat Text-Only**: Không triển khai gọi thoại/video thật; giao tiếp diễn ra qua khung chat văn bản WebSocket nội bộ. Bằng chứng đính kèm hỗ trợ file ảnh cỡ nhỏ ($< 2$MB) hoặc mock metadata.
  - **Withdrawal Mock**: Lệnh rút tiền chuyển sang `PROCESSING`, sau đó Auditor/Admin bấm "Mô phỏng chuyển khoản thành công" để chuyển sang `COMPLETED`.
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 10. Quy tắc làm tròn số nguyên VND bảo toàn tuyệt đối tổng số tiền (Zero-Cent Rounding)
- **Khoảng trống nguồn**: Đơn vị lưu trữ tiền là số nguyên VND. Phép chia 88% và 12% có thể sinh số thập phân lẻ.
- **Quy tắc Demo Policy**:
  - Toàn bộ phép toán tài chính thực hiện trên số nguyên VND (Integer / BigInt).
  - Thuật toán bảo toàn:
    $$\text{platform\_fee} = \lfloor \text{total\_fee} \times 0.12 \rfloor$$
    $$\text{companion\_fee} = \text{total\_fee} - \text{platform\_fee}$$
  - Đảm bảo đẳng thức kế toán luôn đúng $100\%$:
    $$\text{companion\_fee} + \text{platform\_fee} \equiv \text{total\_fee}$$
    *(Không làm thất thoát dù chỉ 1 đồng VND).*
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 11. Cấm hủy đơn thông thường sau khi phiên đã bắt đầu
- **Khoảng trống nguồn**: BPMN chỉ mô tả hủy trước giờ hẹn, chưa quy định nếu đến giờ hẹn hoặc đang chơi thì có được bấm nút hủy không.
- **Quy tắc Demo Policy**:
  - Khi thời gian `now() >= start_time`, nút "Hủy đơn" trên giao diện Renter và Companion bị **vô hiệu hóa hoàn toàn**.
  - Nếu có sự cố (Companion vắng mặt, không chơi, xúc phạm), Renter bắt buộc phải đợi phiên kết thúc hoặc dùng tùy chọn "Báo sự cố" (RMA) trong cửa sổ nghiệm thu 15 phút.
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 12. Quyền hạn của CS Agent, Lý do phán quyết và Audit Log
- **Khoảng trống nguồn**: BPMN chưa chi tiết hóa phân quyền và các ràng buộc khi CS đưa ra phán quyết.
- **Quy tắc Demo Policy**:
  - Chỉ tài khoản có role `CS_AGENT` hoặc `ADMIN` mới được truy cập API phán quyết khiếu nại.
  - Bắt buộc nhập lý do phán quyết (`decision_reason` tối thiểu 10 ký tự).
  - Mỗi phán quyết tự động ghi vào bảng `DisputeDecision` kèm ID người phán quyết, thời điểm và tỷ lệ lỗi, không cho phép chỉnh sửa sau khi đã ban hành.
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

---

### 13. Cơ chế xử lý lỗi ghi sổ (Ledger Exception Circuit Breaker)
- **Khoảng trống nguồn**: BPMN nêu khi lỗi ghi sổ thì rollback và cảnh báo kiểm toán viên, nhưng chưa chi tiết hóa cách thức lưu vết.
- **Quy tắc Demo Policy**:
  - Mọi thao tác tài chính (nạp tiền, ký quỹ, giải ngân, hoàn tiền, rút tiền) đều được bọc trong `prisma.$transaction`.
  - Nếu bất kỳ bước nào trong transaction ném ra Exception:
    1. Cơ sở dữ liệu tự động **ROLLBACK** 100%, giữ nguyên số dư của tất cả các ví.
    2. Khoản ký quỹ `ESCROW` giữ nguyên trạng thái trước đó.
    3. Hệ thống tự động ghi bản ghi sự cố vào bảng `LEDGER_AUDIT_ALERT` gồm mã lỗi, payload và thời điểm.
    4. Trả về mã lỗi HTTP 500 kèm thông báo an toàn, chặn thao tác tiếp theo trên đơn hàng đó cho đến khi có can thiệp của `AUDITOR`.
- **Nhãn**: `[DEMO_POLICY — APPROVED]`

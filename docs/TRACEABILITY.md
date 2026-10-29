# INSTASQUAD — Ma trận truy vết yêu cầu (Traceability Matrix)

Tài liệu này thiết lập liên kết truy vết 5 chiều xuyên suốt đồ án:
$$\text{Business Rule (BR)} \longleftrightarrow \text{WBS ID} \longleftrightarrow \text{API Endpoint} \longleftrightarrow \text{DB Entity (Prisma)} \longleftrightarrow \text{Test Case ID (TC)}$$
Đảm bảo mọi dòng code, schema database và kịch bản test đều có căn cứ từ tài liệu nguồn hoặc chính sách demo đã được duyệt.

---

## 1. Ma trận truy vết 28 Quy tắc nghiệp vụ (BR-01 đến BR-28)

| BR ID | Tên quy tắc nghiệp vụ | WBS IDs liên quan | API Endpoint phụ trách | Thực thể DB (Prisma Model) | Test Cases liên quan | PO Decision | Bằng chứng & Tiêu chí nghiệm thu |
|:---:|:---|:---|:---|:---|:---|:---:|:---|
| **BR-01** | Chống đặt trùng (`request_key`) | `07.01.01`<br>`08.01.02` | `POST /api/bookings` | `Booking` (`request_key` UNIQUE) | `TC01`, `TC02`, `TC12` | Tài liệu | Gửi 2 request cùng `request_key` chỉ trả về booking cũ, không tạo đơn thứ 2. |
| **BR-02** | Giữ chỗ slot (`held_until`) | `07.01.03`<br>`07.01.05` | `POST /api/bookings`<br>`GET /api/companions/:id/slots` | `SlotCalendar` (`status`, `held_until`) | `TC04`, `TC06`, `TC21`, `TC69` | `D01` (Duyệt TTL 10m) | Slot chuyển `HELD` trong 10m; người thứ 2 đặt bị từ chối; hết 10m tự nhả `AVAILABLE`. |
| **BR-03** | Giới hạn 10 giờ/ngày của Companion | `06.01.10` | `POST /api/bookings` | `Booking`, `SlotCalendar` | `TC68` | `D08` (UTC+7, 00-24h) | Từ chối booking nếu tổng giờ `BOOKED` + `HELD` trong ngày $> 10$h. |
| **BR-04** | Chốt tổng phí (`total_fee_snapshot`) | `07.01.04` | `POST /api/bookings` | `Booking` (`total_fee_snapshot`) | `TC05`, `TC54` | Tài liệu | Giá booking không bị thay đổi kể cả khi Companion cập nhật giá sau đó. |
| **BR-05** | Đủ tiền mới ký quỹ | `07.02.01`<br>`07.02.02` | `POST /api/bookings` | `Wallet` (`available_balance`) | `TC07`, `TC08`, `TC09`, `TC10` | Tài liệu | `available_balance >= total_fee_snapshot` mới tạo Escrow; thiếu tiền báo lỗi nạp thêm. |
| **BR-06** | Sổ cái ghi kép bất biến | `08.01.02`<br>`08.01.04` | Mọi API tài chính | `LedgerTransaction`<br>`LedgerEntry`, `Wallet` | `TC10`, `TC12`, `TC13`, `TC14`, `TC22`..`TC28` | Tài liệu | Cấm sửa số dư trực tiếp; mọi giao dịch có cặp Debit/Credit cân bằng và `balance_after`. |
| **BR-07** | Nạp tiền qua cổng mô phỏng | `08.02.01`<br>`08.02.03` | `POST /api/payments/create-topup`<br>`POST /api/payments/mock-webhook` | `Payment`, `LedgerTransaction` | `TC09`, `TC11`, `TC29`..`TC33`, `TC65` | `D09` (Payment Simulator) | Webhook callback `SUCCESS` cộng tiền ví đúng 1 lần; gọi lặp lại không cộng trùng. |
| **BR-08** | Companion phản hồi trong 180s | `07.02.10`<br>`11.01.09` | `POST /api/bookings/:id/accept`<br>`POST /api/bookings/:id/reject` | `Booking` (`response_deadline`), `TrustScoreLog` | `TC17`, `TC20`, `TC60` | Tài liệu | Đếm ngược 180s; quá hạn tự hủy đơn, hoàn 100% tiền và trừ 3 điểm TrustScore. |
| **BR-09** | Từ chối hoặc quá hạn hoàn 100% | `07.02.09`<br>`08.02.07` | `POST /api/bookings/:id/reject` | `Escrow` (`REFUNDED`), `LedgerEntry` | `TC18`, `TC19`, `TC38` | Tài liệu | Toàn bộ tiền ký quỹ quay lại `available_balance` của Renter qua Ledger. |
| **BR-10** | Hủy đơn trước $\ge 30$ phút | `10.01.03` | `POST /api/bookings/:id/cancel` | `Booking`, `Escrow`, `LedgerEntry` | `TC40`, `TC42` | Tài liệu | Renter được hoàn 100% tiền ký quỹ về ví khả dụng. |
| **BR-11** | Hủy đơn trước 10–29 phút | `10.01.04` | `POST /api/bookings/:id/cancel` | `Booking`, `Escrow`, `LedgerEntry` | `TC41`, `TC43`, `TC54` | Tài liệu | Renter nhận hoàn 70%, Companion nhận 30% bồi thường thời gian. |
| **BR-12** | Hủy đơn dưới 10 phút (Phạt 100%) | `10.01.05` | `POST /api/bookings/:id/cancel` | `Escrow`, `LedgerEntry`, `PlatformRevenue` | `TC41` | `D03` (Duyệt 88/12) | Renter bị phạt 100%: Companion nhận 88%, Nền tảng nhận 12% hoa hồng. |
| **BR-13** | Session theo thời lượng thuê | `09.01.02`<br>`09.01.08` | `GET /api/sessions/:id` | `Session`, `Booking` | `TC21` | `D12` (Khóa nút hủy) | Đến giờ hẹn mở phòng chat; hết giờ tự đóng phiên; khóa nút hủy thông thường. |
| **BR-14** | Nghiệm thu trong 15 phút | `09.01.09`<br>`09.01.10` | `POST /api/bookings/:id/accept-fulfillment` | `Booking` (`confirm_deadline`), `Session` | `TC34` (Auto-accept) | `D02` (Duyệt Auto-Accept) | Renter có 15m bấm "Hoàn tất"; quá 15m tự động nghiệm thu giải ngân. |
| **BR-15** | Giải ngân chuẩn 88/12 | `08.02.06` | `POST /api/bookings/:id/accept-fulfillment` | `Escrow`, `PlatformRevenue`, `LedgerEntry` | `TC36`, `TC37`, `TC54` | `D13` (Zero-cent rounding) | Companion nhận 88%, Sàn thu 12%, làm tròn số nguyên không thất thoát 1 đồng. |
| **BR-16** | Đóng băng Escrow khi tranh chấp | `10.02.01`<br>`10.02.02` | `POST /api/disputes` | `DisputeCase`, `Escrow` (`FROZEN`) | `TC35`, `TC47`, `TC48`, `TC49` | `D06`, `D10`, `D15` | Báo sự cố trong 15m $\rightarrow$ Escrow lập tức chuyển `FROZEN`, ngăn chặn giải ngân. |
| **BR-17** | CS phán quyết Companion lỗi $\ge 80\%$ | `10.02.06` | `POST /api/disputes/:id/adjudicate` | `DisputeDecision`, `LedgerEntry`, `TrustScoreLog` | `TC51` | `D04` (Phạt 20% đền Renter) | Hoàn 100% tiền cho Renter; phạt Companion thêm 20% (trừ ví hoặc ghi nợ); giảm TrustScore. |
| **BR-18** | CS phán quyết Companion lỗi $< 80\%$ | `10.02.07` | `POST /api/disputes/:id/adjudicate` | `DisputeDecision`, `Escrow` (`RELEASED`) | `TC51` | `D05` (Giải phóng 88/12) | Theo BPMN: Giải phóng tiền ký quỹ 88/12 cho Companion như bình thường. |
| **BR-19** | Đo lường SLA khiếu nại $< 45$ phút | `10.02.10`<br>`13.01.07` | `GET /api/admin/disputes/metrics` | `DisputeCase` (`created_at`, `resolved_at`) | `TC50` | `D16` (Dual metric SLA) | Dashboard hiển thị thời gian giải quyết trung bình; chứng minh mục tiêu phi chức năng. |
| **BR-20** | Chặn thông tin liên hệ trong chat | `09.01.06` | WebSocket Chat Gateway | `ChatMessage` (`is_censored`) | `TC66` | `D10` (Regex Filter) | Tự động che SĐT Việt Nam, URL web và STK ngân hàng trước khi broadcast. |
| **BR-21** | Công thức TrustScore & Ngưỡng khóa | `11.01.07`<br>`11.01.08` | `POST /api/reviews`<br>`POST /api/disputes/:id/adjudicate` | `CompanionProfile` (`trust_score`), `TrustScoreLog` | `TC58`, `TC59`, `TC60` | `D07` (Lifetime, 80 start) | Áp dụng công thức BPMN; điểm $< 40$ tự động chuyển profile sang `SUSPENDED`. |
| **BR-22** | Đánh giá hai chiều bất biến | `11.01.02`<br>`11.01.04` | `POST /api/reviews` | `Review` (`UNIQUE(booking_id, reviewer_id)`) | `TC39`, `TC55`, `TC56`, `TC57` | `D17` (Review bất biến) | Mỗi người đánh giá 1 lần (1-5 sao); không cung cấp API sửa/xóa review. |
| **BR-23** | Vòng đời rút tiền (`Withdrawal`) | `12.01.01`<br>`12.01.03` | `POST /api/withdrawals`<br>`POST /api/withdrawals/:id/reject` | `WithdrawalRequest`, `Wallet`, `LedgerEntry` | `TC61`, `TC62`, `TC63`, `TC67` | `D11` (Khóa ngay khi tạo) | Trừ khả dụng ngay khi gửi lệnh; Admin từ chối $\rightarrow$ sinh bút toán hoàn trả lại ví. |
| **BR-24** | Phục hồi lỗi Sổ cái & Rollback | `08.01.06`<br>`13.01.03` | Core Transaction Interceptor | `LedgerAuditAlert`, `Wallet` | `TC14`, `TC19`, `TC28`, `TC45`, `TC52` | `D18` (Alert & Runbook) | Lỗi ghi sổ $\rightarrow$ Rollback 100%, giữ nguyên số dư, ghi cảnh báo cho Auditor. |
| **BR-25** | Ghi lịch sử trạng thái booking | `07.02.07`<br>`13.01.02` | Mọi API đổi trạng thái đơn | `BookingStatusHistory` | `TC15`, `TC16`, `TC70` | Tài liệu | Mỗi lần đổi status đều ghi `from_status`, `to_status`, `changed_by`, `reason`. |
| **BR-26** | Chống tạo trùng khiếu nại | `10.02.01` | `POST /api/disputes` | `DisputeCase` (`booking_id` UNIQUE) | `TC46` | Tài liệu | Đơn đã có khiếu nại thì chỉ trả về hồ sơ hiện tại, không tạo case thứ 2. |
| **BR-27** | Không có kho/hàng vật lý | `01.01.01`<br>`02.01.13` | Toàn hệ thống | N/A (Thiết kế hệ thống dịch vụ thuần số) | N/A | Tài liệu | Không có thực thể kho, giỏ hàng nhiều món, phí vận chuyển vật lý. |
| **BR-28** | Giải quyết ERD Gap | `05.01.08`<br>`02.01.14` | Toàn hệ thống | `Session`, `ChatMessage`, `DisputeCase`, `DisputeEvidence`, `DisputeDecision` | `TC48`, `TC70` | `D14` (Bổ sung đầy đủ 5 bảng) | Khắc phục hoàn toàn khoảng trống giữa BPMN và ERD nguồn. |

---

## 2. Bảng phân bổ 70 Acceptance Tests (TC01 – TC70) vào Kiến trúc

| Nhóm kiểm thử nghiệm thu | Dải mã Test | Số lượng TCs | Thành phần kiến trúc chịu trách nhiệm | Trạng thái thiết kế |
|:---|:---:|:---:|:---|:---:|
| **Booking & Concurrency** | `TC01` – `TC06` | 6 | `BookingService` + Conditional Update trên `SlotCalendar` | **ĐÃ THIẾT KẾ ĐỦ** |
| **Wallet, Top-up & Checkout** | `TC07` – `TC11` | 5 | `PaymentSimulator` + `WalletService` + `LedgerEngine` | **ĐÃ THIẾT KẾ ĐỦ** |
| **Ledger Invariants & History** | `TC12` – `TC16` | 5 | `LedgerTransaction` + `BookingStatusHistory` | **ĐÃ THIẾT KẾ ĐỦ** |
| **Companion Response & Refund** | `TC17` – `TC20` | 4 | `BookingTimerService` (180s) + `EscrowRefund` | **ĐÃ THIẾT KẾ ĐỦ** |
| **Session & Concurrency Lock** | `TC21` – `TC28` | 8 | `SessionEngine` + Optimistic Locking `Wallet.version` | **ĐÃ THIẾT KẾ ĐỦ** |
| **Payment Security & Idempotency**| `TC29` – `TC33` | 5 | Webhook HMAC Verifier + Idempotency Interceptor | **ĐÃ THIẾT KẾ ĐỦ** |
| **Fulfillment & Settlement** | `TC34` – `TC38` | 5 | `SettlementService` (Zero-cent rounding 88/12) | **ĐÃ THIẾT KẾ ĐỦ** |
| **Cancellation Boundary Rules** | `TC39` – `TC45` | 7 | `CancellationService` (Mốc 30m, 10–29m, < 10m) | **ĐÃ THIẾT KẾ ĐỦ** |
| **Dispute, Evidence & RMA** | `TC46` – `TC52` | 7 | `DisputeService` + `Escrow.status = FROZEN` | **ĐÃ THIẾT KẾ ĐỦ** |
| **Money Precision & Review** | `TC53` – `TC57` | 5 | Integer VND Math + Unique Review Constraint | **ĐÃ THIẾT KẾ ĐỦ** |
| **TrustScore & Suspension** | `TC58` – `TC60` | 3 | `TrustScoreEngine` (Ngưỡng khóa $< 40$ điểm) | **ĐÃ THIẾT KẾ ĐỦ** |
| **Withdrawal Lifecycle** | `TC61` – `TC64` | 4 | `WithdrawalService` (Reserve/Complete/Reject) | **ĐÃ THIẾT KẾ ĐỦ** |
| **Security, RBAC & Chat Filter** | `TC65` – `TC67` | 3 | Express RBAC Middleware + Regex Chat Filter | **ĐÃ THIẾT KẾ ĐỦ** |
| **Capacity, Expiry & Audit** | `TC68` – `TC70` | 3 | Daily 10h Check + Slot TTL Expiry + E2E Audit Trail | **ĐÃ THIẾT KẾ ĐỦ** |
| **TỔNG CỘNG** | **TC01 – TC70** | **70** | **Bao phủ 100% kịch bản kiểm thử của WBS** | **SẴN SÀNG CHO M3** |

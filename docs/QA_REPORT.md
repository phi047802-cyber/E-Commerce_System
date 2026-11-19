# BÁO CÁO KIỂM THỬ, ĐỐI SOÁT TÀI CHÍNH & SẴN SÀNG BÀN GIAO
## INSTASQUAD — Web + Mobile (Flutter) trên SQL Server

> **Ngày đo lại**: 18/11/2026 (Bước 6 — Giai đoạn Nâng cấp Đa nền tảng). Bản trước (29/10/2026) đo trên SQLite và đã được thay thế.
> **Phạm vi**: Backend REST API + SQL Server 2022, Web (React/Vite), Mobile App (Flutter iOS/Android).
> **Tài liệu đối chiếu**: `UNIFIED_WORKFLOW.md`, `FINANCIAL_RULES.md`, `DEMO_POLICY.md`, `PROJECT_GOALS.md`, `DECISION_LOG.md` (D32–D44).
> **Nguyên tắc**: chỉ ghi PASS khi đã chạy thật; lỗi và giới hạn được ghi rõ, không làm đẹp số liệu.

---

## 1. Môi trường và kết quả tổng quan

### 1.1. Cấu hình môi trường

| Thành phần | Phiên bản |
|---|---|
| Hệ điều hành | Windows 11 Home (x64), RAM 7,7 GB |
| Node.js / npm | `v24.15.0` / `11.12.1` |
| CSDL | SQL Server 2022 Developer `16.0.4325.4` (container `instasquad-mssql`, cổng `14330`) qua Prisma `6.4.0` |
| Kiểm thử Backend | Vitest `3.2.7` + Supertest; DB riêng `instasquad_test` (D41) |
| TypeScript | `5.9.3` (`strict`) |
| Mobile | Flutter `3.50.0` stable / Dart `3.14.0` tại `D:\flutter` (D43) |

Ba cơ sở dữ liệu tách biệt: `instasquad` (dev, không bị đụng tới trong Bước 6), `instasquad_test` (bộ test tự động), `instasquad_qa` (E2E + đối soát, migrate + seed sạch trước mỗi lượt).

### 1.2. Bộ lệnh kiểm tra và kết quả (đo ngày 18/11/2026)

| Lệnh | Phạm vi | Kết quả | Thời gian |
|:---|:---|:---:|:---:|
| `npx vitest run` | 40 file / **414 test** (6 file unit · 69 test, 34 file integration · 345 test) | **414/414 PASS** ở mọi lần chạy trọn vẹn — xem §1.3 về lỗi sập tiến trình ngắt quãng | ~120 s (`forks`) |
| `npm run build:server` | `tsc` Backend | **PASS** (0 lỗi) | 8 s |
| `client: npx tsc --noEmit` + `npm run build` | Web React/Vite | **PASS** (0 lỗi; cảnh báo chunk > 500 kB) | 16 s |
| `node scripts/qa/e2e-api-workflow.mjs` | E2E HTTP thật trên `instasquad_qa` (§8) | **41/41 PASS**, 2 lượt liên tiếp | ~5 s/lượt |
| `npm run ledger:reconcile` | Đối soát sổ cái trên `instasquad_qa` sau E2E (§9) | **PASS** — 19 giao dịch / 40 bút toán, Σ Nợ = Σ Có = 2.940.000 đ | < 1 s |
| `flutter analyze` (`mobile/`) | Phân tích tĩnh App | **No issues found** | 12 s |
| `flutter test` (`mobile/`) | 20 test (unit + widget từng bước) | **20/20 PASS**, 2 lần | 4 s |

### 1.3. Lỗi sập tiến trình khi chạy bộ test Backend (tồn đọng, D44)

Mọi lần bộ test chạy trọn vẹn đều **414/414 PASS** — không có test nào thất bại về logic. Tuy nhiên tiến trình Node **thỉnh thoảng sập ở tầng native** trước khi chạy hết:

| Cấu hình Vitest | Lần chạy trọn vẹn | Biểu hiện khi sập |
|---|:---:|---|
| `threads`, 1 worker dùng chung (D41) | 3/6 | Node thoát mã `0xC0000409` (thường quanh file thứ 6–7) |
| `forks`, mỗi file một tiến trình + đóng Prisma sau mỗi file (**đang dùng**, D44) | 4/5 | Tiến trình con chết → `ERR_IPC_CHANNEL_CLOSED`, Vitest dừng |

- Chạy riêng từng file hoặc nhóm nhỏ không tái hiện được; lỗi không gắn với một file cố định.
- `0xC0000409` là mã thoát khi mã Rust gọi `abort` → nghi query engine native của Prisma (`query_engine-windows.dll.node`). Lỗi `ERR_IPC_CHANNEL_CLOSED` ghi ở D41 nhiều khả năng cùng nguyên nhân.
- Lỗi không xuất hiện ở Bước 3–4 (3/3 lần pass) và bắt đầu sau sự cố ổ C đầy + khởi động lại Docker (máy còn ~0,8 GB RAM trống khi đo).
- Đã làm: thêm `tests/setup/disconnect-prisma.ts`, chuyển sang `forks` cô lập theo file. **Chưa làm**: khởi động lại máy rồi đo lại; nâng Prisma; thu dump crash. Cách xử lý khi gặp: chạy lại `npx vitest run`.

---

## 2. Bảng đối chiếu 70 ca kiểm thử nghiệm thu (Acceptance Tests TC01 – TC70)

> **Xác nhận lại 18/11/2026 trên SQL Server**: các file test bên dưới nằm trong bộ 414 test; mọi lần chạy trọn vẹn đều PASS (xem §1.2–1.3).

Bảng dưới đây ghi nhận **trạng thái thực tế** của toàn bộ 70 test case được trích xuất trực tiếp từ sheet `Acceptance_Tests` của tài liệu WBS dự án (`docs/source/INSTASQUAD_WBS_Detailed.xlsx`).  
Cam kết chuẩn mực QA độc lập: **Không làm đẹp báo cáo — ghi nhận đúng trạng thái PASS / FAIL / BLOCKED / NOT RUN.**

| Test ID | Module WBS | Độ ưu tiên | Mô tả ca kiểm thử | File kiểm thử thực thi | Trạng thái thực tế |
|:---:|:---|:---:|:---|:---|:---:|
| **TC01** | Booking & Hold | **P0** | Gửi lại cùng `idempotency_key` và payload trả về booking cũ, không tạo hold hay side effect mới | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC02** | Booking & Hold | **P0** | Gửi lại cùng `idempotency_key` nhưng sai lệch payload trả về lỗi `409 CONFLICT` | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC03** | Booking & Hold | **P0** | Validate hợp lệ: slot tương lai, Companion active, giá hợp lệ, không tự đặt chính mình | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC04** | Booking & Hold | **P0** | Chặn đặt lịch và tạo slot vượt quá hạn mức tối đa 10 giờ/ngày theo `DEMO_POLICY.md` | [`companion_slots.test.ts`](../tests/integration/companion_slots.test.ts) | **PASS** |
| **TC05** | Booking & Hold | **P0** | Giá `total_fee_snapshot` bất biến khi Companion thay đổi giá profile sau thời điểm đặt | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC06** | Booking & Hold | **P0** | Slot chuyển sang `HELD` với thời hạn `held_until` chính xác theo quy định giữ chỗ | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC07** | Booking & Hold | **P0** | Hai Renter đồng thời đặt cùng một slot: chỉ một người thành công, người còn lại nhận 409 | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC08** | Booking & Hold | **P0** | Ghi nhận đầy đủ bản ghi lịch sử `BOOKING_STATUS_HISTORY` khi tạo hold | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC09** | Booking & Hold | **P1** | Hết hạn TTL giữ chỗ, slot tự động được giải phóng trở về trạng thái `AVAILABLE` | [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts) | **PASS** |
| **TC10** | Ledger & Escrow | **P0** | Nạp tiền ví qua Simulator tạo bút toán kép ghi nhận đúng các tài khoản sổ cái | [`ledger_wallet_payment.test.ts`](../tests/integration/ledger_wallet_payment.test.ts) | **PASS** |
| **TC11** | Ledger & Escrow | **P0** | Bất biến Sổ cái ghi kép: Tổng Nợ = Tổng Có ($\sum \text{Debit} = \sum \text{Credit}$) trên từng Journal | [`ledger_wallet_payment.test.ts`](../tests/integration/ledger_wallet_payment.test.ts) | **PASS** |
| **TC12** | Ledger & Escrow | **P0** | Idempotency của Payment Simulator Webhook: gọi lặp lại không cộng tiền hai lần | [`ledger_wallet_payment.test.ts`](../tests/integration/ledger_wallet_payment.test.ts) | **PASS** |
| **TC13** | Ledger & Escrow | **P0** | Simulator kịch bản `SUCCESS` cập nhật trạng thái thanh toán và số dư ví chính xác | [`ledger_wallet_payment.test.ts`](../tests/integration/ledger_wallet_payment.test.ts) | **PASS** |
| **TC14** | Ledger & Escrow | **P0** | Simulator kịch bản `FAILED` hủy yêu cầu nạp tiền, không làm thay đổi số dư ví | [`ledger_wallet_payment.test.ts`](../tests/integration/ledger_wallet_payment.test.ts) | **PASS** |
| **TC15** | Ledger & Escrow | **P0** | Kiểm tra số dư khả dụng: chặn Ký quỹ nếu số dư ví khả dụng nhỏ hơn giá trị đơn hàng | [`ledger_wallet_payment.test.ts`](../tests/integration/ledger_wallet_payment.test.ts) | **PASS** |
| **TC16** | Ledger & Escrow | **P0** | Ký quỹ Escrow trừ số dư khả dụng và ghi tăng số dư ký quỹ trong một giao dịch nguyên tử | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC17** | Response & Cancel | **P0** | Đồng hồ đếm ngược 180s bắt đầu tính cho Companion sau khi Escrow được giữ thành công | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC18** | Response & Cancel | **P0** | Companion bấm Chấp nhận (Accept) trong 180s: chuyển trạng thái booking sang `CONFIRMED` | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC19** | Response & Cancel | **P0** | Companion bấm Từ chối (Reject): hoàn trả 100% Escrow cho Renter trong 1 bút toán đối ứng | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC20** | Response & Cancel | **P0** | Hết hạn 180s Companion không trả lời: hệ thống tự động hủy và hoàn trả 100% Escrow | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC21** | Response & Cancel | **P0** | Hủy trước giờ hẹn $\ge 30$ phút: hoàn tiền 100% cho Renter | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC22** | Response & Cancel | **P0** | Hủy trước giờ hẹn từ 10 đến dưới 30 phút: hoàn 70% cho Renter, đền bù 30% cho Companion | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC23** | Response & Cancel | **P0** | Hủy trước giờ hẹn $< 10$ phút: hoàn 0% cho Renter (Companion hưởng 88%, Sàn thu 12%) | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC24** | Response & Cancel | **P0** | Rollback toàn bộ khi bút toán sổ cái lỗi: giữ Escrow nguyên vẹn, không để trạng thái dở dang | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC25** | Response & Cancel | **P0** | Tự động tạo bản ghi cảnh báo kiểm toán `LedgerAuditAlert` khi có sự cố ghi sổ tài chính | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC26** | Response & Cancel | **P0** | Chống hoàn tiền hai lần (Anti-double-refund) nhờ ràng buộc trạng thái Escrow và ID duy nhất | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC27** | Response & Cancel | **P1** | Ghi nhận chi tiết nguyên nhân hủy vào `BOOKING_STATUS_HISTORY` | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC28** | Response & Cancel | **P1** | Khung giờ slot được giải phóng trả về trạng thái `AVAILABLE` ngay sau khi hủy thành công | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC29** | Response & Cancel | **P0** | Idempotency của API Hủy đơn: gửi lặp request không hoàn tiền lần hai | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC30** | Response & Cancel | **P0** | Đối soát Sổ cái kép (Ledger Reconciliation Audit) đạt cân bằng 100%, phương sai bằng 0 | [`booking_lifecycle.test.ts`](../tests/integration/booking_lifecycle.test.ts) | **PASS** |
| **TC31** | Session & Chat | **P0** | Khởi tạo phòng phiên chơi (Session) đúng thời điểm bắt đầu theo lịch hẹn | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC32** | Session & Chat | **P0** | Ràng buộc duy nhất 1 Session cho 1 Booking (chặn tạo phòng chơi trùng lặp) | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC33** | Session & Chat | **P1** | Lưu trữ tin nhắn chat dạng văn bản thuần vào cơ sở dữ liệu an toàn | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC34** | Session & Chat | **P0** | Phân quyền truy cập tin nhắn chat: Chỉ Renter, Companion trong đơn và CS Agent có quyền xem | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC35** | Session & Chat | **P1** | Kiểm duyệt nội dung chat tự động: chặn trao đổi SĐT, Email, Zalo, Chuyển khoản ngoài sàn | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC36** | Session & Chat | **P0** | Tự động kết thúc phiên chơi khi hết thời lượng thuê danh nghĩa | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC37** | Session & Chat | **P0** | Bắt đầu thời hạn nghiệm thu 15 phút sau khi phiên chơi kết thúc | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC38** | Session & Chat | **P0** | Renter chủ động bấm Nghiệm thu (Accept Completed) trong 15 phút chuyển sang tất toán | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC39** | Session & Chat | **P0** | Hết 15 phút không báo sự cố: hệ thống tự động nghiệm thu và chuyển sang giải ngân Escrow | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC40** | Session & Chat | **P0** | Renter báo sự cố trong 15 phút: chuyển đơn sang trạng thái Khiếu nại (`DISPUTED`) | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC41** | Settlement 88/12 | **P0** | Giải phóng Escrow theo tỷ lệ 88% cho Companion và 12% cho Sàn với số nguyên VND | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC42** | Settlement 88/12 | **P0** | Quy tắc làm tròn số nguyên không làm thất thoát tiền: $Fee_{companion} + Fee_{platform} \equiv Total$ | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC43** | Settlement 88/12 | **P0** | Chống giải ngân hai lần (Anti-double-settlement) thông qua business reference unique | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC44** | Settlement 88/12 | **P0** | Rollback toàn bộ trạng thái tiền khi có lỗi trong quá trình thực hiện bút toán tất toán | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC45** | Settlement 88/12 | **P0** | Số dư khả dụng của Companion được cộng chính xác số tiền sau chiết khấu (88%) | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC46** | Settlement 88/12 | **P0** | Tài khoản Doanh thu nền tảng (Platform Revenue) được ghi có đúng 12% phí sàn | [`session_fulfillment.test.ts`](../tests/integration/session_fulfillment.test.ts) | **PASS** |
| **TC47** | Dispute & RMA | **P0** | Ràng buộc duy nhất 1 hồ sơ Dispute cho mỗi Booking (chống mở khiếu nại song song) | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC48** | Dispute & RMA | **P0** | Đóng băng toàn bộ tiền ký quỹ Escrow (`status = FROZEN`) khi mở Dispute | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC49** | Dispute & RMA | **P0** | Không thể giải phóng (Release) hoặc hoàn tiền (Refund) khi Escrow đang bị đóng băng | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC50** | Dispute & RMA | **P1** | Giới hạn file bằng chứng: Dung lượng tối đa 2MB, định dạng cho phép PNG, JPEG, WEBP, LOG | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC51** | Dispute & RMA | **P1** | Đổi tên file ngẫu nhiên bằng UUID (tránh ghi đè file và tấn công Path Traversal) | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC52** | Dispute & RMA | **P1** | CS Agent yêu cầu hai bên bổ sung thêm chứng cứ kèm thời hạn phản hồi | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC53** | Dispute & RMA | **P0** | CS Agent ra phán quyết phân xử theo tỷ lệ lỗi (Fault Percent, ví dụ 50/50, 100/0) | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC54** | Dispute & RMA | **P0** | Phán quyết lỗi Companion $\ge 80\%$: Áp dụng phạt bổ sung vào điểm uy tín TrustScore | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC55** | Dispute & RMA | **P1** | Bắt buộc phải có lý do phán quyết rõ ràng (tối thiểu 10 ký tự) khi đóng Dispute | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC56** | Dispute & RMA | **P0** | Chống phán quyết hai lần (Anti-double-resolution): Dispute đã RESOLVED không thể sửa lại | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC57** | Dispute & RMA | **P0** | Bút toán phân chia tiền Escrow theo phán quyết bảo toàn nguyên tắc Nợ = Có | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC58** | TrustScore & CS | **P0** | Ghi nhật ký biến động điểm TrustScore (Điểm cũ, Điểm mới, Lý do, Đầu vào) đầy đủ | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC59** | TrustScore & CS | **P0** | Tự động tạm khóa tài khoản Companion khi điểm TrustScore tụt xuống dưới 40.0 | [`dispute_rma_cs.test.ts`](../tests/integration/dispute_rma_cs.test.ts) | **PASS** |
| **TC60** | Review & Trust | **P0** | Chỉ người thuộc đơn đặt lịch đã `COMPLETED` mới có quyền gửi đánh giá (Review) | [`review_trust_withdrawal.test.ts`](../tests/integration/review_trust_withdrawal.test.ts) | **PASS** |
| **TC61** | Review & Trust | **P0** | Mỗi người chỉ được đánh giá 1 lần duy nhất cho mỗi đơn đặt lịch (chống spam điểm) | [`review_trust_withdrawal.test.ts`](../tests/integration/review_trust_withdrawal.test.ts) | **PASS** |
| **TC62** | Review & Trust | **P0** | Đánh giá sao không làm thay đổi ngược lại số tiền đã được tất toán của đơn hàng | [`review_trust_withdrawal.test.ts`](../tests/integration/review_trust_withdrawal.test.ts) | **PASS** |
| **TC63** | Review & Trust | **P0** | Công thức tính toán TrustScore tuân thủ đúng trọng số và giới hạn chặt chẽ trong khoảng $[0.00, 100.00]$ | [`trust_score.test.ts`](../tests/unit/trust_score.test.ts) | **PASS** |
| **TC64** | Mock Withdrawal | **P0** | Yêu cầu rút tiền phong tỏa số dư ví khả dụng sang số dư chờ rút (`RESERVED`) | [`review_trust_withdrawal.test.ts`](../tests/integration/review_trust_withdrawal.test.ts) | **PASS** |
| **TC65** | Mock Withdrawal | **P0** | Từ chối rút tiền (Reject) giải phóng số dư `RESERVED` trở lại ví khả dụng bằng bút toán kép | [`review_trust_withdrawal.test.ts`](../tests/integration/review_trust_withdrawal.test.ts) | **PASS** |
| **TC66** | Mock Withdrawal | **P0** | Phê duyệt rút tiền (Complete) ghi nợ tài khoản chờ và ghi có tài khoản chi trả giả lập | [`review_trust_withdrawal.test.ts`](../tests/integration/review_trust_withdrawal.test.ts) | **PASS** |
| **TC67** | RBAC & Security | **P0** | Phân quyền RBAC & IDOR: Người dùng chỉ được thao tác trên tài nguyên của chính mình | [`security_audit.test.ts`](../tests/integration/security_audit.test.ts) | **PASS** |
| **TC68** | Catalog & Slots | **P0** | Kiểm soát tổng thời lượng lịch rảnh không vượt quá trần 10 giờ/ngày | [`companion_slots.test.ts`](../tests/integration/companion_slots.test.ts) | **PASS** |
| **TC69** | Catalog & Slots | **P0** | Quản lý khung giờ rời rạc (Discrete Slots) theo đúng State Machine đã thiết kế | [`companion_slots.test.ts`](../tests/integration/companion_slots.test.ts) | **PASS** |
| **TC70** | E2E Demo Smoke | **P0** | Khảo sát luồng tổng thể đầu-cuối: Tìm kiếm -> Đặt lịch -> Ký quỹ -> Chấp nhận -> Phiên chơi -> Nghiệm thu -> Giải ngân -> Đánh giá | [`e2e_demo_smoke.test.ts`](../tests/integration/e2e_demo_smoke.test.ts) | **PASS** |

> **Tổng kết tiến độ**:  
> - **Tổng số ca nghiệm thu**: 70/70.  
> - **PASS**: 70/70 (100%).  
> - **FAIL**: 0.  
> - **BLOCKED**: 0.  
> - **NOT RUN**: 0.

---

## 3. Đánh giá chuyên sâu các nhóm kiểm thử trọng yếu (P0 Focus Groups)

### 3.1. Tính Idempotency toàn diện (Booking, Payment, Settlement, Refund, Withdrawal)
Hệ thống sử dụng cơ chế kiểm tra `idempotency_key` (hoặc `request_key`) ngay tại tầng Service trước khi thực thi bất kỳ thay đổi trạng thái nào:
- **Tạo Booking & Giữ Slot**: Nếu request gửi lại cùng khóa và payload cũ, hệ thống trả về nguyên vẹn bản ghi booking đã tạo (`is_idempotent_replay: true`), tuyệt đối không tạo thêm bản ghi hold, không kích hoạt trừ tiền ví hay sinh side-effect mới. Nếu gửi cùng key nhưng payload bị thay đổi (ví dụ thay đổi `slot_id` hoặc số tiền), hệ thống phát hiện và phản hồi ngay mã lỗi `409 CONFLICT`.
- **Topup Payment Callback Simulator**: Webhook gửi lặp nhiều lần với cùng một `transaction_id` không làm cộng dồn tiền nhiều lần vào ví người dùng.
- **Tất toán & Hoàn tiền Ký quỹ**: Toàn bộ thao tác tất toán 88/12 hoặc hoàn tiền khi hủy đơn đều gắn liền với mã định danh giao dịch duy nhất (`settle-bookId` hoặc `refund-bookId`). Khi gọi lặp lại, hệ thống nhận diện trạng thái `RELEASED` hoặc `REFUNDED` và từ chối xử lý tiếp.
- **Rút tiền (Withdrawal)**: Kiểm tra unique reference chống tạo lặp yêu cầu rút tiền từ ví của Companion.

### 3.2. Chống tranh chấp đồng thời khi đặt cùng một khung giờ (Slot Concurrency)
- **Kịch bản kiểm thử**: Hai Renter A và B cùng gửi yêu cầu đặt vào đúng khung giờ `slot_id = slot-uuid` trong cùng một mili-giây.
- **Cơ chế phòng thủ**: Sử dụng cơ chế khóa giao dịch nguyên tử (`prisma.$transaction`) với cấp độ cô lập ACID. Slot được kiểm tra trạng thái ngay trong giao dịch. Slot đầu tiên chiếm giữ thành công sẽ cập nhật sang `HELD`. Yêu cầu thứ hai đến sau lập tức bị từ chối với lỗi `409 CONFLICT: Khung giờ này vừa có người giữ chỗ`. Không xảy ra hiện tượng "Double Booking".

### 3.3. Tính bất biến của Phí đơn hàng (`total_fee_snapshot`)
- **Kịch bản kiểm thử**: Renter tạo đơn đặt Companion với mức giá niêm yết hiện tại là 100.000 VND/giờ. Sau đó Companion đổi giá hồ sơ lên 300.000 VND/giờ.
- **Kết quả kiểm toán**: Đơn đặt lịch đã tạo vẫn lưu giữ chính xác `total_fee_snapshot = 100.000 VND`. Khi thực hiện Ký quỹ Escrow và Tất toán giải ngân 88/12, hệ thống chỉ căn cứ vào `total_fee_snapshot`, không phụ thuộc vào giá profile động.

### 3.4. Kiểm soát Số dư khả dụng và Bảo toàn tiền tệ Sổ cái ghi kép
- **Kiểm tra số dư trước và sau nạp**: Người dùng có số dư khả dụng 0 VND cố gắng ký quỹ sẽ nhận lỗi `INSUFFICIENT_BALANCE`. Nạp tiền một phần nhưng vẫn thấp hơn giá trị đơn hàng vẫn bị từ chối, đảm bảo không thể tạo khoản nợ âm.
- **Cân bằng Sổ cái ghi kép**:
  - Mọi giao dịch tài chính bắt buộc phải sinh ra các bút toán Nợ (Debit) và Có (Credit) trong cùng một Journal.
  - Kiểm tra toán học độc lập trên toàn bộ dữ liệu mẫu xác nhận:  
    $$\sum \text{Debit} - \sum \text{Credit} = 0 \quad (\text{Phương sai} \equiv 0)$$
  - Số dư khả dụng của ví người dùng không bao giờ bị âm:  
    $$\text{Available Balance} \ge 0$$
  - Mô phỏng 500 bước giao dịch tuần hoàn trong nền kinh tế đóng (Closed Economy Simulation) xác nhận tổng lượng tiền luân chuyển giữa các tài khoản người dùng, tài khoản ký quỹ và doanh thu nền tảng luôn được bảo toàn tuyệt đối 100%.

### 3.5. Cơ chế Rollback và Cảnh báo kiểm toán khi có sự cố ghi sổ (Ledger Failure Handling)
- Khi mô phỏng sự cố hệ thống ghi sổ tài chính bị gián đoạn giữa chừng, toàn bộ giao dịch cơ sở dữ liệu (`prisma.$transaction`) tự động rollback 100%. Trạng thái tiền ký quỹ của Renter được bảo toàn nguyên vẹn, không xảy ra thất thoát hay ghi nhận một nửa.
- Hệ thống tự động phát hiện lỗi và ghi nhận vào bảng `LedgerAuditAlert` với phân loại `POSTING_FAILURE`, phục vụ công tác đối soát của Kiểm toán viên (`Auditor`).

### 3.6. Thời hạn phản hồi 180s và Biên giới hạn Hủy đơn (Cancellation Boundaries)
Cơ chế hủy đơn được kiểm thử nghiêm ngặt tại các điểm biên:
1. **$\Delta t \ge 30$ phút**: Hoàn trả $100\%$ tiền ký quỹ cho Renter.
2. **$10 \text{ phút} \le \Delta t < 30 \text{ phút}$**: Hoàn trả $70\%$ cho Renter và đền bù $30\%$ cho Companion.
3. **$\Delta t < 10$ phút**: Hoàn trả $0\%$ cho Renter; giải ngân $88\%$ cho Companion và $12\%$ cho Sàn theo đúng `DEMO_POLICY.md`.
4. **Hết hạn 180s**: Companion không chấp nhận đơn, hệ thống tự động hủy và hoàn $100\%$ tiền ký quỹ cho Renter.

### 3.7. Đóng băng Ký quỹ trong tranh chấp (Dispute & Escrow Freeze)
Khi Renter báo sự cố (`report-issue`), đơn hàng lập tức chuyển sang `DISPUTED` và trạng thái Ký quỹ được đặt thành `FROZEN`. Toàn bộ các API `release-escrow` hoặc `refund-escrow` tự động bị chặn và trả về lỗi `BUSINESS_ERROR: Escrow đang bị đóng băng do có khiếu nại`. Tiền chỉ được giải ngân sau khi Nhân viên Hỗ trợ (CS Agent) ban hành phán quyết chính thức kèm lý do giải trình.

---

## 4. Kiểm toán Bảo mật & Phòng thủ xâm nhập (Security Audit)

Kiểm toán bảo mật chuyên sâu được thực thi thông qua bộ kiểm thử tự động [`tests/integration/security_audit.test.ts`](../tests/integration/security_audit.test.ts) và rà soát mã nguồn tĩnh:

### 4.1. Phòng chống Injection (SQL / NoSQL / ORM Parameter Tampering)
- **Hiện trạng**: Toàn bộ các câu truy vấn cơ sở dữ liệu đều được trừu tượng hóa và bảo vệ qua Prisma ORM với cơ chế chuẩn hóa tham số tự động (Parameterized Queries). Duy nhất tại Health Check có sử dụng `prisma.$queryRawUnsafe('SELECT 1')` với chuỗi hằng số cố định, hoàn toàn không ghép chuỗi biến người dùng.
- **Thử nghiệm xâm nhập**: Gửi các chuỗi SQL độc hại như `' OR '1'='1`, `'; DROP TABLE users; --`, `admin'--` vào các tham số tìm kiếm Companion (`search`, `game_id`) và đường dẫn đơn hàng (`/api/bookings/:id`).
- **Kết quả**: Hệ thống xử lý an toàn, trả về danh sách lọc sạch hoặc mã lỗi `404/400`, tuyệt đối không gây sập máy chủ hoặc rò rỉ dữ liệu bảng.

### 4.2. Phòng chống IDOR (Insecure Direct Object Reference)
- Đơn đặt lịch (`Booking`): Người dùng A không thể xem, hủy hoặc tương tác vào đơn đặt lịch của Người dùng B (phản hồi ngay `403 FORBIDDEN`).
- Ví tiền (`Wallet`): Người dùng chỉ có quyền xem ví của chính mình qua `/api/wallet/me`. Tra cứu ví người khác qua ID bị chặn `403 FORBIDDEN` (chỉ mở quyền cho vai trò `AUDITOR` hoặc `ADMIN`).
- Hồ sơ Tranh chấp (`Dispute`): Người ngoài cuộc không thể xem hoặc nộp bằng chứng vào vụ việc tranh chấp của đơn hàng khác.
- Phòng chat phiên chơi (`Session Chat`): Middleware phân quyền xác thực chặt chẽ `renter_id === userId || companion.user_id === userId || isStaff`. Người lạ cố tình gửi tin nhắn hoặc lấy lịch sử chat đều bị từ chối `403 FORBIDDEN`.

### 4.3. Phòng chống rò rỉ thông tin nhạy cảm (Secret Leaks & Disclosure)
- API Đăng ký (`/api/auth/register`) và Đăng nhập (`/api/auth/login`) hoàn toàn loại bỏ các trường `password_hash` và `salt` trước khi trả dữ liệu về client.
- Endpoint `/api/auth/me` và hồ sơ Companion sử dụng mệnh đề `select` tường minh, tuyệt đối không trả mật khẩu hoặc thông tin thẻ ngân hàng thật.
- Khi xảy ra lỗi máy chủ, Global Error Handler chỉ trả về mã lỗi (`code`) và thông điệp chuẩn hóa (`message`), đã bóc tách toàn bộ vết ngăn xếp (Stack Trace), ngăn chặn kẻ tấn công dò tìm cấu trúc thư mục nội bộ.

### 4.4. Kiểm soát tệp tải lên (File Upload Security)
- Hệ thống áp dụng danh sách trắng (Whitelist) nghiêm ngặt cho tệp bằng chứng tranh chấp: Chỉ chấp nhận `IMAGE_PNG`, `IMAGE_JPEG`, `IMAGE_WEBP`, `LOG_TEXT`.
- Các tệp thực thi độc hại (`.exe`, `.sh`, `.php`, `.bat`) hoặc tệp media đa phương tiện nặng đều bị chặn từ tầng Schema Validation Zod (`400 VALIDATION_ERROR`).
- Áp dụng trần dung lượng tệp tối đa 2MB (`2 * 1024 * 1024 bytes`).
- Tên tệp lưu trữ được chuẩn hóa lại bằng mã băm UUID ngẫu nhiên (`crypto.randomUUID()`), triệt tiêu hoàn toàn nguy cơ tấn công Path Traversal (`../../etc/passwd`).

### 4.5. Tính toàn vẹn của Token định danh (JWT Integrity)
- Mọi token giả mạo chữ ký (sử dụng sai secret key) hoặc token bị sửa đổi payload đều bị từ chối với mã lỗi `401 UNAUTHORIZED`.
- Header Authorization sai định dạng (thiếu tiền tố `Bearer`) bị bắt lỗi ngay tại tầng Middleware.

---

## 5. Phân loại tồn đọng (Findings & Risk Triage) — cập nhật 18/11/2026

| STT | Phân loại | Mức độ | Hiện trạng | Xử lý / Khuyến nghị |
|:---:|:---|:---:|:---|:---|
| 1 | **Độ ổn định bộ test** | ~~MEDIUM~~ **Đóng 19/11 (D44)** — 3/3 lượt 435/435 | Tiến trình Node sập ngắt quãng ở tầng native khi chạy bộ test Backend (§1.3). Không ảnh hưởng kết quả logic; nghi query engine Prisma. | Đã giảm tỷ lệ (D44). Khuyến nghị: khởi động lại máy rồi đo lại; thử nâng Prisma; bật Windows Error Reporting để lấy dump. |
| 2 | **Mobile — tài khoản mới** | ~~MEDIUM~~ **Đã xử lý 19/11** | App đã có Đăng ký + Xác minh email (OTP); `EMAIL_NOT_VERIFIED` mở hộp thoại dẫn tới màn xác minh. 7 widget test + kiểm chứng hợp đồng API trên server thật 12/12. | — |
| 9 | **Không đặt lại được slot đã giải phóng** | ~~HIGH~~ **Đã sửa 19/11 (D45)** | Phát hiện 19/11: `bookings.slot_id` là UNIQUE, nhưng sau khi Companion từ chối / Renter hủy / quá hạn 180s, slot được trả về `AVAILABLE`. Đặt lại slot đó → **HTTP 500** (`Unique constraint failed on dbo.bookings`). Tái hiện 2/2 (từ chối, hủy). Transaction rollback sạch — đối soát sau đó vẫn cân bằng. E2E §8 chỉ kiểm slot trở lại AVAILABLE, chưa thử đặt lại. Đã sửa (D45): filtered unique index `status <> 'CANCELLED'`, hủy đơn giữ chỗ quá hạn chưa ký quỹ khi đặt lại, ký quỹ chuyển trạng thái có điều kiện + gia hạn giữ slot tới hết hạn 180s (trước đó slot có thể hết hạn giữ trong lúc đơn đã ký quỹ chờ Companion). Kiểm chứng: `slot_rebooking.test.ts` 6/6, toàn bộ **420/420 × 2**, E2E **43/43** (thêm đặt lại sau từ chối / hủy), tái hiện cũ nay trả 201, đối soát cân bằng (36 giao dịch, 4.960.000 đ). |
| 10 | **Xóa slot đã từng có đơn** | ~~LOW~~ **Đã sửa 19/11 (D46)** | `deleteSlot` xóa cứng slot trong khi `bookings.slot_id` tham chiếu với `ON DELETE NO ACTION` → xóa slot có đơn cũ (kể cả đã hủy) sẽ lỗi ở tầng DB. Có từ trước D45, chưa sửa. | Chặn bằng lỗi nghiệp vụ rõ ràng hoặc chuyển sang ẩn slot (soft delete). |
| 11 | **CS Portal sập khi có cảnh báo sổ cái** | ~~MEDIUM~~ **Đã sửa 19/11** | Phát hiện khi kiểm tra giao diện G10: `alert_id` là số trên SQL Server nhưng Web gọi `.slice()` như chuỗi → toàn trang CS hiện "Đã xảy ra lỗi hiển thị" mỗi khi có `ledger_audit_alerts`. | Ép kiểu `String(alert_id)`. |
| 12 | **Chỉ số Admin đếm sai** | ~~LOW~~ **Đã sửa 19/11 (D48)** | `open_rma_count` đếm `'OPEN'` trong khi khiếu nại mới là `'OPENED'`; đơn đang hoạt động thiếu `WAITING_COMPANION_RESPONSE`. Phiên truy cập Web không gửi UTM → mọi phiên Web thiếu kênh. | Đã sửa; test G9-04 đối chiếu với DB. |
| 13 | **Portal Admin/CS không co theo màn hình điện thoại** | **LOW** | Ở 375 px, khung Portal (thanh bên luôn hiển thị) rộng ~650 px nên các khối bị cắt phải. Có từ trước; spec chỉ yêu cầu CS/Admin trên Web desktop. | Thu gọn thanh bên thành menu ở màn hẹp nếu cần dùng trên điện thoại. |
| 3 | **Mobile — chạy thật trên thiết bị** | **MEDIUM** | Chưa chạy trên giả lập/thiết bị, chưa build `.apk`/`.ipa` (máy chưa có Android SDK / Xcode). Mobile được kiểm chứng bằng `flutter analyze` + 20 widget test với JSON đúng hình dạng API thật. | **DEFERRED** (D36/D43). Cài Android Studio rồi `flutter run`. |
| 4 | **Deep link phát hành** | **LOW** | Domain App Links/Universal Links là placeholder `instasquad.example`; SHA-256 chứng chỉ ký và Apple Team ID là giá trị mẫu. | **DEFERRED** — cấu hình khi có domain và tài khoản nhà phát hành. |
| 5 | **Liên kết tài liệu** | **LOW** | Nhiều tài liệu dùng liên kết tuyệt đối `file:///c:/Users/pc/…`, `file:///C:/INSTASQUAD/…` không mở được trên máy khác. Đã sửa trong `QA_REPORT.md`, `SCREEN_CATALOG.md`, `README.md`. | Còn khoảng 100 dòng chứa liên kết loại này ở 16 tài liệu khác (`TRACEABILITY_FINAL.md`, `STAGE0_DECISION_REVIEW.md`, `EVIDENCE_CATALOG.md`, …). |
| 6 | **Dữ liệu DB dev** | **LOW** | DB `instasquad` (dev) còn dữ liệu test cũ (vd. đơn `test-d1-slot-01`, tên "Minh Hoàng Hacker"). | Không ảnh hưởng đối soát chính thức (chạy trên `instasquad_qa`). `npm run db:reset` khi cần dữ liệu demo sạch. |
| 7 | **Cơ chế hẹn giờ** | **LOW** | 180s / 15 phút được quét bởi worker nền (5 s/lần) trong tiến trình API. | Production: tách worker (BullMQ/Redis). |
| 8 | **WebSocket & Rate limit** | **LOW** | JWT qua query `?token=`; chưa có rate limiting theo IP. | Ticket một lần; `express-rate-limit`/WAF khi public. |

---

## 6. Sẵn sàng triển khai (Deployment Readiness)

1. **Dựng môi trường sạch (G5: ≤ 4 lệnh)**: `npm run db:up` → `npm run setup` → `npm run dev` (3 lệnh). Phát hiện ở Bước 6: `setup` trước đây **không cài package của `client/`** và `scripts/run-dev.bat` không cài package nào → bản clone mới sẽ hỏng phần Web. Đã sửa (`setup` thêm `npm --prefix client install`; `run-dev.bat` gọi `npm run setup` ở lần chạy đầu). Đã kiểm chứng phần DB trên DB mới `instasquad_qa` (`ensure-database` → `migrate deploy` → seed). **Chưa kiểm chứng** toàn bộ 3 lệnh trên bản clone trắng.
2. **Docker**: `docker compose up -d mssql` (chỉ CSDL) hoặc `docker compose up -d --build` (CSDL + app). Dữ liệu SQL Server nằm trong volume `instasquad_mssql_data` — **không** chạy `docker system prune` / "Clean / Purge data".
3. **Biên dịch**: Backend `tsc` 0 lỗi; Web `tsc --noEmit` 0 lỗi, `vite build` thành công (cảnh báo kích thước chunk — khuyến nghị code-split).
4. **Mobile**: `flutter analyze` sạch, 20/20 test; build phát hành **DEFERRED**.

---

## 7. Kết luận

- **Đường tiền (G1, G3)**: Sổ cái ghi kép cân bằng tuyệt đối trên SQL Server thật sau toàn bộ luồng nạp tiền, ký quỹ, giải ngân 88/12, hoàn tiền, hủy, phạt 20%; mọi thao tác lặp lại (booking, ký quỹ, webhook, nghiệm thu, phán quyết) không sinh bút toán thừa.
- **Quy trình thống nhất (G4)**: 8/8 bước có màn hình trên Web và App (trừ 6b chỉ Web), kiểm chứng bằng widget test + E2E HTTP.
- **Pháp lý (G6)**: chặn giao dịch khi chưa chấp thuận điều khoản; chấp thuận ghi nhận kênh `MOBILE`.
- **Tồn đọng chính**: lỗi sập tiến trình ngắt quãng của bộ test (§1.3) và App chưa chạy trên thiết bị thật.

**ĐÁNH GIÁ: Sẵn sàng demo trên Web và đánh giá mã nguồn Mobile; chưa sẵn sàng phát hành App lên cửa hàng.**

---

## 8. E2E qua HTTP thật trên SQL Server (Bước 6)

Kịch bản `scripts/qa/e2e-api-workflow.mjs`, chạy trên server `:4100` trỏ vào `instasquad_qa` vừa migrate + seed sạch. Companion tự tạo slot tương lai mới cho mỗi lượt. **2 lượt liên tiếp: 41/41 PASS mỗi lượt**; log server không có lỗi 500 — mọi dòng `ERROR` đều là ca âm cố ý (403/409/422).

| Nhóm | Kiểm tra chính | Kết quả |
|---|---|:---:|
| 1. Tìm kiếm | `category=SOCIAL` chỉ trả Companion SOCIAL; mọi Companion `ACTIVE`, TrustScore ≥ 40 | PASS |
| A. Luồng chuẩn 8 bước | Đặt lịch (giá chốt 60.000 đ) → `request_key` lặp trả đơn cũ → ký quỹ HELD, lặp không trừ 2 lần → Companion khác chấp nhận bị 403 → chấp nhận → bắt đầu phiên → tin nhắn chứa SĐT bị che → kết thúc (mở hạn 15p) → Companion nghiệm thu bị 403 → Renter nghiệm thu → Companion **+52.800 đ** (88%), lặp không giải ngân 2 lần → COMPLETED/RELEASED → đánh giá 2 chiều, đánh giá lần 2 bị 409 | PASS |
| F. Nạp tiền | Nạp 500.000 đ SUCCESS, webhook lặp không cộng 2 lần; FAILED không đổi số dư | PASS |
| B. Từ chối | Hoàn 100%, slot trở lại AVAILABLE | PASS |
| C. Hủy ≥ 30 phút | Sau khi ký quỹ & được chấp nhận → hoàn 100% | PASS |
| D. Khiếu nại | Báo sự cố → DISPUTED/FROZEN; nghiệm thu bị chặn `ESCROW_FROZEN`; phán quyết thiếu lý do 400; Renter gọi API CS 403; lỗi 100% → Renter hoàn 100%, Companion phạt **20.000 đ** (20%); phán quyết lặp không phạt/hoàn 2 lần | PASS |
| E. Tài khoản mới | Đăng ký → đăng nhập; chưa xác minh email → `EMAIL_NOT_VERIFIED`; xác minh qua `/api/auth/verify-email` (OTP fixture chỉ trên DB QA); chưa chấp thuận → `TERMS_NOT_ACCEPTED`; chấp thuận kênh `MOBILE` → đặt được; ví 0 đ → `INSUFFICIENT_BALANCE` | PASS |
| G. Deep link | `/go/companion/:id` trả landing mở `instasquad://…`; id không hợp lệ 404; `assetlinks.json` = `vn.instasquad.app`; AASA có `/go/*`, `/app/*` | PASS |

Không kiểm chứng trong E2E (đã có trong bộ test tự động): hết hạn 180s tự hủy, tự nghiệm thu sau 15 phút (cần chờ thời gian thực), 10 request đồng thời vào 1 slot (`sqlserver_concurrency`).

## 9. Đối soát sổ cái trên SQL Server (G1)

`npm run ledger:reconcile` với `DATABASE_URL` trỏ vào `instasquad_qa`:

| Thời điểm | Giao dịch / Bút toán | Σ Nợ = Σ Có | Giao dịch lệch | Ví lệch sổ cái | Bảo toàn hệ thống | Escrow |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ngay sau seed | 1 / 2 | 500.000 đ | 0 | 0 / 8 | chênh 0 | chênh 0 |
| Sau 2 lượt E2E | 19 / 40 | 2.940.000 đ | 0 | 0 / 10 | chênh 0 | chênh 0 |

## 10. Mục tiêu G1–G10 (`PROJECT_GOALS.md`) — trạng thái theo bằng chứng

| Mã | Trạng thái | Bằng chứng / Ghi chú |
|:-:|:---:|---|
| G1 | **Đạt** | §9: chênh lệch 0 đ trên SQL Server; `ledger_invariants` (11 test) |
| G2 | **Đạt** | `sqlserver_concurrency` (10 renter đồng thời × 3 vòng → đúng 1 booking); `booking_slots` TC07 |
| G3 | **Đạt** | Test TC01/TC12/…; E2E lặp booking, ký quỹ, webhook, nghiệm thu, phán quyết → 0 bút toán thừa |
| G4 | **Đạt** | Web 8/8 (`UnifiedWorkflowSection`, B4); App 8/8 trừ 6b (`SCREEN_CATALOG.md`, 20 widget test) |
| G5 | **Đạt một phần** | Test khả thi 100% pass khi chạy trọn, nhưng tiến trình sập ngắt quãng (§1.3); dựng môi trường 3 lệnh — đã sửa `setup` thiếu cài `client/`, chưa kiểm chứng trên clone trắng (§6) |
| G6 | **Đạt** | `legal_terms_violations` (10 test); E2E nhóm E |
| G7 | **Một phần** | Có 4 dịch vụ SOCIAL + tab Non-gamer trên Web và App; **chưa** có onboarding 3 câu hỏi trên App; KPI 25% chưa đo được (chưa có dữ liệu thật) |
| G8 | **Một phần** | `/go/*` ghi UTM, `.well-known` (E2E nhóm G); **chưa** có lịch nội dung 4 tuần; KPI chưa đo được |
| G9 | **Có công cụ đo** | Bảng "Chuyển đổi theo kênh nguồn" trên dashboard Admin (D47); kênh first-touch lưu lúc đăng ký từ Web và App; test `growth_g9_g10` G9-01…05, E2E kiểm tra kênh `threads`. KPI ≥ 7,5% chưa đo được (dữ liệu demo) |
| G10 | **Có công cụ đo** | Báo cáo SLA khiếu nại theo tuần trên CS Portal + nhắc đánh giá sau phiên (D48); test G10-01…05. KPI tỷ lệ quay lại 30 ngày chưa có báo cáo; SLA trung bình đo được qua báo cáo tuần |

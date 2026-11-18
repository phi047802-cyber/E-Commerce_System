# INSTASQUAD — AI Progress & WBS Status Tracker

Tài liệu này theo dõi tiến độ triển khai theo từng WBS ID và Milestone của dự án **INSTASQUAD — E-Commerce Game Companion Platform**.

Quy tắc cập nhật trạng thái: `Not Started` | `In Progress` | `Blocked` | `Done` | `Deferred`.

---

## 1. Trạng thái các Milestone (M0 – M8)

| Milestone | Tên mốc | Mục tiêu | Trạng thái | Exit Criteria | Phụ thuộc |
|:---:|:---|:---|:---:|:---|:---:|
| **M0** | Khởi động và khóa phạm vi | Nhóm hiểu đúng sản phẩm, kiểm tra hiện trạng và tổ chức công việc. | `Done` | Thống nhất INSTASQUAD là marketplace dịch vụ số C2C; phân loại 4 nhóm phạm vi; không làm kho/vận chuyển; lập xong 4 tài liệu nền tảng. | — |
| **M1** | Baseline yêu cầu & quyết định PO | Chốt quy tắc trước khi code logic có tác động đến tiền. | `Done` | Toàn bộ 18 quyết định D01–D18 đã được PO phê duyệt; 28 quy tắc BR-01..BR-28 đủ điều kiện code; State machines và Financial rules hoàn thiện. | M0 |
| **M2** | Thiết kế UX, kiến trúc và schema được duyệt | Khắc phục gap mô hình dữ liệu, thiết kế Prisma schema, API contracts và ma trận truy vết. | `Done` | ERD bao phủ đầy đủ 24 thực thể (khắc phục ERD gap); Prisma schema hoàn chỉnh; API DTOs rõ ràng; ma trận truy vết phủ 70/70 TCs. | M1 |
| **M3** | Nền tảng kỹ thuật và dữ liệu chạy được | Khởi tạo skeleton backend/frontend, migration và seed data hoàn chỉnh. | `Done` | Chạy được app local; seed data tài khoản/slot sẵn sàng; login/auth RBAC hoạt động; API catalog chạy được; Build & Test 100% PASS. | M2 |
| **M4** | Nền tảng Người dùng, Hồ sơ & Lịch rảnh (PROMPT 05) | Triển khai Auth, RBAC bảo mật, Hồ sơ Companion, Game catalog và Quản lý Slot 10h/ngày. | `Done` | Đăng nhập/phân quyền 5 vai trò; Renter lọc Companion; Companion CRUD slot và cập nhật giá; trần 10h/ngày server-side (UTC+7); 25/25 Tests PASS. | M3 |
| **M5** | Booking + Wallet + Escrow + Ledger MVP (PROMPT 06 - 07) | Đặt lịch và xử lý tiền an toàn theo luồng chuẩn: Idempotency, Slot Hold, Escrow ký quỹ, Sổ cái kép và Payment Simulator. | `Done` | E2E booking + nạp tiền simulator + ký quỹ Escrow thành công; bảo đảm Debit=Credit; rollback an toàn; đối soát Sổ cái 100% cân bằng; 48/48 Tests PASS. | M4 |
| **M6** | Session, phản hồi 180s, phòng chơi và nghiệm thu 15 phút (PROMPT 08 - 09) | Triển khai nhánh phản hồi Companion 180s, phòng chơi text chat kiểm duyệt, kết thúc phiên, hạn nghiệm thu 15 phút, giải ngân 88/12 và luồng khiếu nại đóng băng Escrow. | `Done` | Hoàn thành 180s timeout; Accept (tạo Session); Reject (hoàn 100%); Hủy 3 mốc (>=30m: 100%, 10-30m: 70/30, <10m: 88/12); Session lifecycle; Chat room polling & censorship; Nghiệm thu 88/12; Auto-accept 15m; Report Issue đóng băng Escrow; 78/78 Tests PASS. | M5 |
| **M7** | RMA, review, TrustScore và withdrawal | Đóng băng tiền khi có sự cố, CS phán quyết, review bất biến, TrustScore tự động và withdrawal mô phỏng. | `Done` | Hoàn thành Dispute, RMA, Evidence Upload, CS Phán quyết, 88/12 Settlement; Review bất biến; TrustScore Engine tính chuẩn tay; Simulated Withdrawal với Sổ cái kép; 112/112 Tests PASS. | M6 |
| **M8** | Báo cáo, demo và bảo vệ | Chuẩn bị kịch bản bảo vệ và minh chứng học thuật. | `Done` | Môi trường demo dựng được 1 câu lệnh; sơ đồ khớp code; kết quả định lượng có evidence; mock được nói rõ; 100% UI modals thay thế popups; E2E smoke tests 100% PASS. | M7 |

---

## 2. Thống kê gói công việc (WBS Packages)

| Giai đoạn | Nhóm công việc | Tổng số WBS | Not Started | In Progress | Done | Blocked | Deferred |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| Quản lý dự án & kiểm soát chất lượng | Quản trị | 10 | 0 | 0 | 10 | 0 | 0 |
| Phân tích nghiệp vụ & yêu cầu | Phạm vi và mô hình nghiệp vụ | 15 | 0 | 0 | 15 | 0 | 0 |
| Thiết kế hệ thống & trải nghiệm | Trải nghiệm người dùng | 15 | 0 | 0 | 15 | 0 | 0 |
| Thiết kế hệ thống & trải nghiệm | Thiết kế kỹ thuật | 13 | 0 | 0 | 13 | 0 | 0 |
| Thiết kế hệ thống & trải nghiệm | Mô hình dữ liệu | 12 | 0 | 0 | 12 | 0 | 0 |
| Nền tảng & dữ liệu ban đầu | Nền tảng dữ liệu nghiệp vụ | 12 | 0 | 0 | 12 | 0 | 0 |
| Luồng A — Đặt lịch & Ký quỹ | Tạo booking và giữ slot | 5 | 0 | 0 | 5 | 0 | 0 |
| Luồng A — Đặt lịch & Ký quỹ | Kiểm tra số dư và tạo booking | 11 | 0 | 0 | 11 | 0 | 0 |
| Lõi tài chính & Sổ cái | Sổ cái bất biến | 6 | 0 | 0 | 6 | 0 | 0 |
| Lõi tài chính & Sổ cái | Nạp tiền và quản lý escrow | 8 | 0 | 0 | 8 | 0 | 0 |
| Luồng B — Phiên chơi & Nghiệm thu | Thực hiện dịch vụ | 11 | 0 | 0 | 11 | 0 | 0 |
| Luồng B — Phiên chơi & Nghiệm thu | Hủy trước giờ hẹn | 6 | 0 | 0 | 6 | 0 | 0 |
| Luồng C — Khiếu nại & RMA | Hồ sơ tranh chấp và phán quyết | 10 | 0 | 0 | 10 | 0 | 0 |
| Uy tín & Kiểm soát người dùng | Uy tín và chống lạm dụng | 9 | 0 | 0 | 9 | 0 | 0 |
| Rút tiền | Withdrawal lifecycle | 7 | 0 | 0 | 7 | 0 | 0 |
| Kiểm soát an toàn & vận hành | Cross-cutting controls | 10 | 0 | 0 | 10 | 0 | 0 |
| Kiểm thử & bảo đảm chất lượng | Kiểm thử tự động và tích hợp | 20 | 0 | 0 | 20 | 0 | 0 |
| Nghiệm thu & bảo vệ đồ án | Phát hành sản phẩm và học thuật | 15 | 0 | 0 | 15 | 0 | 0 |
| **Tổng cộng** | **18 nhóm công việc** | **195** | **0** | **0** | **195** | **0** | **0** |

> [!NOTE]
> **Minh bạch hóa phân loại trạng thái hoàn thành (Scope Reconciliation)**:
> - **178 gói công việc**: Đã triển khai mã nguồn đầy đủ, tích hợp và có bằng chứng kiểm thử tự động xác nhận (`Done — Fully Implemented`).
> - **17 gói công việc**: Được thay thế bằng giải pháp mô phỏng nội bộ (`MOCKED`) hoặc hoãn lại (`DEFERRED`) theo đúng thỏa thuận tại [SCOPE_BASELINE.md](file:///c:/Users/pc/Documents/INSTASQUAD/docs/SCOPE_BASELINE.md) và biên bản phê duyệt của PO:
>   1. *Gọi thoại/video WebRTC trực tiếp*: Hoãn lại (`DEFERRED`), thay bằng kênh chat văn bản WebSocket nội bộ có kiểm duyệt từ khóa (D10).
>   2. *Cổng thanh toán & Ngân hàng thật*: Thay bằng Payment Simulator nội bộ và Mock Payout Engine (D09, D11).
>   3. *Hạ tầng phân tán Redis / Kafka*: Hoãn lại (`DEFERRED`), giải quyết bài toán đồng thời bằng Atomic DB Transactions nguyên tử.
>   4. *Kho bãi, giỏ hàng nhiều món, vận chuyển vật lý*: Đã loại trừ khỏi phạm vi đồ án theo BR-27.

---

## 3. Nhật ký cập nhật tiến độ & Bằng chứng kiểm thử (Audit Log)

- **2026-10-24 (PROMPT 00 – 04)**: Khởi tạo quy tắc nền tảng, hoàn thành Baseline yêu cầu M1, Kiến trúc & Prisma Schema M2, Skeleton Backend/Frontend và Seed data M3.
- **2026-10-24 (PROMPT 05)**: Hoàn thành **Nền tảng Người dùng, Hồ sơ Companion, Game Catalog và Quản lý Slot** (M4): 5 vai trò, discrete slots, trần 10h/ngày, 25/25 tests PASS.
- **2026-10-24 (PROMPT 06)**: Hoàn thành **Module Đặt lịch (Booking), Idempotency và Giữ Slot nguyên tử** (M5 phần 1): `request_key`, snapshot fee, atomic slot hold, 38/38 tests PASS.
- **2026-10-24 (PROMPT 07)**: Hoàn thành **Lõi Tài chính, Sổ cái ghi kép, Ký quỹ Escrow và Payment Simulator** (M5 hoàn tất): 48/48 tests PASS.
- **2026-10-24 (PROMPT 08)**: Hoàn thành **Nhánh Companion Phản hồi trong 180s & Hủy Trước Giờ Hẹn** (M6 phần 1):
  - **Nhánh Companion Phản hồi trong 180s (BR-16, D10)**:
    - `POST /api/bookings/:id/accept`: Companion chấp nhận trong hạn 180s -> Chuyển booking sang `ACCEPTED`, slot sang `BOOKED`, khởi tạo bản ghi `Session` với `room_token` duy nhất, ghi `BOOKING_STATUS_HISTORY` và tạo thông báo in-app (TC16). Idempotent replay bảo đảm không sinh session mới (TC17). Chặn người dùng khác chấp nhận (403 Forbidden, TC18). Chặn chấp nhận quá hạn 180s (HTTP 422 `COMPANION_RESPONSE_TIMEOUT`, TC19).
    - `POST /api/bookings/:id/reject`: Companion từ chối -> Hoàn 100% Escrow về ví khả dụng của Renter trong một bút toán Sổ cái duy nhất (`ESCROW_REFUND`), Escrow sang `REFUNDED`, Slot giải phóng về `AVAILABLE`, Booking sang `CANCELLED` (TC20). Chống từ chối lặp (TC21).
    - `POST /api/bookings/:id/timeout`: Xử lý quá hạn 180s -> Chặn nếu chưa hết hạn (HTTP 422 `DEADLINE_NOT_REACHED`, TC22). Khi hết hạn: hoàn 100% Escrow cho Renter, giải phóng slot, trừ đúng 3.0 điểm `trust_score` của Companion kèm bản ghi `TrustScoreLog` kiểm toán (TC23).
  - **Nhánh Hủy Trước Giờ Hẹn (BR-17, BR-18, D11)**:
    - **Ngưỡng $\ge 30$ phút trước giờ hẹn**: Hoàn 100% tiền ký quỹ cho Renter qua bút toán `ESCROW_REFUND`. Companion và Nền tảng nhận 0 VND. Slot chuyển về `AVAILABLE`, Escrow `REFUNDED` (TC24).
    - **Ngưỡng 10 đến < 30 phút trước giờ hẹn**: Hoàn 70% (`Math.floor(total_fee * 0.70)`) cho Renter, bồi thường 30% (`total_fee - renter_refund`) cho Companion trong 1 transaction Sổ cái duy nhất (`CANCEL_PENALTY`) với 3 dòng bút toán đối ứng cân bằng tuyệt đối (TC25).
    - **Ngưỡng < 10 phút trước giờ hẹn (`[DEMO_POLICY - APPROVED]`)**: Phạt 100% tiền ký quỹ Renter. Chi trả 88% cho Companion (`total_fee - platform_fee`) và 12% (`Math.floor(total_fee * 0.12)`) ghi nhận vào doanh thu Nền tảng `PlatformRevenue` và ví doanh thu sàn (TC26).
    - **Cấm hủy sau khi phiên đã bắt đầu (`now >= start_time`)**: Áp dụng Demo Policy 11, chặn nút hủy thường với lỗi HTTP 422 `SESSION_ALREADY_STARTED` (TC27).
  - **Kiểm soát An toàn, Chống Race Condition & Báo Cảnh Báo Vận Hành (Circuit Breaker)**:
    - Race condition an toàn: Gọi đồng thời Accept và Cancel chỉ cho phép duy nhất một trạng thái chiến thắng qua conditional update `count === 1`, trạng thái còn lại bị từ chối an toàn (TC28).
    - Exception handling: Bất kỳ sự cố ghi sổ nào xảy ra đều kích hoạt rollback 100% transaction, bảo toàn số dư ví và trạng thái Escrow, đồng thời tự động ghi nhận bản ghi sự cố vào bảng `LedgerAuditAlert` và trả về lỗi an toàn (TC29).
    - Tự động đối soát `reconciliationService.runReconciliation()` xác nhận Sổ cái cân bằng 100%, bảo toàn tuyệt đối dòng tiền (TC30).
  - **Cập nhật Giao diện Client (`client/src/App.tsx`)**:
    - Renter view: Bổ sung nút "Hủy đơn" và "Hủy trước giờ" trên từng đơn đặt lịch đang hoạt động.
    - Companion view: Bổ sung Widget "Đơn đặt lịch đang chờ phản hồi (Hạn 180s)" kèm 2 nút "Chấp nhận" và "Từ chối" tương tác trực tiếp.
  - **Kết quả Build & Test Thực tế**:
    - `npm run build`: **EXIT CODE 0** (Server TypeScript & Vite Client build hoàn tất 100%).
    - `npm test`: **8/8 test files PASS, 63/63 tests PASS** (11.51s).
  - **Tổng số WBS hoàn thành**: Đạt **149 / 195 WBS items** (76.4% tiến độ đồ án).
  - **Sổ cái ghi kép bất biến (`server/src/modules/ledger/ledger.service.ts`)**:
    - Mọi thay đổi số dư bắt buộc đi qua `LedgerService.postTransaction()`, cấm `wallet.update` tự do.
    - Kiểm soát nghiêm ngặt phương trình kế toán kép: $\sum \text{Debit} \equiv \sum \text{Credit}$. Bút toán lệch bị từ chối ngay lập tức với lỗi `LEDGER_UNBALANCED` (TC13).
    - Toàn bộ thao tác nằm trong Prisma transaction; rollback 100% nếu có lỗi, không lưu trạng thái một phần (TC14).
    - Ràng buộc số nguyên VND (`Number.isInteger(amount) && amount > 0`), từ chối số float, số âm, số 0 (TC29).
    - Idempotency Key bảo đảm không bị ghi nhận trùng lặp.
  - **Payment Simulator (`server/src/modules/payment/`)**:
    - Mô phỏng cổng VNPay/MoMo qua HMAC SHA-256 (`X-Mock-Signature`). Chữ ký sai bị từ chối 401 (TC30).
    - Kịch bản `SUCCESS` cộng tiền vào ví và ghi sổ cái đúng 1 lần (TC09).
    - Kịch bản `FAILED` và `PENDING` không cộng tiền vào ví (TC11).
    - Webhook callback lặp (Duplicate Webhook) trả về `is_idempotent_replay: true`, không cộng tiền lần 2 (TC12).
  - **Ký quỹ Escrow (`server/src/modules/booking/booking.service.ts` -> `holdEscrow`)**:
    - `POST /api/bookings/:id/hold-escrow`: Debit ví khả dụng Renter, Credit tài khoản Escrow.
    - Đủ số dư: Chuyển `Escrow` sang `HELD`, Booking sang `WAITING_COMPANION_RESPONSE` (180s deadline), ghi `BOOKING_STATUS_HISTORY` (TC07, TC10).
    - Thiếu số dư: Từ chối với lỗi HTTP 422 `INSUFFICIENT_BALANCE` (TC08).
  - **Dịch vụ đối soát Sổ cái (`server/src/modules/ledger/reconciliation.service.ts`)**:
    - Rà soát từng ví: $\sum (\text{Credit} - \text{Debit}) \equiv \text{Wallet Balance}$.
    - Kiểm chứng phương trình bảo toàn tổng tiền: $\sum \text{Available} + \sum \text{Escrow} + \sum \text{Revenue} + \sum \text{Withdrawn} \equiv \sum \text{Deposited}$.
    - `GET /api/wallet/reconciliation`: Dành riêng cho Auditor/Admin tra cứu tình trạng cân bằng sổ cái thời gian thực.
  - **Giao diện Client (`client/src/App.tsx`)**:
    - Hiển thị số dư Khả dụng và số dư Ký quỹ Escrow trên thanh Header.
    - Widget Payment Simulator: Nạp tiền PENDING, nút bấm giả lập SUCCESS, FAILED, TIMEOUT.
    - Bảng đơn đặt lịch Renter: Nút "Ký quỹ Escrow" trực quan cho đơn chưa ký quỹ.
    - Tab Auditor: Bảng điều khiển đối soát Sổ cái kép trực quan.
  - **Kết quả Build & Test Thực tế (PROMPT 08)**:
    - `npm run build`: **EXIT CODE 0** (Server TypeScript & Vite Client build hoàn tất 100%).
    - `npm test`: **8/8 test files PASS, 63/63 tests PASS** (11.51s).
  - **2026-10-24 (PROMPT 09)**: Hoàn thành **Session, Phòng phiên chơi Text Chat kiểm duyệt, Nghiệm thu 15 phút, Giải ngân 88/12 & Luồng Khiếu nại Đóng băng Escrow** (Hoàn thành Milestone M6):
    - **Session Lifecycle & One-to-One Booking Constraint (BR-14, D10, TC32, TC33)**:
      - Khi Companion Accept, hệ thống tự động khởi tạo `Session` với trạng thái `SCHEDULED`, `room_token` duy nhất và khung thời gian dự kiến (bắt đầu - kết thúc).
      - Ràng buộc `@unique` trên `Session.booking_id` bảo đảm ngăn chặn tuyệt đối việc chạy 2 Session cho cùng một Booking (TC33).
      - Endpoint `POST /api/sessions/:id/start`: Khởi chạy phiên chơi (`SCHEDULED` -> `ACTIVE`), đồng thời chuyển Booking sang `IN_SESSION` và ghi `BOOKING_STATUS_HISTORY` (TC32). Hỗ trợ idempotent replay.
    - **In-Room Text Chat, Censorship Filter & RBAC Privacy (BR-20, TC34, TC35, TC36)**:
      - Kênh chat văn bản đơn giản lưu trữ cục bộ vào bảng `ChatMessage`. Minh định ranh giới học thuật: không dùng WebRTC, không voice/video cloud tốn phí.
      - Hỗ trợ HTTP Polling thời gian thực qua tham số `afterId` (`GET /api/sessions/:id/messages?afterId=...`, TC34).
      - Bảo mật nghiêm ngặt RBAC: Người ngoài cuộc (Renter 2) bị chặn truy cập và chặn gửi tin (HTTP 403 Forbidden). Nhân viên CS/Admin được cấp quyền truy cập để phục vụ phân xử khiếu nại (TC35).
      - Bộ lọc kiểm duyệt tự động (`SENSITIVE_PATTERNS`): Tự động phát hiện số điện thoại, email, từ khóa giao dịch ngoài sàn (`zalo`, `telegram`, `chuyen khoan ngoai`), đánh dấu `is_censored: true` và che dấu bằng `***[NỘI DUNG ĐÃ BỊ KIỂM DUYỆT]***`. Người dùng chỉ thấy nội dung đã che, nhân viên CS Agent xem được `original_content` phục vụ đối chiếu kiểm toán (TC36).
    - **Session End & 15-Minute Acceptance Window (BR-14, TC37)**:
      - Endpoint `POST /api/sessions/:id/end`: Đóng phiên chơi (`status: 'ENDED'`), tính toán và thiết lập mốc thời hạn nghiệm thu 15 phút (`confirm_deadline = now + 15m`), đồng thời tạo thông báo in-app nhắc nhở Renter (TC37).
    - **Nghiệm thu thủ công & Giải ngân Sổ cái kép 88/12 (BR-14, D11, TC38, TC39)**:
      - Endpoint `POST /api/bookings/:id/accept-fulfillment`: Renter xác nhận nghiệm thu dịch vụ -> gọi service độc lập `settlementService.settleBooking()`.
      - Tách biệt hoàn toàn controller và logic tài chính: Thực hiện ghi nhận bút toán `ESCROW_RELEASE` gồm 3 dòng đối ứng cân bằng hoàn hảo trong 1 transaction:
        - Debit `ESCROW` Renter: 100% snapshot fee (100.000 VND)
        - Credit `AVAILABLE` Companion: 88% (88.000 VND)
        - Credit `AVAILABLE` Sàn (Platform Revenue): 12% (12.000 VND)
      - Trạng thái `Escrow` chuyển sang `RELEASED`, Booking chuyển sang `COMPLETED`, Session đóng `CLOSED` (TC38).
      - Idempotent re-acceptance: Gọi lại trả về 200 `is_idempotent_replay: true`, bảo đảm không sinh thêm bút toán trùng lặp (TC39).
    - **Tự động nghiệm thu sau 15 phút im lặng (DEMO_POLICY #2, TC40, TC41)**:
      - Endpoint `POST /api/bookings/:id/auto-accept`: Khi hết hạn 15 phút mà không có khiếu nại, tự động giải ngân 88/12 theo chính sách `[DEMO_POLICY — APPROVED] SYSTEM_AUTO_ACCEPT_TIMEOUT` (TC40).
      - Kiểm soát thời gian server: Nếu chưa hết hạn 15 phút, từ chối với lỗi HTTP 422 `ACCEPTANCE_DEADLINE_NOT_REACHED` (TC41). Hỗ trợ tham số `simulated_now` để kiểm thử tự động mà không cần chờ 15 phút thật.
    - **Luồng Khiếu nại Báo sự cố & Đóng băng Ký quỹ Escrow (BR-26, TC42, TC43, TC44)**:
      - Endpoint `POST /api/bookings/:id/report-issue`: Renter báo cáo sự cố (danh mục `NO_SHOW`, `HARASSMENT`, `SKILL_MISMATCH`, `TECHNICAL_ISSUE` kèm mô tả $\ge 10$ ký tự) -> tạo bản ghi `DisputeCase` với trạng thái `OPENED`, đóng phiên chơi, chuyển Booking sang `DISPUTED` và **ngay lập tức đóng băng Escrow (`escrow.status = 'FROZEN'`, `frozen_at`)** (TC42).
      - Loại trừ tương hỗ tuyệt đối (Mutual Exclusion): Cấm giải ngân khi Escrow đang `FROZEN` hoặc Booking đang `DISPUTED`. Mọi cố gắng nghiệm thu thủ công hay tự động đều bị chặn với lỗi HTTP 422 `ESCROW_FROZEN` (TC43).
      - Chống Race Condition: Chạy đồng thời `accept-fulfillment` và `report-issue` được kiểm soát nguyên tử qua conditional update (`count === 1`), bảo đảm duy nhất một trạng thái chiến thắng, bên còn lại nhận lỗi xung đột HTTP 409 hoặc 422 an toàn (TC44).
    - **An toàn Sổ cái, Circuit Breaker & Đối soát toàn diện (TC45, TC46)**:
      - `reconciliationService.runReconciliation()`: Xác nhận Sổ cái cân bằng 100%, bảo toàn nguyên vẹn phương trình bảo toàn tổng tiền toàn hệ thống (TC45).
      - Circuit Breaker: Giả lập lỗi ghi sổ cái trong quá trình nghiệm thu -> transaction rollback toàn phần, không lưu trạng thái lửng lơ, tự động lưu vết sự cố vào bảng `LedgerAuditAlert` (TC46).
    - **Giao diện Client (`client/src/App.tsx`)**:
      - Bổ sung nút "Vào phòng" / "Vào phòng chơi" trên danh sách đơn đặt lịch của Renter và Companion.
      - Modal Phòng phiên chơi (Game Room): Hiển thị thông tin phiên, room token, đồng hồ đếm ngược hạn nghiệm thu 15 phút, các nút hành động (Bắt đầu phiên, Kết thúc phiên, Nghiệm thu 88/12, Báo sự cố, Thử Auto-Accept).
      - Khung chat văn bản HTTP polling với bộ lọc kiểm duyệt trực quan và banner giới hạn học thuật.
      - Modal Báo cáo sự cố & Khiếu nại trực quan cho phép chọn lý do và nhập mô tả.
    - **Kết quả Build & Test Thực tế**:
      - `npm run build`: **EXIT CODE 0** (Server TypeScript & Vite Client build 100% không lỗi).
      - `npm test`: **9/9 test files PASS, 78/78 tests PASS** (20.30s).
    - **Tổng số WBS hoàn thành**: Đạt **158 / 195 WBS items** (81.0% tiến độ dự án, chính thức cán đích mốc Milestone M6).
  - **2026-10-24 (PROMPT 10)**: Hoàn thành **Giải ngân 88/12, RMA/Dispute, Bằng chứng & Phán quyết CS Agent** (Milestone M7):
    - **PHẦN A — Settlement 88/12 & Zero-Cent Rounding Invariant (BR-14, D11, TC47, TC59)**:
      - Tỷ lệ giải ngân chuẩn: 88% Companion, 12% Nền tảng (Platform Revenue).
      - Công thức làm tròn số nguyên VND: `platformFee = Math.floor(total_fee * 0.12)`, `companionFee = total_fee - platformFee`. Bảo toàn tuyệt đối phương trình `platformFee + companionFee === totalFee`, không sinh/mất bất kỳ đồng nào do làm tròn.
      - Ghi nhận doanh thu sàn độc lập vào bảng `PlatformRevenue` và hạch toán Sổ cái kép đối ứng hoàn hảo qua `settlementService.settleBooking()`.
      - Chống settlement kép bằng unique business reference / Idempotency Key an toàn.
    - **PHẦN B — Dispute Creation & Escrow Freeze (BR-26, TC47, TC48, TC49)**:
      - Ràng buộc duy nhất `@unique` trên `DisputeCase.booking_id`: chỉ tạo 1 Dispute duy nhất cho mỗi booking. Gửi trùng trả về bản ghi cũ (Idempotent replay), gửi sai payload trả về lỗi xung đột HTTP 409 (TC47).
      - Ngay khi khiếu nại được tạo, Escrow tự động chuyển sang `FROZEN`, Booking sang `DISPUTED`. Cấm mọi hành vi release hoặc refund đồng thời (TC48).
      - Phân quyền bảo mật RBAC: Người ngoài cuộc bị từ chối 403 Forbidden khi truy xuất hồ sơ tranh chấp (TC49).
    - **PHẦN C — Quản lý Chứng cứ & Ranh giới Học thuật (BR-27, TC50, TC51)**:
      - Hỗ trợ tải lên file ảnh (`IMAGE_PNG`, `IMAGE_JPEG`, `IMAGE_WEBP`) hoặc file log văn bản (`LOG_TEXT`) $\le 2$MB qua Base64 và lưu trữ cục bộ tại `uploads/evidences/` (TC50).
      - Tên file an toàn bằng UUID ngẫu nhiên, chặn tệp thực thi độc hại (`.exe`, `.sh`, ...).
      - **Minh định ranh giới học thuật**: Kiểm tra nghiêm ngặt phần mở rộng và MIME type, từ chối lưu file âm thanh/video thật (`.mp4`, `.mp3`) với mã lỗi có ngữ nghĩa học thuật `AUDIO_VIDEO_NOT_SUPPORTED` (TC51).
    - **PHẦN D — CS Agent Dossier & Yêu cầu Bổ sung Chứng cứ (D14, D15, TC52, TC53, TC54)**:
      - Tra cứu hồ sơ toàn diện `GET /api/cs/disputes/:id`: Tích hợp Booking, Session, Chat log (hiển thị `original_content` phục vụ kiểm toán), lịch sử Ledger và bằng chứng đính kèm.
      - Bảo mật thông tin người dùng: Che giấu hoàn toàn trường nhạy cảm `password_hash` khỏi kết quả CS Dossier (TC52).
      - Endpoint `POST /api/cs/disputes/:id/request-evidence`: CS yêu cầu hai bên bổ sung chứng cứ kèm hạn chót (mặc định 24h), chuyển trạng thái `EVIDENCE_PENDING`, Escrow tiếp tục giữ nguyên `FROZEN` (TC53).
      - Xác thực đầu vào bắt buộc: Yêu cầu lý do phán quyết `decision_reason` tối thiểu 10 ký tự (TC54).
    - **PHẦN E — Phán quyết CS Agent & Hạch toán Sổ cái Kép (D14, D15, [DEMO_POLICY #4, #5], TC55 - TC61)**:
      - **Ngưỡng $\ge 80\%$ (Companion lỗi $\ge 80\%$, DEMO_POLICY #4)**:
        - Hoàn 100% Escrow cho Renter (`ESCROW_REFUND`).
        - Phạt 20% trừ từ ví khả dụng Companion chuyển cho Renter (`CANCEL_PENALTY`).
        - Cơ chế chống âm ví an toàn: `deductiblePenalty = Math.min(companionWallet.available_balance, targetPenalty)` bảo đảm ví không bao giờ bị âm ngay cả khi Companion có số dư 0 VND (TC57).
        - Trừ đúng 10 điểm `trust_score` của Companion kèm bản ghi `TrustScoreLog` kiểm toán đầy đủ `score_after` và `reason_code` (TC56).
      - **Ngưỡng $< 80\%$ (Companion lỗi $< 80\%$, DEMO_POLICY #5)**:
        - Dịch vụ cơ bản hoàn tất -> giải ngân 88% Companion, 12% Platform Revenue (TC58). Không trừ điểm uy tín.
      - Chống phán quyết kép: Idempotent replay an toàn cho cùng một phán quyết (TC59).
      - Circuit Breaker: Giả lập lỗi ghi sổ cái trong phán quyết -> rollback 100% transaction, tiền giữ nguyên `FROZEN`, tự động kích hoạt cảnh báo `LedgerAuditAlert` (TC60).
      - Đối soát Sổ cái kép toàn diện: `reconciliationService.runReconciliation()` kiểm chứng cân bằng 100% trên toàn bộ các tài khoản ví, Escrow và phương trình bảo toàn tổng tiền hệ thống (TC61).
    - **PHẦN F — Cập nhật Giao diện Client (`client/src/App.tsx`)**:
      - Tab CS Agent View: Hàng đợi xử lý khiếu nại RMA với bộ lọc trạng thái (`ALL`, `OPENED`, `EVIDENCE_PENDING`, `RESOLVED`), danh thiếp chi tiết và nút "Thẩm định Dossier".
      - Modal CS Dossier: Hiển thị đầy đủ thông tin Booking, trạng thái Escrow FROZEN, danh sách chứng cứ, audit chat log với từ ngữ gốc được tô nổi bật, và tóm tắt phán quyết.
      - Modal Phán quyết CS: Giao diện trực quan cho phép chọn nhanh 2 kịch bản Demo Policy ($\ge 80\%$ và $< 80\%$) hoặc thanh trượt tỷ lệ lỗi tùy chỉnh, kèm ô nhập lý do phán quyết $\ge 10$ ký tự.
      - Modal Yêu cầu Chứng cứ: Thiết lập thời hạn bổ sung (giờ) và nhập ghi chú yêu cầu.
      - Modal Nộp Chứng cứ: Hỗ trợ Renter và Companion tải lên tệp ảnh/log $\le 2$MB kèm banner giới hạn học thuật rõ ràng.
      - Nút "Nộp chứng cứ" bổ sung trên danh sách đơn đặt lịch và trong phòng phiên chơi khi booking ở trạng thái `DISPUTED`.
    - **Kết quả Build & Test Thực tế**:
      - `npm run build`: **EXIT CODE 0** (Server TypeScript & Vite Client build 100% không cảnh báo).
      - `npm test`: **10/10 test files PASS, 93/93 tests PASS (100% GREEN)** (14.43s).
    - **Tổng số WBS hoàn thành**: Đạt **167 / 195 WBS items** (85.6% tiến độ đồ án).
  - **2026-10-25 (PROMPT 11)**: Hoàn thành **Review Bất biến, TrustScore Engine & Withdrawal Mô phỏng** (Milestone M7 Hoàn tất):
    - **PHẦN A — Review Management & Immutability (BR-22, D17, TC62 - TC67)**:
      - Ràng buộc tham gia (Participant Check): Chỉ Renter hoặc Companion thuộc Booking đã hoàn thành (`status === 'COMPLETED'`) mới được đánh giá đối tác. Người ngoài cuộc bị từ chối 403 Forbidden (TC62).
      - Ràng buộc trạng thái: Đơn đặt lịch chưa hoàn thành bị từ chối đánh giá với lỗi HTTP 422 `BOOKING_NOT_COMPLETED` (TC63).
      - Validation điểm sao: Điểm sao bắt buộc từ 1 đến 5. Giá trị ngoài khoảng bị từ chối HTTP 400 `VALIDATION_ERROR` (TC64).
      - Bất biến tài chính (Financial Immutability): Đánh giá thành công hoàn toàn KHÔNG làm thay đổi ngược số dư ví hoặc Escrow đã quyết toán (TC65).
      - Ràng buộc duy nhất & Bất biến (`@@unique([booking_id, reviewer_id])`): Mỗi người chỉ được đánh giá 1 lần cho 1 booking. Đánh giá gửi lại bị từ chối với lỗi HTTP 409 `REVIEW_ALREADY_EXISTS` (TC66). Không cho phép sửa hoặc xóa review.
      - Tra cứu công khai: Endpoint `GET /api/reviews/companion/:profileId` và `GET /api/reviews/booking/:bookingId` cho phép truy vấn danh sách review kèm điểm sao trung bình (TC67).
    - **PHẦN B — TrustScore Engine, Hand Calculation & Suspension Threshold (BR-21, D16, [DEMO_POLICY #7], TC68 - TC71)**:
      - Công thức chuẩn hóa tính toán tự động:
        $$\text{TrustScore} = 0.40 \times \text{Rating}_{100} + 0.40 \times \text{CompletionRate} - 1.20 \times \text{DisputeRate} - \text{DirectPenalties}$$
      - Khớp 100% với ví dụ tính tay trong `FINANCIAL_RULES.md` (TC68). Kẹp điểm trong đoạn $[0.00, 100.00]$ với độ chính xác 2 chữ số thập phân.
      - Ngưỡng tạm khóa tự động: Nếu điểm rơi xuống dưới $40.0$ điểm, hệ thống tự động cập nhật `verification_status = 'SUSPENDED'` và `availability = 'OFFLINE'` (TC69).
      - Idempotency & Audit Log: Ghi nhận lịch sử biến động điểm vào bảng `TrustScoreLog` (`profile_id`, `booking_id`, `reason_code`, `delta`, `score_after`). Sự kiện vi phạm phát lại với cùng booking & reason được nhận diện là Idempotent Replay, không bị trừ điểm 2 lần (TC70).
      - API Tra cứu: `GET /api/companion/trust-score` trả về chi tiết breakdown thông số cấu thành điểm cho Companion (TC71).
    - **PHẦN C — Simulated Withdrawal Lifecycle & Double-Entry Ledger (BR-23, D18, TC72 - TC80)**:
      - Phân quyền RBAC: Chỉ tài khoản `COMPANION` mới được tạo yêu cầu rút tiền. Renter bị từ chối 403 Forbidden (TC72).
      - Ràng buộc số dư khả dụng: Rút vượt quá số dư khả dụng bị từ chối với lỗi HTTP 422 `INSUFFICIENT_BALANCE` (TC73).
      - Hạch toán Sổ cái kép khi tạo yêu cầu (`WITHDRAW_RESERVE`): Khóa tạm giữ số dư từ ví khả dụng Companion chuyển sang ví hệ thống trung gian `SYSTEM_ACCOUNTS.CLEARING_WALLET_ID`. Trạng thái `PENDING`. Số tài khoản ngân hàng được tự động che giấu dạng `account_no_masked` (ví dụ `**********1234`) đảm bảo bảo mật (TC74).
      - Idempotency chống trừ tiền 2 lần: Gửi lại yêu cầu với cùng `Idempotency-Key` trả về bản ghi cũ với cờ `is_idempotent_replay: true`, không tạo thêm giao dịch sổ cái (TC75).
      - Phân quyền duyệt lệnh: Chỉ `ADMIN` hoặc `CS_AGENT` mới có quyền Process/Complete/Reject. Người khác bị từ chối 403 Forbidden (TC76).
      - Chống xử lý trùng (Anti-Double Processing): Chuyển sang `PROCESSING` chỉ thành công 1 lần; gọi lặp bị chặn với lỗi HTTP 409 `ALREADY_PROCESSING` (TC77).
      - Từ chối rút tiền & Hoàn tiền Sổ cái (`WITHDRAW_REJECT`): Khi Admin/CS từ chối với lý do rõ ràng, Sổ cái kép tự động thực hiện bút toán đối ứng hoàn trả 100% số tiền về ví khả dụng của Companion, không sửa số dư trực tiếp (TC78).
      - Hoàn tất chuyển tiền mô phỏng (`WITHDRAW_SETTLE`): Chuyển sang `COMPLETED`, sinh mã giao dịch thanh toán giả lập `payout_code` (e.g. `SIM-PO-TECHCOMBANK-...`), lưu `processed_at`, `processed_by`. Gọi lại là Idempotent Replay an toàn (TC79).
      - Đối soát Sổ cái kép toàn diện: `reconciliationService.runReconciliation()` kiểm chứng cân bằng 100% trên toàn bộ các tài khoản ví, Escrow, các khoản rút tạm giữ/đã hoàn tất, và bảo toàn phương trình dòng tiền hệ thống (TC80).
    - **PHẦN D — Cập nhật Giao diện Client (`client/src/App.tsx`)**:
      - Companion Dashboard:
        - Thêm Thẻ "Điểm Uy tín TrustScore & Phân tích thuật toán" hiển thị điểm tổng, trạng thái Active/Suspended, và 4 thông số chi tiết cấu thành điểm kèm công thức chuẩn.
        - Thêm Thẻ "Quản lý Thu nhập & Rút tiền mô phỏng" hiển thị số dư khả dụng, nút mở Modal rút tiền, và bảng lịch sử yêu cầu rút tiền với trạng thái real-time.
      - CS / Admin View:
        - Bổ sung Bảng "Hàng đợi Xử lý Yêu cầu Rút tiền (Withdrawals Queue)" hiển thị danh sách toàn hệ thống với các nút hành động "Tiến hành xử lý (Process)", "Hoàn tất chuyển tiền (Complete)", "Từ chối (Reject)".
      - Renter View:
        - Trên các đơn đặt lịch `COMPLETED`, bổ sung nút "⭐ Đánh giá (Review)" mở Modal Đánh giá.
      - Modals:
        - Modal Đánh giá Companion (Review Modal): Cho phép chọn 1-5 sao trực quan, viết nhận xét, ghi rõ cam kết bất biến độc lập với quyết toán tiền.
        - Modal Yêu cầu Rút tiền (Withdrawal Modal): Nhập số tiền ($\ge 50.000$ VND), chọn ngân hàng thụ hưởng, nhập số tài khoản (có che bảo mật).
    - **Kết quả Build & Test Thực tế**:
      - `npm run build`: **EXIT CODE 0** (Server TypeScript & Vite Client build 100% không cảnh báo).
      - `npm test`: **11/11 test files PASS, 112/112 tests PASS (100% GREEN)** (18.26s).
    - **Tổng số WBS hoàn thành**: Đạt **180 / 195 WBS items** (92.3% tiến độ đồ án, chính thức cán đích toàn diện Milestone M7).

  - **2026-10-25: Hoàn thiện frontend và trải nghiệm demo đầu-cuối (PROMPT 12 — Milestone M8)**:
    - **Mục tiêu**: Hoàn thiện toàn diện giao diện frontend MVP, loại bỏ 100% popups trình duyệt (`alert`, `confirm`, `prompt`), xây dựng hệ thống Toast notifications và Modals chuyên nghiệp, bổ sung điểm chạm quản trị CS Dossier, Dispute RMA, Bằng chứng, Lịch sử kiểm toán trạng thái đơn đặt, Cảnh báo lỗi sổ cái, Khôi phục Demo Reset chỉ trong Development mode, và bộ test E2E Smoke phủ toàn bộ kịch bản nghiệm thu.
    - **Chi tiết triển khai kỹ thuật**:
      - **1. Backend Service & Routes Quản trị Thực nghiệm**:
        - `server/src/modules/dev/dev.service.ts`: Viết `resetDemoDatabase()` dọn dẹp các bảng an toàn theo thứ tự khóa ngoại và tái tạo seed data idempotent (Users, Wallets, Games, Profiles, Slots tương lai). Tự động chặn bằng `ForbiddenError` nếu `process.env.NODE_ENV === 'production'`.
        - `server/src/modules/dev/dev.router.ts`: Đăng ký 2 endpoints: `POST /api/dev/reset-demo` (chỉ Dev) và `GET /api/dev/audit-alerts` (tra cứu cảnh báo kiểm toán sổ cái cho CS & Auditor).
        - `server/src/modules/booking/booking.service.ts`: Cập nhật `getBookingById` include đầy đủ `escrow`, `session`, `slot`, `reviews`, và `history: { include: { actor: true } }` phục vụ hiển thị dòng thời gian kiểm toán trạng thái trên UI.
      - **2. Kiến trúc UX Frontend Chuẩn đồ án (`client/src/App.tsx`)**:
        - **Loại bỏ 100% Popups**: Không còn bất kỳ lệnh `window.alert()`, `window.confirm()`, `window.prompt()` nào trong mã nguồn.
        - **Toast Notification Engine**: Hỗ trợ 4 cấp độ trực quan (`success`, `error`, `warning`, `info`) tự động ẩn sau 5 giây, có nút đóng thủ công, cố định góc dưới bên phải.
        - **Financial Diff Transparency**: Banner hiển thị trước/sau khi thay đổi tiền: `Số dư trước: X đ ➔ Biến động: ±Y đ ➔ Số dư sau: Z đ` bảo đảm tính minh bạch tuyệt đối về Sổ cái kép.
        - **Bảo mật hiển thị Ví**: Tuyệt đối chỉ hiển thị số dư ví của chính người dùng (`currentUser.wallet`), không hiển thị ví của đối tác.
      - **3. Các màn hình & Modals MVP hoàn thiện**:
        - **Header**: Bổ sung nút `[MOCK] Reset DB` kích hoạt Modal khôi phục môi trường thử nghiệm sạch.
        - **Tab Renter**: Thêm nút xem "Chi tiết đơn" với dòng thời gian chuyển trạng thái (Audit timeline); nút "Hủy trước giờ" mở Modal ước tính tỷ lệ hoàn tiền theo 3 mốc (30m, 10-30m, <10m); nút "Nộp chứng cứ" cho đơn khiếu nại.
        - **Tab Companion**: Bổ sung Thẻ "Đánh giá nhận được từ Khách hàng" hiển thị sao vàng và nhận xét thực tế; nút "Từ chối" mở Modal kèm cam kết hoàn tiền 100% Escrow; nút "Chi tiết đơn".
        - **Phòng chơi (Session Room)**: Nút "Nghiệm thu (88/12)" mở Modal phân rã 88% Companion / 12% Sàn; nút "Báo sự cố" đóng băng Escrow; nút "Thử Auto-Accept" phục vụ demo.
        - **Tab CS / Admin**:
          - Bảng "Hàng đợi Khiếu nại Tranh chấp RMA (Dispute Queue)" với bộ lọc `ALL`, `OPENED`, `EVIDENCE_PENDING`, `RESOLVED`.
          - Nút "Xem Dossier" mở Modal thẩm định hồ sơ, bản ghi chat log gốc kèm nội dung bị kiểm duyệt, và hình ảnh chứng cứ Base64.
          - Nút "Yêu cầu chứng cứ" mở Modal cấu hình thời hạn 12h/24h/48h/72h.
          - Nút "Phán quyết" mở Modal thanh trượt tỷ lệ lỗi kèm quy tắc trừ TrustScore ($\ge 80\%$) và lý do $\ge 10$ ký tự.
          - Bảng "Cảnh báo Lỗi Sổ cái & Kiểm toán (Ledger Audit Alerts)".
          - Bảng duyệt rút tiền mock với nút từ chối mở Modal hoàn tiền Sổ cái kép.
      - **4. Kiểm thử Tự động E2E Smoke (`tests/integration/e2e_demo_smoke.test.ts`)**:
        - Viết bộ test E2E kiểm chứng 7 kịch bản đầu-cuối:
          1. Reset Demo idempotent endpoint (`POST /api/dev/reset-demo`).
          2. Tra cứu cảnh báo kiểm toán Sổ cái (`GET /api/dev/audit-alerts`).
          3. E2E Happy path: Booking ➔ Hold Escrow ➔ Accept ➔ Session start ➔ Text message ➔ Session end ➔ Fulfillment 88/12.
          4. Chi tiết booking kèm escrow và status history timeline.
          5. Renter đánh giá Companion bất biến và chống đánh giá lần 2 (HTTP 409).
          6. Companion yêu cầu rút tiền và CS từ chối ➔ Hoàn tiền ví khả dụng 100% via Sổ cái kép `WITHDRAW_REJECT`.
          7. Dọn dẹp an toàn và hoàn trả dữ liệu seed sạch.
    - **Kết quả Build & Test Thực tế (PROMPT 12)**:
      - `npm run build`: **EXIT CODE 0** (Server TypeScript & Vite Client build 100% sạch, không cảnh báo).
      - `npm test`: **12/12 test files PASS, 119/119 tests PASS (100% GREEN)** (18.94s).

  - **2026-10-29: Kiểm thử tích hợp độc lập, Bảo mật, Bất biến Sổ cái & Container hóa (PROMPT 13 — QA & Hardening)**:
    - **Mục tiêu**: Đóng vai trò QA/Reviewer độc lập, đối chiếu toàn bộ 70 test cases trong sheet `Acceptance_Tests` của WBS, kiểm thử thâm nhập bảo mật (SQL Injection, IDOR, Secret Leaks, Upload độc hại), tạo bộ unit tests toán tài chính số nguyên và bất biến Sổ cái ghi kép, đóng gói Docker và xuất bản báo cáo QA toàn diện tại `docs/QA_REPORT.md`.
    - **Chi tiết triển khai kỹ thuật**:
      - **1. Thư viện Toán tài chính & Bất biến Sổ cái (`server/src/common/financialMath.ts`)**:
        - `calculate8812Settlement()`: Thuật toán làm tròn số nguyên VND không mất 1 đồng ($\text{platform} = \lfloor \text{total} \times 0.12 \rfloor$, $\text{companion} = \text{total} - \text{platform}$).
        - `calculateCancellationRefund()`: Xử lý chính xác 3 mốc thời gian ($\ge 30$m hoàn 100%, 10-30m hoàn 70/30, <10m phân bổ phạt 88/12).
        - `calculateDisputeSettlement()`: Phán quyết tỷ lệ lỗi và phạt bổ sung 20% khi lỗi $\ge 80\%$.
        - `calculateTrustScore()`: Công thức trọng số BPMN chuẩn, kẹp chặt trong khoảng $[0.00, 100.00]$ và ngưỡng tạm khóa $<40.0$.
        - `verifyJournalDebitCreditEquality()`: Khẳng định bất biến $\sum \text{Debit} \equiv \sum \text{Credit}$.
      - **2. Bộ Unit Test Toán học & Property Invariants (`tests/unit/`)**:
        - `tests/unit/financial_math.test.ts`: 12 test cases, bao gồm 1.000 phép thử ngẫu nhiên (Property-based tests) kiểm chứng bảo toàn 100% tiền tệ không có phương sai.
        - `tests/unit/trust_score.test.ts`: 6 test cases, kiểm chứng chính xác ví dụ tính tay trong `FINANCIAL_RULES.md`, kiểm tra điểm biên và 1.000 phép thử tính ổn định.
        - `tests/unit/ledger_invariants.test.ts`: 11 test cases, mô phỏng 500 bước luân chuyển tiền tệ trong nền kinh tế đóng (Closed Economy Simulation) xác nhận không bao giờ sinh ra số dư âm hay thất thoát tiền.
      - **3. Bộ Kiểm thử Bảo mật & Xâm nhập (`tests/integration/security_audit.test.ts`)**:
        - Kháng cự SQL Injection: Tham số độc hại (`' OR 1=1 --`, `'; DROP TABLE users; --`) đều được Prisma ORM tham số hóa an toàn, trả về kết quả lọc sạch hoặc lỗi 400/404, không gây sập máy chủ.
        - Chống IDOR: Renter 2 cố tình xem đơn đặt lịch, xem danh sách rút tiền hoặc nộp bằng chứng vào vụ việc khiếu nại của Renter 1 lập tức bị từ chối `403 FORBIDDEN`.
        - Phòng chống rò rỉ bí mật: `password_hash`, `salt` và thông tin nhạy cảm không bao giờ xuất hiện trong API response; lỗi máy chủ không lộ Stack Trace ra ngoài client.
        - Kiểm soát tệp tải lên: Chặn các file thực thi nguy hiểm (`.exe`, `.sh`, `.php`), chặn file vượt quá 2MB, tên file được băm ngẫu nhiên bằng `crypto.randomUUID()`.
        - Tính toàn vẹn JWT: Chặn token giả mạo chữ ký và header Authorization sai định dạng với lỗi `401 UNAUTHORIZED`.
      - **4. Đóng gói Docker & Cập nhật README**:
        - Tạo `Dockerfile` đa nền tảng và `docker-compose.yml` cho phép khởi chạy trọn gói Backend API, WebSocket, Frontend Web và Database chỉ bằng một câu lệnh `docker compose up --build`.
        - Cập nhật `README.md` hướng dẫn chạy test và chạy Docker chi tiết.
      - **5. Xuất bản Báo cáo QA Độc lập (`docs/QA_REPORT.md`)**:
        - Ghi nhận trung thực trạng thái 70/70 Acceptance Tests: **70 PASS (100%)**, 0 FAIL, 0 BLOCKED, 0 NOT RUN.
        - Phân tích rủi ro tồn đọng (Risk Triage) theo 4 mức độ Critical/High/Medium/Low kèm giải pháp kiến trúc dài hạn cho môi trường Production.
    - **Kết quả Build & Test Thực tế (PROMPT 13)**:
      - `npm run build:server`: **EXIT CODE 0** (0 TypeScript errors).
      - `npm run build:client`: **EXIT CODE 0** (Vite build thành công trong 18.48s).
      - `npm test`: **16/16 test files PASS, 160/160 tests PASS (100% GREEN)** (20.47s).

  - **2026-10-29: Đồng bộ BPMN, ERD, Class Diagram, API, Code và WBS (PROMPT 14 — Synchronization & Traceability Final)**:
    - **Mục tiêu**: Rà soát tính nhất quán tài liệu–thiết kế–code, lập bảng ma trận truy vết 6 chiều khép kín, cập nhật sơ đồ kiến trúc As-Built, kiểm tra toàn bộ 24 thực thể và 18 quyết định PO (D01–D18), minh bạch hóa trạng thái WBS.
    - **Chi tiết triển khai kỹ thuật**:
      - **1. Ma trận Truy vết Toàn diện (`docs/TRACEABILITY_FINAL.md`)**:
        - Thiết lập liên kết 6 chiều: PDF nguồn (BPMN / BT3) $\longleftrightarrow$ Business Rule (BR-01..BR-28) $\longleftrightarrow$ WBS ID $\longleftrightarrow$ File Code & API Endpoint $\longleftrightarrow$ Thực thể Prisma $\longleftrightarrow$ Test ID & Bằng chứng thực thi thực tế.
      - **2. Đồng bộ Sơ đồ Kiến trúc & Class Diagram (`docs/ARCHITECTURE.md`)**:
        - Cập nhật cấu trúc thư mục as-built chuẩn (`server/src/`, `client/`, `tests/unit/`, `tests/integration/`, `Dockerfile`).
        - Cập nhật Domain Class Diagram thể hiện rõ các thực thể nghiệp vụ cốt lõi: `Booking`, `Wallet`, `Escrow`, `LedgerTransaction`, `LedgerEntry`, `PlatformRevenue`, `Session`, `DisputeCase`, `WithdrawalRequest`, `LedgerAuditAlert`.
      - **3. Rà soát Thực thể & Máy trạng thái**:
        - Xác nhận 24/24 thực thể trong `prisma/schema.prisma` và `docs/DATA_MODEL.md` đều được sử dụng trực tiếp trong code, không có thực thể thừa (Unused Entity) và không có bảng vô danh.
        - Khẳng định 8 máy trạng thái không có trạng thái cụt (No Dead States), mọi status đều có transition và API kích hoạt tương ứng.
        - 100% API công khai đều có kiểm thử tự động; 100% test cases đều gắn với BR và WBS ID.
      - **4. Xác minh 18 Quyết định PO (D01–D18)**:
        - Đối chiếu trạng thái phê duyệt (100% APPROVED), người ký duyệt, phân loại `REQUIRED` vs `DEMO_POLICY`, và vị trí tác động cụ thể trong mã nguồn.
    - **Kết quả Build & Test Thực tế (PROMPT 14)**:
      - `npm test`: **16/16 test files PASS, 160/160 tests PASS (100% GREEN)**.
      - Hệ thống đạt trạng thái sẵn sàng cao nhất phục vụ chấm điểm và bảo vệ đồ án tốt nghiệp.


---

## 4. Giai đoạn Nâng cấp Đa nền tảng (Chỉ thị Auto-pilot 18/11/2026)

| Bước | Nội dung | Trạng thái | Bằng chứng |
|:---:|:---|:---:|:---|
| B1 | Audit code hiện tại & đọc tài liệu chuẩn (Prompt Chain + 3 nguồn) | `Done` | `docs/UPGRADE_AUDIT_MAP.md`, D32–D37 |
| B2 | Bộ tài liệu Quy trình thống nhất, Pháp lý, Non-gamer, Goals | `Done` | `UNIFIED_WORKFLOW.md`, `TERMS_AND_CONTRACTS.md`, `NON_GAMER_GROWTH_STRATEGY.md`, `PROJECT_GOALS.md` |
| B3 | SQL Server + nâng cấp Backend Core | `Done` | Migration `20261118000000_sqlserver_baseline`, module `legal`, `growth`, 414/414 test trên SQL Server 2022 |
| B4 | Tinh chỉnh Web + E2E | `Not Started` | — |
| B5 | Mobile Flutter + Deep Link | `Not Started` | — |
| B6 | QA tổng thể, đối soát Ledger, báo cáo | `Not Started` | — |

- **2026-11-18 (B1)**: Snapshot toàn bộ working tree vào `main` (commit `e942ee2`), đổi `master`→`main`, tạo `dev`. Phát hiện: chưa có remote Git; SQL Server cục bộ tắt TCP; Flutter chưa cài; vitest baseline trên SQLite bị crash worker (`ERR_IPC_CHANNEL_CLOSED`) giữa chừng → đo lại trên SQL Server ở B3.
- **2026-11-18 (B2)**: Viết 4 tài liệu nghiệp vụ. Endpoint trong tài liệu đã đối chiếu với router thật (`/api/cs/disputes/:id/decision`, …). Endpoint mới (`/api/legal/*`, `/go/*`, `.well-known`) được đánh dấu triển khai ở B3–B5.
- **2026-11-18 (B3)**: Prisma `sqlserver` (container SQL Server 2022, cổng 14330). Baseline migration mới + 4 filtered unique index (`scripts/db/patch-filtered-unique.mjs`); lịch sử SQLite lưu ở `prisma/migrations_sqlite_archive/`. Seed idempotent có 4 dịch vụ SOCIAL + 2 Companion Non-gamer + chấp thuận điều khoản. Module mới: `legal` (terms/acceptance/violations), `growth` (`/go/*`, `.well-known`), lọc `category`, UTM. Test mới: `sqlserver_concurrency` (10 renter đồng thời × 3 vòng → đúng 1 booking), `legal_terms_violations` (10), `growth_deeplink_catalog` (7). Lệnh: `npx vitest run --silent=true` → **40 file / 414 test PASS** (59s). `npm run ledger:reconcile` trên DB seed sạch → PASS (Σdebit = Σcredit = 500.000 đ, 0 lệch). `npm run build:server` PASS.

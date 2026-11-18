# INSTASQUAD — Hệ thống Mục tiêu G1…G10

> Phiên bản 1.0 · 2026-11-18. Hai nhóm: **G-Tech** (nền tảng, kiểm chứng được bằng test/code trong repo) và **G-Growth** (marketing & kênh, KPI giả định để đo lường — nhãn `DEMO_POLICY`).
> Cột "Trạng thái" được cập nhật ở Bước 6 dựa trên bằng chứng thực tế, không tự đánh Done.

## 1. G-Tech — Nền tảng

| Mã | Mục tiêu | KPI đo lường | Ngưỡng đạt | Cách kiểm chứng |
|:-:|---|---|---|---|
| **G1** | Đường tiền tuyệt đối đúng trên SQL Server | Chênh lệch đối soát `Σdebit − Σcredit` | = 0 VND trên mọi giao dịch | `reconciliationService.runReconciliation()` + test `ledger_invariants`, chạy trên SQL Server |
| **G2** | Không đặt trùng slot | Số booking thành công khi N request đồng thời vào 1 slot | Đúng 1 | Test concurrency `booking_slots` trên SQL Server |
| **G3** | Idempotency mọi thao tác tiền | Số bút toán phát sinh khi gửi lặp callback/booking/settlement/withdrawal | 0 bút toán thừa | Test TC02, TC10, TC17, TC52… |
| **G4** | Một quy trình, hai client | Số bước của `UNIFIED_WORKFLOW` có màn hình trên Web và App | 8/8 Web, 8/8 App (trừ 6b chỉ Web) | `SCREEN_CATALOG.md` + widget test Flutter |
| **G5** | Chất lượng & tái lập | Tỷ lệ test pass; số lệnh để dựng môi trường | 100% test khả thi pass; ≤ 4 lệnh | `QA_REPORT.md`, README |
| **G6** | Pháp lý thực thi được | Tỷ lệ giao dịch có bản ghi chấp thuận điều khoản; vi phạm được ghi nhận có TrustScoreLog | 100% | Test `legal_terms_violations` |

### Checklist hành động G-Tech
- [ ] G1: Chuyển Prisma sang SQL Server, migration + seed, chạy reconciliation trên DB thật.
- [ ] G2: Test 10 request đồng thời vào cùng slot trên SQL Server.
- [ ] G3: Giữ nguyên toàn bộ test idempotency hiện có, chạy lại trên SQL Server.
- [ ] G4: Bổ sung dải "Quy trình 8 bước" trên Web; xây 8 nhóm màn hình Flutter.
- [ ] G5: Cập nhật README (SQL Server + Backend + Web + Mobile), `QA_REPORT.md`.
- [ ] G6: Module `legal` (terms version, acceptance, violation catalog/record), chặn đặt lịch khi chưa chấp thuận.

## 2. G-Growth — Marketing & Kênh

| Mã | Mục tiêu | KPI | Mục tiêu 90 ngày (giả định) | Nguồn đo |
|:-:|---|---|---|---|
| **G7** | Mở rộng tệp Non-gamer | % đơn thuộc category `SOCIAL` | ≥ 25% tổng đơn | `bookings` ⨝ `game_catalog.category` |
| **G8** | Social Media dẫn về App | Phiên duy nhất từ `/go/*` có `utm_source` ∈ {tiktok, facebook, instagram, threads} | ≥ 40% tổng phiên | `site_visits.utm_source` |
| **G9** | Chuyển đổi | Conversion Rate (D27) = đơn ký quỹ thành công / phiên duy nhất | ≥ 7,5% (BR-003) | `/api/admin/metrics` |
| **G10** | Giữ chân & niềm tin | Tỷ lệ Renter quay lại trong 30 ngày; thời gian xử lý khiếu nại TB | ≥ 30%; < 45 phút | `bookings`, `dispute_cases` |

### Checklist hành động G-Growth
- [ ] G7: Seed 4 dịch vụ SOCIAL + Companion mẫu; tab "Trò chuyện & Giải trí" trên Web và App.
- [ ] G7: Onboarding 3 câu hỏi trên App.
- [ ] G8: Endpoint `/go/*` ghi UTM; `.well-known` cho App Links/Universal Links; lịch nội dung 4 tuần cho TikTok/Reels/Threads.
- [ ] G8: Mỗi bài đăng một link `/go/...` riêng có `utm_campaign` để so sánh hiệu quả.
- [ ] G9: Dashboard Admin hiển thị conversion theo `utm_source`.
- [ ] G10: Thông báo nhắc đánh giá sau phiên; báo cáo SLA khiếu nại theo tuần.

## 3. Ma trận liên kết

| Mục tiêu | Tài liệu | Module code |
|---|---|---|
| G1, G3 | `FINANCIAL_RULES.md` | `server/src/modules/ledger`, `payment`, `booking` |
| G2 | `UNIFIED_WORKFLOW.md` §0 bước 2 | `booking.service.ts` |
| G4 | `UNIFIED_WORKFLOW.md` §3 | `client/`, `mobile/` |
| G6 | `TERMS_AND_CONTRACTS.md` | `server/src/modules/legal` |
| G7, G8 | `NON_GAMER_GROWTH_STRATEGY.md` | `catalog`, `growth` (`/go/*`, `.well-known`) |
| G9, G10 | `DECISION_LOG.md` D27 | `admin.service.ts` |

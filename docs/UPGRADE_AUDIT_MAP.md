# INSTASQUAD — Bản đồ Audit & Kế hoạch Nâng cấp Đa nền tảng (Bước 1)

> Ngày audit: 2026-11-18 · Phạm vi: toàn bộ repo tại thời điểm commit `e942ee2` (snapshot).
> Nguyên tắc: **kế thừa, không build lại**. Chỉ refactor/bổ sung phần thiếu hoặc chưa đạt chuẩn.

## 1. Nguồn chuẩn đã đọc

| Nguồn | Trạng thái | Ghi chú |
|---|---|---|
| `docs/INSTASQUAD_AI_Prompt_Chain.txt` | Đã đọc đủ PROMPT 00–18 | Người dùng bổ sung lúc audit (ban đầu đặt ở thư mục gốc, đã chuyển vào `docs/`). Chuỗi M0–M8 trong file **đã được hiện thực** trong repo (xem `AI_PROGRESS.md`). Các ràng buộc bị **ghi đè** bởi chỉ thị 2026-11-18: Web-MVP-only → Đa nền tảng (Web + Flutter); PostgreSQL → SQL Server; thêm Pháp lý & Tăng trưởng; Git tự động. Kỷ luật giữ nguyên: VND số nguyên, ledger ghi kép, idempotency, khóa slot bằng DB, nhãn REQUIRED/MOCKED/DEMO_POLICY/DEFERRED, “chỉ ghi PASS khi đã chạy thật”. |
| `docs/source/BT3_INSTASQUAD.pdf` | Đã đọc | 2 luồng: Đặt lịch thuê Companion & Thanh toán–Ký quỹ–Sổ cái; nối qua BOOKING + ESCROW. |
| `docs/source/INSTASQUAD_BPMN_TKHT.pdf` | Đã đọc | 180s phản hồi, hủy 30p/10p (100/70/phạt 100), 10h/ngày, nghiệm thu 15p, 88/12, lỗi ≥80% → hoàn 100% + phạt 20%, SLA khiếu nại 45p, regex chặn SĐT/STK. |
| `docs/source/INSTASQUAD_WBS_Detailed.xlsx` | Đã đối chiếu qua `AI_PROGRESS.md` | WBS đã được ánh xạ M0–M8 (tất cả `Done` trên SQLite). |
| `docs/source/INSTASQUAS_REQUIREMENTS.pdf`, `INSTASQUAD_Game_Companion.pdf` | Đã đọc lướt | Khớp `REQUIREMENTS.md`. |

## 2. Hiện trạng kỹ thuật

| Thành phần | Công nghệ | Quy mô |
|---|---|---|
| Backend | Node 24 + Express 4 + TypeScript + Prisma 6.4 + Zod | 17 module, ~13.1k dòng, ~70 endpoint REST + WebSocket (thông báo, WebRTC signaling) |
| CSDL | **SQLite** (`file:./dev.db`), 8 migration SQLite | 27 model |
| Web | React + Vite + Tailwind | `App.tsx` 6.5k dòng, view theo role: catalog / companion_dashboard / cs_view / auditor_view / admin_dashboard / admin_bookings / profile + trang chính sách |
| Test | Vitest + Supertest | 31 file integration + 6 unit |
| Mobile | — | **Chưa có** |
| Git | Nhánh `master`, 1 commit, không có remote | Hàng trăm file chưa commit |

## 3. Bản đồ GIỮ NGUYÊN / NÂNG CẤP / BỔ SUNG

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Module Booking (request_key idempotent, slot hold nguyên tử bằng conditional update `count===1`, 180s, hủy 30p/10p) | **GIỮ** | Đã đúng BR-01/08/16–18, có test TC16–TC30. |
| Ledger ghi kép, `balance_after`, Idempotency key, Reconciliation, LedgerAuditAlert | **GIỮ** | Đúng kỷ luật cốt lõi (debit = credit). |
| Escrow HELD/FROZEN/RELEASED/REFUNDED, settlement 88/12, retry D26 | **GIỮ** | Đúng BPMN Hình 2B. |
| Dispute/RMA, evidence AES-256, CS phán quyết ≥80% (D22/D23) | **GIỮ** | Đúng BPMN Hình 2C. |
| Review bất biến, TrustScore, Withdrawal mock | **GIỮ** | Đúng M7. |
| Payment Simulator SUCCESS/FAILED/PENDING + SePay webhook | **GIỮ** | `PAYMENT_PROVIDER=simulator` mặc định (MOCKED). |
| Prisma datasource SQLite | **NÂNG CẤP → SQL Server** | Chỉ thị override #2. Cần xử lý: chuỗi dài → `NVarChar(Max)`, unique trên cột nullable → filtered unique index, chu trình cascade → `NoAction`. |
| Slot lock | **NÂNG CẤP** | Giữ conditional update; bổ sung chạy trong transaction trên SQL Server (row lock `UPDLOCK`-tương đương do `UPDATE ... WHERE status='AVAILABLE'`), test đặt đồng thời chạy trên SQL Server thật. |
| Catalog chỉ có Game | **BỔ SUNG** | Thêm `category` (GAME/SOCIAL) cho dịch vụ non-gamer: Tâm sự, Xem phim cùng, Nghe nhạc, Party game nhẹ. |
| Pháp lý | **BỔ SUNG** | Module `legal`: phiên bản điều khoản, ghi nhận chấp thuận (TermsAcceptance), danh mục vi phạm & chế tài, CS ghi nhận vi phạm (ViolationRecord) → trừ TrustScore/khóa tài khoản. |
| Tăng trưởng | **BỔ SUNG** | Ghi nhận kênh nguồn (UTM / social) trên `SiteVisit`; trang `/go/*` redirect + Deep Link; `.well-known/assetlinks.json` & `apple-app-site-association`. |
| Web UI | **TINH CHỈNH** | Thêm dải "Quy trình thống nhất" 8 bước, trang Điều khoản/Hợp đồng đọc từ API, sổ biến động số dư; giữ layout hiện có. |
| Mobile | **BỔ SUNG MỚI** | `mobile/` Flutter (iOS + Android) dùng chung REST API. |
| Git | **CHUẨN HÓA** | `master`→`main`, nhánh `dev`, `feature/*`, merge `--no-ff` sau mỗi bước. |

## 4. Rủi ro đã nhận diện

1. **Không có Git remote** → không thể `push`. Mọi commit/merge làm cục bộ; khi có remote chỉ cần `git push -u origin main dev`.
2. **SQL Server cài sẵn trên máy chỉ bật Shared Memory (TCP tắt)** → Prisma không kết nối được. Không sửa cấu hình hệ thống; dùng container `mcr.microsoft.com/mssql/server:2022-latest` cổng `14330` (D33).
3. **Flutter SDK chưa cài** trên máy → ban đầu dự kiến dùng Docker image Flutter (D36); **đã thay** bằng cài native tại `D:lutter` (D43).
4. Bộ test cũ phụ thuộc cascade delete của SQLite → cần giữ `onDelete: Cascade` ở mọi quan hệ không tạo chu trình trên SQL Server.
5. PROMPT 00 nói “Docker là tùy chọn, phải có cách chạy local”: README sẽ mô tả cả 2 cách (Docker container hoặc SQL Server cài sẵn bật TCP/IP + SQL login).
6. Lần chạy baseline trên SQLite bị crash worker vitest (`ERR_IPC_CHANNEL_CLOSED`) giữa chừng → baseline mới sẽ được đo trực tiếp trên SQL Server.

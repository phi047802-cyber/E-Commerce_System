# DANH MỤC BẰNG CHỨNG HỌC THUẬT VÀ TÀI LIỆU BÀN GIAO (EVIDENCE CATALOG)
## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ DỊCH VỤ GAME COMPANION (INSTASQUAD)

> **Phiên bản phát hành**: v1.0.0 (Release Candidate - Academic Final Submission)  
> **Ngày lập danh mục**: 29/10/2026  
> **Cam kết tính xác thực**: Toàn bộ dữ liệu, test report và mã nguồn dưới đây được trích xuất từ môi trường chạy thật, đã được kiểm chứng độc lập.

---

## 1. Danh mục Tài liệu Bàn giao Toàn diện

| STT | Tài liệu bàn giao | Đường dẫn tệp | Mục đích học thuật & Nội dung cốt lõi |
|:---:|:---|:---|:---|
| 1 | **Báo cáo QA & Kiểm toán Độc lập** | [`docs/QA_REPORT.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/QA_REPORT.md) | Báo cáo chi tiết kết quả 16 test suites, **160/160 tests PASS**, đối chiếu 70 ca kiểm thử WBS (TC01–TC70), kiểm toán thâm nhập bảo mật và đối soát Sổ cái kép. |
| 2 | **Ma trận Truy vết 6 Chiều Khép kín** | [`docs/TRACEABILITY_FINAL.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/TRACEABILITY_FINAL.md) | Ma trận nối: PDF Đề bài $\longleftrightarrow$ Business Rule (BR-01..BR-28) $\longleftrightarrow$ WBS ID $\longleftrightarrow$ Code & API $\longleftrightarrow$ Thực thể Prisma $\longleftrightarrow$ Test ID & Bằng chứng. |
| 3 | **Đề cương Báo cáo Tổng kết Đồ án** | [`docs/FINAL_REPORT_OUTLINE.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/FINAL_REPORT_OUTLINE.md) | Khung báo cáo 6 chương chuẩn học thuật: Bối cảnh, Yêu cầu, BPMN, Kiến trúc, ERD, Bộ ba Booking-Escrow-Ledger, Bảng phân loại tính năng (Thực/Mock/Deferred), và Hướng phát triển. |
| 4 | **Kịch bản Demo Bảo vệ Đồ án** | [`docs/DEMO_SCRIPT.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/DEMO_SCRIPT.md) | Kịch bản trình diễn 8–12 phút chi tiết từng phút, các điểm chạm Sổ cái cần chỉ ra cho Hội đồng và kế hoạch dự phòng (Fallback Plan). |
| 5 | **Bộ Câu hỏi & Trả lời Phản biện** | [`docs/DEFENSE_QA.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/DEFENSE_QA.md) | Bộ 10 câu hỏi cốt lõi về Sổ cái kép, Idempotency, Concurrency, Escrow, Rollback, RBAC/IDOR, Mock Simulator và hạn chế kỹ thuật. |
| 6 | **Thiết kế Kiến trúc As-Built** | [`docs/ARCHITECTURE.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/ARCHITECTURE.md) | Kiến trúc Modular Monolith, cơ chế Atomic Slot Lock trong DB Transaction, và Sơ đồ lớp miền nghiệp vụ (Domain Class Diagram). |
| 7 | **Mô hình Dữ liệu Thực thể (ERD)** | [`docs/DATA_MODEL.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/DATA_MODEL.md) | Sơ đồ Mermaid ERD 24 thực thể, khắc phục hoàn toàn ERD Gap ban đầu theo Quyết định D14. |
| 8 | **Quy tắc Tài chính & Đối soát Sổ cái**| [`docs/FINANCIAL_RULES.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/FINANCIAL_RULES.md) | Quy tắc kế toán kép $\sum \text{Debit} \equiv \sum \text{Credit}$, thuật toán 88/12 zero-cent rounding và công thức tính tay TrustScore. |
| 9 | **Sổ Quyết định PO (Decision Log)** | [`docs/DECISION_LOG.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/DECISION_LOG.md) | Biên bản phê duyệt chính thức toàn bộ 18 quyết định (D01 – D18) từ Product Owner. |
| 10 | **Đường cơ sở Phạm vi (Scope Baseline)**| [`docs/SCOPE_BASELINE.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/SCOPE_BASELINE.md) | Phân định ranh giới 4 nhóm: REQUIRED, MOCKED, DEFERRED, và DEMO_POLICY. |
| 11 | **Đặc tả API & Hợp đồng DTO** | [`docs/API_CONTRACT.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/API_CONTRACT.md) | Đặc tả Request/Response DTO có kiểm thực Zod cho toàn bộ các endpoints. |
| 12 | **Theo dõi Tiến độ WBS & Milestones** | [`docs/AI_PROGRESS.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/AI_PROGRESS.md) | Nhật ký tiến độ 195 WBS items và hoàn thành 100% các Milestone M0 đến M8. |

---

## 2. Thông số Kỹ thuật & Môi trường Thực thi Đã Xác nhận

- **Hệ điều hành kiểm thử**: Microsoft Windows 11 Enterprise (x64)
- **Node.js Engine**: `v24.14.1` (Tương thích Node 18, 20, 22, 24)
- **Package Manager**: NPM `v11.11.0`
- **TypeScript Compiler**: `v5.7.3` (`strict: true`, 0 lỗi kiểu dữ liệu)
- **Cơ sở dữ liệu**: SQLite 3 qua Prisma ORM `v6.4.0` (Tương thích chuyển đổi PostgreSQL)
- **Kiểm thử tự động**: Vitest `v3.0.5` + Supertest `v7.0.0`
- **Kết quả kiểm thử tự động toàn diện**:
  - `npx vitest run tests/unit`: **29/29 tests PASS** (Toán tài chính, TrustScore, Invariants).
  - `npx vitest run tests/integration`: **131/131 tests PASS** (API, RBAC, Security, E2E Smoke).
  - `npm test`: **160/160 tests PASS (100% GREEN)** trong thời gian 22.74 giây.
- **Biên dịch Frontend**: Vite `v6.4.5` build thành công trong 18.48s (`dist/assets/index.js` 73.78 kB gzip).

---

## 3. Danh mục Tài khoản Thử nghiệm Minh họa (Demo Mock Accounts)

> [!NOTE]
> Toàn bộ tài khoản dưới đây là **tài khoản minh họa giả lập cục bộ** phục vụ đồ án, không phải tài khoản người dùng thật, không lưu giữ thẻ ngân hàng thật hay tiền thật.

🔑 **Mật khẩu dùng chung cho môi trường demo**: `Demo@123456`

| Vai trò | Email minh họa | Tên hiển thị | Số dư khởi tạo | Chức năng demo chính |
|:---|:---|:---|:---:|:---|
| **Renter** | `renter1@instasquad.test` | Minh Hoàng | 500.000 VND | Demo đặt lịch, ký quỹ Escrow tức thì, chat phiên chơi, nghiệm thu 88/12. |
| **Renter** | `renter2@instasquad.test` | Khánh Vy | 0 VND | Demo cảnh báo thiếu số dư, nạp tiền qua Payment Simulator, báo sự cố RMA. |
| **Companion** | `companion1@instasquad.test` | Bảo Ngọc | 0 VND | TrustScore 95.0, giá 100k/h, demo nhận đơn 180s, rút tiền mô phỏng. |
| **Companion** | `companion2@instasquad.test` | Tuấn Anh | 0 VND | TrustScore 80.0, giá 150k/h, demo xử lý khiếu nại, trừ điểm uy tín. |
| **CS Agent** | `cs_agent@instasquad.test` | CS Hỗ trợ | N/A | Thẩm định Dossier khiếu nại, xem ảnh chứng cứ, ra phán quyết lỗi $\ge 80\%$. |
| **Auditor** | `auditor@instasquad.test` | Trần Thị Kiểm Toán | N/A | Tra cứu Sổ cái kép, kiểm tra đối soát bảo toàn tiền ($\text{Variance} = 0$). |
| **Admin** | `admin@instasquad.test` | Quản trị hệ thống | N/A | Quản trị toàn sàn, duyệt/từ chối rút tiền, quản lý danh mục trò chơi. |

---

## 4. Xác nhận Quy trình Cài đặt Sạch (Clean Setup Verification)

Đã kiểm tra thực tế quy trình cài đặt sạch từ đầu:
1. `npm install` và `npm --prefix client install` $\rightarrow$ Hoàn tất sạch, không xung đột dependency.
2. `npx prisma generate` $\rightarrow$ Sinh mã Prisma Client thành công.
3. `npx prisma migrate dev --name init` $\rightarrow$ Khởi tạo cấu trúc 24 bảng trong `dev.db`.
4. `npm run prisma:seed` $\rightarrow$ Nạp bộ dữ liệu mẫu trong 3.12 giây.
5. `npm run build` $\rightarrow$ Biên dịch Backend và Frontend thành công (0 errors).
6. `npm test` $\rightarrow$ Toàn bộ 160 ca kiểm thử tự động đạt 100% PASS.
7. Khởi chạy thử nghiệm Docker: `docker compose up --build` $\rightarrow$ Image Alpine đóng gói thành công và chạy ổn định tại cổng 4000/5173.

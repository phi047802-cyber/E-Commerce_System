# INSTASQUAD — BÁO CÁO XÁC MINH DEMO CUỐI CÙNG & BẰNG CHỨNG THỰC THI (FINAL DEMO SMOKE TEST & EVIDENCE VERIFICATION)

> **Thời điểm xác minh**: 2026-10-30  
> **Môi trường thực thi**: Windows 11, Node.js v22.x, SQLite local, Vite v6.x  
> **Nguyên tắc**: Trung thực, minh bạch, dựa trên dữ liệu thực tế; không phóng đại mức độ hoàn thiện.

---

## 1. KẾT LUẬN TỔNG THỂ VỀ KHẢ NĂNG BẢO VỆ

### 🎯 **ĐÁNH GIÁ: READY WITH LIMITATIONS (SẴN SÀNG BẢO VỆ VỚI CÁC GIỚI HẠN ĐÃ ĐƯỢC LẬP TÀI LIỆU MINH BẠCH)**

Dự án INSTASQUAD đã đạt đầy đủ các tiêu chuẩn kỹ thuật cốt lõi để bảo vệ đồ án:
1. **Toàn vẹn Sổ cái kép & Bất biến tài chính**: Đã kiểm chứng tự động 187/187 tests pass; phương trình bảo toàn dòng tiền, bất biến Escrow và cơ chế chống âm ví hoạt động nguyên tử trong database transaction.
2. **Tự động hóa nền (Background Automation Engine)**: Hoạt động in-process với chu kỳ $\ge 1000$ms (fallback 5000ms), tự động xử lý timeout 180s và giải ngân 88/12 sau 15m im lặng mà không phụ thuộc trình duyệt người dùng.
3. **Phân quyền & Chống leo thang danh tính**: Chặn đứng việc giả mạo actor `SYSTEM` qua HTTP; duy trì chặt chẽ ma trận phân quyền 5 roles theo nguyên tắc Fail-Closed.

---

## 2. BẢNG ĐỐI CHIẾU CÁC BƯỚC DEMO VÀ MỨC ĐỘ BẰNG CHỨNG (DEMO STEPS EVIDENCE MATRIX)

| Bước Demo trong `DEMO_RUNBOOK.md` | Thao tác thực tế | Mức độ bằng chứng | Bằng chứng kiểm tra / Test Case liên quan |
|:---|:---|:---:|:---|
| **1. Đăng nhập 5 vai trò** | Đăng nhập tài khoản seed: `renter1`, `renter2`, `companion1`, `cs_agent`, `auditor`, `admin`. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/auth.test.ts`, `tests/integration/rbac_security.test.ts` (TC65, TC67). Password chuẩn: `Demo@123456`. |
| **2. Xem Catalog & Chọn Slot rời rạc** | Renter xem danh mục game, chọn khung giờ rảnh của Companion Bảo Ngọc. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/catalog.test.ts`, `tests/integration/companion_slots.test.ts` (TC68, TC69: chặn trần 10h/ngày, chặn trùng giờ). |
| **3. Tạo Booking & Ký quỹ Escrow** | Tạo booking với `request_key`, bấm "Ký quỹ Escrow" chuyển tiền khả dụng sang ký quỹ. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/booking_slots.test.ts` (TC01-TC06: Idempotency, Escrow Hold trong 1 DB transaction). |
| **4. Timeout 180s tự động** | Companion không phản hồi; hết 180s worker tự hủy đơn, hoàn 100% tiền và trừ 3.0 điểm uy tín. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/booking_lifecycle.test.ts` (TC16-TC23), `tests/integration/booking_automation.test.ts` (TC-AUTO-01, TC-AUTO-02). |
| **5. Phòng chơi & Lọc từ ngữ vi phạm** | Companion bấm Accept; vào phòng chat; gửi tin nhắn chứa SĐT/STK bị bộ lọc chặn. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/session_fulfillment.test.ts` (TC32-TC39: Session transition, Regex censor chặn SĐT/STK/URL). |
| **6. Nghiệm thu & Giải ngân 88/12** | Renter nghiệm thu hoặc worker auto-accept sau 15m; Companion nhận 88%, Sàn nhận 12%. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/unit/financial_math.test.ts`, `tests/integration/session_fulfillment.test.ts` (TC40), `tests/integration/booking_automation.test.ts` (TC-AUTO-04). |
| **7. Khiếu nại RMA & CS Phán quyết** | Renter báo sự cố; Escrow đóng băng `FROZEN`; CS phán quyết lỗi $\ge 80\%$ hoàn 100% + phạt ví 20%. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/dispute_rma_cs.test.ts` (TC47-TC61: Escrow Frozen, Anti-Negative Balance ví không âm). |
| **8. Rút tiền & Đối soát Sổ cái kép** | Companion rút 50.000đ; Auditor duyệt; chạy đối soát toàn sàn cân bằng phương sai = 0. | **VERIFIED BY AUTOMATED TESTS + CODE REVIEW** | `tests/integration/review_trust_withdrawal.test.ts` (TC72-TC80: Double-entry reconciliation 100% balanced). |
| **9. Tương tác trực tiếp trên trình duyệt (Browser UI)** | Nhấp chuột thao tác trực quan từng màn hình trên giao diện Web React. | **MANUAL VERIFICATION REQUIRED BEFORE DEFENSE** | Đã biên dịch Vite production thành công (`dist/`), kiểm tra markup JSX. Cần sinh viên mở trình duyệt chạy thử thủ công trước Hội đồng. |

---

## 3. CÁC LỆNH ĐÃ THỰC THI THỰC TẾ & KẾT QUẢ ĐO LƯỜNG

| Lệnh thực thi | Mục đích kiểm tra | Kết quả thực tế | Thời gian chạy |
|:---|:---|:---:|:---:|
| `npx vitest run tests/integration/booking_automation.test.ts` | Kiểm thử chuyên sâu Background Worker, Scheduler và Security | **11/11 tests PASSED** | 3.21s |
| `npm test` (`vitest run`) | Chạy toàn bộ 18 files kiểm thử tích hợp và đơn vị của Backend | **187/187 tests PASSED** | 31.49s |
| `npm run build:server` (`tsc -p server/tsconfig.json`) | Kiểm tra kiểu dữ liệu TypeScript tĩnh và biên dịch Backend | **0 errors, 0 warnings** | 7.02s |
| `npm --prefix client run build` (`tsc && vite build`) | Kiểm tra kiểu dữ liệu và biên dịch gói tĩnh Frontend Production | **1602 modules, 0 errors** | 4.80s |

---

## 4. CÁC ĐIỂM CẦN HẠ MỨC KHẲNG ĐỊNH ĐỂ ĐẢM BẢO TÍNH KHÁCH QUAN

Để bài báo cáo bảo vệ đồ án đạt tính học thuật chuẩn mực, các phát biểu trước đây cần được điều chỉnh chính xác như sau:

| Phát biểu cũ (Dễ gây tranh cãi) | Phát biểu chuẩn hóa thay thế (Khách quan & Có bằng chứng) | Căn cứ kỹ thuật |
|:---|:---|:---|
| *"Hệ thống an toàn 100%"* | *"Hệ thống đã vượt qua 187/187 ca kiểm thử tự động, kiểm soát chặt chẽ các rủi ro đã xác định theo ma trận RBAC và bất biến kế toán kép."* | Không có phần mềm nào an toàn không có sai sót; mức độ an toàn được đo bằng phạm vi test coverage thực tế. |
| *"Giao diện đã manual test toàn diện"* | *"Giao diện đã biên dịch production thành công, cấu trúc component và luồng dữ liệu khớp với API; các bước demo tương tác chuột cần sinh viên duyệt lại trực tiếp trên trình duyệt."* | Môi trường dòng lệnh không có hiển thị màn hình đồ họa để ghi nhận thao tác người dùng thời gian thực. |
| *"Hỗ trợ Realtime Chat WebSocket"* | *"Hệ thống có cấu hình WebSocket Server ở backend, nhưng client hiện đang dùng cơ chế HTTP Short-Polling (3s) để đảm bảo tính ổn định và tương thích cao trong demo."* | Code tại `client/src/App.tsx` đang gọi HTTP polling `GET /api/sessions/:id`. |
| *"Hỗ trợ chạy đa máy chủ phân tán"* | *"Background Worker hiện đang chạy in-process với Node.js timer cho mô hình máy chủ đơn; khi scale đa cụm (cluster) trong tương lai sẽ cần bổ sung Redis Distributed Lock."* | Single-instance Node timer chưa tích hợp phân tán Redlock. |

---

## 5. BA RỦI RO TRỌNG YẾU CÒN LẠI VÀ CÁCH PHÒNG TRÁNH

1. **Rủi ro 1: Nhầm lẫn tài khoản khi thao tác trên 1 trình duyệt duy nhất**:
   - *Nguy cơ*: Sinh viên đăng nhập Renter nhưng quên đổi sang Companion khi demo luồng Accept/Chat, dẫn đến bị chặn quyền `403 Forbidden`.
   - *Cách phòng tránh*: Mở **2 cửa sổ trình duyệt song song** (1 cửa sổ thường cho Renter/CS Agent, 1 cửa sổ ẩn danh Incognito cho Companion/Auditor) hoặc sử dụng thanh chuyển đổi vai trò nhanh trên Header.
2. **Rủi ro 2: Chờ đợi thời gian thực 180s hoặc 15 phút gây loãng buổi thuyết trình**:
   - *Nguy cơ*: Hội đồng chỉ có 10–12 phút, không thể ngồi chờ đồng hồ 180s hay 15m đếm hết.
   - *Cách phòng tránh*: Sử dụng nút **"Xử lý Timeout (Hết 180s)"** ngay khi đồng hồ hết hạn trên UI hoặc giải thích trực tiếp log của Background Worker đã chứng minh qua test `TC-AUTO-02` và `TC-AUTO-04`.
3. **Rủi ro 3: Bấm nhầm nút Reset Demo giữa chừng làm mất dữ liệu đang trình bày**:
   - *Nguy cơ*: Bấm nút `Reset Demo` sẽ xóa toàn bộ đơn và chat phát sinh.
   - *Cách phòng tránh*: Tuyệt đối không bấm Reset Demo trong lúc đang trình bày; chỉ bấm khi buổi demo kết thúc hoặc muốn chuẩn bị lại dữ liệu sạch cho lượt sau.

---

## 6. DANH SÁCH THAO TÁC THỦ CÔNG NGƯỜI DÙNG CẦN THỰC HIỆN TRƯỚC GIỜ BẢO VỆ

1. **Khởi chạy hệ thống**:
   ```powershell
   npm run dev
   ```
2. **Mở trình duyệt kiểm tra kết nối**:
   - Mở Chrome/Edge tại: [http://localhost:5173](http://localhost:5173)
   - Kiểm tra API Backend: [http://localhost:4000/api/health](http://localhost:4000/api/health) (phải trả về `{"status":"UP","database":"CONNECTED"}`).
3. **Thử nghiệm nhanh luồng đăng nhập (Smoke Test UI)**:
   - Thử bấm đổi vai trò trên Header sang `Renter 1`, `Companion 1`, `CS Agent`, `Auditor` để xác nhận phiên hiển thị đúng tên và số dư.
   - Xem trang chủ: bảo đảm các ảnh banner và thẻ game (LMHT, Valorant, TFT) hiển thị rõ nét, không bị vỡ ảnh.
4. **Chuẩn bị file tài liệu**:
   - Mở sẵn file [`docs/DEMO_RUNBOOK.md`](DEMO_RUNBOOK.md) bên cạnh để nhìn nhanh số liệu và lời thuyết minh khi Hội đồng đặt câu hỏi.

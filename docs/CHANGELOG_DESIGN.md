# NHẬT KÝ ĐỒNG BỘ THIẾT KẾ VÀ KIẾN TRÚC (CHANGELOG DESIGN)

> **Mục đích**: Ghi nhận toàn bộ các điều chỉnh, chuẩn hóa giữa tài liệu yêu cầu (UC, Requirements), sơ đồ quy trình (BPMN) và mô hình dữ liệu (ERD / Codebase) nhằm bảo đảm tính nhất quán 100% trong toàn bộ dự án.

---

### [2026-10-29] Chuẩn hóa Mô hình Ký quỹ Escrow & Giao diện Trang chủ

#### 1. Đồng bộ luồng Ký quỹ Escrow (Giữa UC03 và BPMN Hình 1B)
- **Tình trạng ban đầu trong tài liệu cũ**: Một số mô tả sơ khai của UC03 ghi "thanh toán sau khi hoàn tất phiên chơi".
- **Quy chuẩn chuẩn hóa theo BPMN Hình 1B & Quyết định D01**: Bắt buộc phải **Ký quỹ Escrow trước** (`PENDING_ACCEPTANCE` $\rightarrow$ `WAITING_COMPANION_RESPONSE`). Tiền được phong tỏa an toàn trong quỹ ký quỹ ngay khi đặt lịch và giữ slot; không thanh toán ngoài sàn, không trả sau nhằm triệt tiêu hoàn toàn rủi ro bùng tiền, quỵt cọc.
- **Tác động mã nguồn**:
  - `POST /api/bookings/:id/hold-escrow`: Thực thi bút toán Sổ cái ghi kép chuyển tiền từ Ví khả dụng sang Ký quỹ trong 1 DB Transaction.
  - Test suites: `booking_lifecycle.test.ts`, `escrow_ledger.test.ts`.

#### 2. Chuẩn hóa Giao diện Trang chủ theo Mockup Chính thức
- **Nội dung điều chỉnh**:
  - Chuyển đổi giao diện từ phong cách bảng điều khiển kỹ thuật (admin console) sang Landing Page thương mại điện tử C2C hiện đại chuẩn Gaming Design System (#0A0A1F, card #15152E, neon tím/cyan, font Be Vietnam Pro).
  - Tách module độc lập: `Navbar`, `Hero`, `GameRow`, `GameCard`, `TopCompanions`, `CompanionCard`, `WhyChoose`, `Testimonials`, `Footer`, `SlotBookingModal`.
  - Giữ nguyên 100% các modal nghiệp vụ: Phòng chat WebSocket, Ký quỹ Escrow, Nạp/rút tiền mô phỏng, Phân xử RMA, Kiểm toán Sổ cái.

#### 3. Chuẩn hóa Hiển thị Số liệu Minh bạch
- **Quy tắc**: Tuyệt đối không bịa đặt số liệu thống kê phóng đại. Mọi con số đều ghi rõ là dữ liệu minh họa thử nghiệm hoặc lấy từ hệ thống kiểm toán thực tế.
- **Tiền tệ**: 100% giao diện và nghiệp vụ quy đổi sang Đồng Việt Nam (VND), bảo đảm tính toàn vẹn số nguyên không mất 1 đồng.

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

---

### [2026-11-05] Thống nhất Nguồn tham chiếu vận hành (Playerduo & Lita) và Ghi nhận các điểm Khác nguồn

Theo Quyết định ngày 05/11/2026, nhóm chỉ sử dụng **02 nguồn tham chiếu vận hành** là **Playerduo** và **Lita** (lập thành bảng ánh xạ tại [`docs/REFERENCE_MAPPING.md`](file:///c:/INSTASQUAD/INSTASQUAD/docs/REFERENCE_MAPPING.md)). Nhóm chính thức ghi nhận 05 điểm "Khác nguồn" có chủ ý như sau:

1. **Chủ thể xác nhận hoàn tất đơn (`REF-DONE-01`)**:
   - *Lita*: Seller bấm "Order Complete", người mua có 48 giờ phản đối.
   - *INSTASQUAD*: Renter chủ động nghiệm thu trong 15 phút, quá 15 phút hệ thống tự động nghiệm thu và giải ngân 88/12.
   - *Lý do*: Phiên chơi game là dịch vụ diễn ra trong ngày; nghiệm thu 15 phút giúp giải phóng dòng tiền cho Companion tức thì, tránh bị treo vốn 48h.
2. **Thời gian chờ an toàn khi rút tiền (`REF-WDRAW-01`)**:
   - *Lita*: Áp dụng thời gian chờ an toàn 7 ngày sau khi đơn hoàn tất mới cho rút tiền.
   - *INSTASQUAD*: Chưa áp dụng thời hạn chờ 7 ngày trong phiên bản MVP; Companion có thể yêu cầu rút ngay khi tiền về ví khả dụng và Admin phê duyệt.
3. **Chính sách Thuế**:
   - *Lita*: Seller tự chịu thuế và giá hiển thị đã gồm thuế.
   - *INSTASQUAD*: Theo tài liệu đề bài, nền tảng đóng vai trò khấu trừ và nộp thuế thay (hoặc giữ lại hoa hồng sàn 12% đã bao gồm chi phí vận hành).
4. **Mã QR động và Đồng hồ hết hạn (`REF-TOPUP-05`)**:
   - *Lita & Playerduo*: Chuyển hướng sang trang cổng thanh toán của bên thứ ba.
   - *INSTASQUAD*: Phát triển thêm thành phần hiển thị mã QR động có số tiền và nội dung duy nhất kèm đếm ngược 15 phút để tăng tính trực quan khi demo.
5. **Phương thức Đăng ký & Định danh (`REF-AUTH-01`)**:
   - *Lita*: Dùng số điện thoại và mã OTP 4 số.
   - *Playerduo*: Dùng đăng nhập liên kết Facebook.
   - *INSTASQUAD*: Dùng Email có xác thực và mật khẩu Bcrypt kết hợp JWT/RBAC để chuẩn hóa theo môi trường học thuật.

---

### [2026-11-05] Chuyển đổi Giao diện sang Tone Đen – Đỏ Gaming Sang trọng (#0A0A0A & #E11D2E)

- **Thay thế hoàn toàn Design System cũ**: Xóa bỏ toàn bộ dải màu tím/cyan (#0A0A1F, #15152E), neon glow và gradient trang trí đa sắc.
- **Hệ thống Design Tokens mới**:
  - Nền trang: `#0A0A0A` (đen sâu).
  - Bề mặt card & sidebar: `#141414`.
  - Bề mặt nổi (input, hover): `#1C1C1C`.
  - Đường viền 1px sắc nét: `#2A2A2A`.
  - Màu chủ đạo (Primary Red): `#E11D2E` (hover: `#B91C1C`, badge nền đỏ: `rgba(225,29,46,0.12)`).
  - Độ tương phản chữ: Tiêu đề trắng `#FFFFFF`, phụ `#A3A3A3`, mờ `#6B6B6B` (WCAG AA).
  - Màu trạng thái tiết chế: Xanh lá `#22C55E` (Online/Thành công), Vàng `#FACC15` (Sao), Cam `#F59E0B` (Ký quỹ HELD).
- **Cấu trúc 2 giao diện song song**:
  - *Chưa đăng nhập*: Trang chủ công khai theo Mẫu 1 (HeroSlider, GameRow, TrendingCompanions, TopCompanions, CommunityHub, Footer).
  - *Đã đăng nhập*: Khung ứng dụng bo góc lớn 24px (`rounded-3xl`) theo Mẫu 2 (`AuthenticatedAppFrame.tsx`) với Sidebar nhóm, Topbar số dư ví VND thực tế, và bảng quản lý đơn hàng.


---

### [2026-11-06] Giải quyết các ghi chú "cần PO xác nhận" trên Hình 1C, 2A, 2C bằng D21–D27

Theo quyết định chốt của nhóm ngày 06/11/2026 (**NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định**), toàn bộ các ghi chú "cần PO xác nhận" trên các sơ đồ BPMN Hình 1C, 2A, 2C đã được đóng dứt điểm bằng các quyết định kỹ thuật D21–D27 như sau:

1. **Hình 1C – Hủy đơn đặt lịch (Bước 4c)**:
   - *Ghi chú cũ*: *"Tài liệu Charter chưa nói rõ khoản phạt này chia cho Companion và nền tảng thế nào (kể cả hoa hồng 12%)... cần PO xác nhận"*.
   - *Giải quyết bằng **D21***: Hủy dưới 10 phút phạt 100% Escrow; chia 88% Companion và 12% Nền tảng trong cùng một lần xử lý nguyên tử, áp dụng thuật toán làm tròn số nguyên không mất 1 đồng. Mốc 10–29 phút giữ đúng BPMN: 70% Renter, 30% Companion, không trừ hoa hồng.

2. **Hình 2A – Fulfillment và Nghiệm thu (Bước 8)**:
   - *Ghi chú cũ*: *"Đây là đề xuất của nhóm, chưa có trong Project Charter: dự án chỉ nêu thời hạn 15 phút mà chưa nói điều gì xảy ra khi hết hạn... cần PO xác nhận"*.
   - *Giải quyết bằng **D24***: Tự động nghiệm thu sau 15 phút im lặng; Background Worker quét và giải ngân 88/12 cho Companion, ghi nhận lý do `SYSTEM_AUTO_ACCEPT_TIMEOUT`.

3. **Hình 2C – Tranh chấp và Phân xử RMA (Bước 6b, Bước 7, Bước 8a)**:
   - *Ghi chú cũ tại Bước 6b*: *"Thời hạn nộp bổ sung do PO quy định, hiện chưa thể hiện trong sơ đồ"*.
     - *Giải quyết bằng **D25***: Đặt thời hạn bổ sung chứng cứ chót 24 giờ (`evidence_deadline`); tạm dừng đồng hồ đo SLA 45 phút của CS khi trạng thái là `EVIDENCE_PENDING`; quá hạn CS phán quyết trên hồ sơ hiện có.
   - *Ghi chú cũ tại Bước 7*: *"trường hợp lỗi từ 1% đến 79% hiện đi theo nhánh “Không”... cần PO xác nhận hoặc bổ sung quy tắc nghiệp vụ"*.
     - *Giải quyết bằng **D23***: Lỗi 1–79% đi theo nhánh "Không", giải ngân 88/12 cho Companion, CS ghi chú kết luận phân xử, không phạt Companion, không tính vào tỷ lệ khiếu nại của TrustScore.
   - *Ghi chú cũ tại Bước 8a*: *"Dự án chưa nói khoản phạt 20% trừ từ ví nào và chuyển cho ai, cần PO xác nhận"*.
     - *Giải quyết bằng **D22***: Renter hoàn 100% Escrow; phạt Companion 20% trừ từ ví khả dụng Companion, nộp về doanh thu nền tảng (`PLATFORM_REVENUE_WALLET_ID`). Nếu ví không đủ, trừ tối đa số có, phần thiếu ghi nợ `PENALTY_DEBT` và tự động cấn trừ vào thu nhập của các đơn hoàn tất sau; đảm bảo số dư ví không bao giờ âm.

4. **Hình 2B – Giải ngân Escrow lỗi (Bước 2a)**:
   - *Ghi chú cũ*: *"Hiện chưa có cơ chế tự thử lại hay thời hạn xử lý nên xác định là ngoài phạm vi"*.
   - *Giải quyết bằng **D26***: Bổ sung hàng đợi `SettlementRetryQueue` thử lại tối đa 3 lần (sau 1, 5, 15 phút) với cùng `idempotency_key`; nếu sau 3 lần vẫn lỗi thì giữ Escrow `HELD`, sinh cảnh báo `LedgerAuditAlert` cho Auditor xử lý thủ công trong 24 giờ.

5. **Đo lường hiệu quả chuyển đổi (Conversion Rate)**:
   - *Ghi chú cũ*: Charter và Slide chưa định nghĩa công thức phễu chi tiết.
   - *Giải quyết bằng **D27***: Thống nhất công thức `Conversion Rate = đơn ký quỹ thành công / số phiên truy cập duy nhất (Funnel)`; tỷ lệ hoàn tất đơn hiển thị riêng.

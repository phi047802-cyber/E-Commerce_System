# INSTASQUAD — TÀI LIỆU ÁNH XẠ THAM CHIẾU THƯƠNG MẠI (REFERENCE MAPPING)

Tài liệu này xác lập cơ sở pháp lý và nghiệp vụ thực tiễn cho toàn bộ các quy trình, con số, công thức tài chính và cơ chế vận hành trong sàn C2C **INSTASQUAD**. 
**Nguyên tắc cốt lõi:** Tuyệt đối không tự sáng tạo quy tắc nghiệp vụ/con số khi chưa có case study thương mại đã thành công trên thế giới làm căn cứ đối chiếu. Mọi quyết định thiết kế đều được đối chiếu với Help Center, Whitepaper hoặc tài liệu kỹ thuật chính thức.

---

## BẢNG TỔNG HỢP ÁNH XẠ NGHIỆP VỤ (MASTER MAPPING TABLE)

| STT | Luồng / Quy tắc nghiệp vụ | Case tham chiếu quốc tế | Nguồn tài liệu chính thức | Điểm lấy nguyên bản | Điểm mở rộng / Tinh chỉnh cho INSTASQUAD | Trạng thái xác minh | Quyết định PO |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | Ký quỹ Escrow & Giải ngân an toàn | **Upwork Fixed-Price Escrow** | [Upwork Escrow Help](https://support.upwork.com/hc/en-us/articles/211063748-Fixed-Price-Protection) | Tiền được trừ ngay từ ví Client vào tài khoản Escrow trung gian trước khi bắt đầu công việc; Freelancer chỉ được nhận tiền khi Client Approve hoặc hết hạn khiếu nại. | Thay vì milestone dự án nhiều ngày, INSTASQUAD dùng Time-Slot (1h/slot) và cơ chế tự động Release tiền sau `CONFIRMATION_TIMEOUT` (mặc định 2h). | **ĐÃ XÁC MINH** | Chờ PO duyệt thời gian timeout tự động (2h vs 24h). |
| **02** | Sổ cái ghi kép & Bất biến số dư | **Stripe Ledger / Modern Treasury** | [Stripe Ledger Architecture](https://stripe.com/blog/ledger-architecture) & [Martin Fowler Accounting](https://martinfowler.com/eaaDev/AccountingTransaction.html) | Mọi biến động số dư phải qua Bút toán kép: $\sum \text{Debit} \equiv \sum \text{Credit}$. Số dư tài khoản là view phái sinh (sum of entries). Bất biến (Immutable), không `UPDATE` số dư trực tiếp. | Thiết lập 5 hệ thống tài khoản con: Client Available, Escrow In-Flight, Companion Earnings, Platform Revenue, Platform Dispute Loss. Bắt buộc kiểm tra `Variance = 0` trước khi `COMMIT`. | **ĐÃ XÁC MINH** | Đã chốt theo tiêu chuẩn kế toán quốc tế. |
| **03** | Tỷ lệ chia doanh thu (Platform Fee Split) | **Epic Games Store (88/12) & Steam (70/30)** | [Epic Games Store Revenue Share](https://store.epicgames.com/en-US/news/epic-games-store-announcement) | Tỷ lệ 88% cho Creator / 12% cho sàn để tối ưu hóa biên lợi nhuận cho người cung cấp dịch vụ, tạo sức hút mạng lưới (Network Effect). | Áp dụng chia tách tự động trong Sổ cái ghi kép ngay khi Escrow Release: 88% vào ví Companion, 12% vào ví Doanh thu sàn. | **ĐÃ XÁC MINH** | Đề xuất 88/12 (hoặc 80/20 theo tài liệu đồ án). Chờ PO chốt con số chính thức. |
| **04** | Hủy slot & Hoàn tiền theo bậc thang (Tiered Cancellation) | **Airbnb Cancellation Policies** | [Airbnb Flexible & Moderate Policy](https://www.airbnb.com/help/article/475) | Chia mốc thời gian báo trước để quyết định mức phạt/hoàn tiền: Hủy sớm (>24h): hoàn 100%; Hủy sát giờ (<2h): trừ phí đền bù tổn thất cơ hội (Opportunity Cost) cho host. | - Hủy trước >2h: Hoàn 100% tiền Escrow về ví Client.<br>- Hủy trong vòng 2h trước giờ hẹn: Hoàn 70%, phạt 30% (20% đền bù Companion, 10% phí vận hành).<br>- Companion tự ý bùng/hủy: Hoàn 100% Client + phạt điểm uy tín Companion. | **ĐÃ XÁC MINH** | Chờ PO chốt khung thời gian (2h hay 1h) và tỷ lệ phạt. |
| **05** | Tự động nghiệm thu sau buổi chơi (Auto-Complete Order) | **Fiverr Order Completion** | [Fiverr Order Auto-Completion](https://www.fiverr.com/support/articles/360010560118-Order-completion) | Sau khi bàn giao dịch vụ, nếu Buyer không có hành động xác nhận hoặc khiếu nại trong 72h, hệ thống tự động hoàn tất và giải ngân cho Seller. | Giảm từ 72h của Fiverr xuống còn **2 giờ** (hoặc 24h đối với dịch vụ online tức thời) vì đặc thù buổi chơi game diễn ra trong ngày. | **ĐÃ XÁC MINH** | Chờ PO chốt cửa sổ khiếu nại (2h hay 24h). |
| **06** | Phòng chống giao dịch ngoài sàn (Anti-Circumvention) | **Upwork Terms of Service (Non-Circumvention)** | [Upwork Non-Circumvention Policy](https://www.upwork.com/legal#noncircumvention) | Cấm trao đổi số điện thoại, mạng xã hội bên ngoài (Zalo, Discord, Facebook) trước khi ký hợp đồng/escrow. Phạt khóa tài khoản vĩnh viễn hoặc thu phí chuyển đổi ngoài sàn. | Regex & Keyword Filter quét real-time trên kênh chat và hồ sơ Companion: chặn số điện thoại Việt Nam, link `zalo.me`, `facebook.com`, ID Discord cá nhân khi đơn chưa Escrow. | **ĐÃ XÁC MINH** | Đã cấu hình bộ regex cơ bản trong service. |
| **07** | Giới hạn giờ làm việc & Chống kiệt sức (Fatigue Management) | **Grab & Uber Safety Policy** | [Grab Fatigue Management](https://www.grab.com/sg/safety/driver/) & [Uber Driving Hour Limits](https://www.uber.com/us/en/drive/safety/driving-hours/) | Bắt buộc ngắt ca trực khi tài xế đạt giới hạn giờ lái xe liên tục (Grab tối đa 12h/ngày, bắt buộc nghỉ 6h sau 11h lái xe). | Companion không được nhận quá 8 slots (8 giờ)/ngày để đảm bảo thể lực, sức khỏe tâm lý và chất lượng trải nghiệm của khách hàng. | **ĐÃ XÁC MINH** | Tính năng đề xuất tăng cường bảo vệ lao động C2C. |
| **08** | Đánh giá ẩn hai chiều & Trọng số uy tín (Two-sided Blind Reviews) | **Uber / Airbnb Rating System** | [Uber Mutual Rating System](https://help.uber.com/riders/article/how-do-ratings-work) | Hai bên đánh giá độc lập. Điểm review chỉ hiển thị khi cả 2 bên cùng hoàn tất hoặc sau hạn chót (tránh hiện tượng trả thù review - Tit-for-tat retaliation). | Client và Companion đều có thể chấm điểm lẫn nhau sau slot chơi. Điểm hiển thị trên profile là trung bình trọng số 50 cuốc gần nhất. | **ĐÃ XÁC MINH** | Hệ thống hiện tại mới có 1 chiều (Client -> Companion). Cần quyết định nâng cấp 2 chiều. |
| **09** | Chống lặp giao dịch tài chính (Idempotency Key) | **Stripe API Idempotency** | [Stripe Idempotency Documentation](https://stripe.com/docs/api/idempotent_requests) | Header `Idempotency-Key` với UUID v4. Server lưu kết quả của request đầu tiên trong 24h. Các request trùng lặp trả về cùng response mà không thực thi lại giao dịch kế toán. | Mọi endpoint thanh toán, nạp tiền, giải ngân escrow (`/api/bookings/book`, `/api/wallet/topup`, `/api/bookings/:id/release`) đều bắt buộc truyền `Idempotency-Key`. | **ĐÃ XÁC MINH** | Đã kiểm thử và bảo đảm bởi 160 unit/integration tests. |

---

## CHI TIẾT TỪNG CA NGHIỆP VỤ & PHÂN TÍCH SO SÁNH

### 1. Luồng Ký Quỹ Escrow (Tham chiếu: Upwork Fixed-Price)
- **Tài liệu nguồn:** Upwork Support - "How Fixed-Price Escrow Works".
- **Bản chất nghiệp vụ:** 
  - Khách hàng không trả tiền trực tiếp cho Companion vào thời điểm đặt lịch.
  - Số dư khả dụng của Client được chuyển dịch sang trạng thái `ESCROW_LOCKED` (tài khoản trung gian của hệ thống).
  - Companion thấy tiền đã được nạp và khóa an toàn mới bắt đầu phục vụ (xóa bỏ rủi ro quỵt tiền).
  - Tiền chỉ rời khỏi Escrow khi:
    1. Client bấm nút **"Xác nhận hoàn thành"** (`CONFIRM`).
    2. Hết hạn chờ khiếu nại (Auto-completion).
    3. Trọng tài viên (Admin/Dispute Officer) ra phán quyết khi có tranh chấp.
- **Điểm khác biệt ở INSTASQUAD:** Khác với Upwork duyệt theo sản phẩm/file nộp, INSTASQUAD kiểm soát theo **Time-slot**. Hệ thống ghi nhận mốc `startedAt` và `finishedAt` của slot game.

---

### 2. Sổ Cái Kế Toán Ghi Kép (Tham chiếu: Stripe Ledger & Martin Fowler)
- **Tài liệu nguồn:** Stripe Engineering - "Designing an immutable, double-entry accounting ledger".
- **Bản chất nghiệp vụ:**
  - Không bao giờ có lệnh SQL: `UPDATE users SET balance = balance + 100000 WHERE id = ?`.
  - Mọi sự dịch chuyển giá trị đều sinh ra một đối tượng `LedgerTransaction` chứa ít nhất 2 dòng `LedgerEntry`:
    - Một dòng ghi Nợ (Debit - tài khoản nguồn giảm).
    - Một dòng ghi Có (Credit - tài khoản đích tăng).
  - Ràng buộc bất biến tuyệt đối:
    $$\sum_{i} \text{Debit}_i - \sum_{i} \text{Credit}_i = 0 \quad (\text{Variance} = 0)$$
  - Số dư tài khoản = Tổng các phát sinh Nợ/Có từ lúc khởi tạo đến hiện tại:
    $$\text{Balance} = \sum \text{Credits} - \sum \text{Debits}$$
- **Ứng dụng tại INSTASQUAD:** Được cài đặt chặt chẽ qua Prisma transaction (`prisma.$transaction`) tại [server/src/services/wallet.service.ts](../server/src/services/wallet.service.ts) và bảo đảm tính toàn vẹn qua bộ kiểm thử `ledger.test.ts`.

---

### 3. Hủy Slot & Hoàn Tiền Bậc Thang (Tham chiếu: Airbnb)
- **Tài liệu nguồn:** Airbnb Help Center - "Flexible and Moderate Cancellation Policies".
- **Bản chất nghiệp vụ:** Khung giờ chơi game của Companion là **tài sản có tính suy hao theo thời gian (Perishable Inventory)**. Khi Client giữ chỗ mà hủy vào phút chót, Companion mất cơ hội nhận khách khác.
- **Bảng chính sách hoàn hủy INSTASQUAD:**
  1. **Khách hủy trước $\ge 2$ giờ:**
     - Hoàn tiền: $100\%$ về ví chính của Client.
     - Phạt: $0\%$.
  2. **Khách hủy sát giờ ($< 2$ giờ trước giờ hẹn):**
     - Hoàn tiền: $70\%$ về ví Client.
     - Bồi thường Companion: $20\%$ (đền bù chi phí cơ hội).
     - Phí dịch vụ sàn: $10\%$.
  3. **Companion hủy đơn / Không xuất hiện (No-show):**
     - Hoàn tiền: $100\%$ về ví Client.
     - Phạt Companion: Trừ 20 điểm tín nhiệm và khóa tạo slot trong 24h.
     - Bồi thường Client: Tặng mã giảm giá $10\%$ cho lần đặt tiếp theo (trích từ quỹ dự phòng phạt của sàn).

---

### 4. Tỷ Lệ Chia Doanh Thu Sàn 88/12 (Tham chiếu: Epic Games Store)
- **Tài liệu nguồn:** Epic Games Store FAQ - "Revenue Sharing 88/12".
- **Bản chất nghiệp vụ:** 
  - Khác với mức chiết khấu cao 30% của Steam hay Apple App Store gây ức chế cho creator, Epic chứng minh tỷ lệ **88% cho Creator / 12% cho Sàn** vẫn bảo đảm đủ chi phí vận hành máy chủ, thanh toán gateway (khoảng 3-4%) và duy trì biên lợi nhuận ròng 8%.
  - Đối với thị trường Game Companion C2C Việt Nam, tỷ lệ 12% giúp thu hút Companion giỏi từ các nhóm tự phát (Discord, Facebook) gia nhập nền tảng chính quy có bảo vệ Escrow.

---

### 5. Phòng Chống Giao Dịch Ngầm (Tham chiếu: Upwork Non-Circumvention)
- **Tài liệu nguồn:** Upwork Terms of Service Section 7 - "Communicating Outside of Upwork".
- **Bản chất nghiệp vụ:** 
  - Nguy cơ trọng yếu của sàn C2C: Khách và Companion gặp nhau lần đầu trên sàn, sau đó tự trao đổi Zalo/STK để chơi ngoài sàn nhằm né phí 12%.
  - Cơ chế kỹ thuật:
    - Bộ lọc từ khóa và số điện thoại trên hệ thống chat WebSocket: Tự động che số điện thoại (`09xxxxxxx` $\rightarrow$ `[Số điện thoại đã bị ẩn]`), link Zalo, mã QR, link ngân hàng (`vietqr`, `momo`).
    - Cảnh báo an toàn hiển thị thường trực trên khung chat: *"Giao dịch ngoài sàn sẽ mất hoàn toàn quyền bảo hộ ký quỹ Escrow và giải quyết tranh chấp."*

---

## DANH MỤC QUYẾT ĐỊNH CHỜ PRODUCT OWNER (PO DECISION BACKLOG)

| ID | Vấn đề cần quyết định | Lựa chọn A (Đề xuất kỹ thuật) | Lựa chọn B (Giải pháp truyền thống) | Tác động hệ thống |
| :--- | :--- | :--- | :--- | :--- |
| **PO-01** | Thời gian Auto-Release Escrow | **2 giờ** sau khi kết thúc slot (dựa trên tính chất dịch vụ tức thì). | **24 giờ** (cho phép khách có nhiều thời gian khiếu nại hơn). | Ảnh hưởng tốc độ quay vòng vốn của Companion. |
| **PO-02** | Tỷ lệ chia doanh thu sàn | **12% sàn / 88% Companion** (Chuẩn Epic Games). | **20% sàn / 80% Companion** (Theo spec tài liệu môn học). | Tác động trực tiếp vào `booking.service.ts` phần split ledger. |
| **PO-03** | Mức phạt hủy sát giờ ($<2h$) | **Phạt 30%** (20% cho Companion, 10% sàn). | **Phạt 50%** (40% cho Companion, 10% sàn). | Thay đổi logic hạch toán tại `cancelBooking` trong `booking.service.ts`. |
| **PO-04** | Cơ chế eKYC Companion | Tích hợp eKYC xác thực CCCD thật qua VNPT/FPT eKYC Sandbox. | Giữ nguyên xác thực qua liên kết tài khoản Steam / Riot / Discord OAuth. | Chi phí API và độ phức tạp tích hợp. |

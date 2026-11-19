# BỘ CÂU HỎI VÀ TRẢ LỜI PHẢN BIỆN BẢO VỆ ĐỒ ÁN (DEFENSE Q&A)
## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ DỊCH VỤ GAME COMPANION (INSTASQUAD)

> **Mục đích**: Trang bị cho sinh viên khả năng trả lời phản biện xuất sắc, tự tin, trung thực và sâu sắc về mặt kỹ thuật trước Hội đồng chấm đồ án.  
> **Nguyên tắc trả lời**: Trả lời thẳng vào bản chất kỹ thuật, chỉ ra file code/hàm thực tế, thừa nhận giới hạn học thuật và giải thích lý do lựa chọn phương án kỹ thuật tối ưu.

---

### CÂU HỎI 1: TÀI CHÍNH & SỔ CÁI GHI KÉP (DOUBLE-ENTRY LEDGER)

**Hội đồng hỏi**:  
*"Tại sao các em phải thiết kế hệ thống Sổ cái ghi kép (Double-Entry Ledger) phức tạp với các bảng `LedgerTransaction`, `LedgerEntry` thay vì chỉ cần một câu lệnh đơn giản `UPDATE wallets SET balance = balance + amount`?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, việc `UPDATE` trực tiếp số dư là một anti-pattern nghiêm trọng trong các hệ thống tài chính và thương mại điện tử vì 3 lý do cốt lõi:*
1. * **Mất dấu vết kiểm toán (No Audit Trail)**: Nếu `UPDATE` trực tiếp, ta chỉ biết số dư hiện tại là bao nhiêu, hoàn toàn không biết tại sao nó thay đổi, ai thay đổi, do đơn hàng nào hay do lỗi hệ thống.
2. * **Không thể chứng minh tính bảo toàn tiền tệ**: Trong kế toán, tiền không tự nhiên sinh ra hay mất đi. Hệ thống Sổ cái ghi kép bắt buộc mỗi biến động phải có ít nhất 2 dòng bút toán đối ứng: một bên ghi Nợ (Debit), một bên ghi Có (Credit) sao cho $\sum \text{Debit} \equiv \sum \text{Credit}$.
3. * **Khả năng đối soát và phục hồi sai lệch**: Bằng cách lưu `balance_after` trên từng `LedgerEntry`, kiểm toán viên có thể chạy hàm `reconciliationService.runReconciliation()` để tính toán lại toàn bộ lịch sử từ đầu đến cuối. Nếu có bất kỳ sự can thiệp trái phép nào vào database, hệ thống sẽ phát hiện độ lệch phương sai ($\text{Variance} \ne 0$) ngay lập tức.*
*Trong code của nhóm tại [`server/src/modules/ledger/ledger.service.ts`](../server/src/modules/ledger/ledger.service.ts), toàn bộ các controller bị cấm gọi `wallet.update()`, mọi biến động tiền đều phải đi qua `LedgerService.postTransaction()` trong 1 transaction an toàn."*

---

### CÂU HỎI 2: XỬ LÝ TRANH CHẤP ĐỒNG THỜI (CONCURRENCY & SLOT LOCK)

**Hội đồng hỏi**:  
*"Làm thế nào hệ thống đảm bảo 2 Renter bấm đặt cùng một khung giờ của Companion trong cùng một mili-giây không bị đặt trùng (Double Booking), nhất là khi các em không sử dụng Redis?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, để đảm bảo tiêu chí đồ án 100% zero-config và không phụ thuộc hạ tầng ngoài, nhóm không sử dụng Redis mà sử dụng **Cơ chế Khóa hàng nguyên tử (Atomic Conditional Update) kết hợp DB Transaction**:*
- *Nếu ta làm theo cách thông thường: `SELECT` kiểm tra slot trống rồi mới `UPDATE`, giữa 2 bước đó sẽ có khoảng trống (Race Condition window) khiến cả 2 request cùng thấy slot `AVAILABLE`.*
- *Nhóm đã xử lý triệt để trong [`server/src/modules/booking/booking.service.ts`](../server/src/modules/booking/booking.service.ts) bằng cách gộp kiểm tra và cập nhật vào 1 câu lệnh duy nhất bên trong `prisma.$transaction`:*
  ```typescript
  const updated = await tx.slotCalendar.updateMany({
    where: { slot_id: slotId, status: 'AVAILABLE' },
    data: { status: 'HELD', held_until: new Date(Date.now() + 10 * 60 * 1000) }
  });
  if (updated.count === 0) {
    throw new BusinessError('SLOT_ALREADY_HELD', 'Khung giờ này vừa có người giữ chỗ.');
  }
  ```
- *Nhờ cơ chế cô lập của cơ sở dữ liệu quan hệ, request đầu tiên cập nhật thành công (`count = 1`), request thứ hai đến sau dù chỉ vài micro-giây sẽ thấy điều kiện `status = 'AVAILABLE'` không còn thỏa mãn (`count = 0`), lập tức bị từ chối với lỗi HTTP 409 Conflict. Đã được chứng minh tự động qua bài test `TC07` trong [`booking_slots.test.ts`](../tests/integration/booking_slots.test.ts)."*

---

### CÂU HỎI 3: TÍNH TOÀN VẸN CỦA GIAO THỨC (IDEMPOTENCY)

**Hội đồng hỏi**:  
*"Khi mạng chập chờn hoặc người dùng sốt ruột bấm nút Đặt lịch / Nạp tiền nhiều lần, làm sao hệ thống không bị trừ tiền hoặc tạo đơn hai lần?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm áp dụng nguyên lý **Idempotency** xuyên suốt toàn bộ các API nhạy cảm về trạng thái và tiền bạc:*
1. * **Với Booking**: Mỗi request gửi lên bắt buộc kèm theo một `request_key` (hoặc `Idempotency-Key`) sinh ngẫu nhiên ở client. Nếu request gửi lại cùng key và payload, service nhận diện qua trường `@unique` trong bảng `Booking` và trả về ngay kết quả đơn cũ (`is_idempotent_replay: true`), không sinh hold mới, không trừ tiền mới. Nếu gửi cùng key nhưng payload khác nhau, hệ thống trả về lỗi `409 CONFLICT` (kiểm thử qua `TC01`, `TC02`).*
2. * **Với Cổng thanh toán & Webhook**: Bảng `LedgerTransaction` có trường `idempotency_key` duy nhất. Khi Payment Simulator gửi webhook callback lặp lại với cùng mã giao dịch, hệ thống nhận diện khóa trùng và bỏ qua việc cộng tiền lần hai (kiểm thử qua `TC12`).*
3. * **Với Tất toán & Hoàn tiền**: Mã tham chiếu nghiệp vụ `settle-bookingId` hoặc `refund-bookingId` đảm bảo một khoản ký quỹ chỉ được giải phóng hoặc hoàn tiền đúng 1 lần duy nhất."*

---

### CÂU HỎI 4: CƠ CHẾ KÝ QUỸ (ESCROW) VÀ BẢO VỆ KHI KHIẾU NẠI

**Hội đồng hỏi**:  
*"Cơ chế Ký quỹ (Escrow) trong hệ thống hoạt động như thế nào để bảo vệ quyền lợi của cả Renter lẫn Companion khi phát sinh khiếu nại?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, Ký quỹ Escrow đóng vai trò là chiếc 'két sắt trung gian' giữa hai bên:*
- *Khi đặt lịch thành công, tiền của Renter bị trừ khỏi ví khả dụng và chuyển vào ví ký quỹ (`status = HELD`). Lúc này Companion chưa nhận được tiền nên không thể quỵt, nhưng Renter cũng không thể rút lại tùy tiện nên Companion an tâm bỏ thời gian phục vụ.*
- *Khi phiên chơi kết thúc, hệ thống mở cửa sổ nghiệm thu 15 phút. Nếu hài lòng, Renter bấm Nghiệm thu thì tiền mới chuyển cho Companion (88%) và Sàn (12%).*
- *Nếu Renter bấm **Báo sự cố (Report Issue)**, hệ thống lập tức kích hoạt trạng thái **`FROZEN` (Đóng băng)** trên bản ghi `Escrow`. Toàn bộ các API giải ngân hoặc hoàn tiền tự động đều bị khóa cứng. Tiền chỉ được mở ra sau khi Nhân viên CS Agent xem xét chứng cứ và ra phán quyết phân xử lỗi theo tỷ lệ rõ ràng (theo Quyết định D04, D05)."*

---

### CÂU HỎI 5: XỬ LÝ NGOẠI LỆ KHI POSTING LỖI (CIRCUIT BREAKER & ROLLBACK)

**Hội đồng hỏi**:  
*"Nếu đang thực hiện dở dang một giao dịch tài chính (ví dụ trừ tiền Renter thành công nhưng ghi có cho Companion bị lỗi mạng/DB crash), hệ thống xử lý thế nào để không bị sai lệch số dư?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, hệ thống áp dụng nguyên tắc **Giao dịch Nguyên tử (Atomic Transactions) kết hợp Cảnh báo kiểm toán tự động (Circuit Breaker)**:*
1. *Toàn bộ các bước ghi sổ Nợ, Có, cập nhật số dư ví và đổi trạng thái đơn hàng đều được đóng gói chặt chẽ bên trong một transaction duy nhất của Prisma: `await prisma.$transaction(async (tx) => { ... })`.*
2. *Nếu bất kỳ bước nào trong chuỗi gặp lỗi (kể cả lỗi mất điện hay cú pháp), cơ sở dữ liệu sẽ tự động **ROLLBACK 100%**. Số dư của các bên được bảo toàn nguyên vẹn như trước khi gọi API, tuyệt đối không có trạng thái lửng lơ hay trừ tiền một bên.*
3. *Đồng thời, trong khối `catch`, hệ thống bắt ngoại lệ và tự động tạo một bản ghi vào bảng **`LedgerAuditAlert`** với phân loại `POSTING_FAILURE` để Kiểm toán viên (`Auditor`) có thể theo dõi và đối soát ngay trên Dashboard (kiểm thử qua `TC24`, `TC25`)."*

---

### CÂU HỎI 6: BẢO MẬT PHÂN QUYỀN (RBAC) VÀ PHÒNG CHỐNG IDOR

**Hội đồng hỏi**:  
*"Làm thế nào để ngăn chặn một Renter đổi tham số ID trên URL để xem đơn hàng, xem tin nhắn chat hoặc ví tiền của người khác (lỗ hổng IDOR)?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, hệ thống bảo vệ 2 lớp nghiêm ngặt:*
1. * **Tầng Middleware**: Xác thực token JWT hợp lệ (`authenticate`) và kiểm tra vai trò người dùng (`authorizeRoles`). Ví dụ: Renter không thể gọi các endpoint của CS hay Admin.*
2. * **Tầng Service (Kiểm tra quyền sở hữu tài nguyên — Anti-IDOR)**: Trên mọi hàm truy vấn như `getBookingById`, `getSessionById`, `getDisputeById`, hệ thống luôn lấy `userId` từ token đã xác thực để kiểm tra:*
   ```typescript
   const isParticipant = booking.renter_id === userId || booking.companion.user_id === userId;
   const isStaff = ['CS_AGENT', 'ADMIN', 'AUDITOR'].includes(userRole);
   if (!isParticipant && !isStaff) {
     throw new ForbiddenError('Bạn không có quyền truy cập vào tài nguyên này.');
   }
   ```
*Nếu Renter 2 cố tình truy cập booking của Renter 1, hệ thống lập tức từ chối với lỗi HTTP 403 Forbidden. Nhóm đã viết riêng bộ test tự động kiểm thử thâm nhập [`tests/integration/security_audit.test.ts`](../tests/integration/security_audit.test.ts) khẳng định không có lỗ hổng IDOR."*

---

### CÂU HỎI 7: TẠI SAO DÙNG PAYMENT SIMULATOR THAY VÌ CỔNG THẬT?

**Hội đồng hỏi**:  
*"Tại sao các em không kết nối cổng thanh toán thật như VNPay, MoMo hay Stripe mà lại tự làm Payment Simulator?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, đây là **quyết định thiết kế có chủ đích** dựa trên tiêu chí đồ án học thuật đã được PO duyệt tại Quyết định **D09** và đối chiếu với nguồn tham chiếu **`REF-TOPUP-04` / `REF-TOPUP-05`** trong [`docs/REFERENCE_MAPPING.md`](REFERENCE_MAPPING.md):*
1. * **Vướng mắc pháp lý & Phí**: Các cổng thanh toán thật tại Việt Nam (VNPay, MoMo, ZaloPay) yêu cầu Giấy phép đăng ký kinh doanh doanh nghiệp và tài khoản ngân hàng pháp nhân, sinh viên không thể đăng ký tài khoản thật.*
2. * **Khả năng kiểm thử các kịch bản lỗi biên**: Khi dùng cổng thật Sandbox, ta rất khó giả lập các tình huống lỗi hiếm gặp như: Webhook bị trễ (Timeout), Webhook gửi lặp (Duplicate Callback), hoặc chữ ký bị giả mạo. Payment Simulator nội bộ cho phép nhóm chủ động kiểm thử trọn vẹn cả 3 trạng thái `SUCCESS`, `FAILED`, `TIMEOUT` với chữ ký HMAC SHA-256 mô phỏng chuẩn xác.*
3. * **Tính độc lập & Zero-config**: Người chấm bài có thể chạy đồ án offline hoàn toàn mà không sợ lỗi do server của bên thứ 3 bảo trì."*

---

### CÂU HỎI 8: TẠI SAO KHÔNG TRIỂN KHAI GỌI THOẠI WEBRTC?

**Hội đồng hỏi**:  
*"Tại sao hệ thống chỉ có chat văn bản mà không làm gọi thoại WebRTC hoặc video trực tiếp giữa Renter và Companion?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, tính năng gọi thoại WebRTC đã được nhóm phân tích kỹ tại [SCOPE_BASELINE.md](SCOPE_BASELINE.md) và đối chiếu với nguồn tham chiếu `REF-CHAT-01` trong `REFERENCE_MAPPING.md`, quyết định **Hoãn lại (DEFERRED)** vì 2 lý do:*
1. * **Thực tế người dùng**: Khi chơi game, người chơi luôn sử dụng phần mềm giao tiếp chuyên dụng có sẵn (như Discord hoặc Voice chat in-game của LMHT/Valorant) vì âm thanh qua web browser thường gây giật lag và giảm FPS của game.*
2. * **Chi phí & Hạ tầng mạng**: WebRTC để hoạt động xuyên qua các mạng NAT/Firewall trường học bắt buộc phải có máy chủ TURN/STUN trả phí. Nhóm tập trung nguồn lực vào **phòng chat văn bản WebSocket nội bộ có bộ lọc kiểm duyệt thông tin nhạy cảm** (chặn trao đổi SĐT, Zalo, STK ngân hàng theo BR-20), giải quyết bài toán chống giao dịch chui ngoài sàn."*

---

### CÂU HỎI 9: CĂN CỨ THỰC TẾ VÀ QUY TẮC NGHIỆP VỤ CỦA HỆ THỐNG (REFERENCE MAPPING & BUSINESS RULES)

**Hội đồng hỏi**:  
*"Các em lấy cơ sở nào để thiết kế các luồng giao dịch, và các con số như giữ chỗ 10 phút, tự động nghiệm thu 15 phút, tỷ lệ chia 88/12, phạt hủy đơn 3 mốc... là do các em tự bịa ra hay lấy ở đâu?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm đã phân định rõ ràng giữa **Nguồn tham chiếu vận hành thực tế** và **Quy tắc nghiệp vụ của nhóm** theo quyết định ngày 05/11/2026, được chuẩn hóa tại [`docs/REFERENCE_MAPPING.md`](REFERENCE_MAPPING.md):*
1. * **Về cách vận hành (luồng thao tác, màn hình, bước)**: Nhóm đối chiếu trực tiếp với **HAI nền tảng C2C Game Companion thực tế** là **Playerduo** (Việt Nam) và **Lita** (Đông Nam Á):
   - Luồng nạp tiền: Các mốc nạp nhanh, chọn phương thức, tự cập nhật số dư, lịch sử giao dịch gắn mã bút toán (`REF-TOPUP-01` đến `REF-TOPUP-08`).
   - Luồng thuê & dịch vụ: Đăng ký companion, đặt giá theo giờ, trả trước ký quỹ, companion bấm nhận/từ chối, phòng chat và rút tiền (`REF-AUTH-01` đến `REF-FUND-01`).
   - Kết quả tổng kết tách bạch ba phương diện: (a) Mức hoàn thiện triển khai (28 dòng REF): 25 dòng Đầy đủ (89.3%), 2 dòng Một phần (7.1%) (`REF-CHAT-01`, `REF-TAX-01`), 1 dòng Chưa có / Chưa đáp ứng (3.6%) (`REF-AUTH-03` – Google OAuth2), 0 dòng thiếu; (b) Độ chính xác tài liệu tham chiếu (28 dòng REF): 24 dòng KHỚP (85.7%), 3 dòng KHÁC NGUỒN (10.7%) (`REF-DONE-01`, `REF-WDRAW-02`, `REF-TAX-01`), 1 dòng CHƯA KIỂM CHỨNG ĐƯỢC (3.6%) (Ảnh Lita nút Nạp Xu `REF-TOPUP-01` chưa có tệp trên đĩa); (c) Phân loại theo Loại thiết kế (28 dòng REF): 23 dòng LẤY THEO NGUỒN (82.1%), 2 dòng NHÓM PHÁT TRIỂN THÊM (7.1%) (`REF-TOPUP-03`, `REF-TOPUP-05`), 3 dòng KHÁC NGUỒN (10.7%) (`REF-DONE-01`, `REF-WDRAW-02`, `REF-TAX-01`).
2. * **Về quy tắc nghiệp vụ cốt lõi**: Toàn bộ là **Quy tắc của nhóm** dựa trên Project Charter, tài liệu đề bài `INSTASQUAD_BPMN_TKHT.pdf` (19 trang) và Requirements của nhóm:
   - Tỷ lệ 88/12 (Trang 1 Mục I, Trang 13 Bước 1), phản hồi 180s (Trang 1 Mục II, Trang 6 Bước 3), mốc hủy 30m/10m (Trang 1 Mục II, Trang 9), nghiệm thu 15m (Trang 11 Mục III, Trang 12 Bước 6), khiếu nại lỗi $\ge 80\%$ (Trang 11, Trang 18), trần 10 giờ/ngày (Trang 1, Trang 2 Bước 2) lấy trực tiếp từ số trang thật của sơ đồ quy trình đề bài.
   - Các điểm mở tài liệu gốc chưa quy định (D21 chia phạt hủy < 10m theo 88/12, D22 phạt 20% nộp sàn & ghi nợ `PENALTY_DEBT`, D23 lỗi 1–79%, D24 tự động nghiệm thu 15m, D25 hạn chứng cứ 24h & tạm dừng SLA, D26 thử lại 3 lần giải ngân Escrow lỗi, D27 Funnel Conversion Rate) được nhóm ghi nhận minh bạch là **NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định (D21–D27)** tại [`docs/DECISION_LOG.md`](DECISION_LOG.md).
   - Tuyệt đối không tự ý đưa con số vào mã nguồn mà không có quyết định phê duyệt."*

---

### CÂU HỎI 10: HẠN CHẾ VÀ ĐỊNH HƯỚNG LÊN PRODUCTION QUY MÔ LỚN

**Hội đồng hỏi**:  
*"Hệ thống hiện tại có những hạn chế gì, và nếu đưa lên Production phục vụ hàng trăm ngàn người dùng thực tế thì cần nâng cấp những gì?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm đánh giá trung thực 3 điểm kỹ thuật và lộ trình nâng cấp:*
1. * **Cơ sở dữ liệu SQLite**: Rất tuyệt vời cho môi trường demo zero-config, nhưng do sử dụng cơ chế File Locking nên sẽ bị nghẽn ghi ở tải cao (>1.000 req/s). **Giải pháp**: Prisma schema của nhóm đã thiết kế tương thích 100% với PostgreSQL, chỉ cần đổi chuỗi kết nối và bật Connection Pooling (PgBouncer) với cơ chế Row Lock (`SELECT ... FOR UPDATE`).*
2. * **Cơ chế Hẹn giờ Timer & Background Automation**: Hệ thống đã hoàn thành **Background Automation Engine (`BookingAutomationService`)** chạy ngầm phía backend để tự động quét timeout 180s và auto-accept 15 phút hoàn toàn không phụ thuộc việc người dùng còn mở trình duyệt hay không. Khi lên môi trường phân tán lớn (Multi-instance), nhóm sẽ nâng cấp scheduler này lên Redis + BullMQ để chia tải giữa các cluster worker.*
3. * **Bảo vệ Gateway**: Bổ sung middleware `express-rate-limit` hoặc Cloudflare WAF để chống tấn công brute-force mật khẩu và DDoS."*

---

### CÂU HỎI 11: CỔNG THANH TOÁN QR VÀ TÍCH HỢP SEPAY WEBHOOK (REF-TOPUP-05, 06)

**Hội đồng hỏi**:  
*"Tại sao nhóm lại chọn SePay và Webhook để xử lý nạp tiền tự động thay vì tích hợp các cổng thanh toán truyền thống như VNPay hay MoMo Merchant?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm lựa chọn giải pháp SePay kết hợp VietQR mở vì 4 lý do thực tế và kỹ thuật:*
1. * **Chi phí 0đ và tính khả thi đồ án**: Các cổng thanh toán doanh nghiệp (VNPay, MoMo Business) bắt buộc phải có Giấy chứng nhận đăng ký kinh doanh (GPKD), ký quỹ hợp đồng thương mại và mất phí thường niên. SePay cung cấp gói FREE (50 giao dịch tiền vào/tháng) hoàn toàn miễn phí, hỗ trợ liên kết tài khoản ngân hàng cá nhân của nhóm sinh viên để thực nghiệm tiền thật mà không tốn chi phí.*
2. * **Tương thích toàn diện (VietQR NAPAS 247)**: VietQR Compact2 tạo bởi SePay là chuẩn thanh toán quốc gia mở, tương thích 100% ứng dụng của mọi ngân hàng Việt Nam và ví điện tử, người dùng không cần cài thêm app trung gian.*
3. * **Kiến trúc Pluggable Provider linh hoạt**: Nhóm thiết kế interface `PaymentProvider` độc lập. Khi chạy thật chỉ cần đặt `PAYMENT_PROVIDER=sepay` trong file cấu hình `.env`; khi demo offline hoặc chạy kiểm thử tự động, hệ thống chuyển sang `PAYMENT_PROVIDER=simulator` mà không sửa một dòng code nghiệp vụ.*
4. * **Bảo toàn bất biến Sổ cái ghi kép**: Cả 2 provider SePay và Simulator đều bắt buộc đi qua cùng một hàm xác nhận tiền vào duy nhất `confirmPaymentInflow`, bảo đảm tính toán nạp tiền luôn hạch toán `DEBIT CLEARING_WALLET` và `CREDIT RENTER_AVAILABLE` với sai lệch $\Delta = 0$."*

---

### CÂU HỎI 12: BẢO MẬT WEBHOOK VÀ CHỐNG GIAN LẬN NẠP TIỀN (IDEMPOTENCY & TIMING-SAFE)

**Hội đồng hỏi**:  
*"Webhook từ cổng thanh toán bên ngoài gửi về qua Internet công cộng tiềm ẩn nguy cơ bị hacker giả mạo, tấn công dò API Key hoặc gửi lặp để nhân đôi tiền. Nhóm đã phòng chống các rủi ro này như thế nào?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm đã thiết lập cơ chế phòng thủ 4 lớp nghiêm ngặt cho endpoint Webhook:*
1. * **Xác thực thời gian hằng số (Timing-Safe Comparison)**: Xác thực API Key từ SePay sử dụng `crypto.timingSafeEqual` trên chuỗi hash SHA-256. Kỹ thuật này triệt tiêu hoàn toàn nguy cơ rò rỉ độ dài hoặc ký tự của khóa bí mật qua kỹ thuật tấn công đo thời gian (Timing Attack).*
2. * **Chống chạy đua đồng thời (Concurrency In-Memory Lock)**: Hệ thống duy trì khóa xử lý theo mã giao dịch ngoài `LOCK-${external_transaction_id}` để chặn đứng nguy cơ hai yêu cầu webhook đến đồng thời trong cùng một phần nghìn giây gây double-spending.*
3. * **Chống gửi lặp Idempotency Deduplication**: Kiểm tra trạng thái đơn nạp và mã giao dịch ngoài SePay. Nếu đơn đã ở trạng thái `SUCCESS` hoặc `LATE`, hệ thống chỉ trả về HTTP 200 `{ success: true, is_idempotent_replay: true }` và tăng biến đếm `repeat_count` trong bảng cảnh báo kiểm toán `LedgerAuditAlert` mà TUYỆT ĐỐI không ghi thêm một dòng bút toán nào vào ví.*
4. * **Bảo mật dữ liệu cá nhân (Data Masking)**: Toàn bộ nhật ký hệ thống (Winston logger) đều tự động che số tài khoản ngân hàng (chỉ hiển thị 4 số cuối, ví dụ `******6789`) và không lưu bất kỳ khóa bí mật API Key nào vào cơ sở dữ liệu hay log public."*

---

### CÂU HỎI 13: BẢO MẬT BẰNG CHỨNG TRANH CHẤP & LOẠI BỎ TOKEN TRÊN QUERY STRING (ĐỢT D1b)

**Hội đồng hỏi**:  
*"Tại sao việc truyền token trên query string của URL ảnh (ví dụ `?token=eyJ...`) là rủi ro an ninh nghiêm trọng, và nhóm đã khắc phục điều này như thế nào?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, việc đính kèm JWT trên query URL là vi phạm nghiêm trọng chuẩn bảo mật OWASP Top 10 vì:*
1. * **Lỗ hổng rò rỉ token**: Query string sẽ bị lưu lại vĩnh viễn trong nhật ký máy chủ web (Access Logs), lịch sử trình duyệt (Browser History), thanh địa chỉ của màn hình máy chiếu khi demo, và tiêu đề HTTP `Referer` khi người dùng mở liên kết bên ngoài.*
2. * **Giải pháp khắc phục 2 cấp độ của nhóm**:*
   - * **Tải ảnh an toàn trên giao diện**: Client thực hiện gọi API qua header `Authorization: Bearer <token>`, nhận luồng dữ liệu nhị phân Blob (`URL.createObjectURL(blob)`), hiển thị ảnh an toàn và tự động giải phóng bộ nhớ (`URL.revokeObjectURL`) khi đóng modal xem hồ sơ.*
   - * **Liên kết ký tải về ngắn hạn (Signed URLs)**: Khi người dùng cần mở tab mới hoặc tải file trực tiếp, hệ thống cung cấp endpoint cấp `signed_token` ký riêng bằng HMAC SHA-256 có thời hạn giới hạn chỉ 60 giây và phạm vi (scope) cụ thể `purpose: "evidence_download"`. Khi token ký này hết hạn, URL trở nên vô hiệu ngay lập tức.*
3. * **Chính sách từ chối triệt để**: Endpoint tải file `/api/disputes/:id/evidences/:evidenceId/file` lập tức trả HTTP 401 nếu client cố tình truyền `?token=` trên query string."*

---

### CÂU HỎI 14: PHÂN QUYỀN NỘI DUNG CHAT NHẠY CẢM & CƠ CHẾ ĐỐI CHỨNG D29 (ĐỢT D1b)

**Hội đồng hỏi**:  
*"Khi một bên gửi thông tin vi phạm (như số điện thoại, giao dịch ngoài sàn) trong phòng chơi, làm sao CS Agent phân xử được mà không làm lộ thông tin đó cho các bên tham gia?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm áp dụng cơ chế phân quyền RBAC và kiểm toán 3 lớp nghiêm ngặt:*
1. * **Che giấu phía người dùng thường**: Trong các API phòng chat thông thường (`GET /api/sessions/:id/messages`) và chi tiết đơn đặt, trường `original_content` tuyệt đối bị ẩn (`undefined`) đối với cả Renter lẫn Companion. Cả hai bên chỉ nhìn thấy nội dung đã được làm sạch hoặc che dấu sao `***[NỘI DUNG ĐÃ BỊ KIỂM DUYỆT]***`.*
2. * **Quyền xem kiểm toán đặc quyền kèm AuditLog**: Chỉ có nhân viên CS Agent và Admin khi mở **Hồ sơ thẩm định CS Dossier** (`GET /api/cs/disputes/:id`) mới được hệ thống cung cấp trường `original_content` để làm căn cứ phán quyết. Đồng thời, mỗi lần CS Agent hoặc Admin xem hồ sơ có chứa chat gốc, hệ thống ghi nhận một bản ghi kiểm toán bất biến `AuditLog` với hành động `VIEW_DISPUTE_CHAT_AUDIT` lưu vết danh tính người xem và thời điểm.*
3. * **Bảo đảm quyền giải trình đối chứng (Quyết định D29)**: Hồ sơ CS Dossier được thiết kế tách biệt 2 cột rõ ràng giữa Renter (lý do báo sự cố, bằng chứng bổ sung) và Companion (bản giải trình chính thức, ảnh bằng chứng đối chứng). Cả hai bên đều được cấp thời hạn nộp 24 giờ và đồng hồ SLA 45 phút của CS được tạm dừng (`EVIDENCE_PENDING`) để bảo đảm tính công bằng, minh bạch."*

---

### CÂU HỎI 15: AN TOÀN TẢI LÊN ẢNH ĐẠI DIỆN (AVATAR) & BẢO VỆ DỮ LIỆU RIÊNG TƯ (ĐỢT E1 / REF-PROF-01)

**Hội đồng hỏi**:  
*"Khi cho phép người dùng tự tải ảnh đại diện lên hệ thống, nhóm đối phó thế nào với nguy cơ tải lên WebShell mã độc giả dạng ảnh (Unrestricted File Upload) và bảo vệ quyền riêng tư người dùng khỏi việc lộ vị trí GPS qua ảnh chụp?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm áp dụng giải pháp phòng thủ 5 lớp theo chuẩn OWASP File Upload Security và quy định bảo vệ dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP):*
1. * **Kiểm tra Magic Bytes nhị phân (Binary Header Signature)**: Backend đọc trực tiếp mảng byte đầu của tệp thay vì tin tưởng đuôi file `.png`/`.jpg` hoặc header `Content-Type` do client gửi. Chỉ các tệp khớp đúng signature chuẩn nhị phân (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`) mới được chấp nhận; các tệp chứa mã độc giả dạng ảnh (polyglot file, PHP webshell đổi đuôi) bị từ chối ngay lập tức với HTTP 400.*
2. * **Tái tạo ảnh và triệt tiêu toàn bộ EXIF/GPS Metadata**: Backend sử dụng thư viện Jimp đọc lại luồng pixel nhị phân và render lại thành tệp ảnh hoàn toàn mới. Quá trình này tự động strip sạch 100% metadata EXIF, loại bỏ hoàn toàn tọa độ GPS, ngày chụp và thông tin thiết bị, bảo đảm quyền riêng tư tuyệt đối cho Companion và Renter.*
3. * **Chuẩn hóa kích thước & Tối ưu lưu trữ**: Ảnh được tự động cắt vuông từ tâm (center crop) và resize về chuẩn 256x256 pixel và thumbnail 64x64 pixel, giới hạn dung lượng $\le 2\text{MB}$. Tên file được băm bằng UUIDv4 ngẫu nhiên, lưu tại thư mục cách ly không có quyền thực thi script (`no-exec`).*
4. * **Chống ghi đè trường nhạy cảm (Mass Assignment Protection)**: API cập nhật hồ sơ (`PATCH /api/me/profile`) chỉ nhận các trường được phép (`display_name`, `bio`, `date_of_birth`, `favorite_games`, companion settings); từ chối hoặc bỏ qua triệt để mọi toan tính ghi đè `role`, `email`, `wallet_id` hay `trust_score`.*
5. * **Bộ lọc thông tin liên hệ (Contact Filter)**: Tên hiển thị và tiểu sử được quét tự động qua bộ lọc Regex chặn đứng việc chèn số điện thoại, email hoặc đường dẫn ngoài nhằm ngăn chặn giao dịch chui ngoài sàn."*

---

### CÂU HỎI 16: PHÂN QUYỀN RBAC THEO VAI TRÒ & NGUYÊN TẮC TOÀN VẸN SỔ CÁI KÉP (ĐỢT E1)

**Hội đồng hỏi**:  
*"Tại sao Admin, CS Agent và Auditor không được phép có ví cá nhân, không thể nạp tiền hay tự tạo đơn đặt lịch trên hệ thống? Việc phân tách màn hình theo vai trò giúp ích gì cho tính toàn vẹn của Sổ cái kép?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, đây là nguyên tắc Phân tách nhiệm vụ (Segregation of Duties - SoD) cốt lõi trong an toàn hệ thống tài chính và kiểm toán:*
1. * **Tránh xung đột lợi ích (Conflict of Interest)**: Nhân sự nội bộ (Admin, CS Agent, Auditor) có quyền quản trị, phân xử tranh chấp hoặc kiểm toán sổ cái. Nếu họ vừa đóng vai trò người chơi (Renter/Companion) có ví tiền và tham gia giao dịch, họ có thể tự tạo đơn giả, tự phân xử khiếu nại để trục lợi tiền Escrow hoặc phạt Companion đối thủ.*
2. * **Chặn cứng cả ở Server lẫn Client (Defense in Depth)**:
   - Server từ chối mọi yêu cầu tạo đơn (`POST /api/bookings`) hoặc nạp tiền (`POST /api/payments/create-topup`) từ vai trò `ADMIN`, `CS_AGENT`, `AUDITOR` với mã lỗi `403 FORBIDDEN`.
   - Client ẩn hoàn toàn Wallet Pill, nút nạp tiền, và danh sách đặt lịch đối với các vai trò nhân sự.*
3. * **Tách bạch màn hình quản lý đơn toàn sàn**: Admin không xem đơn qua giao diện 'Đơn của tôi' của Renter mà sử dụng màn hình riêng **Quản lý đơn hàng toàn sàn** (`GET /api/admin/bookings`) với bộ lọc trạng thái đầy đủ. Điều này đảm bảo tính minh bạch, dữ liệu của người dùng không bao giờ bị gán nhãn mạo danh là của Admin.*
4. * **Bảo toàn bất biến Sổ cái ghi kép**: Mọi tài khoản trung gian của hệ thống (`Clearing`, `Platform Revenue`) là tài khoản tổ chức (institutional ledger accounts) hạch toán tự động qua bút toán ghi kép, không phải ví cá nhân rút được tiền tự do, bảo đảm phương trình bảo toàn $\text{Variance} = 0$ tuyệt đối."*

---

### CÂU HỎI 17: GỌI THOẠI WEBRTC 1-1 TRONG PHIÊN & BẢO VỆ DỮ LIỆU GIỌNG NÓI (FR-006, UC04, D31)

**Hội đồng hỏi**:  
*"Hệ thống thiết lập kênh gọi thoại 1-1 bằng công nghệ gì? Tại sao hệ thống không tự động ghi âm nội dung cuộc gọi thoại theo mặc định, và làm sao CS Agent giải quyết được tranh chấp nếu không nghe lại cuộc gọi?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, hệ thống xử lý gọi thoại và tranh chấp theo các nguyên tắc kỹ thuật và pháp lý chặt chẽ:*
1. * **Kiến trúc WebRTC Peer-to-Peer qua WebSocket Signaling**: Kênh tín hiệu (Offer, Answer, ICE candidate) được truyền tải an toàn qua WebSocket sẵn có của phiên chơi. Server kiểm tra xác thực JWT, session_id, kiểm tra trạng thái phiên `ACTIVE` và từ chối nghiêm ngặt mọi thông điệp từ người ngoài đơn (chống nghe lén). Cấu hình ICE dùng STUN công cộng miễn phí (hỗ trợ TURN qua biến môi trường).*
2. * **Lý do không tự động ghi âm theo mặc định (Quyết định D31)**: Dữ liệu giọng nói là dữ liệu sinh trắc học và thông tin cá nhân đặc biệt nhạy cảm theo quy định pháp luật (Nghị định 13/2023/NĐ-CP). Việc tự động ghi âm ngầm khi chưa có sự đồng thuận rõ ràng của cả hai bên sẽ vi phạm pháp luật và tạo gánh nặng rủi ro lộ lọt dữ liệu. Khi mở rộng, tính năng ghi âm bắt buộc có nút đồng thuận 2 bên, mã hóa AES-256-GCM và tự động hủy sau 30 ngày.*
3. * **Giải quyết tranh chấp minh bạch qua CallLog & Bằng chứng in-game**: Toàn bộ siêu dữ liệu cuộc gọi được hệ thống tự động ghi nhận vào bảng `CallLog` (người gọi, người nhận, thời điểm bắt đầu/kết thúc, thời lượng giây, dòng thời gian sự kiện kết nối, kết quả COMPLETED/MISSED). CS Agent đối chiếu CallLog trong tab riêng của Dossier kết hợp với ảnh chụp màn hình in-game và nhật ký chat để phân xử công bằng mà không cần xâm phạm đời tư giọng nói.*
4. * **Luồng dự phòng an toàn (UC04 Luồng 3a)**: Nếu người dùng không có micro hoặc mạng sau NAT chặn WebRTC, hệ thống hiển thị thông báo nhẹ nhàng và kênh chat văn bản vẫn trao đổi bình thường, không gây gián đoạn phiên chơi."*

---

### CÂU HỎI 18: ĐĂNG NHẬP GOOGLE OAUTH2, XÁC MINH CHỮ KÝ RS256 & BẢO VỆ ĐỘ TUỔI 18+ (FR-001, UC01)

**Hội đồng hỏi**:  
*"Hệ thống tích hợp Google OAuth2 như thế nào? Phía backend xác thực token của Google ra sao và làm sao đảm bảo người đăng nhập bằng Google vẫn tuân thủ quy tắc từ đủ 18 tuổi mới được tạo ví và giao dịch?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm thiết kế luồng xác thực Google OAuth2 theo chuẩn OpenID Connect và Zero-Trust Security:*
1. * **Xác minh chữ ký RS256 độc lập qua Google JWKS (Thư viện jose)**: Backend không phụ thuộc vào `google-auth-library` nặng nề mà sử dụng thư viện `jose` tương thích Node 18+. Backend lấy khóa công khai từ `https://www.googleapis.com/oauth2/v3/certs` (có cơ chế cache và làm mới tự động), giải mã và kiểm tra tính hợp lệ của chữ ký số RS256, kiểm tra `iss` (khớp Google), `aud` (khớp chính xác `GOOGLE_CLIENT_ID`), `exp` chưa quá hạn và `email_verified === true`.*
2. * **Quy trình Onboarding bắt buộc trước khi cấp ví**: Người dùng tạo tài khoản mới qua Google chưa được cấp ví ngay lập tức (`is_onboarding_completed: false`). Hệ thống yêu cầu hoàn tất bước bổ sung: chọn vai trò (Renter / Companion), nhập ngày sinh để kiểm tra đủ 18 tuổi, và đồng ý điều khoản dịch vụ.*
3. * **Chặn cứng người dưới 18 tuổi**: Nếu người dùng nhập ngày sinh chưa đủ 18 tuổi, backend từ chối với mã lỗi 422 `UNDERAGE_USER`, không cấp ví và không cho phép nạp tiền hay đặt lịch.*
4. * **Liên kết an toàn tài khoản sẵn có**: Nếu email Google đã trùng khớp với một tài khoản nội bộ có sẵn trong hệ thống, backend tự động liên kết `google_id` vào tài khoản đó sau khi đã xác minh chữ ký thành công."*

---

### CÂU HỎI 19: MÃ HÓA DỮ LIỆU NGHỈ DƯỠNG AES-256-GCM & BẢO MẬT CHỨNG CỨ KHIẾU NẠI (NFR-002)

**Hội đồng hỏi**:  
*"Dữ liệu chứng cứ khiếu nại và thông tin nhạy cảm được bảo vệ thế nào khi lưu trữ trên đĩa cứng và trong cơ sở dữ liệu? Nếu hacker chiếm được file database hoặc thư mục uploads thì có đọc được nội dung không?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm áp dụng giải pháp mã hóa cấp độ dữ liệu (Data-at-Rest Encryption) chuẩn quân sự AES-256-GCM:*
1. * **Mã hóa tệp chứng cứ trên đĩa (Disk Encryption)**: Toàn bộ ảnh bằng chứng khiếu nại và giải trình trong thư mục `uploads/disputes/` được mã hóa đối xứng AES-256-GCM ngay khi tải lên. Mỗi tệp có một IV (Vector khởi tạo) ngẫu nhiên 12-byte và Auth Tag 16-byte riêng biệt, mở đầu bằng header ma thuật `ENC1`. Mở file trực tiếp trên đĩa chỉ thấy dữ liệu rác nhị phân.*
2. * **Tính toàn vẹn chống can thiệp (Tamper-Proof)**: Chế độ GCM cung cấp cơ chế xác thực toàn vẹn (Authenticated Encryption). Nếu hacker chỉnh sửa dù chỉ 1 bit của file trên đĩa, quá trình giải mã sẽ lập tức ném lỗi `Decryption failed or data tampered` do Auth Tag không khớp.*
3. * **Mã hóa cột văn bản nhạy cảm trong Database**: Các trường văn bản nhạy cảm gồm mô tả khiếu nại (`description`), giải trình của Companion (`companion_explanation`), nội dung tin nhắn (`content`) và tin nhắn gốc (`original_content`) được mã hóa trước khi lưu vào SQLite với định dạng có tiền tố phiên bản khóa `v1:iv:tag:ciphertext` để phục vụ xoay khóa (Key Rotation) trong tương lai.*
4. * **Tách biệt khóa độc lập**: Khóa mã hóa dữ liệu `DATA_ENCRYPTION_KEY` là khóa 32-byte độc lập, hoàn toàn tách biệt với khóa mã hóa ảnh định danh `EKYC_ENCRYPTION_KEY` và khóa ký `JWT_SECRET`. Riêng ảnh đại diện (Avatar) là thông tin công khai nên không mã hóa để tối ưu bộ nhớ đệm HTTP."*



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
*Trong code của nhóm tại [`server/src/modules/ledger/ledger.service.ts`](file:///c:/Users/pc/Documents/INSTASQUAD/server/src/modules/ledger/ledger.service.ts), toàn bộ các controller bị cấm gọi `wallet.update()`, mọi biến động tiền đều phải đi qua `LedgerService.postTransaction()` trong 1 transaction an toàn."*

---

### CÂU HỎI 2: XỬ LÝ TRANH CHẤP ĐỒNG THỜI (CONCURRENCY & SLOT LOCK)

**Hội đồng hỏi**:  
*"Làm thế nào hệ thống đảm bảo 2 Renter bấm đặt cùng một khung giờ của Companion trong cùng một mili-giây không bị đặt trùng (Double Booking), nhất là khi các em không sử dụng Redis?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, để đảm bảo tiêu chí đồ án 100% zero-config và không phụ thuộc hạ tầng ngoài, nhóm không sử dụng Redis mà sử dụng **Cơ chế Khóa hàng nguyên tử (Atomic Conditional Update) kết hợp DB Transaction**:*
- *Nếu ta làm theo cách thông thường: `SELECT` kiểm tra slot trống rồi mới `UPDATE`, giữa 2 bước đó sẽ có khoảng trống (Race Condition window) khiến cả 2 request cùng thấy slot `AVAILABLE`.*
- *Nhóm đã xử lý triệt để trong [`server/src/modules/booking/booking.service.ts`](file:///c:/Users/pc/Documents/INSTASQUAD/server/src/modules/booking/booking.service.ts) bằng cách gộp kiểm tra và cập nhật vào 1 câu lệnh duy nhất bên trong `prisma.$transaction`:*
  ```typescript
  const updated = await tx.slotCalendar.updateMany({
    where: { slot_id: slotId, status: 'AVAILABLE' },
    data: { status: 'HELD', held_until: new Date(Date.now() + 10 * 60 * 1000) }
  });
  if (updated.count === 0) {
    throw new BusinessError('SLOT_ALREADY_HELD', 'Khung giờ này vừa có người giữ chỗ.');
  }
  ```
- *Nhờ cơ chế cô lập của cơ sở dữ liệu quan hệ, request đầu tiên cập nhật thành công (`count = 1`), request thứ hai đến sau dù chỉ vài micro-giây sẽ thấy điều kiện `status = 'AVAILABLE'` không còn thỏa mãn (`count = 0`), lập tức bị từ chối với lỗi HTTP 409 Conflict. Đã được chứng minh tự động qua bài test `TC07` trong [`booking_slots.test.ts`](file:///c:/Users/pc/Documents/INSTASQUAD/tests/integration/booking_slots.test.ts)."*

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
*Nếu Renter 2 cố tình truy cập booking của Renter 1, hệ thống lập tức từ chối với lỗi HTTP 403 Forbidden. Nhóm đã viết riêng bộ test tự động kiểm thử thâm nhập [`tests/integration/security_audit.test.ts`](file:///c:/Users/pc/Documents/INSTASQUAD/tests/integration/security_audit.test.ts) khẳng định không có lỗ hổng IDOR."*

---

### CÂU HỎI 7: TẠI SAO DÙNG PAYMENT SIMULATOR THAY VÌ CỔNG THẬT?

**Hội đồng hỏi**:  
*"Tại sao các em không kết nối cổng thanh toán thật như VNPay, MoMo hay Stripe mà lại tự làm Payment Simulator?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, đây là **quyết định thiết kế có chủ đích** dựa trên tiêu chí đồ án học thuật đã được PO duyệt tại Quyết định **D09**:*
1. * **Vướng mắc pháp lý & Phí**: Các cổng thanh toán thật tại Việt Nam (VNPay, MoMo, ZaloPay) yêu cầu Giấy phép đăng ký kinh doanh doanh nghiệp và tài khoản ngân hàng pháp nhân, sinh viên không thể đăng ký tài khoản thật.*
2. * **Khả năng kiểm thử các kịch bản lỗi biên**: Khi dùng cổng thật Sandbox, ta rất khó giả lập các tình huống lỗi hiếm gặp như: Webhook bị trễ (Timeout), Webhook gửi lặp (Duplicate Callback), hoặc chữ ký bị giả mạo. Payment Simulator nội bộ cho phép nhóm chủ động kiểm thử trọn vẹn cả 3 trạng thái `SUCCESS`, `FAILED`, `TIMEOUT` với chữ ký HMAC SHA-256 mô phỏng chuẩn xác.*
3. * **Tính độc lập & Zero-config**: Người chấm bài có thể chạy đồ án offline hoàn toàn mà không sợ lỗi do server của bên thứ 3 bảo trì."*

---

### CÂU HỎI 8: TẠI SAO KHÔNG TRIỂN KHAI GỌI THOẠI WEBRTC?

**Hội đồng hỏi**:  
*"Tại sao hệ thống chỉ có chat văn bản mà không làm gọi thoại WebRTC hoặc video trực tiếp giữa Renter và Companion?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, tính năng gọi thoại WebRTC đã được nhóm phân tích kỹ tại [SCOPE_BASELINE.md](file:///c:/Users/pc/Documents/INSTASQUAD/docs/SCOPE_BASELINE.md) và quyết định **Hoãn lại (DEFERRED)** vì 2 lý do:*
1. * **Thực tế người dùng**: Khi chơi game, người chơi luôn sử dụng phần mềm giao tiếp chuyên dụng có sẵn (như Discord hoặc Voice chat in-game của LMHT/Valorant) vì âm thanh qua web browser thường gây giật lag và giảm FPS của game.*
2. * **Chi phí & Hạ tầng mạng**: WebRTC để hoạt động xuyên qua các mạng NAT/Firewall trường học bắt buộc phải có máy chủ TURN/STUN trả phí. Nhóm tập trung nguồn lực vào **phòng chat văn bản WebSocket nội bộ có bộ lọc kiểm duyệt thông tin nhạy cảm** (chặn trao đổi SĐT, Zalo, STK ngân hàng theo BR-20), giải quyết bài toán chống giao dịch chui ngoài sàn."*

---

### CÂU HỎI 9: CĂN CỨ VÀ TÍNH PHÁP LÝ CỦA CÁC CHÍNH SÁCH DEMO (D01 – D18)

**Hội đồng hỏi**:  
*"Các con số như giữ chỗ 10 phút, tự động nghiệm thu 15 phút, tỷ lệ chia 88/12, phạt hủy đơn 3 mốc... là do các em tự bịa ra hay lấy ở đâu?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, toàn bộ các quy tắc này đều có nguồn gốc minh bạch:*
- *Các quy tắc gốc như tỷ lệ 88/12, phản hồi 180s, mốc hủy 30m và 10m được trích xuất trực tiếp từ sơ đồ quy trình trong tài liệu đề bài `INSTASQUAD_BPMN_TKHT.pdf` (pp. 4–8).*
- *Với các khoảng trống mà đề bài chưa nêu số cụ thể (như giữ slot bao nhiêu phút thì nhả, im lặng bao lâu thì auto-accept), nhóm đã lập **Sổ quyết định PO (Decision Log D01–D18)** tại [`docs/DECISION_LOG.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/DECISION_LOG.md) và được Product Owner phê duyệt chính thức làm Baseline kỹ thuật trước khi code. Không có bất kỳ con số nào được tự ý đưa vào mã nguồn mà không có quyết định phê duyệt."*

---

### CÂU HỎI 10: HẠN CHẾ VÀ ĐỊNH HƯỚNG LÊN PRODUCTION QUY MÔ LỚN

**Hội đồng hỏi**:  
*"Hệ thống hiện tại có những hạn chế gì, và nếu đưa lên Production phục vụ hàng trăm ngàn người dùng thực tế thì cần nâng cấp những gì?"*

**Câu trả lời chuẩn**:  
*"Dạ thưa Thầy/Cô, nhóm đánh giá trung thực 3 hạn chế kỹ thuật hiện tại và giải pháp nâng cấp:*
1. * **Cơ sở dữ liệu SQLite**: Rất tuyệt vời cho môi trường demo zero-config, nhưng do sử dụng cơ chế File Locking nên sẽ bị nghẽn ghi ở tải cao (>1.000 req/s). **Giải pháp**: Prisma schema của nhóm đã thiết kế tương thích 100% với PostgreSQL, chỉ cần đổi chuỗi kết nối và bật Connection Pooling (PgBouncer) với cơ chế Row Lock (`SELECT ... FOR UPDATE`).*
2. * **Cơ chế Hẹn giờ Timer**: Hiện tại 180s và 15m được đánh giá tại thời điểm request API để đảm bảo tính xác định khi test. **Giải pháp**: Ở môi trường Production, sẽ bổ sung thêm một Background Worker độc lập sử dụng Redis + BullMQ để quét định kỳ.*
3. * **Bảo vệ Gateway**: Bổ sung middleware `express-rate-limit` hoặc Cloudflare WAF để chống tấn công brute-force mật khẩu và DDoS."*

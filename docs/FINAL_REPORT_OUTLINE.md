# ĐỀ CƯƠNG VÀ NỘI DUNG BÁO CÁO TỔNG KẾT ĐỒ ÁN (FINAL REPORT OUTLINE)
## ĐỀ TÀI: NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ DỊCH VỤ GAME COMPANION (INSTASQUAD)

> **Môn học**: Thương mại Điện tử / Kỹ thuật Phần mềm / Đồ án Tốt nghiệp  
> **Hệ thống**: INSTASQUAD — E-Commerce Game Companion Platform  
> **Phiên bản mã nguồn**: v1.0.0 (Release Candidate)  
> **Lưu ý định dạng**: Tài liệu này đóng vai trò là khung báo cáo học thuật đầy đủ nội dung kỹ thuật. Nếu khoa hoặc trường có mẫu template (Word/LaTeX) bắt buộc riêng (như trang bìa quy chuẩn, định dạng font, lề, số thứ tự chương mục), sinh viên chỉ cần cung cấp template để điều chỉnh tương ứng.

---

## MỤC LỤC TỔNG QUAN BÁO CÁO

- **CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ XÁC ĐỊNH PHẠM VI**
  - 1.1. Bối cảnh thị trường và Thực trạng giao dịch dịch vụ số C2C
  - 1.2. Vấn đề nghiên cứu & Các thách thức kỹ thuật cốt lõi
  - 1.3. Mục tiêu đồ án & Đường cơ sở phạm vi (Scope Baseline)
  - 1.4. Bảng phân loại tính năng (Thực tế - Mô phỏng - Hoãn lại - Demo Policy)
- **CHƯƠNG 2: PHÂN TÍCH YÊU CẦU VÀ MÔ HÌNH HÓA NGHIỆP VỤ (BPMN)**
  - 2.1. Các tác nhân tham gia hệ thống (Actors & Roles)
  - 2.2. Danh mục 28 Quy tắc nghiệp vụ cốt lõi (Business Rules BR-01 – BR-28)
  - 2.3. Mô hình hóa quy trình nghiệp vụ tổng thể (BPMN 4 làn)
  - 2.4. Phân tích 8 Máy trạng thái chuyên sâu (State Machines)
- **CHƯƠNG 3: THIẾT KẾ KIẾN TRÚC VÀ MÔ HÌNH DỮ LIỆU (ERD & CLASS DIAGRAM)**
  - 3.1. Phong cách kiến trúc Modular Monolith & Lựa chọn công nghệ
  - 3.2. Cơ chế giải quyết tranh chấp đồng thời (Concurrency Lock không dùng Redis)
  - 3.3. Mô hình thực thể quan hệ As-Built (ERD 24 thực thể & Khắc phục ERD Gap)
  - 3.4. Sơ đồ lớp miền tài chính & Nghiệp vụ (Domain Class Diagram)
- **CHƯƠNG 4: HIỆN THỰC HÓA BỘ BA CỐT LÕI: BOOKING – ESCROW – LEDGER**
  - 4.1. Thiết kế Idempotency và Cơ chế Giữ slot nguyên tử
  - 4.2. Cơ chế Ký quỹ Escrow và Bất biến Snapshot tổng phí
  - 4.3. Thiết kế Lõi Sổ cái ghi kép bất biến (Double-Entry Ledger Engine)
  - 4.4. Thuật toán giải ngân 88/12 không thất thoát tiền tệ (Zero-Cent Rounding)
  - 4.5. Cơ chế phân nhánh Hủy đơn tại các điểm biên thời gian
  - 4.6. Quy trình thụ lý khiếu nại (RMA) và Phán quyết của CS Agent
- **CHƯƠNG 5: KIỂM THỬ ĐỘC LẬP, BẢO MẬT VÀ ĐỐI SOÁT TÀI CHÍNH**
  - 5.1. Ma trận đối chiếu 70 ca kiểm thử nghiệm thu (Acceptance Tests TC01 – TC70)
  - 5.2. Kiểm thử đơn vị thuật toán tài chính và 1.000 phép thử bất biến (Property Tests)
  - 5.3. Mô phỏng 500 bước bảo toàn tiền tệ trong nền kinh tế đóng
  - 5.4. Kiểm toán an toàn bảo mật và Thâm nhập (SQL Injection, IDOR, Secrets, Upload)
  - 5.5. Kết quả đối soát Sổ cái kép (Ledger Reconciliation Audit)
- **CHƯƠNG 6: KẾT LUẬN, GIỚI HẠN VÀ HƯỚNG PHÁT TRIỂN**
  - 6.1. Đánh giá mức độ hoàn thành so với mục tiêu ban đầu
  - 6.2. Các giới hạn kỹ thuật và Ranh giới học thuật
  - 6.3. Kế hoạch phát triển lên môi trường Production quy mô lớn

---

## NỘI DUNG KỸ THUẬT CHI TIẾT TỪNG CHƯƠNG

### CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI VÀ XÁC ĐỊNH PHẠM VI

#### 1.1. Bối cảnh thị trường & Nguồn tham chiếu vận hành thực tế
Thương mại điện tử dịch vụ kết nối người chơi game đồng hành (Game Companion / Co-play) đang phát triển nhanh chóng tại Châu Á và Việt Nam. Tuy nhiên, hình thức giao dịch tự phát hiện nay trên mạng xã hội tiềm ẩn rủi ro rất lớn:
- Người thuê chuyển khoản trước dễ bị Companion bùng kèo, chặn liên lạc.
- Companion cung cấp dịch vụ xong dễ bị người thuê quỵt tiền hoặc báo cáo gian lận với ngân hàng.
- Thiếu cơ chế trung gian giám sát phiên chơi, đánh giá kỹ năng và xử lý khiếu nại minh bạch.

Nhằm bảo đảm tính thực tiễn cao, hệ thống INSTASQUAD tiến hành đối chiếu cách vận hành (luồng nạp tiền, đặt lịch, hồ sơ, rút tiền...) với **HAI nền tảng C2C Game Companion thực tế** là **Playerduo** (Việt Nam) và **Lita** (Đông Nam Á) theo tài liệu [`docs/REFERENCE_MAPPING.md`](REFERENCE_MAPPING.md). Đồng thời, các quy tắc nghiệp vụ cốt lõi (180s, 15m nghiệm thu, 88/12, phạt hủy bậc thang, RMA 80%, trần 10h/ngày, Sổ cái kép) được bảo toàn độc lập theo Project Charter và BPMN của nhóm.

#### 1.2. Vấn đề nghiên cứu & Thách thức kỹ thuật
Đề tài tập trung giải quyết 4 bài toán kỹ thuật trọng điểm trong giao dịch C2C:
1. **Bài toán Concurrency**: Ngăn chặn 2 người thuê cùng đặt một khung giờ rảnh trong cùng một mili-giây mà không làm phát sinh chi phí hạ tầng cụm Redis.
2. **Bài toán Bảo toàn tiền tệ**: Đảm bảo số dư ví không bao giờ bị cập nhật tùy tiện (`UPDATE balance`), mọi biến động tiền đều có chứng từ Nợ/Có cân bằng hoàn hảo.
3. **Bài toán Idempotency**: Khi mạng chập chờn, người dùng bấm nhiều lần hoặc cổng thanh toán gửi lặp Webhook, hệ thống không được cộng/trừ tiền hai lần.
4. **Bài toán Trọng tài phân xử**: Quy trình khiếu nại đóng băng tiền tạm giữ và cho phép nhân viên hỗ trợ phân bổ tiền phạt/hoàn dựa trên chứng cứ.

#### 1.3. Bảng phân loại tính năng (Scope Classification Matrix)

| Phân loại | Định nghĩa | Danh mục tính năng cụ thể trong hệ thống INSTASQUAD |
|:---|:---|:---|
| **Tính năng thực tế**<br>*(Fully Implemented)* | Các tính năng cốt lõi được xây dựng bằng mã nguồn thực tế và kiểm thử tự động 100%. | - Xác thực JWT & Phân quyền RBAC 5 vai trò.<br>- Quản lý danh mục game, rank tier, hồ sơ Companion.<br>- Khung giờ rời rạc (Discrete Slots) và trần làm việc 10h/ngày (UTC+7).<br>- Đặt lịch Idempotent, Atomic Slot Hold (10m TTL), snapshot giá cố định.<br>- Lõi Sổ cái ghi kép (Double-Entry Ledger) với kiểm toán đối soát cân bằng $\sum \text{Debit} \equiv \sum \text{Credit}$.<br>- Ký quỹ Escrow (HELD $\rightarrow$ RELEASED / REFUNDED / FROZEN).<br>- Đếm ngược 180s cho Companion phản hồi; tự động hoàn 100% khi quá hạn.<br>- Hủy đơn trước giờ hẹn tại 3 mốc: $\ge 30$m (100%), 10–29m (70/30), $< 10$m (88/12).<br>- Phòng chơi Session, đếm ngược thời lượng thuê, cửa sổ nghiệm thu 15m.<br>- Nghiệm thu giải ngân 88/12 làm tròn số nguyên không mất 1 đồng.<br>- Tranh chấp RMA, đóng băng Escrow, CS phán quyết theo tỷ lệ lỗi $\ge 80\%$ và $< 80\%$.<br>- Đánh giá 1–5 sao hai chiều bất biến; công thức TrustScore kẹp $[0, 100]$ và ngưỡng khóa $< 40$.<br>- Vòng đời rút tiền: khóa số dư khả dụng, hoàn trả khi từ chối.<br>- Rollback toàn phần khi lỗi ghi sổ và phát sinh cảnh báo `LedgerAuditAlert`. |
| **Tính năng mô phỏng**<br>*(Mocked / Simulator)* | Các dịch vụ bên ngoài tốn phí hoặc phụ thuộc ngân hàng được thay bằng Simulator nội bộ có độ trung thực cao. | - **Payment Simulator**: Mô phỏng cổng VNPay/MoMo với UI chọn kịch bản `SUCCESS`, `FAILED`, `TIMEOUT` và Webhook HMAC SHA-256.<br>- **Bank Payout Simulator**: Mô phỏng chuyển khoản ngân hàng khi tất toán rút tiền.<br>- **Chat Room Text-only**: WebSocket nội bộ kèm bộ lọc regex che số điện thoại, email, URL và STK ngân hàng.<br>- **Bằng chứng khiếu nại**: Tải lên tệp ảnh/log $\le 2$MB lưu trữ cục bộ kèm mã hóa UUID ngẫu nhiên. |
| **Tính năng hoãn lại**<br>*(Deferred Scope)* | Các tính năng phức tạp, tốn kém hạ tầng được thỏa thuận đưa ra ngoài phạm vi đồ án sinh viên. | - Gọi thoại/video WebRTC trực tiếp (chi phí băng thông và STUN/TURN server).<br>- Kiến trúc Microservices phân tán, cụm Kafka / RabbitMQ.<br>- Bộ nhớ đệm phân tán Redis (thay bằng DB Transaction nguyên tử).<br>- Kho bãi, giỏ hàng nhiều món, giao nhận hàng vật lý (Đã loại trừ theo BR-27). |
| **Chính sách giả định Demo**<br>*(Approved Demo Policies)* | Toàn bộ 18 quyết định kỹ thuật D01–D18 đã được PO phê duyệt chính thức làm Baseline; **Không có giả định nào chưa được duyệt**. | - **D01**: TTL giữ slot cố định 10 phút.<br>- **D02**: Tự động nghiệm thu sau 15 phút im lặng.<br>- **D03**: Hủy đơn $< 10$ phút phân bổ phạt 88% Companion / 12% Sàn.<br>- **D04**: Companion lỗi $\ge 80\%$ phạt thêm 20%, ghi nhận nợ phạt không làm âm ví.<br>- **D05**: Companion lỗi $< 80\%$ giải ngân 88/12.<br>- **D06**: Thời hạn nộp bổ sung chứng cứ tối đa 24 giờ.<br>- **D07**: Điểm TrustScore mặc định 80, ngưỡng khóa $< 40$.<br>- **D08**: Múi giờ tính trần 10 giờ/ngày là `Asia/Ho_Chi_Minh` (UTC+7).<br>- **D13**: Phí sàn lấy phần nguyên $\lfloor 12\% \rfloor$, Companion nhận phần còn lại.<br>- **D17**: Đánh giá sau khi gửi là bất biến (không sửa/xóa). |

---

### CHƯƠNG 2: PHÂN TÍCH YÊU CẦU VÀ MÔ HÌNH HÓA NGHIỆP VỤ (BPMN)

#### 2.1. Các tác nhân và vai trò hệ thống
1. **Renter (Người thuê)**: Tìm kiếm Companion, chọn slot, nạp tiền mô phỏng, ký quỹ Escrow, chat trong phòng chơi, nghiệm thu hoặc khiếu nại, đánh giá sao.
2. **Companion (Bạn chơi)**: Thiết lập hồ sơ, cấu hình lịch rảnh rời rạc, chấp nhận/từ chối đơn trong 180s, chat phiên chơi, theo dõi thu nhập và tạo yêu cầu rút tiền.
3. **CS Agent (Nhân viên hỗ trợ)**: Thẩm định hồ sơ khiếu nại RMA, xem chứng cứ và log chat, yêu cầu bổ sung chứng cứ, ban hành phán quyết phân xử tỷ lệ lỗi.
4. **Auditor (Kiểm toán viên)**: Tra cứu lịch sử Sổ cái ghi kép, đối soát cân bằng tiền tệ thời gian thực, xử lý các cảnh báo ngoại lệ ghi sổ `LedgerAuditAlert`.
5. **Admin (Quản trị viên)**: Quản trị toàn diện người dùng, phê duyệt hoặc từ chối yêu cầu rút tiền, quản lý danh mục trò chơi.

#### 2.2. Sơ đồ quy trình nghiệp vụ tổng thể (BPMN 4 Làn)
Hệ thống hiện thực hóa quy trình nghiệp vụ theo sơ đồ BPMN chuẩn với 4 phân làn hoạt động:
- **Làn Renter**: Đặt lịch $\rightarrow$ Ký quỹ Escrow $\rightarrow$ Tham gia phiên chơi $\rightarrow$ Nghiệm thu / Khiếu nại $\rightarrow$ Đánh giá sao.
- **Làn Companion**: Khởi tạo Slot $\rightarrow$ Đếm ngược phản hồi 180s (Chấp nhận / Từ chối) $\rightarrow$ Thực hiện phiên chơi $\rightarrow$ Nhận giải ngân 88% $\rightarrow$ Rút tiền.
- **Làn Hệ thống (Core System)**: Kiểm tra trần 10h/ngày $\rightarrow$ Khóa slot nguyên tử $\rightarrow$ Hạch toán Sổ cái kép $\rightarrow$ Quản lý thời lượng thuê $\rightarrow$ Đóng phiên $\rightarrow$ Tự động nghiệm thu sau 15m.
- **Làn CS / Trọng tài**: Tiếp nhận Dispute $\rightarrow$ Đóng băng Escrow `FROZEN` $\rightarrow$ Thẩm định Dossier $\rightarrow$ Phán quyết lỗi Companion $\ge 80\%$ (Hoàn tiền 100% + Phạt 20%) hoặc $< 80\%$ (Giải ngân 88/12).

---

### CHƯƠNG 3: THIẾT KẾ KIẾN TRÚC VÀ MÔ HÌNH DỮ LIỆU

#### 3.1. Kiến trúc Modular Monolith
Hệ thống được thiết kế theo phong cách Modular Monolith nhằm tối ưu hóa khả năng bảo trì, đơn giản hóa giao dịch ACID và loại bỏ sự phức tạp của hệ thống phân tán:
- Tầng Client: React 18 SPA với các View chuyên biệt theo vai trò.
- Tầng Backend: Express REST API kết hợp WebSocket Server nội bộ.
- Tầng Dữ liệu: Prisma ORM với cơ chế Interactive Transactions (`prisma.$transaction`) bảo vệ các thao tác tài chính.

#### 3.2. Cơ chế khóa hàng nguyên tử (Atomic Slot Concurrency)
Giải quyết triệt để xung đột đồng thời khi hai Renter cùng đặt một slot:
```typescript
const updated = await tx.slotCalendar.updateMany({
  where: { slot_id: slotId, status: 'AVAILABLE' },
  data: { status: 'HELD', held_until: new Date(Date.now() + 10 * 60 * 1000) }
});
if (updated.count === 0) {
  throw new BusinessError('SLOT_ALREADY_HELD', 'Khung giờ này vừa có người giữ chỗ.');
}
```
Nhờ cơ chế Row-level locking của cơ sở dữ liệu quan hệ, request đầu tiên sẽ cập nhật thành công (`count = 1`), request thứ hai nhận `count = 0` và lập tức nhận lỗi `409 CONFLICT`.

#### 3.3. Mô hình dữ liệu As-Built (24 Thực thể)
Khắc phục hoàn toàn khoảng trống dữ liệu của đề bài thông qua 7 thực thể bổ sung đã được PO phê duyệt:
1. `users`, `companion_profiles`, `game_catalog`, `skill_rank_tier`, `slot_calendar`.
2. `bookings`, `booking_status_histories` *(Bổ sung)*.
3. `sessions` *(Bổ sung)*, `chat_messages` *(Bổ sung)*.
4. `wallets`, `escrows`, `ledger_transactions`, `ledger_entries`, `payments`, `platform_revenues`, `withdrawal_requests`.
5. `dispute_cases` *(Bổ sung)*, `dispute_evidences` *(Bổ sung)*, `dispute_decisions` *(Bổ sung)*.
6. `reviews`, `trust_score_logs`, `notifications`, `audit_logs`, `ledger_audit_alerts` *(Bổ sung)*.

---

### CHƯƠNG 4: HIỆN THỰC HÓA BỘ BA CỐT LÕI: BOOKING – ESCROW – LEDGER

#### 4.1. Lõi Sổ cái ghi kép (Double-Entry Ledger Engine)
- Mọi biến động số dư bắt buộc đi qua `LedgerService.postTransaction()`, tuyệt đối cấm câu lệnh sửa trực tiếp `wallet.update({ balance })`.
- Mỗi giao dịch bắt buộc có mã định danh `idempotency_key` duy nhất và danh sách bút toán thỏa mãn:
  $$\sum \text{Debit} \equiv \sum \text{Credit}$$
- Số dư ví đóng vai trò là bộ đệm đọc (Read-optimized cache) được tính toán và cập nhật nguyên tử cùng `balance_after` trong mỗi `LedgerEntry`.

#### 4.2. Thuật toán phân chia 88/12 không thất thoát tiền tệ (Zero-Cent Rounding)
Do tiền tệ Việt Nam Đồng (VND) là số nguyên, phép chia tỷ lệ phần trăm có thể sinh số thập phân. Hệ thống áp dụng thuật toán làm tròn sàn:
$$\text{PlatformFee} = \lfloor \text{TotalFee} \times 0.12 \rfloor$$
$$\text{CompanionFee} = \text{TotalFee} - \text{PlatformFee}$$
Đảm bảo phương trình bảo toàn tuyệt đối:
$$\text{PlatformFee} + \text{CompanionFee} \equiv \text{TotalFee}$$
Đã được kiểm chứng qua 1.000 phép thử ngẫu nhiên không có sai lệch dù chỉ 1 đồng.

---

### CHƯƠNG 5: KIỂM THỬ ĐỘC LẬP, BẢO MẬT VÀ ĐỐI SOÁT TÀI CHÍNH

- **Tổng số ca kiểm thử**: **228/228 tests PASS (100% GREEN) trên 22 test files** (bao gồm 19 integration test suites với 199 tests, 3 unit test suites với 29 tests; kiểm thử trọn vẹn xác thực độ tuổi 18+, tải lên voice bio, eKYC AES-256-GCM, Anti-Enumeration, lọc bot & băm HMAC IP cho SiteVisit, Dual Conversion Rate và Sổ cái kép).
- **Ánh xạ tham chiếu vận hành (Playerduo & Lita)**:
  - *(a) Mức hoàn thiện triển khai (28 dòng REF)*: **25 dòng Đầy đủ (89.3%)**, **2 dòng Một phần (7.1%)** (`REF-CHAT-01`, `REF-TAX-01`), **1 dòng Chưa có / Chưa đáp ứng (3.6%)** (`REF-AUTH-03` – Google OAuth2), **0 dòng thiếu ngoài tầm kiểm soát**.
  - *(b) Độ chính xác tài liệu tham chiếu (28 dòng REF)*: **24 dòng KHỚP (85.7%)**, **3 dòng KHÁC NGUỒN (10.7%)** (`REF-DONE-01`, `REF-WDRAW-02`, `REF-TAX-01`), **1 dòng CHƯA KIỂM CHỨNG ĐƯỢC (3.6%)** (Ảnh Lita nút Nạp Xu `REF-TOPUP-01` chưa có tệp trên đĩa).
  - *(c) Phân loại theo Loại thiết kế (28 dòng REF)*: **23 dòng LẤY THEO NGUỒN (82.1%)**, **2 dòng NHÓM PHÁT TRIỂN THÊM (7.1%)** (`REF-TOPUP-03`, `REF-TOPUP-05`), **3 dòng KHÁC NGUỒN (10.7%)** (`REF-DONE-01`, `REF-WDRAW-02`, `REF-TAX-01`).
- **Bao phủ 70/70 Acceptance Tests** từ WBS: Không có test nào bị bỏ qua hoặc đánh giá sai sự thật.
- **Kiểm tra an toàn bảo mật**:
  - Không có lỗ hổng SQL Injection (100% parameterized qua ORM).
  - Phòng chống triệt để lỗ hổng IDOR trên đơn đặt lịch, phòng chat, khiếu nại và ví tiền.
  - Loại bỏ hoàn toàn trường `password_hash` và thông tin thẻ nhạy cảm khỏi kết quả API.
  - Giới hạn tệp tải lên tối đa 2MB, danh sách trắng định dạng ảnh/log, tên file băm UUID ngẫu nhiên.
  - Khắc phục triệt để lỗ hổng giả mạo actor nội bộ `SYSTEM` và tham số `simulated_now`.
- **Đối soát Sổ cái kép**: Kiểm toán đối soát toàn bộ hệ thống xác nhận độ lệch phương sai bằng 0 ($\text{Variance} \equiv 0$).

---

### CHƯƠNG 6: KẾT LUẬN, GIỚI HẠN VÀ HƯỚNG PHÁT TRIỂN

#### 6.1. Kết luận
Đồ án đã xây dựng thành công một nền tảng thương mại điện tử dịch vụ C2C hoàn chỉnh, giải quyết xuất sắc các bài toán phức tạp về an toàn tài chính, tính đồng thời, tự động hóa chu kỳ hạn mức và quy trình phân xử khiếu nại minh bạch.

#### 6.2. Giới hạn hệ thống
1. Hệ thống sử dụng SQLite cục bộ phục vụ demo zero-config; chưa tối ưu cho tải ghi cực lớn (>1.000 req/s).
2. Kênh gọi thoại/video trực tiếp được hoãn lại (DEFERRED), tập trung vào chat text nội bộ có bộ lọc regex.

#### 6.3. Hướng phát triển cho môi trường Production
1. Chuyển đổi tầng lưu trữ sang PostgreSQL với cơ chế Row-level locking (`SELECT ... FOR UPDATE`) và Connection Pooling (PgBouncer).
2. Nâng cấp Background Automation Engine từ worker đơn tiến trình nội bộ sang cụm Worker phân tán (BullMQ + Redis cluster) để điều phối tải đa server.
3. Bổ sung Rate Limiting ở tầng API Gateway để ngăn chặn tấn công từ chối dịch vụ (DDoS).

# ĐẶC TẢ CÁC TRƯỜNG HỢP SỬ DỤNG (USE CASE SPECIFICATIONS)

Tài liệu này chuẩn hóa đặc tả các Use Case chính của hệ thống INSTASQUAD (UC01 đến UC05), đặc biệt viết lại toàn diện **UC03** nhằm đồng bộ tuyệt đối với sơ đồ BPMN Hình 1A, Hình 1B và nguyên tắc tài chính của Sổ cái kép.

---

## UC03: ĐẶT LỊCH, KÝ QUỸ ESCROW VÀ PHẢN HỒI CỦA COMPANION

### 1. Thông tin chung
- **Mã Use Case:** UC03
- **Tên Use Case:** Đặt lịch, Ký quỹ Escrow và Phản hồi chấp nhận của Companion
- **Tác nhân chính:** Người thuê (Renter)
- **Tác nhân hỗ trợ:** Người đồng hành (Companion), Hệ thống Sổ cái kép (Double-Entry Ledger Engine), Tiến trình nền (Timeout Worker)
- **Mục tiêu:** Cho phép Renter đặt lịch thuê Companion, thực hiện ký quỹ bảo đảm tài chính trước, kích hoạt đếm ngược 180 giây để Companion tiếp nhận hoặc từ chối, và tự động hoàn trả tiền nếu quá hạn.

### 2. Tiền điều kiện (Preconditions)
1. Renter đã đăng nhập vào hệ thống và hoàn tất đăng ký thông tin hợp lệ (từ 18 tuổi trở lên).
2. Companion đang có ít nhất một khung giờ rảnh ở trạng thái `AVAILABLE` trong tương lai.
3. Số dư khả dụng trong ví của Renter đủ để thanh toán toàn bộ chi phí đơn đặt (`wallet.available_balance >= total_fee`). Nếu thiếu, Renter nạp tiền trước qua cổng thanh toán mô phỏng.

### 3. Hậu điều kiện (Postconditions)
- **Thành công:** Tiền được giữ an toàn trong ví Escrow, đơn chuyển sang trạng thái `ACCEPTED`, slot chuyển thành `BOOKED`, phòng chơi (`Session`) được tạo sẵn.
- **Thất bại / Hủy:** Toàn bộ 100% tiền ký quỹ được tự động hoàn trả nguyên vẹn về ví khả dụng của Renter qua bút toán Sổ cái đảo, không thất thoát số dư, slot được mở lại `AVAILABLE`.

### 4. Luồng sự kiện chính (Main Flow - Chuẩn hóa theo BPMN Hình 1A & Hình 1B)

| Bước | Tác nhân | Hành động |
| :---: | :--- | :--- |
| **1** | Renter | Chọn tựa game, xem hồ sơ Companion và bấm nút "Thuê ngay". |
| **2** | Renter | Chọn khung giờ rảnh mong muốn từ danh sách slot khả dụng và xác nhận yêu cầu (`POST /api/bookings`). |
| **3** | Hệ thống | Kiểm tra tính khả dụng của slot và tạo bản ghi đơn đặt ban đầu với mã khóa yêu cầu `request_key`. |
| **4** | Hệ thống | Yêu cầu Renter tiến hành **Ký quỹ Escrow trước** (`POST /api/bookings/:id/hold-escrow`). |
| **5** | Sổ cái kép | Thực thi giao dịch nguyên tử: Ghi Nợ ví khả dụng của Renter và Ghi Có ví ký quỹ Escrow của Renter. Phương sai kiểm toán $\text{Variance} = 0$. |
| **6** | Hệ thống | Chuyển trạng thái đơn sang `WAITING_COMPANION_RESPONSE` (hoặc `PENDING_ACCEPTANCE`), chuyển slot sang `HELD`, kích hoạt đồng hồ đếm ngược **180 giây** (`response_deadline`). |
| **7** | Hệ thống | Gửi thông báo đẩy thời gian thực qua WebSocket đến tài khoản Companion kèm chuông cảnh báo. |
| **8** | Companion | Nhận thông báo, kiểm tra thời gian hẹn và bấm nút "Chấp nhận" trong vòng 180 giây (`POST /api/bookings/:id/accept`). |
| **9** | Hệ thống | Xác nhận đơn thành công: chuyển trạng thái đơn sang `ACCEPTED`, cập nhật slot thành `BOOKED`. |
| **10** | Hệ thống | Tự động khởi tạo phòng chơi (`Session`), sinh liên kết phòng chat/voice và gửi thông báo xác nhận cho cả hai bên. |

### 5. Các luồng thay thế và ngoại lệ (Alternative & Exception Flows)

#### Luồng 4a: Số dư khả dụng không đủ để ký quỹ
1. Tại Bước 4, hệ thống kiểm tra ví Renter phát hiện `available_balance < total_fee`.
2. Hệ thống từ chối bút toán ký quỹ với mã lỗi `INSUFFICIENT_BALANCE`.
3. Giao diện hiển thị modal hướng dẫn Renter nạp tiền nhanh qua chuyển khoản SePay QR.
4. Slot tạm thời được giữ trong 5 phút. Nếu Renter không nạp tiền, slot tự động mở lại cho người khác.

#### Luồng 8a: Companion từ chối đơn đặt lịch trong hạn 180 giây
1. Companion bấm nút "Từ chối" và nhập lý do từ chối (`POST /api/bookings/:id/reject`).
2. Hệ thống thực thi giao dịch Sổ cái đảo ngay lập tức: Ghi Nợ ví ký quỹ Escrow và Ghi Có trả lại 100% tiền vào ví khả dụng của Renter.
3. Đơn chuyển sang trạng thái `CANCELLED`, slot mở lại `AVAILABLE`.
4. Gửi thông báo cho Renter kèm lý do Companion từ chối.

#### Luồng 8b: Quá hạn 180 giây Companion không phản hồi (Timeout Auto-Refund)
1. Hết 180 giây, Companion không bấm Chấp nhận hay Từ chối.
2. Tiến trình nền `Booking Timeout Worker` (hoặc Renter kích hoạt kiểm tra quá hạn `POST /api/bookings/:id/timeout`) phát hiện `now > response_deadline`.
3. Hệ thống tự động hủy đơn và thực hiện bút toán hoàn trả 100% tiền ký quỹ về ví khả dụng của Renter.
4. Đơn chuyển sang `CANCELLED`, slot mở lại `AVAILABLE`.
5. Hệ thống gửi thông báo xin lỗi Renter và trừ 2 điểm TrustScore của Companion vì vi phạm không phản hồi đơn đúng hạn (Demo Policy).

---

## 6. Điểm khác biệt quan trọng giữa Bản chuẩn hóa này và Bản thảo UC gốc ban đầu

| Tiêu chí | Bản thảo UC gốc ban đầu (Draft sơ khai) | Bản chuẩn hóa hiện tại (Khớp BPMN Hình 1B & Code) | Lý do điều chỉnh & Cơ sở kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Thời điểm thanh toán / Ký quỹ** | Ghi "Renter thanh toán sau khi Companion chấp nhận đơn" hoặc "sau khi chơi xong". | **Ký quỹ Escrow trước** ngay khi đặt lịch (`hold-escrow`) trước khi gửi thông báo 180s cho Companion. | **Bảo vệ tuyệt đối cho Companion**: Tránh tình trạng Renter đặt lịch ảo giữ slot rồi bùng tiền khi Companion đã nhận đơn. Kích hoạt đếm ngược 180s gắn liền với cam kết tài chính thực tế. |
| **Cơ chế giữ tiền** | Ghi chung chung "trừ tiền vào tài khoản". | **Bút toán Sổ cái kép bất biến**: Chuyển số dư từ `AVAILABLE` sang `ESCROW_LOCKED` nội bộ trong ví Renter. | **Bảo toàn tổng tiền hệ thống (Variance = 0)**: Tiền không bao giờ bị trừ mất mà được giữ trong ví ký quỹ của Renter cho đến khi nghiệm thu hoặc phán quyết. |
| **Thời hạn phản hồi của Companion** | Không nêu rõ thời gian hoặc ghi 15 phút. | **Đúng 180 giây (3 phút)** có đồng hồ đếm ngược trực quan. | Khớp chuẩn thiết kế `INSTASQUAD_BPMN_TKHT.pdf` Hình 1A & 1B. Đảm bảo trải nghiệm tức thời cho người thuê. |
| **Cơ chế khi quá hạn 180s** | Chưa định nghĩa xử lý tiền ra sao. | **Tự động hủy đơn và hoàn trả 100% qua Sổ cái kép**, trừ nhẹ điểm uy tín Companion. | Triệt tiêu hoàn toàn rủi ro treo tiền của người thuê. |

# REFERENCE_MAPPING – INSTASQUAD

Ngày lập: 05/11/2026. Đồ án: nền tảng C2C thuê Companion chơi game, có Escrow và Sổ cái ghi kép.

## 0. Cách dùng file này (dành cho AI agent và người đọc)

1. Đây là bảng **ánh xạ cách vận hành (luồng thao tác, màn hình, bước)** của hai nền tảng tham chiếu là **Playerduo** và **Lita** sang INSTASQUAD.
2. **Chỉ có hai nguồn tham chiếu** cho phần vận hành: Playerduo và Lita. Không thêm nguồn khác khi chưa có yêu cầu mới.
3. **Quy tắc nghiệp vụ của nhóm** (mục 5) **giữ nguyên** theo Project Charter, tài liệu BPMN và Requirements. Các quy tắc này không cần tham chiếu và không được sửa theo hai nền tảng trên.
4. Mỗi dòng có cột "Loại", gồm ba giá trị:
   - **Lấy theo nguồn**: làm đúng cách vận hành của nguồn.
   - **Nhóm phát triển thêm**: nguồn không có, nhóm tự bổ sung. Được phép làm, nhưng phải ghi rõ là phần mở rộng.
   - **Khác nguồn**: nhóm cố ý làm khác. Phải ghi lý do trong báo cáo.
5. Nguồn nào có độ tin cậy thấp thì không được trình bày như sự thật chắc chắn. Với chi tiết không có nguồn, ghi **"CHƯA XÁC MINH"**, không tự suy ra.
6. Khi code hoặc sửa giao diện, mỗi tính năng thuộc luồng trong file này phải ghi chú ID dòng (ví dụ `REF-TOPUP-02`) vào comment hoặc tài liệu.

## 1. Nguồn tham chiếu

| Mã | Nguồn | Loại | Độ tin cậy | Truy cập |
|---|---|---|---|---|
| L1 | Lita – Điều khoản dịch vụ, mục 6 "Buying and Selling Peer-to-peer Services": https://www.lita.gg/vi/terms-of-service | Tài liệu chính thức | Cao | 05/11/2026 |
| L2 | Lita – About us: https://www.lita.gg/about-us | Tài liệu chính thức | Cao | 05/11/2026 |
| L3 | Codashop – Lita (Official Distributor): https://app.codashop.com/en-ph/lita | Nhà phân phối chính thức | Trung bình – cao | 05/11/2026 |
| L4 | Thế Giới Di Động – Cách đăng ký tài khoản Lita: https://www.thegioididong.com/game-app/cach-dang-ky-tai-khoan-lita-1386614 | Báo công nghệ | Trung bình | 05/11/2026 |
| L5 | Xemgame – Giới thiệu Lita: https://www.xemgame.com/lay-lai-cam-hung-choi-game-nho-ung-dung-lita-dong-hanh-choi-game-post427381.html và https://www.xemgame.com/cac-nen-tang-tim-kiem-nguoi-choi-game-cung-tot-nhat-hien-nay-post431395.html | Báo ngoài | Trung bình | 05/11/2026 |
| P1 | Playerduo: https://playerduo.vn/ | Trang chính thức (chỉ mô tả dịch vụ) | Cao nhưng ít chi tiết | 05/11/2026 |
| P2 | Hoàng Hà Mobile – Hướng dẫn tải và nạp tiền PlayerDuo (cập nhật 2026): https://hoanghamobile.com/tin-tuc/playerduo-2/ | Báo công nghệ | Trung bình | 05/11/2026 |
| P3 | Sforum – Cách thuê người trên PlayerDuo: https://cellphones.com.vn/sforum/tai-playerduo-ung-dung-mang-xa-hoi-cho-streamer-game-thu | Báo công nghệ | Trung bình | 05/11/2026 |
| P4 | MindMeister – Sơ đồ Playerduo: https://www.mindmeister.com/754023687/playerduo | Do cá nhân vẽ, có vẻ đã cũ | Thấp, chỉ tham khảo | 05/11/2026 |

Ghi chú: toàn văn L1 được chụp màn hình bởi nhóm vào 05/11/2026 và lưu trong thư mục `docs/evidence/` (cần bổ sung ảnh chụp). Phần Playerduo chủ yếu dựa vào báo ngoài; nếu có thể, nhóm chụp thêm màn hình thật trong ứng dụng.

## 2. Luồng nạp tiền vào ví

| ID | Bước của INSTASQUAD | Lita | Playerduo | Loại | Ghi chú triển khai |
|---|---|---|---|---|---|
| REF-TOPUP-01 | Vào "Ví", bấm "Nạp tiền" | Có nút "Nạp Xu" trên trang web (L1, ảnh chụp) | Có mục "Nạp tiền" trong ứng dụng (P2) | Lấy theo nguồn | Nút luôn hiện ở ví và ở thanh trên |
| REF-TOPUP-02 | Chọn hạn mức nạp | Chọn giá trị gói xu có mệnh giá cố định (L3) | Nguồn chỉ nói chọn phương thức, không nói mệnh giá | Lấy theo nguồn (mốc nhanh) | Hiện các mốc nhanh, ví dụ 100.000đ, 200.000đ, 500.000đ |
| REF-TOPUP-03 | Nhập số tiền mong muốn | Không có trong nguồn | Không có trong nguồn | Nhóm phát triển thêm | Ô nhập tự do, có tối thiểu và tối đa; khi đặt lịch thiếu tiền thì tự điền số còn thiếu (Hình 1A bước 6) |
| REF-TOPUP-04 | Chọn phương thức thanh toán | Chọn phương thức ở bước thanh toán (L3) | Thẻ, ví điện tử (MoMo, ZaloPay, ViettelPay), chuyển khoản ngân hàng (P2) | Lấy theo nguồn | Hỗ trợ QR chuyển khoản và ví điện tử mô phỏng |
| REF-TOPUP-05 | Hiện mã QR và đồng hồ hết hạn | Không có trong nguồn | Với ví điện tử, chuyển sang trang thanh toán của ví để xác nhận (P2) | Nhóm phát triển thêm (QR) | Mã QR kèm số tiền và nội dung duy nhất; đếm ngược; ghi rõ trong báo cáo là phần mở rộng |
| REF-TOPUP-06 | Cổng báo kết quả, số dư tự cập nhật | Xu được cộng ngay sau khi thanh toán (L3) | Ứng dụng tự cập nhật số dư sau khi hoàn tất (P2) | Lấy theo nguồn | Cập nhật không cần tải lại trang; đẩy sự kiện qua WebSocket là phần phát triển thêm |
| REF-TOPUP-07 | Xem lịch sử nạp tiền và chi tiết | Có ví tài khoản (L1) | Mục "Lịch sử giao dịch" gồm thời gian, số tiền, phương thức; chi tiết có mã giao dịch và trạng thái (P2) | Lấy theo nguồn | Mỗi dòng gắn với bút toán trong Sổ cái |
| REF-TOPUP-08 | Giao dịch lỗi hoặc không khớp | Không có trong nguồn | Liên hệ hỗ trợ kèm mã giao dịch, thời gian, số tiền (P2) | Lấy theo nguồn | Nút "Báo lỗi giao dịch" gửi kèm mã; tự tạo cảnh báo cho Auditor là phần phát triển thêm |

Lưu ý: P2 và P4 mô tả phương thức nạp hơi khác nhau (P4 nhắc thẻ cào, ATM, PayPal/Visa). Ưu tiên P2 vì mới hơn.

## 3. Các luồng vận hành khác

| ID | Luồng INSTASQUAD | Lita | Playerduo | Loại | Ghi chú |
|---|---|---|---|---|---|
| REF-AUTH-01 | Đăng ký tài khoản | Số điện thoại và mã OTP 4 số (L4) | Đăng nhập bằng Facebook (P4) | Khác nguồn | Nhóm dùng email có xác minh; ghi rõ là lựa chọn của nhóm |
| REF-AUTH-02 | Giới hạn tuổi | Người mua phải đủ 18 tuổi; dưới 18 không được làm Seller (L1) | Không có trong nguồn | Lấy theo nguồn | Thêm ô xác nhận "Tôi đủ 18 tuổi" khi đăng ký |
| REF-PROF-01 | Hồ sơ cá nhân | Nickname, tiểu sử, ảnh, giới tính, ghi âm giới thiệu, ngày sinh (L4) | Cập nhật hồ sơ, số điện thoại, email (P4) | Lấy theo nguồn | Thêm ghi âm giọng giới thiệu cho Companion |
| REF-COMP-01 | Đăng ký làm Companion | Người dùng đã đăng ký phải nộp đơn để thành Seller; đơn miễn phí (L1) | Có bước đăng ký trở thành Player (P4) | Lấy theo nguồn | eKYC và Admin duyệt hồ sơ là phần nhóm phát triển thêm |
| REF-COMP-02 | Companion đặt giá và số giờ tối đa | Hồ sơ Seller theo từng game, có nút "Order Now" (L1) | Player tự đặt giá theo giờ và số giờ tối đa (P4) | Lấy theo nguồn | Giá lưu theo đơn vị VND mỗi giờ |
| REF-FIND-01 | Tìm và chọn Companion | Danh sách theo game, hiện trình độ và đánh giá người đã chơi (L5) | Xem thông tin, ưu điểm, giá theo giờ (P3) | Lấy theo nguồn | Lọc theo rank và TrustScore là phần phát triển thêm |
| REF-ORDER-01 | Đặt đơn, trả tiền trước | Người mua trả trước để tạo đơn (L1) | Chọn Player, thanh toán rồi mới kết nối (P4) | Lấy theo nguồn | Ứng với Hình 1A |
| REF-ORDER-02 | Companion nhận hoặc từ chối | Seller được chọn nhận hoặc từ chối (L1) | Player nhận thông báo web và SMS rồi bấm Accept (P4) | Lấy theo nguồn | Ứng với Hình 1B; đếm ngược 180 giây là luật của nhóm |
| REF-CHAT-01 | Chat và voice trong phiên | Voice chat trong ứng dụng (L5) | Kết nối qua phòng chat (P4) | Lấy theo nguồn | Bộ lọc che thông tin liên hệ là phần phát triển thêm |
| REF-DONE-01 | Hoàn tất đơn | Seller bấm "Order Complete" (L1) | Không có trong nguồn | Khác nguồn | INSTASQUAD để Renter nghiệm thu; ghi chú trong báo cáo |
| REF-CANCEL-01 | Hủy đơn | Hủy vì bất kỳ lý do nào thì tiền về ví người mua; hủy nhiều có thể ảnh hưởng uy tín (L1) | Bên thuê có thể chủ động chấm dứt và đánh giá (P3) | Lấy theo nguồn (hoàn về ví) | Các mốc hoàn tiền là luật của nhóm, xem mục 5 |
| REF-DISP-01 | Khiếu nại | Người mua có 48 giờ phản đối; nếu nền tảng thấy chưa hoàn thành thì tiền trả lại người mua (L1) | Không có trong nguồn | Lấy theo nguồn (nền tảng quyết định) | Đóng băng tiền, CS Agent, tỷ lệ lỗi là luật của nhóm |
| REF-REVIEW-01 | Đánh giá hai chiều | Có đánh giá của người đã chơi (L5) | Chế độ đánh giá cho cả user và player (P4) | Lấy theo nguồn | TrustScore là phần phát triển thêm |
| REF-WDRAW-01 | Rút tiền của Companion | Chỉ rút được khi đơn đã hoàn thành; có thể tạm khóa rút vì an ninh; Seller uy tín có thể được rút sớm (L1) | Player cài tài khoản ngân hàng rồi rút tiền (P4) | Lấy theo nguồn | Admin duyệt hoặc từ chối; từ chối thì sinh bút toán hoàn |
| REF-FUND-01 | Tiền giữ ở bên thứ ba | Lita là bên thu hộ có giới hạn, tiền đi qua đối tác dịch vụ thanh toán (L1) | Không có trong nguồn | Lấy theo nguồn | Tiền nằm ở đối tác; Sổ cái chỉ ghi nghiệp vụ |

## 4. Những điểm khác nguồn (cần ghi trong báo cáo)

1. **Ai xác nhận hoàn tất:** Lita để Seller xác nhận rồi người mua có 48 giờ phản đối. INSTASQUAD để Renter nghiệm thu trong 15 phút, quá hạn thì tự động nghiệm thu. Lý do: phiên chơi ngắn, tiền của Companion không bị treo lâu.
2. **Thời gian chờ khi rút tiền:** Lita có thời gian chờ an toàn 7 ngày (L1). INSTASQUAD chưa áp dụng. Có thể bổ sung sau.
3. **Thuế:** Lita quy định Seller tự chịu thuế và giá hiển thị đã gồm thuế (L1). Tài liệu pháp lý của nhóm ghi sàn khấu trừ và nộp thay. Hai cách khác nhau.
4. **Mã QR:** không có trong hai nguồn, là phần nhóm phát triển thêm.
5. **Đăng ký bằng email:** Lita dùng số điện thoại và OTP, Playerduo dùng Facebook.

## 5. Quy tắc nghiệp vụ của nhóm (giữ nguyên, không tham chiếu hai nền tảng)

Nguồn là Project Charter, tài liệu BPMN (Hình 1A đến 2C) và Requirements của nhóm.

- Companion có 180 giây để trả lời; quá hạn thì hủy, hoàn 100% và trừ 3 điểm tín nhiệm.
- Hủy trước giờ hẹn: còn từ 30 phút hoàn 100%; còn 10 đến 29 phút hoàn 70% cho Renter và 30% cho Companion; còn dưới 10 phút phạt theo quy tắc.
- Mỗi Companion nhận tối đa 10 giờ mỗi ngày.
- Giữ chỗ khung giờ tạm thời để chống đặt trùng; mã chống gửi lặp cho yêu cầu đặt lịch và nạp tiền.
- Nghiệm thu trong 15 phút; quá hạn tự động nghiệm thu.
- Giải ngân 88% cho Companion và 12% cho nền tảng, ghi đối ứng trong một lần xử lý.
- Khiếu nại: đóng băng tiền ngay; lỗi của Companion từ 80% trở lên thì hoàn 100% cho Renter và phạt Companion 20%; dưới 80% thì giải ngân 88/12.
- Công thức TrustScore và ngưỡng tạm khóa dưới 40 điểm.
- Số dư chỉ thay đổi qua bút toán ghi kép; tổng ghi nợ bằng tổng ghi có.

Các mục trước đây chờ quyết định trong tài liệu (chia khoản phạt dưới 10 phút, phạt 20% trừ ví nào, lỗi từ 1% đến 79%, hạn nộp bổ sung bằng chứng, thử lại giải ngân lỗi) đã được **NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định (D21–D27)**, là quy tắc nghiệp vụ nội bộ của nhóm, độc lập với nguồn tham chiếu.

## 6. Việc cần kiểm tra khi hoàn thiện

- [ ] Mỗi tính năng thuộc mục 2 và 3 đã có comment hoặc tài liệu ghi ID dòng tương ứng.
- [ ] Ảnh chụp trang L1 (mục 6) đã lưu trong `docs/evidence/`.
- [ ] Ảnh chụp màn hình nạp tiền thực tế của Playerduo hoặc Lita (nếu có) đã bổ sung.
- [ ] Những chỗ "Khác nguồn" ở mục 4 đã được viết vào báo cáo.

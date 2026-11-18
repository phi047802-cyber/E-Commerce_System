# TÀI LIỆU TRÍCH DẪN NỘI DUNG THAM CHIẾU NGUYÊN VĂN (REF_EXCERPTS)

- **Đồ án**: INSTASQUAD — Nền tảng E-Commerce C2C Thuê Companion Chơi Game
- **Ngày kiểm chứng**: 06/11/2026 (Cập nhật chuẩn hóa: 07/11/2026)
- **Kho lưu trữ tệp gốc**: Toàn bộ trang HTML gốc đã tải về lưu trữ tại thư mục `docs/evidence/raw_pages/` (`L1.html`, `L2.html`, `L3.html`, `L4.html`, `L5a.html`, `L5b.html`, `P2.html`, `P3.html`, `P4.html`).
- **Quy tắc trích dẫn**: Mỗi câu trích dẫn nguyên văn không quá 15 từ, đặt trong dấu ngoặc kép `"..."`, là chuỗi con liên tục của tệp nguồn (sau khi chuẩn hóa khoảng trắng), tuyệt đối không dùng `"..."` để chắp vá hai đoạn và không tự ý sửa chữ.
- **Quy tắc tính trung thực**: Nếu nội dung trang web không đề cập hoặc khác biệt so với mô tả tham chiếu, ghi rõ **"KHÔNG KHỚP"** hoặc **"CHƯA KIỂM CHỨNG ĐƯỢC"**, tuyệt đối không tự diễn giải thay thế.

---

## 1. Bảng 28 dòng tham chiếu chuẩn hóa kèm tệp nguồn, vị trí và trích dẫn nguyên văn

| Mã REF | Bước của INSTASQUAD | Nguồn tham chiếu | Tệp raw_pages & Vị trí mục | Câu trích nguyên văn ($\le 15$ từ) | Kết quả kiểm chứng |
|:---|:---|:---|:---|:---|:---:|
| **REF-TOPUP-01** | Vào Ví, bấm Nạp tiền | Lita (Ảnh giao diện)<br><br>Playerduo (P2) | docs/evidence/lita_nap_xu.png (không có trên đĩa)<br><br>P2.html, Mục Cách nạp tiền vào PlayerDuo | *Không có file ảnh trên đĩa; văn bản L1 không có chữ Nạp Xu*<br><br>`"tìm đến mục “Nạp tiền”"` | **CHƯA KIỂM CHỨNG ĐƯỢC** (Ảnh Lita)<br><br>**KHỚP** (P2) |
| **REF-TOPUP-02** | Chọn hạn mức nạp | Lita (L3 Codashop)<br><br>Playerduo (P2) | L3.html, Mục Select Recharge<br><br>P2.html, Mục Các phương thức | `"Select Recharge"` và `"110 Lita Coin"`<br><br>*Không có trong nguồn (P2 chỉ nói chọn phương thức nạp, không có gói)* | **KHỚP** (L3)<br><br>*(Đúng theo bảng)* |
| **REF-TOPUP-03** | Nhập số tiền mong muốn | Cả hai nguồn (Lita & Playerduo) | Không có trong L1.html, L3.html, P2.html, P4.html | *Không có trong nguồn (tính năng ô nhập tự do kèm min 10k, max 50M là nhóm phát triển thêm)* | **KHÔNG KHỚP** (Nhóm phát triển thêm) |
| **REF-TOPUP-04** | Chọn phương thức thanh toán | Lita (L3 Codashop)<br><br>Playerduo (P2) | L3.html, Mục Select Payment<br><br>P2.html, Mục Các phương thức | `"Pay conveniently using Codacash PH, Globe, GCash"`<br><br>`"như thẻ tín dụng/thẻ ghi nợ, ví điện tử"` | **KHỚP** (L3)<br><br>**KHỚP** (P2) |
| **REF-TOPUP-05** | Hiện mã QR và đồng hồ hết hạn | Lita<br><br>Playerduo (P2) | Không có trong Lita<br><br>P2.html, Mục Xác nhận nạp | *Không có trong nguồn*<br><br>`"chuyển hướng đến trang thanh toán của ví để xác nhận giao dịch"` | **KHÔNG KHỚP** (Nhóm phát triển thêm mã QR động)<br><br>**KHỚP** (P2 chuyển trang ví) |
| **REF-TOPUP-06** | Cổng báo kết quả, số dư tự cập nhật | Lita (L3 Codashop)<br><br>Playerduo (P2) | L3.html, Mục Confirmation<br><br>P2.html, Mục Hoàn tất | `"the Lita Coin will be added immediately to your Lita account"`<br><br>`"ứng dụng sẽ tự động cập nhật số dư"` | **KHỚP** (L3)<br><br>**KHỚP** (P2) |
| **REF-TOPUP-07** | Xem lịch sử nạp tiền và chi tiết | Lita (L1 Terms)<br><br>Playerduo (P2) | L1.html, Mục 6<br><br>P2.html, Mục Lịch sử | `"returned to the Buyer's account wallet"`<br><br>`"tìm đến mục “Lịch sử giao dịch”"` | **KHỚP** (L1 có ví)<br><br>**KHỚP** (P2) |
| **REF-TOPUP-08** | Giao dịch lỗi hoặc không khớp | Lita<br><br>Playerduo (P2) | Không có trong Lita<br><br>P2.html, Mục Lưu ý nạp tiền | *Không có trong nguồn*<br><br>`"hãy liên hệ với bộ phận hỗ trợ khách hàng"` | **KHỚP** (P2) |
| **REF-AUTH-01** | Đăng ký tài khoản | Lita (L1 Terms Mục 3)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 3<br><br>P4.html, Nhánh User | `"your date of birth, username, and password"`<br><br>`"Đăng ký tài khoản hoặc đăng nhập bằng FB"` | **KHỚP** (L1 Mục 3 có email, ngày sinh, tên người dùng, mật khẩu; INSTASQUAD có đủ) |
| **REF-AUTH-02** | Giới hạn tuổi $\ge 18$ | Lita (L1 Terms) | L1.html, Mục 2 & Mục 6 | `"only if you are eighteen (18) years of age or older"` | **KHỚP** (L1) |
| **REF-AUTH-03** | Đăng nhập bên thứ ba (Google OAuth2) | Lita (L1 Terms Mục 5)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 5<br><br>P4.html, Nhánh User | `"register and log on to Our Services via certain third-party services"`<br><br>`"đăng nhập bằng FB"` | **KHỚP** (Tùy chọn; môi trường học thuật ẩn an toàn khi thiếu env) |
| **REF-ACC-01** | Cấm bán hoặc chia sẻ tài khoản | Lita (L1 Terms Mục 3) | L1.html, Mục 3 | `"you may not sell, rent, lease, share or provide access to your account"` | **KHỚP** (L1) |
| **REF-MOD-01** | Khóa tài khoản vi phạm | Lita (L1 Terms Mục 11) | L1.html, Mục 11 | `"We reserve the right, without notice and at Our sole discretion, to terminate"` | **KHỚP** (Khóa tự động khi TrustScore < 40 và khóa thủ công bởi Admin) |
| **REF-PROF-01** | Hồ sơ cá nhân Companion | Lita (L4 TGDĐ & L5b Xemgame)<br><br>Playerduo (P4 MindMeister) | L4.html & L5b.html<br><br>P4.html, Nhánh Profile | `"Nickname để chỉnh tên tài khoản"`, `"tiểu sử"`, `"thể hiện bởi chính giọng nói của người đồng hành đó"`<br><br>`"Cập nhật profile"` và `"Thông tin cá nhân"` | **KHỚP** (L4, L5b, P4)<br>*(L4 không có giới tính; ghi âm nằm ở L5b)* |
| **REF-COMP-01** | Đăng ký làm Companion / Seller | Lita (L1 Terms)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 6<br><br>P4.html, Nhánh Player | `"Applications to become a Seller are free"`<br><br>`"Đăng ký trở thành Player"` | **KHỚP** (L1)<br><br>**KHỚP** (P4) |
| **REF-COMP-02** | Companion đặt giá và số giờ tối đa | Lita (L1 Terms)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 6<br><br>P4.html, Nhánh Player Settings | `"found on Seller's Game profiles"`<br><br>`"Set phí thuê theo giờ & số giờ có thể thuê tối đa"` | **KHỚP** (L1)<br><br>**KHỚP** (P4) |
| **REF-FIND-01** | Tìm và chọn Companion | Lita (L5b Xemgame)<br><br>Playerduo (P3 Sforum) | L5b.html, Đoạn 2<br><br>P3.html, Đoạn 4 | `"tìm kiếm đồng hành để sát cánh trong trò chơi"`<br><br>`"Xem thông tin, các ưu điểm và giá tiền thuê"` | **KHỚP** (L5b)<br><br>**KHỚP** (P3) |
| **REF-ORDER-01** | Đặt đơn, trả tiền trước (Ký quỹ Escrow) | Lita (L1 Terms)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 6<br><br>P4.html, Nhánh Booking | `"Buyers pay Us in advance to create an order"`<br><br>`"thanh toán phí thuê -> kết nối với player qua phòng chat"` | **KHỚP** (L1)<br><br>**KHỚP** (P4) |
| **REF-ORDER-02** | Companion nhận hoặc từ chối | Lita (L1 Terms)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 6<br><br>P4.html, Nhánh Acceptance | `"Seller may choose to accept or decline the order"`<br><br>`"Player nhận được thông báo"` và `"Player Accept"` | **KHỚP** (L1)<br><br>**KHỚP** (P4) |
| **REF-CHAT-01** | Chat và voice trong phiên | Lita (L5b Xemgame)<br><br>Playerduo (P4 MindMeister) | L5b.html, Đoạn 3<br><br>P4.html, Nhánh Chat | `"tính năng hỗ trợ trò chuyện bằng giọng nói"`<br><br>`"kết nối với player qua phòng chat"` | **KHỚP** (L5b)<br><br>**KHỚP** (P4) |
| **REF-DONE-01** | Hoàn tất đơn | Lita (L1 Terms) | L1.html, Mục 6 | `"confirm completion of the order via the Order Complete button"` | **KHÁC NGUỒN** (Mô tả đúng nguồn; INSTASQUAD chủ ý để Renter nghiệm thu 15m) |
| **REF-CANCEL-01** | Hủy đơn & Hoàn tiền | Lita (L1 Terms)<br><br>Playerduo (P3 Sforum) | L1.html, Mục 6<br><br>P3.html, Đoạn 5 | `"funds paid will be returned to the Buyer's account wallet"`<br><br>`"chủ động chấm dứt hợp đồng thuê"` | **KHỚP** (L1 hoàn tiền về ví)<br><br>**KHỚP MỘT PHẦN** (P3 chỉ có chấm dứt, không có từ hoàn tiền) |
| **REF-DISP-01** | Khiếu nại (Dispute RMA) | Lita (L1 Terms) | L1.html, Mục 6 | `"the Buyer will have 48 hours to dispute the completed status"` | **KHỚP** (L1) |
| **REF-REVIEW-01** | Đánh giá hai chiều | Lita (L5a Xemgame)<br><br>Playerduo (P4 MindMeister) | L5a.html, Đoạn 5<br><br>P4.html, Nhánh Rating | `"đánh giá của những người đã chơi cùng đồng hành đó"`<br><br>`"Chế độ đánh giá dành cho user và player"` | **KHỚP** (L5a)<br><br>**KHỚP** (P4) |
| **REF-WDRAW-01** | Rút tiền của Companion | Lita (L1 Terms)<br><br>Playerduo (P4 MindMeister) | L1.html, Mục 6<br><br>P4.html, Nhánh Withdraw | `"Withdrawal of funds is only made available once an order is marked as complete"`<br><br>`"Cài đặt tài khoản ngân hàng"` và `"Rút tiền"` | **KHỚP** (L1)<br><br>**KHỚP** (P4) |
| **REF-WDRAW-02** | Chờ an toàn 7 ngày trước khi rút | Lita (L1 Terms) | L1.html, Mục 6 | `"before the standard 7 days safety clearance period"` | **KHÁC NGUỒN** (Lita chờ 7 ngày; INSTASQUAD Companion tạo yêu cầu rút, Admin duyệt/từ chối, từ chối thì hoàn bút toán) |
| **REF-TAX-01** | Nghĩa vụ thuế của Companion | Lita (L1 Terms) | L1.html, Mục 6 | `"Sellers are responsible for paying any direct or indirect taxes"` | **KHÁC NGUỒN** (Lita để Seller tự chịu thuế; INSTASQUAD định hướng sàn khấu trừ và nộp thay theo Nghị định 117/2025, chưa làm trong demo) |
| **REF-FUND-01** | Tiền giữ ở bên thứ ba / Escrow | Lita (L1 Terms) | L1.html, Mục 6 | `"appointed as a limited authorized payment collection agent"` | **KHỚP** (L1)<br>*(Sổ cái ghi kép là phần nhóm phát triển thêm, loại bỏ đối chiếu P4)* |

---

## 2. Ghi chú kiểm tra các điểm nghi ngờ sai nguồn

1. **`L1.html` Mục 6 vs Mục 7**:
   - Mục 6 có tiêu đề chính xác: **"Buying and Selling Peer-to-peer Services"** (chứa toàn bộ quy định về trả trước, tạo đơn, xác nhận hoàn thành, hủy đơn, hoàn tiền về ví, khiếu nại trong 48 giờ, rút tiền và vai trò đại lý thu hộ có giới hạn).
   - Mục 7 có tiêu đề: **"Modification of These Terms"** (chỉ quy định quyền sửa đổi điều khoản của sàn, hoàn toàn không có quy định ký quỹ hay escrow). Nhóm khẳng định trích dẫn chuẩn xác theo Mục 6.
2. **`L2.html` (About Us)**:
   - File `L2.html` chỉ là trang giới thiệu sứ mệnh công ty ("Find an ideal teammate to play games together", "Apply Free at Lita App"). Trang này **không chứa bất kỳ điều khoản khiếu nại, tranh chấp hay RMA nào**. Toàn bộ căn cứ khiếu nại của Lita thuộc về `L1.html` Mục 6.
3. **`P2.html` (Hoàng Hà Mobile)**:
   - File `P2.html` là bài viết hướng dẫn tải ứng dụng và nạp tiền PlayerDuo. Trang này **chỉ nói về nạp tiền và tra cứu lịch sử giao dịch**, tuyệt đối **không nói về quy trình rút tiền**. Căn cứ rút tiền của Playerduo dựa trên sơ đồ nhánh `P4.html` ("Cài đặt tài khoản ngân hàng", "Rút tiền").
4. **`docs/evidence/lita_nap_xu.png` (Ảnh nạp tiền Lita)**:
   - File ảnh này hiện **không có trên đĩa** repo; nhóm ghi nhận đúng thực tế là **"CHƯA KIỂM CHỨNG ĐƯỢC"** và xếp độ tin cậy ở mức **THẤP**. Các bước nạp tiền chi tiết của `REF-TOPUP` được đối chiếu dựa trên `L3.html` (Codashop) và `P2.html`.
5. **`REF-FUND-01` & Sổ cái ghi kép (Double-Entry Ledger)**:
   - `REF-FUND-01` chỉ dựa trên `L1.html` Mục 6 quy định Lita đóng vai trò đại lý thu hộ có giới hạn ("limited authorized payment collection agent").
   - MindMeister `P4.html` chỉ là sơ đồ luồng tổng quan, **hoàn toàn không đề cập đến Sổ cái ghi kép hay hạch toán kế toán**.
   - Do đó, nhóm loại bỏ hoàn toàn cụm từ "đối chiếu P4" đối với sổ cái ghi kép; chuyển toàn bộ kiến trúc **Sổ cái ghi kép (Double-Entry Ledger)** vào danh mục **"Nhóm phát triển thêm, không có tham chiếu"** (áp dụng nguyên tắc kế toán tài chính bất biến $\sum \text{Debit} \equiv \sum \text{Credit}$).

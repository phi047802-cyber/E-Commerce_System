# BẢNG ÁNH XẠ THAM CHIẾU VẬN HÀNH HỆ THỐNG INSTASQUAD
## Đối chiếu luồng vận hành với hai nền tảng thực tế: Playerduo & Lita

## 0. Quyết định nguyên tắc và phạm vi tham chiếu (05/11/2026)

> [!IMPORTANT]
> **Quyết định ngày 05/11/2026 của nhóm**:
> 1. Nhóm thống nhất **chỉ sử dụng HAI nguồn tham chiếu vận hành chính là Playerduo (Việt Nam) và Lita (Quốc tế/Đông Nam Á)** cho toàn bộ đề tài. Các case study khác (Upwork, Stripe, Epic Games, Airbnb, Fiverr, Grab, Uber) chuyển xuống phần Phụ lục để tham khảo kỹ thuật mở rộng, không làm nguồn đối chiếu chính.
> 2. **Hai nguồn trên CHỈ dùng để tham khảo LUỒNG VẬN HÀNH VÀ THAO TÁC NGƯỜI DÙNG** (luồng nạp tiền, tạo tài khoản, đăng ký companion, đặt lịch, chat, khiếu nại, rút tiền).
> 3. **Toàn bộ QUY TẮC NGHIỆP VỤ CỐT LÕI VÀ THÔNG SỐ TÀI CHÍNH của INSTASQUAD là BẤT BIẾN**, do nhóm tự xây dựng theo Project Charter và BPMN đề bài, hoàn toàn độc lập và không phụ thuộc vào hai nền tảng trên:
>    - Phản hồi đơn trong **180 giây** (quá hạn hủy tự động, trừ 3 điểm TrustScore).
>    - Bậc thang hủy đơn: $\ge 30$ phút hoàn 100%, 10–29 phút hoàn 70% Renter / 30% Companion, $< 10$ phút phạt 100% (chia 88/12).
>    - Phân chia doanh thu **88% Companion / 12% Nền tảng** (thuật toán làm tròn số nguyên không mất 1 đồng).
>    - Thời hạn nghiệm thu **15 phút** (hết 15 phút tự động nghiệm thu giải ngân).
>    - Khiếu nại lỗi $\ge 80\%$ hoàn 100% Renter, phạt 20% Companion nộp về nền tảng (ghi nợ `PENALTY_DEBT`, ví không bao giờ âm).
>    - Giới hạn làm việc **tối đa 10 giờ/ngày** theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7).
>    - Thuật toán **TrustScore [0, 100]**, tạm khóa khi $< 40$.
>    - Bất biến **Sổ cái ghi kép (Double-Entry Ledger)**: $\sum \text{Debit} \equiv \sum \text{Credit}$, bảo toàn phương trình tiền tệ $\text{Variance} \equiv 0$.
>    - **FR-006 (WebRTC Voice Call & CallLog)**: Tín hiệu thoại 1-1 WebRTC qua WebSocket và CallLog được kiểm thử tự động toàn diện tại `webrtc_voice_signaling.test.ts`; hướng dẫn thử tay cuộc gọi thoại thật giữa 2 tab trình duyệt có trong `DEMO_SCRIPT.md`; bộ kiểm tra tự động `ui:smoke` đảm bảo tính toàn vẹn giao diện.

---

## 1. Nguồn tham chiếu vận hành chính

| Mã | Nguồn | Loại tài liệu | Độ tin cậy | Trạng thái truy cập (06/11/2026) | Ghi chú kiểm tra |
|---|---|---|---|---|---|
| **L1** | Lita – Điều khoản dịch vụ, mục 6 "Buying and Selling Peer-to-peer Services": https://www.lita.gg/vi/terms-of-service | Tài liệu chính thức | Cao | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; đã đối chiếu và trích xuất câu từ văn bản tại `docs/evidence/REF_EXCERPTS.md`. Lưu trữ mã nguồn tại `docs/evidence/raw_pages/L1.html`. |
| **L2** | Lita – About us: https://www.lita.gg/about-us | Tài liệu chính thức | Cao | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; mô tả mô hình kết nối người chơi game đồng hành. Lưu trữ tại `docs/evidence/raw_pages/L2.html`. |
| **L3** | Codashop – Lita (Official Distributor): https://app.codashop.com/en-ph/lita | Nhà phân phối chính thức | Trung bình – cao | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; lưu trữ tại `docs/evidence/raw_pages/L3.html`. *Ghi chú quan trọng*: Đây là trang Codashop Philippines (tiền tệ PHP - peso), nhóm **chỉ tham khảo luồng thao tác chọn gói nạp cố định và các bước thanh toán**, không áp dụng mệnh giá peso vào hệ thống (INSTASQUAD sử dụng VNĐ). |
| **L4** | Thế Giới Di Động – Cách đăng ký tài khoản Lita: https://www.thegioididong.com/game-app/cach-dang-ky-tai-khoan-lita-1386614 | Báo công nghệ | Trung bình | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; khớp quy trình đăng ký SĐT/OTP, nickname, tiểu sử, ngày sinh (không có giới tính & voice). Lưu trữ tại `docs/evidence/raw_pages/L4.html`. |
| **L5** | Xemgame – Giới thiệu Lita: https://www.xemgame.com/lay-lai-cam-hung-choi-game-nho-ung-dung-lita-dong-hanh-choi-game-post427381.html và https://www.xemgame.com/cac-nen-tang-tim-kiem-nguoi-choi-game-cung-tot-nhat-hien-nay-post431395.html | Báo ngoài | Trung bình | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; khớp mô tả voice chat in-app, mini-voice trang cá nhân và đánh giá bạn chơi. Lưu trữ tại `docs/evidence/raw_pages/L5a.html`, `L5b.html`. |
| **P1** | Playerduo: https://playerduo.vn/ | Trang web chính thức | Cao nhưng ít chi tiết | **CHƯA XÁC MINH (403/SSL ERR)** | Máy chủ LiteSpeed/Hostinger chặn truy cập tự động từ xa (403 Forbidden / SSL Handshake Error). Cần người dùng mở trình duyệt kiểm tra thủ công; giữ nguyên trạng thái chưa xác minh. |
| **P2** | Hoàng Hà Mobile – Hướng dẫn tải và nạp tiền PlayerDuo (cập nhật 2026): https://hoanghamobile.com/tin-tuc/playerduo-2/ | Báo công nghệ | Trung bình | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; khớp nạp tiền qua ví điện tử, chuyển khoản, lịch sử giao dịch và liên hệ hỗ trợ. Lưu trữ tại `docs/evidence/raw_pages/P2.html`. |
| **P3** | Sforum – Cách thuê người trên PlayerDuo: https://cellphones.com.vn/sforum/tai-playerduo-ung-dung-mang-xa-hoi-cho-streamer-game-thu | Báo công nghệ | Trung bình | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; khớp thuê streamer giá hợp lý, chủ động chấm dứt hợp đồng (không có từ hoàn tiền). Lưu trữ tại `docs/evidence/raw_pages/P3.html`. |
| **P4** | MindMeister – Sơ đồ Playerduo: https://www.mindmeister.com/754023687/playerduo | Sơ đồ tư duy cá nhân | Thấp, chỉ tham khảo | **Đã kiểm tra truy cập (200 OK)** | Đã kiểm tra truy cập HTTP 200; khớp sơ đồ luồng đăng nhập FB, phòng chat, accept, đặt giá/giờ tối đa, rút tiền, đánh giá 2 chiều. Lưu trữ tại `docs/evidence/raw_pages/P4.html`. |

*Lưu ý: P2 và P4 mô tả phương thức nạp hơi khác nhau (P4 nhắc thẻ cào, ATM, PayPal/Visa; P2 cập nhật ví điện tử và chuyển khoản). Nhóm ưu tiên tham chiếu P2 vì phản ánh thực tế giao dịch mới nhất.*

---

## 2. Luồng nạp tiền vào ví

> [!NOTE]
> **Độ chính xác nguồn nạp tiền (REF-TOPUP)**:
> - Tệp `docs/evidence/lita_nap_xu.png` hiện **chưa có trên đĩa**; nút "Nạp Xu" được ghi nhận dựa trên quan sát giao diện thanh trên cùng trang Lita, do đó được đánh giá ở mức tin cậy **THẤP**.
> - Do L1 (Điều khoản pháp lý) không quy định các bước nạp tiền chi tiết, các bước từ **`REF-TOPUP-02` đến `REF-TOPUP-08` chỉ dựa trên nguồn L3 (Codashop Lita) và P2 (Báo Hoàng Hà Mobile)**.

| ID | Bước của INSTASQUAD | Lita | Playerduo | Loại | Ghi chú triển khai | Mức tin cậy | Kết quả kiểm chứng |
|:---|:---|:---|:---|:---:|:---|:---:|:---:|
| **REF-TOPUP-01** | Vào "Ví", bấm "Nạp tiền" | Nút "Nạp Xu" trên thanh trên trang web (Quan sát UI; L1 không có quy định nạp tiền) | Tìm đến mục "Nạp tiền" (P2) | Lấy theo nguồn | Nút hiển thị ở Sidebar, Topbar và trang Ví | Thấp (Lita) / Trung bình (P2) | **CHƯA KIỂM CHỨNG ĐƯỢC** (Ảnh Lita nút Nạp Xu chưa có tệp trên đĩa) |
| **REF-TOPUP-02** | Chọn hạn mức nạp | Chọn gói nạp cố định (110 Lita Coin...) (L3) | Nhập số tiền hoặc chọn mệnh giá (P2) | Lấy theo nguồn | 6 mốc nạp nhanh: 100k, 200k, 500k, 1M, 2M, 5M | Trung bình | **KHỚP** (L3, P2) |
| **REF-TOPUP-03** | Tự điền số tiền còn thiếu | Không có trong nguồn | Không có trong nguồn | Nhóm phát triển thêm | Nút nạp tiền tự động tính và điền số tiền còn thiếu khi ký quỹ | Nội bộ | **KHỚP** (Nhóm phát triển thêm) |
| **REF-TOPUP-04** | Chọn phương thức thanh toán | Thanh toán qua Codacash PH, GCash, PayMaya, Card (L3) | Thẻ tín dụng/ghi nợ, ví điện tử (MoMo, ZaloPay), chuyển khoản (P2) | Lấy theo nguồn | Hỗ trợ QR chuyển khoản và Payment Simulator | Trung bình | **KHỚP** (L3, P2) |
| **REF-TOPUP-05** | Hiện mã QR và đồng hồ hết hạn | Không có trong nguồn | Chuyển sang trang thanh toán để xác nhận (P2) | Nhóm phát triển thêm | Mã VietQR Compact2 (ngân hàng, STK, số tiền, nội dung INSQ...), đếm ngược 15 phút, SePay Webhook tự động (0đ) kèm Simulator dự phòng | Nội bộ | **KHỚP** (Nhóm phát triển thêm) |
| **REF-TOPUP-06** | Cổng báo kết quả, số dư tự cập nhật | Xu được cộng ngay sau khi thanh toán ("the Lita Coin will be added immediately to your Lita account") (L3) | Ứng dụng tự cập nhật số dư sau khi hoàn tất ("ứng dụng sẽ tự động cập nhật số dư") (P2) | Nhóm phát triển thêm | Webhook SePay (timingSafeEqual) / Mock Webhook HMAC-SHA256 và WebSocket TOPUP_SUCCESS cập nhật tức thì không cần F5, tự động ký quỹ nếu đang giữ slot | Nội bộ | **KHỚP** (Nhóm phát triển thêm) |
| **REF-TOPUP-07** | Xem lịch sử nạp tiền và chi tiết | Có ví tài khoản ("returned to the Buyer's account wallet") (L1 Mục 6) | Mục "Lịch sử giao dịch" ("tìm đến mục “Lịch sử giao dịch”") (P2) | Lấy theo nguồn | Lịch sử nạp tiền đối soát với Sổ cái ghi kép | Cao (L1) / Trung bình (P2) | **KHỚP** (L1, P2) |
| **REF-TOPUP-08** | Giao dịch lỗi hoặc không khớp | Không có trong nguồn | Liên hệ hỗ trợ ("hãy liên hệ với bộ phận hỗ trợ khách hàng") (P2) | Lấy theo nguồn | Modal hướng dẫn liên hệ CS kèm mã giao dịch | Trung bình (P2) | **KHỚP** (P2) |

---

## 3. Các luồng vận hành khác

| ID | Luồng INSTASQUAD | Lita | Playerduo | Loại | Ghi chú triển khai | Mức tin cậy | Kết quả kiểm chứng |
|:---|:---|:---|:---|:---:|:---|:---:|:---:|
| **REF-AUTH-01** | Đăng ký tài khoản | Email, ngày sinh, tên người dùng, mật khẩu ("your date of birth, username, and password") (L1 Mục 3) | Đăng ký tài khoản hoặc đăng nhập bằng FB ("Đăng ký tài khoản hoặc đăng nhập bằng FB") (P4) | Lấy theo nguồn | Email/mật khẩu, xác thực độ tuổi 18+, bcrypt cost 12 | Cao (L1) / Thấp (P4) | **KHỚP** (L1 Mục 3 có email, ngày sinh, tên người dùng, mật khẩu; INSTASQUAD có đủ) |
| **REF-AUTH-02** | Giới hạn tuổi >= 18 | Người dùng phải đủ 18 tuổi ("only if you are eighteen (18) years of age or older") (L1 Mục 2 & 6) | Không có trong nguồn | Lấy theo nguồn | Chặn cứng độ tuổi dưới 18 ở backend Zod schema | Cao (L1) | **KHỚP** (L1) |
| **REF-AUTH-03** | Đăng nhập bên thứ ba (Google OAuth2) | Đăng nhập qua dịch vụ bên thứ ba ("register and log on to Our Services via certain third-party services") (L1 Mục 5) | Đăng nhập bằng FB ("đăng nhập bằng FB") (P4) | Lấy theo nguồn | FR-001 OAuth2: Đã đáp ứng đầy đủ. Server xác minh chữ ký RS256 bằng khóa công khai Google JWKS qua thư viện jose; GIS frontend; liên kết email và quy trình bổ sung thông tin tuổi từ 18 | Cao (L1) / Thấp (P4) | **KHỚP** (L1, P4) (Đã hoàn thành đầy đủ: GIS frontend + jose JWKS verification server-side) |
| **REF-ACC-01** | Cấm bán hoặc chia sẻ tài khoản | Cấm bán, cho thuê, chia sẻ tài khoản ("you may not sell, rent, lease, share or provide access to your account") (L1 Mục 3) | Không có trong nguồn | Lấy theo nguồn | Điều khoản cấm chia sẻ tài khoản, khóa phiên đăng nhập đa thiết bị | Cao (L1) | **KHỚP** (L1) |
| **REF-MOD-01** | Khóa tài khoản vi phạm | Quyền chấm dứt tài khoản ("We reserve the right, without notice and at Our sole discretion, to terminate") (L1 Mục 11) | Không có trong nguồn | Lấy theo nguồn | Khóa tự động khi TrustScore < 40 và khóa thủ công bởi Admin | Cao (L1) | **KHỚP** (Khóa tự động khi TrustScore < 40 và khóa thủ công bởi Admin) |
| **REF-PROF-01** | Hồ sơ cá nhân Companion & Người dùng | Nickname ("Nickname để chỉnh tên tài khoản"), tiểu sử ("tiểu sử") (L4); ghi âm giới thiệu ("thể hiện bởi chính giọng nói của người đồng hành đó") (L5b) | Cập nhật profile ("Cập nhật profile"), thông tin cá nhân ("Thông tin cá nhân") (P4) | Lấy theo nguồn | Nickname, bio, avatar an toàn (xóa EXIF, 256x256), date_of_birth (18+), audio_intro, rank, game, trần 10h/ngày, eKYC badge | Trung bình (L4, L5b, P4) | **KHỚP** (L4, L5b, P4) (Đáp ứng đầy đủ 100%: nickname, tiểu sử, ảnh đại diện an toàn, ngày sinh, ghi âm giọng nói; L4 không có giới tính; ghi âm nằm ở L5b) |
| **REF-COMP-01** | Đăng ký làm Companion / Seller | Đơn đăng ký Seller miễn phí ("Applications to become a Seller are free") (L1 Mục 6) | Đăng ký trở thành Player ("Đăng ký trở thành Player") (P4) | Lấy theo nguồn | Nộp đơn Companion; eKYC AES-256-GCM | Cao (L1) / Thấp (P4) | **KHỚP** (L1, P4) |
| **REF-COMP-02** | Companion đặt giá và số giờ tối đa | Hồ sơ theo game ("found on Seller's Game profiles") (L1 Mục 6) | Tự đặt giá và số giờ tối đa ("Set phí thuê theo giờ & số giờ có thể thuê tối đa") (P4) | Lấy theo nguồn | Giá VND/giờ; trần 10 giờ/ngày theo múi giờ UTC+7 | Cao (L1) / Thấp (P4) | **KHỚP** (L1, P4) |
| **REF-FIND-01** | Tìm và chọn Companion | Tìm kiếm đồng hành để sát cánh ("tìm kiếm đồng hành để sát cánh trong trò chơi") (L5b) | Xem thông tin, ưu điểm, giá tiền ("Xem thông tin, các ưu điểm và giá tiền thuê") (P3) | Lấy theo nguồn | Bộ lọc game, rank, khoảng giá, TrustScore | Trung bình (L5b, P3) | **KHỚP** (L5b, P3) |
| **REF-ORDER-01** | Đặt đơn, trả tiền trước (Ký quỹ Escrow) | Người mua trả trước để tạo đơn ("Buyers pay Us in advance to create an order") (L1 Mục 6) | Thanh toán phí thuê rồi kết nối ("thanh toán phí thuê -> kết nối với player qua phòng chat") (P4) | Lấy theo nguồn | Ký quỹ Escrow, khóa slot nguyên tử bằng DB transaction | Cao (L1) / Thấp (P4) | **KHỚP** (L1, P4) |
| **REF-ORDER-02** | Companion nhận hoặc từ chối | Companion nhận hoặc từ chối đơn ("Seller may choose to accept or decline the order") (L1 Mục 6) | Player nhận thông báo và Accept ("Player nhận được thông báo" và "Player Accept") (P4) | Lấy theo nguồn | Đếm ngược 180s; quá hạn hoàn 100% Escrow, trừ 3 TrustScore | Cao (L1) / Thấp (P4) | **KHỚP** (L1, P4) |
| **REF-CHAT-01** | Chat và voice trong phiên | Voice chat trong ứng dụng ("tính năng hỗ trợ trò chuyện bằng giọng nói") (L5b) | Kết nối qua phòng chat ("kết nối với player qua phòng chat") (P4) | Lấy theo nguồn | Chat text WebSocket, lọc Regex SĐT/Zalo/STK và Gọi thoại 1-1 WebRTC trong phiên qua kênh tín hiệu WebSocket có xác thực, CallLog và STUN công cộng | Trung bình (L5b, P4) | **KHỚP** (L5b, P4) (Đã hoàn thành đầy đủ: Chat text lọc nhạy cảm + Gọi thoại WebRTC 1-1 + CallLog) |
| **REF-DONE-01** | Hoàn tất đơn | Seller bấm nút hoàn tất ("confirm completion of the order via the Order Complete button") (L1 Mục 6) | Không có trong nguồn | Khác nguồn | Renter nghiệm thu trong 15 phút, quá hạn tự động giải ngân (D24) | Cao (L1) | **KHÁC NGUỒN** (Lita Seller bấm; INSTASQUAD Renter nghiệm thu 15m) |
| **REF-CANCEL-01** | Hủy đơn & Hoàn tiền | Hủy đơn tiền hoàn về ví ("funds paid will be returned to the Buyer's account wallet") (L1 Mục 6) | Bên thuê chủ động chấm dứt hợp đồng ("chủ động chấm dứt hợp đồng thuê") (P3) | Lấy theo nguồn | Bậc thang hủy: >= 30m hoàn 100%, 10-29m hoàn 70/30, < 10m phạt 100% chia 88/12 | Cao (L1) / Trung bình (P3) | **KHỚP** (L1 hoàn tiền về ví; P3 chỉ có chấm dứt, không có từ hoàn tiền) |
| **REF-DISP-01** | Khiếu nại (Dispute RMA) | Người mua có 48 giờ khiếu nại ("the Buyer will have 48 hours to dispute the completed status") (L1 Mục 6) | Không có trong nguồn | Lấy theo nguồn | Báo sự cố trong 15m đóng băng Escrow; CS phân xử lỗi >= 80% (D22) | Cao (L1) | **KHỚP** (L1) |
| **REF-REVIEW-01** | Đánh giá hai chiều | Đánh giá của người đã chơi ("đánh giá của những người đã chơi cùng đồng hành đó") (L5a) | Chế độ đánh giá cho user và player ("Chế độ đánh giá dành cho user và player") (P4) | Lấy theo nguồn | Đánh giá sao 1-5 sao sau phiên hoàn tất; tính vào TrustScore | Trung bình (L5a, P4) | **KHỚP** (L5a, P4) |
| **REF-WDRAW-01** | Rút tiền của Companion | Rút tiền khả dụng sau khi đơn hoàn tất ("Withdrawal of funds is only made available once an order is marked as complete") (L1 Mục 6) | Cài tài khoản ngân hàng và rút tiền ("Cài đặt tài khoản ngân hàng" và "Rút tiền") (P4) | Lấy theo nguồn | Tạo yêu cầu rút, phong tỏa số dư; Admin duyệt hoặc từ chối sinh bút toán hoàn | Cao (L1) / Thấp (P4) | **KHỚP** (L1, P4) |
| **REF-WDRAW-02** | Chờ an toàn 7 ngày trước khi rút | Bắt buộc chờ an toàn 7 ngày ("before the standard 7 days safety clearance period") (L1 Mục 6) | Không có trong nguồn | Khác nguồn | Companion tạo yêu cầu rút, Admin duyệt hoặc từ chối, từ chối thì hoàn bút toán về ví Companion | Cao (L1) | **KHÁC NGUỒN** (Lita chờ 7 ngày; INSTASQUAD Companion tạo yêu cầu rút, Admin duyệt/từ chối, từ chối thì hoàn bút toán) |
| **REF-TAX-01** | Nghĩa vụ thuế của Companion | Seller tự chịu trách nhiệm nộp thuế ("Sellers are responsible for paying any direct or indirect taxes") (L1 Mục 6) | Không có trong nguồn | Khác nguồn | Slide 16 định hướng sàn khấu trừ và nộp thay theo Nghị định 117/2025; trong bản demo học thuật chưa làm trích nộp thuế | Cao (L1) | **KHÁC NGUỒN** (Lita để Seller tự chịu thuế; INSTASQUAD định hướng sàn khấu trừ và nộp thay theo Nghị định 117/2025, chưa làm trong demo) |
| **REF-FUND-01** | Tiền giữ ở bên thứ ba / Escrow | Nền tảng là đại lý thu hộ có giới hạn ("appointed as a limited authorized payment collection agent") (L1 Mục 6) | Không có trong nguồn | Lấy theo nguồn | Tài khoản ký quỹ Escrow tách biệt, bảo toàn phương trình tiền tệ Variance = 0 | Cao (L1) | **KHỚP** (L1) |

---

## 4. Những điểm khác nguồn (Cần ghi rõ trong Báo cáo)

Nhóm ghi nhận minh bạch **03 điểm khác biệt có chủ ý** giữa INSTASQUAD và hai nền tảng tham chiếu:

1. **Ai là người bấm nút Hoàn tất đơn (`REF-DONE-01`)**:
   - *Lita (L1 Mục 6)*: Seller là bên bấm nút "Order Complete" sau khi hoàn thành dịch vụ; Buyer chỉ có 48h để khiếu nại nếu Seller bấm sai.
   - *INSTASQUAD*: Người bấm nghiệm thu là **Renter (Người thuê)** trong thời hạn 15 phút. Nếu Renter im lặng quá 15 phút, hệ thống tự động nghiệm thu (**D24**). Lý do: bảo vệ Renter tốt hơn và phù hợp với mô hình thanh toán dịch vụ theo giờ có ký quỹ Escrow.
2. **Quy trình duyệt rút tiền của Companion (`REF-WDRAW-02`)**:
   - *Lita (L1 Mục 6)*: Bắt buộc số dư phải qua thời gian chờ an toàn 7 ngày ("before the standard 7 days safety clearance period") mới được tạo lệnh rút tiền.
   - *INSTASQUAD*: Cho phép Companion tạo yêu cầu rút tiền sau khi hoàn tất / nghiệm thu 15 phút; Admin duyệt hoặc từ chối, từ chối thì hoàn bút toán về ví Companion.
3. **Nghĩa vụ thuế của Companion (`REF-TAX-01`)**:
   - *Lita (L1 Mục 6)*: Quy định Seller hoàn toàn tự chịu trách nhiệm kê khai và nộp thuế ("Sellers are responsible for paying any direct or indirect taxes").
   - *INSTASQUAD*: Slide 16 "Khả thi pháp lý và thuế" (`INSTASQUAD_Game_Companion.pdf`) định hướng sàn khấu trừ và nộp thay theo Nghị định 117/2025; trong bản demo học thuật hiện tại CHƯA làm phần trích nộp thuế này (bỏ cụm TNCN do slide không có chữ TNCN).

---

## 5. Quy tắc nghiệp vụ của nhóm (Giữ nguyên, không tham chiếu hai nền tảng)

> [!NOTE]
> **Chú thích quy ước mã định danh (Disambiguation)**:
> - Các mã **BR-001 đến BR-004** trong `docs/REQUIREMENTS.md` là **Business Requirements** (Yêu cầu nghiệp vụ cấp cao của đề tài).
> - Các mã **BR-01 đến BR-28** trong toàn bộ tài liệu kỹ thuật (`docs/FINANCIAL_RULES.md`, `docs/TRACEABILITY_FINAL.md`, `docs/QA_REPORT.md`) là **Business Rules** (Quy tắc nghiệp vụ chi tiết cấp kỹ thuật).

Toàn bộ các quy tắc dưới đây là **Quy tắc của nhóm** dựa trên Project Charter, tài liệu quy trình BPMN (`INSTASQUAD_BPMN_TKHT.pdf`) và Requirements của đề tài. Các quy tắc này có hiệu lực tối cao, **tuyệt đối không bị thay đổi hoặc suy giảm theo hai nền tảng thương mại bên ngoài**:

1. **Phản hồi 180 giây**: Companion có đúng 180 giây để bấm Nhận hoặc Từ chối đơn; quá hạn hệ thống tự động hủy, hoàn trả 100% tiền ký quỹ cho Renter và phạt trừ 3 điểm TrustScore của Companion.
2. **Hủy đơn theo bậc thang thời gian trước giờ hẹn**:
   - Còn $\ge 30$ phút: Hoàn 100% tiền ký quỹ về ví khả dụng Renter.
   - Còn từ 10 đến 29 phút: Hoàn 70% cho Renter, đền bù 30% cho Companion (chi phí cơ hội).
   - Còn dưới 10 phút: Phạt 100% tiền ký quỹ (phân bổ 88% cho Companion, 12% ghi nhận doanh thu sàn).
3. **Giới hạn thời gian làm việc (Fatigue Management)**: Mỗi Companion chỉ được nhận tối đa 10 giờ làm việc mỗi ngày (tính theo múi giờ Việt Nam `Asia/Ho_Chi_Minh` UTC+7) để bảo vệ sức khỏe và chất lượng dịch vụ.
4. **Khóa giữ slot nguyên tử & Chống lặp (Concurrency & Idempotency)**: Khóa tạm thời 10 phút (`HELD`) bằng Database Transaction để chống đặt trùng slot (Race Condition); kiểm soát `Idempotency-Key` / `request_key` trên mọi giao dịch nhạy cảm.
5. **Cửa sổ nghiệm thu 15 phút**: Phiên kết thúc mở cửa sổ 15 phút cho Renter nghiệm thu; nếu Renter không thao tác, hệ thống tự động nghiệm thu và giải ngân (`SYSTEM_AUTO_ACCEPT_TIMEOUT`).
6. **Tỷ lệ chia sẻ doanh thu 88/12**: Khi hoàn tất đơn, tự động giải ngân 88% cho Companion và 12% hoa hồng cho nền tảng; thuật toán làm tròn số nguyên VND đảm bảo không thất thoát dù chỉ 1 đồng.
7. **Quy trình khiếu nại (RMA) & Đóng băng Escrow**:
   - Báo sự cố lập tức khóa cứng tiền ký quỹ sang trạng thái `FROZEN`.
   - CS Agent phân xử dựa trên chứng cứ: Nếu lỗi Companion $\ge 80\%$ thì hoàn 100% cho Renter và phạt thêm 20% trừ vào ví Companion (ghi nợ `PENALTY_DEBT` nếu thiếu, không làm âm ví); nếu lỗi $< 80\%$ thì giải ngân 88/12 cho Companion.
8. **Thuật toán TrustScore**: Tính toán điểm uy tín từ đánh giá sao và lịch sử đơn hàng theo thang điểm $[0, 100]$, mặc định 80 điểm; nếu điểm tụt dưới 40 sẽ tự động tạm khóa nhận đơn.
9. **Bất biến Sổ cái ghi kép (Double-Entry Ledger)**: Số dư tài khoản không bao giờ cập nhật trực tiếp mà là view phái sinh của các bút toán; mỗi giao dịch bắt buộc $\sum \text{Debit} \equiv \sum \text{Credit}$ (phương trình bảo toàn $\text{Variance} = 0$).

### 5.1. Bảng kiểm chứng thực tế 6 quy tắc cốt lõi từ tài liệu gốc đề bài (PDF)

- **Tài liệu đối chiếu**: `docs/source/INSTASQUAD_BPMN_TKHT.pdf` (Tài liệu Thiết kế Hệ thống và Quy trình Nghiệp vụ BPMN).
- **Tổng số trang thật của tệp PDF**: **19 trang** (xác nhận chính xác 100% bằng lệnh `pypdf.PdfReader`).
- **Phương pháp đếm trang**: Số trang tuyệt đối (1-based index) từ trang 1 đến trang 19 của tệp `INSTASQUAD_BPMN_TKHT.pdf`.
- **Nguyên tắc mã quy tắc**: Mỗi quy tắc cốt lõi được gắn **DUY NHẤT MỘT MÃ BR** (căn cứ theo tài liệu gốc [`docs/TRACEABILITY_FINAL.md`](TRACEABILITY_FINAL.md)), không ghi hai mã trong ngoặc.

| STT | Quy tắc cốt lõi | Mã BR duy nhất | Dòng tại `TRACEABILITY_FINAL.md` | Mã Quyết định D | Số trang PDF thật (`INSTASQUAD_BPMN_TKHT.pdf`) | Câu trích gốc nguyên văn ($\le 15$ từ) | Hiện trạng kiểm chứng & Triển khai |
|:---:|:---|:---:|:---:|:---:|:---|:---|:---|
| **1** | **180 giây phản hồi** | `BR-08` | Dòng 22 | không có mã D riêng | Trang 1 (Mục II)<br>Trang 6 (Bước 1, 3) | *"Companion có 180 giây để trả lời"* (Trang 1)<br>*"quá 180 giây không trả lời"* (Trang 6) | **Khớp hoàn toàn**: Triển khai tại `booking.service.ts#handleBookingTimeout` và Background Worker; hoàn 100% Escrow, phạt -3 TrustScore. Quy tắc gốc đề bài Project Charter, không có mã D riêng. |
| **2** | **Hủy đơn 100/70/Phạt** | `BR-10` | Dòng 24 | `D21`<br>*(Thay thế D03, D12)* | Trang 1 (Mục II)<br>Trang 9 (Bước 4a, 4b, 4c) | *"diễn đạt lại, không phải trích dẫn"* (Trang 1)<br>*"Tài liệu Charter chưa nói rõ khoản phạt này chia cho Companion và nền tảng thế nào"* (Trang 9) | **Khớp mốc thời gian**: Triển khai tại `booking.service.ts#cancelBooking`. Phân chia phạt $< 10$m theo tỷ lệ 88/12 ghi nhận: **NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định** (D21). |
| **3** | **Phân chia doanh thu 88/12** | `BR-15` | Dòng 29 | `D13` | Trang 1 (Mục I)<br>Trang 13 (Hình 2B Bước 1) | *"giải ngân 88/12"* (Trang 1)<br>*"12% tổng phí thuộc về nền tảng và 88% là thu nhập của Companion"* (Trang 13) | **Khớp hoàn toàn**: Triển khai tại `session.service.ts#acceptFulfillment` và `settlement.service.ts`; thuật toán làm tròn số nguyên không mất 1 đồng. |
| **4** | **Nghiệm thu 15 phút (Auto-Accept)** | `BR-14` | Dòng 28 | `D24`<br>*(Thay thế D02)* | Trang 11 (Mục III)<br>Trang 12 (Hình 2A Bước 6) | *"Nếu Renter không phản hồi sau 15 phút"* (Trang 12)<br>*"Đây là đề xuất của nhóm, chưa có trong Project Charter"* (Trang 12) | **Khớp hoàn toàn**: Triển khai tại `session.service.ts#autoAccept` và Background Worker quét định kỳ giải ngân tự động sau 15 phút. Ghi nhận: **NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định** (D24). |
| **5** | **Khiếu nại lỗi $\ge 80\%$** | `BR-17` | Dòng 31 | `D22`<br>*(Thay thế D04, D15)* | Trang 11 (Mục III)<br>Trang 18 (Bước 7, Bước 8a) | *"hoàn 100% cho Renter và phạt Companion 20%"* (Trang 11)<br>*"khoản phạt 20% trừ từ ví nào và chuyển cho ai, cần PO xác nhận"* (Trang 18) | **Khớp quy trình**: Triển khai tại `dispute.service.ts#resolveDispute`. Phạt 20% nộp về nền tảng, ghi nợ `PENALTY_DEBT` không làm âm ví ghi nhận: **NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định** (D22). |
| **6** | **Trần 10 giờ/ngày** | `BR-03` | Dòng 17 | `D08` | Trang 1 (Mục II)<br>Trang 2 (Hình 1A Bước 2) | *"mỗi Companion nhận tối đa 10 giờ mỗi ngày"* (Trang 1)<br>*"mỗi Companion chỉ nhận tối đa 10 giờ mỗi ngày để giữ sức khỏe"* (Trang 2) | **Khớp hoàn toàn**: Triển khai chặn cứng tại `companion.service.ts#createSlot` theo múi giờ Việt Nam `Asia/Ho_Chi_Minh` (UTC+7). |

### 5.2. Bảng quyết định đã chốt (NHÓM ĐÃ CHỐT 06/11/2026 – Charter chưa quy định: D21 – D27)

Nhóm quyết định chốt luôn toàn bộ các điểm mở kỹ thuật và vận hành mà Project Charter và BPMN gốc chưa quy định chi tiết, KHÔNG chờ PO, nhằm đảm bảo hệ thống vận hành hoàn toàn tự động, toàn vẹn sổ cái ghi kép và không có điểm nghẽn:

| Mã Quyết định | Nguyên văn BPMN / Slide (trích từ `BPMN_EXTRACT.txt`) | Quyết định của nhóm | Lý do |
|:---:|:---|:---|:---|
| **D21** | Trang 9 (Bước 4c): *"Tài liệu Charter chưa nói rõ khoản phạt này chia cho Companion và nền tảng thế nào"*<br>Trang 9 (Bước 4b): *"Hai khoản này được ghi thành hai dòng đối ứng"* | **Hủy dưới 10 phút**: Phạt 100% ký quỹ, chia 88% Companion và 12% nền tảng, hai bút toán đối ứng trong một lần xử lý, làm tròn theo thuật toán 88/12 hiện có. Mốc 10–29 phút giữ đúng BPMN: 70% Renter, 30% Companion, không trừ hoa hồng. *(Thay thế D03 và phần chia phạt của D12)*. | Bù đắp chi phí cơ hội cho Companion khi bị hủy sát giờ hẹn (< 10 phút), đồng thời bảo toàn nguồn thu hoa hồng nền tảng theo tỷ lệ 88/12 đã định nghĩa, đảm bảo nguyên tắc bút toán đối ứng cân bằng ($\Delta = 0$). |
| **D22** | Trang 18 (Bước 8a): *"khoản phạt 20% trừ từ ví nào và chuyển cho ai, cần PO xác nhận"* | **Khiếu nại lỗi từ 80%**: Renter hoàn 100%; phạt Companion 20% giá trị đơn trừ từ ví khả dụng Companion, ghi có doanh thu nền tảng (loại phạt vi phạm). Không đủ số dư thì trừ tối đa số có, phần thiếu ghi `PENALTY_DEBT`, cấn trừ vào thu nhập đơn sau; ví không bao giờ âm. *(Thay thế D04 và D15)*. | Renter đã được hoàn 100% tiền ký quỹ nên khoản phạt 20% đối với Companion là chế tài vi phạm quy chế sàn nộp về nền tảng. Cơ chế `PENALTY_DEBT` đảm bảo nguyên tắc bất biến ví không bao giờ âm (non-negative balance) nhưng vẫn bảo đảm thu hồi đầy đủ chế tài vi phạm khi Companion có thu nhập phát sinh sau. |
| **D23** | Trang 18 (Bước 7): *"Dự án chỉ quy định mốc từ 80% trở lên"*<br>Trang 18 (Bước 7): *"cần PO xác nhận hoặc bổ sung quy tắc nghiệp vụ"* | **Lỗi 1–79%**: Nhánh "Không", giải ngân 88/12, CS ghi chú kết luận phân xử, không phạt Companion, không tính vào tỷ lệ khiếu nại của TrustScore. *(Thay thế D05)*. | Tuân thủ cấu trúc rẽ nhánh nhị phân của BPMN; bảo vệ Companion khỏi bị phạt nặng đối với các lỗi nhỏ hoặc tranh chấp cảm tính, đồng thời CS vẫn lưu vết ghi chú hòa giải để giám sát chất lượng dịch vụ. |
| **D24** | Trang 12 (Hình 2A Bước 6): *"Nếu Renter không phản hồi sau 15 phút"*<br>Trang 12 (Bước 8): *"Đây là đề xuất của nhóm, chưa có trong Project Charter"* | **Tự động nghiệm thu sau 15 phút**: Giữ nguyên. Khi Renter im lặng quá 15 phút sau khi phiên kết thúc, worker tự động chuyển trạng thái đơn sang `COMPLETED`, giải ngân 88/12 cho Companion và ghi log `SYSTEM_AUTO_ACCEPT_TIMEOUT`. *(Thay thế D02)*. | Tránh tình trạng tiền Escrow bị giam vô hạn định khi Renter quên hoặc cố tình không phản hồi nghiệm thu, bảo vệ quyền lợi nhận thu nhập kịp thời của Companion. |
| **D25** | Trang 18 (Bước 6b): *"Thời hạn nộp bổ sung do PO quy định"*<br>Trang 11 (Mục III): *"mục tiêu xử lý khiếu nại trung bình dưới 45 phút"* | **Hạn bổ sung bằng chứng 24 giờ**: Quá hạn CS phán quyết theo hồ sơ hiện có; đồng hồ mục tiêu 45 phút tạm dừng khi chờ bổ sung (`EVIDENCE_PENDING`). *(Thay thế D06)*. | Tạo khung thời gian hợp lý (24 giờ) cho các bên cung cấp chứng cứ mà không làm méo mó chỉ số SLA xử lý chủ động của nhân viên CS (đồng hồ SLA tạm dừng trong thời gian chờ chứng cứ). |
| **D26** | Trang 14 (Bước 2a): *"tiền của Companion chờ kiểm toán viên xử lý thủ công"*<br>Trang 14 (Bước 2a): *"Hiện chưa có cơ chế tự thử lại hay thời hạn xử lý"* | **Giải ngân Escrow lỗi**: Thử lại tối đa 3 lần (sau 1, 5, 15 phút) bằng worker nền với cùng `idempotency_key` (`SETTLE-BOOKING-${booking_id}`); vẫn lỗi thì giữ Escrow `HELD`, tạo `LedgerAuditAlert` (`SETTLEMENT_RETRY_EXHAUSTED`), Auditor xử lý thủ công trong 24 giờ, thông báo Companion. *(Thay thế phần cơ chế retry giải ngân Escrow của D18)*. | Xử lý tự động lỗi mạng tạm thời bằng Exponential Backoff mà không gây trùng bút toán nhờ khóa Idempotency; phân định rõ ranh giới tự động hóa và ngưỡng can thiệp kiểm toán viên nếu lỗi kéo dài quá 3 lần. |
| **D27** | Slide 12: *"10.000 booking và 7,5% chưa có công thức"*<br>REQUIREMENTS BR-003: *"Đạt Conversion Rate (tỷ lệ chuyển đổi) tối thiểu 7,5% theo giai đoạn đo lường"* | **Conversion Rate** = đơn ký quỹ thành công / số phiên truy cập duy nhất (Funnel); tỷ lệ hoàn tất đơn hiển thị riêng. | Tách bạch rõ tỷ lệ chuyển đổi khách hàng tiềm năng thành đơn trả phí (Funnel Conversion) với tỷ lệ hoàn thành phiên dịch vụ (Fulfillment Rate), tránh ngộ nhận hiệu quả kinh doanh của sàn. |

---

## 6. Việc cần kiểm tra khi hoàn thiện

- [x] Đã ánh xạ toàn bộ 8 bước nạp tiền (`REF-TOPUP-01` đến `REF-TOPUP-08`) và 20 bước vận hành (`REF-AUTH-01` đến `REF-FUND-01`).
- [x] Đã kiểm tra tính khả dụng của toàn bộ các liên kết tài liệu nguồn (đánh dấu rõ ràng link 200 OK và link CHƯA XÁC MINH).
- [x] Đã ghi nhận 3 điểm khác nguồn có chủ ý tại Mục 4.
- [x] Đã khẳng định tính độc lập của 9 nhóm quy tắc nghiệp vụ nội bộ tại Mục 5.
- [ ] Ảnh chụp toàn văn điều khoản dịch vụ L1 (mục 6) lưu trữ tại `docs/evidence/` để phục vụ bảo vệ đồ án.
- [ ] Bổ sung ảnh chụp màn hình thao tác nạp tiền thực tế từ ứng dụng Playerduo/Lita (nếu có).

---

## PHỤ LỤC: Nguồn đã cân nhắc, không dùng làm tham chiếu chính

*(Lưu trữ các case study quốc tế đã từng được khảo sát trước ngày 05/11/2026. Nhóm quyết định không sử dụng các nguồn này làm tham chiếu vận hành chính vì khác biệt ngành nghề, nhưng giữ lại làm tài liệu tham khảo kỹ thuật mở rộng).*

| STT | Tên case study | Lĩnh vực | Nguồn tài liệu | Lý do không dùng làm tham chiếu chính |
|:---:|:---|:---|:---|:---|
| **01** | **Upwork Fixed-Price Escrow** | Freelance công việc trí tuệ | [Upwork Escrow Help](https://support.upwork.com/hc/en-us/articles/211063748-Fixed-Price-Protection) *(403 Forbidden – bị chặn bot, chưa xác minh)* | Upwork áp dụng cho dự án bàn giao sản phẩm/milestone kéo dài nhiều ngày/tháng, không phù hợp với đặc thù phiên chơi game companion diễn ra theo giờ trong ngày. |
| **02** | **Stripe Ledger / Modern Treasury** | Hạ tầng kế toán tài chính | [Stripe Blog](https://stripe.com/blog/ledger-architecture) *(404 Not Found – link chết, không dùng làm trích dẫn)* & [Martin Fowler](https://martinfowler.com/eaaDev/AccountingTransaction.html) *(200 OK)* | Đây là kiến trúc kỹ thuật kế toán ghi kép và bất biến số dư, nhóm đưa vào làm **Quy tắc nội bộ của nhóm**, không phải mô hình vận hành sàn C2C. |
| **03** | **Epic Games Store (88/12) & Steam (70/30)** | Phát hành game kỹ thuật số | [Epic Games Store Announcement](https://store.epicgames.com/en-US/news/epic-games-store-announcement) *(403 Forbidden – bị chặn bot, chưa xác minh)* | Epic Games là nền tảng B2C phân phối phần mềm game, không phải sàn dịch vụ kết nối người chơi C2C. Tỷ lệ 88/12 được nhóm giữ lại làm **Quy tắc nội bộ của nhóm**. |
| **04** | **Airbnb Cancellation Policies** | Lưu trú & Khách sạn | [Airbnb Help Center](https://www.airbnb.com/help/article/475) *(200 OK)* | Airbnb áp dụng chính sách hủy phòng theo ngày/tuần đối với bất động sản vật lý. Cơ chế hủy theo bậc thang 30m/10m được nhóm chuyển thành **Quy tắc nội bộ của nhóm**. |
| **05** | **Fiverr Order Completion** | Dịch vụ số tự do | [Fiverr Order Auto-Completion](https://www.fiverr.com/support/articles/360010560118-Order-completion) *(403 Forbidden – bị chặn bot, chưa xác minh)* | Fiverr cho phép người mua phản hồi trong 72 giờ sau khi giao hàng, quá dài so với phiên chơi game kết thúc trong ngày. Cơ chế nghiệm thu 15 phút là **Quy tắc nội bộ của nhóm**. |
| **06** | **Upwork Non-Circumvention Policy** | Phòng chống giao dịch ngoài sàn | [Upwork Legal](https://www.upwork.com/legal#noncircumvention) *(403 Forbidden – bị chặn bot, chưa xác minh)* | Bộ lọc Regex che giấu số điện thoại, Zalo, STK được nhóm phát triển độc lập và chuẩn hóa thành **Quy tắc nội bộ của nhóm**. |
| **07** | **Grab & Uber Fatigue Management** | Dịch vụ vận tải, gọi xe | [Grab Safety](https://www.grab.com/sg/safety/driver/) *(404 Not Found – link chết, không dùng làm trích dẫn)* & [Uber Hours](https://www.uber.com/us/en/drive/safety/driving-hours/) *(406 Not Acceptable – bị chặn bot, chưa xác minh)* | Thuộc ngành giao thông vận tải đường bộ. Nhóm chuyển trần làm việc 10 giờ/ngày thành **Quy tắc nội bộ của nhóm**. |
| **08** | **Uber / Airbnb Mutual Rating System** | Đánh giá ẩn hai chiều | [Uber Ratings](https://help.uber.com/riders/article/how-do-ratings-work) *(404 Not Found – link chết, không dùng làm trích dẫn)* | Đánh giá sao và công thức TrustScore được xây dựng trực tiếp theo BPMN đề bài, chuyển thành **Quy tắc nội bộ của nhóm**. |
| **09** | **Stripe API Idempotency** | Tiêu chuẩn giao diện API | [Stripe Idempotency Docs](https://docs.stripe.com/api/idempotent_requests) *(200 OK)* | Là chuẩn giao thức kỹ thuật của HTTP header `Idempotency-Key`, nhóm áp dụng như **Quy tắc kỹ thuật nội bộ của nhóm**. |

# DANH MỤC MÀN HÌNH HỆ THỐNG (SCREEN CATALOG)

Tài liệu này tổng hợp toàn bộ màn hình và giao diện người dùng của hệ thống INSTASQUAD theo từng vai trò (Role), mục đích nghiệp vụ, trường hợp sử dụng (Use Case), yêu cầu chức năng (FR) và ảnh chụp thực tế.

---

## 1. Màn hình Dành cho Khách vãng lai & Đăng ký / Đăng nhập (Guest)

| Tên màn hình | Mục đích | Use Case | FR | Ảnh chụp thực tế |
| :--- | :--- | :---: | :---: | :--- |
| **Trang chủ (Home Page)** | Giới thiệu nền tảng, slider banner, danh mục game, top companion nổi bật, đánh giá cộng đồng và bảng xếp hạng TrustScore | UC01, UC02 | FR-001, FR-002 | [screenshot-ui1-desktop-1440.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-ui1-desktop-1440.png) |
| **Đăng nhập thường & Google OAuth2** | Cho phép đăng nhập bằng tài khoản nội bộ hoặc tài khoản Google thông qua Google Identity Services | UC01 | FR-001 | [screenshot-stage1c-login.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-stage1c-login.png) |
| **Đăng ký tài khoản mới** | Tạo tài khoản mới, chọn vai trò ban đầu (Renter / Companion), xác minh độ tuổi từ 18 và đồng ý điều khoản | UC01 | FR-001 | [screenshot-stage1c-register.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-stage1c-register.png) |
| **Chính sách Ký quỹ (Escrow Policy)** | Giải thích minh bạch quy trình giữ tiền, thời hạn nghiệm thu 15 phút, tỷ lệ chia 88/12 và hoàn tiền tự động | UC03 | FR-003, FR-005 | [screenshot-ui1-escrow-policy.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-ui1-escrow-policy.png) |
| **Quy trình Giải quyết Khiếu nại** | Cung cấp quy định về căn cứ phán quyết RMA, thời hạn bổ sung chứng cứ 24h và các mức lỗi hoàn tiền | UC05 | FR-004, FR-007 | [screenshot-ui1-dispute-guide.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-ui1-dispute-guide.png) |
| **Điều khoản Dịch vụ & Hướng dẫn thanh toán** | Quy định điều khoản sử dụng nền tảng, quy tắc ứng xử văn minh và hướng dẫn nạp tiền qua cổng SePay | UC01, UC03 | FR-001, FR-003 | [screenshot-ui1-terms.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-ui1-terms.png) |

---

## 2. Màn hình Dành cho Người thuê (Renter)

| Tên màn hình | Mục đích | Use Case | FR | Ảnh chụp thực tế |
| :--- | :--- | :---: | :---: | :--- |
| **Bảng điều khiển Renter (Dashboard)** | Xem số dư ví khả dụng/ký quỹ, đơn đang chờ xác nhận (đồng hồ 180s), đơn sắp diễn ra và lịch sử thuê | UC01, UC03 | FR-001, FR-003 | [screenshot-e1-dashboard-renter.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-renter.png) |
| **Tìm kiếm & Bộ lọc nâng cao (5 tiêu chí)** | Tìm kiếm Companion theo game, rank, mức giá, khung giờ rảnh, TrustScore tối thiểu, sắp xếp và phân trang | UC02 | FR-002 | [screenshot-ui1-games-row.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-ui1-games-row.png) |
| **Đặt lịch & Giữ chỗ tạm thời** | Chọn khung giờ khả dụng của Companion, kiểm tra chi phí và tiến hành giữ chỗ slot trước khi thanh toán | UC03 | FR-002, FR-003 | [screenshot-stage1c-desktop.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-stage1c-desktop.png) |
| **Phòng phiên chơi (Room Voice & Chat)** | Trao đổi tin nhắn văn bản lọc từ ngữ nhạy cảm, gọi thoại 1-1 WebRTC, bấm nghiệm thu hoặc báo sự cố | UC04 | FR-006 | [screenshot-stage1c-renter.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-stage1c-renter.png) |
| **Hồ sơ cá nhân & Đổi avatar** | Xem thông tin tài khoản, cập nhật mật khẩu, tải lên ảnh đại diện kiểm soát bảo mật và đồng bộ toàn hệ thống | UC01 | FR-001 | [screenshot-e1-profile-renter.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-profile-renter.png) |
| **Trung tâm thông báo Renter** | Nhận thông báo phán quyết khiếu nại, tiếp nhận đơn, hoàn tiền ký quỹ bằng tiếng Việt tự nhiên chuẩn hóa | UC03, UC05 | FR-001, FR-007 | [screenshot-e2-renter-notifications.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e2-renter-notifications.png) |
| **Nộp chứng cứ bổ sung khiếu nại** | Tải lên ảnh bằng chứng in-game trong hạn chót 24h (mã hóa AES-256-GCM bảo vệ an toàn trên đĩa) | UC05 | FR-004 | [screenshot-d1b-renter-additional-evidence-deadline.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-d1b-renter-additional-evidence-deadline.png) |

---

## 3. Màn hình Dành cho Người đồng hành (Companion)

| Tên màn hình | Mục đích | Use Case | FR | Ảnh chụp thực tế |
| :--- | :--- | :---: | :---: | :--- |
| **Bảng điều khiển Companion (Dashboard)** | Xem số dư ví thu nhập, đơn mới chờ tiếp nhận kèm đếm ngược 180s, trạng thái hoạt động và TrustScore | UC01, UC03 | FR-001, FR-003 | [screenshot-e1-dashboard-companion.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-companion.png) |
| **Quản lý lịch rảnh (Slot Calendar)** | Đăng ký các khung giờ rảnh trong tuần, áp dụng trần 10 giờ/ngày theo múi giờ Việt Nam để bảo vệ sức khỏe | UC02 | FR-002 | [screenshot-e1-profile-companion.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-profile-companion.png) |
| **Ghi âm giọng nói giới thiệu (Audio Bio)** | Ghi âm hoặc tải tệp âm thanh giới thiệu bản thân (kiểm tra định dạng magic bytes và giới hạn 2MB) | UC01 | FR-001 | [screenshot-e1-profile-companion.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-profile-companion.png) |
| **Gửi giải trình khiếu nại (D29)** | Cung cấp lời giải trình và bằng chứng đối chứng khi bị khiếu nại trong thời hạn 24 giờ quy định | UC05 | FR-004 | [screenshot-d1-companion-explanation.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-d1-companion-explanation.png) |
| **Trung tâm thông báo Companion** | Nhận thông báo đơn đặt mới, giải ngân thu nhập 88% sau nghiệm thu, kết quả phán quyết tranh chấp | UC03, UC05 | FR-001, FR-007 | [screenshot-e2-companion-notifications.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e2-companion-notifications.png) |
| **Yêu cầu rút tiền thu nhập (BPMN 3A)** | Nhập số tiền rút về tài khoản ngân hàng, hệ thống phong tỏa số dư khả dụng và sinh yêu cầu cho Admin duyệt | UC01 | FR-001, FR-005 | [screenshot-e1-dashboard-companion.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-companion.png) |

---

## 4. Màn hình Dành cho Nhân viên CSKH (CS Agent)

| Tên màn hình | Mục đích | Use Case | FR | Ảnh chụp thực tế |
| :--- | :--- | :---: | :---: | :--- |
| **Bảng điều khiển & Hàng đợi Khiếu nại** | Theo dõi toàn bộ hồ sơ tranh chấp đang mở, đồng hồ SLA 45 phút, phân loại lý do và trạng thái xử lý | UC05 | FR-004 | [screenshot-e1-dashboard-cs-agent.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-cs-agent.png) |
| **Hồ sơ thẩm định tranh chấp (CS Dossier 2 cột)** | Đối chiếu song song chứng cứ 2 phía (Renter vs Companion), xem giải trình D29, nhật ký chat kiểm toán và tab CallLog | UC05 | FR-004, FR-006 | [screenshot-d1b-admin-dossier-2col.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-d1b-admin-dossier-2col.png) |
| **Yêu cầu bổ sung chứng cứ & Tạm dừng SLA** | Gửi yêu cầu Renter bổ sung hình ảnh in-game, thiết lập hạn chót 24h và tạm dừng đồng hồ tính giờ SLA | UC05 | FR-004 | [screenshot-d1-cs-request-evidence.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-d1-cs-request-evidence.png) |
| **Ban hành phán quyết RMA** | Nhập tỷ lệ lỗi (0 - 100%), giải thích căn cứ quy tắc, tự động kích hoạt bút toán Sổ cái và mở đóng băng Escrow | UC05 | FR-004, FR-005 | [screenshot-d1-cs-dossier-chat-evidence.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-d1-cs-dossier-chat-evidence.png) |

---

## 5. Màn hình Dành cho Kiểm toán viên (Auditor)

| Tên màn hình | Mục đích | Use Case | FR | Ảnh chụp thực tế |
| :--- | :--- | :---: | :---: | :--- |
| **Bảng điều khiển Kiểm toán Sổ cái** | Kiểm tra phương trình bảo toàn tổng tiền, xác nhận phương sai $\text{Variance} = 0$, rà soát dòng tiền Escrow | NFR-001 | FR-005 | [screenshot-e1-dashboard-auditor.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-auditor.png) |
| **Nhật ký giao dịch chi tiết (Ledger Entries)** | Xem toàn bộ các dòng ghi Nợ/Có (DEBIT/CREDIT), mã đối soát, số dư khả dụng và số dư ký quỹ sau giao dịch | NFR-001 | FR-005 | [screenshot-e1-dashboard-auditor.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-auditor.png) |
| **Sổ nhật ký kiểm toán hệ thống (AuditLog)** | Truy xuất lịch sử các thao tác can thiệp hệ thống, duyệt rút tiền, phán quyết khiếu nại và đổi trạng thái | NFR-006 | FR-007 | [screenshot-e1-dashboard-auditor.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-auditor.png) |

---

## 6. Màn hình Dành cho Quản trị viên (Admin)

| Tên màn hình | Mục đích | Use Case | FR | Ảnh chụp thực tế |
| :--- | :--- | :---: | :---: | :--- |
| **Bảng tổng quan Quản trị (Admin Overview)** | Giám sát toàn diện người dùng, tổng doanh thu 12% của sàn, tổng số đơn đặt, tỷ lệ chuyển đổi và tranh chấp | Toàn bộ | Toàn bộ | [screenshot-e1-dashboard-admin.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-admin.png) |
| **Quản lý danh sách Đơn đặt (Bookings)** | Xem toàn bộ đơn hàng trong hệ thống, trạng thái vòng đời Escrow (HELD, ACCEPTED, IN_SESSION, COMPLETED, DISPUTED) | UC03 | FR-003 | [screenshot-e1-admin-bookings.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-admin-bookings.png) |
| **Phê duyệt yêu cầu rút tiền (Withdrawals)** | Thẩm định yêu cầu rút tiền của Companion, phê duyệt chi tiền (tạo mã `SIM-PO`) hoặc từ chối hoàn trả số dư | UC01 | FR-005 | [screenshot-e1-dashboard-admin.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-admin.png) |
| **Duyệt hồ sơ định danh eKYC** | Kiểm tra thông tin giấy tờ tùy thân, ảnh selfie, đối chiếu khuôn mặt và phê duyệt trạng thái huy hiệu eKYC | UC01 | FR-001 | [screenshot-e1-dashboard-admin.png](file:///C:/INSTASQUAD/INSTASQUAD/docs/screenshot-e1-dashboard-admin.png) |

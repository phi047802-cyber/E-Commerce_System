# TÀI LIỆU CHUẨN HÓA TRẠNG THÁI ĐƠN HÀNG VÀ GIAO DIỆN (UI_STATES)

**Dự án:** INSTASQUAD — Nền tảng thuê bạn chơi game C2C  
**Ngày cập nhật:** 14/11/2026 (Đợt E1)  
**Mã đối chiếu:** REF-PROF-01, BR-08, BR-14, D21, D22, D23, D25, D29  
**Nguyên tắc:** Khiếu nại đã phán quyết (RESOLVED) thì đơn KHÔNG còn là đơn đang hoạt động (Khắc phục triệt để lỗi A.1).

---

## 1. Bảng Ánh Xạ Trạng Thái (Database vs Phân Nhóm UI)

| Mã trạng thái (`Booking.status`) | Trạng thái phụ / Quan hệ | Phân nhóm UI (`getBookingGroup`) | `isBookingActive` | Nhãn hiển thị tiếng Việt | Ghi chú vận hành |
|---|---|---|:---:|---|---|
| `PENDING_ACCEPTANCE` | - | `ACTIVE` | **Có** | Chờ xác nhận (180s) | Companion có 180s để nhận hoặc từ chối (BR-08) |
| `WAITING_COMPANION_RESPONSE` | - | `ACTIVE` | **Có** | Chờ xác nhận (180s) | Tương đương PENDING_ACCEPTANCE |
| `ACCEPTED` / `CONFIRMED` | - | `ACTIVE` | **Có** | Đã xác nhận | Đã giữ chỗ, chuẩn bị vào phiên chơi |
| `IN_SESSION` | - | `ACTIVE` | **Có** | Đang trong phiên | Hai bên đang giao lưu theo thời lượng đã đặt |
| `WAITING_RENTER_CONFIRM` | - | `ACTIVE` | **Có** | Chờ nghiệm thu (15p) | Phiên kết thúc, Renter có 15 phút nghiệm thu (BR-14) |
| `DISPUTED` | `dispute.status = 'OPEN'` | `DISPUTED` | **Có** | Đang khiếu nại | Renter mở khiếu nại, Escrow bị đóng băng |
| `DISPUTED` | `dispute.status = 'EVIDENCE_PENDING'` | `DISPUTED` | **Có** | Chờ bổ sung chứng cứ | CS yêu cầu bổ sung chứng cứ (hạn 24h) |
| `DISPUTED` | `dispute.status = 'UNDER_REVIEW'` | `DISPUTED` | **Có** | Đang khiếu nại | CS Agent đang nghiên cứu hồ sơ phán quyết |
| `DISPUTED` | `dispute.status = 'RESOLVED'` | `CANCELLED_OR_REFUNDED` | **Không** | Khiếu nại đã giải quyết | **LỖI A.1 ĐÃ KHẮC PHỤC**: Phán quyết xong thì đơn ĐÃ KẾT THÚC, không còn hiện trong "Đơn hẹn đang hoạt động" |
| `COMPLETED` | - | `COMPLETED` | **Không** | Hoàn tất | Tiền đã giải ngân 88% Companion, 12% Nền tảng |
| `CANCELLED` | - | `CANCELLED_OR_REFUNDED` | **Không** | Đã hủy | Hủy theo quy tắc D21 (100% / 70% / phạt) |
| `REFUNDED` | - | `CANCELLED_OR_REFUNDED` | **Không** | Đã hoàn tiền | Đã hoàn tiền cho Renter |
| `REJECTED` | - | `CANCELLED_OR_REFUNDED` | **Không** | Từ chối nhận | Companion từ chối nhận đơn |
| `TIMEOUT` | - | `CANCELLED_OR_REFUNDED` | **Không** | Hết giờ phản hồi | Quá 180s không nhận đơn, hệ thống tự hủy |

---

## 2. Quy Tắc Lọc Danh Sách Theo Vai Trò

### 2.1. Renter (Người thuê)
- **Đơn hẹn đang hoạt động**: Chỉ hiển thị các đơn có `isBookingActive(booking) === true` của chính Renter (`renter_id = user_id`).
- **Danh sách "Đơn của tôi"**: Cung cấp các tab lọc:
  1. *Tất cả*: Mọi đơn của chính Renter, sắp xếp giảm dần theo thời gian tạo.
  2. *Đang hoạt động*: `isBookingActive(b) === true`.
  3. *Hoàn tất*: `status === 'COMPLETED'`.
  4. *Khiếu nại*: `status === 'DISPUTED'` và chưa RESOLVED.
  5. *Đã hủy / hoàn tiền*: `['CANCELLED', 'REFUNDED', 'REJECTED', 'TIMEOUT']` hoặc khiếu nại đã `RESOLVED`.

### 2.2. Companion (Người đồng hành)
- **Yêu cầu chờ nhận**: Đơn `PENDING_ACCEPTANCE` có đồng hồ đếm ngược 180s.
- **Phiên sắp tới / Đang diễn ra**: Đơn có `isBookingActive(booking) === true` và `status !== 'PENDING_ACCEPTANCE'`. Khi khiếu nại đã được CS phán quyết `RESOLVED`, đơn lập tức rời khỏi mục này (Khắc phục dứt điểm Lỗi A.1).
- **Khiếu nại cần giải trình**: Đơn `DISPUTED` chờ nộp phản hồi/bằng chứng theo D29.
- **Ẩn hoàn toàn**: Danh sách "Companion online" và nút "Thuê".

### 2.3. CS Agent & Admin & Auditor
- **CS Agent**: Không tham gia thuê/nhận đơn, không nạp ví; chỉ xem hàng chờ xử lý tranh chấp và xem hồ sơ chi tiết (Dossier).
- **Auditor**: Giám sát sổ cái, phát hiện mất cân đối, cảnh báo kiểm toán; không hiển thị ví cá nhân hay đặt lịch.
- **Admin**:
  - Chỉ xem tổng quan vận hành, tỷ lệ chuyển đổi, báo cáo tài chính.
  - Màn hình "Quản lý đơn hàng" hiển thị toàn sàn, không dùng mục "Đơn của tôi" vốn chỉ dành cho người dùng cá nhân (Khắc phục dứt điểm Lỗi A.2).
  - Không hiển thị nút "Thuê" hoặc form "Nạp tiền cá nhân".

---

## 3. Mã Nguồn Chuẩn Hóa
- Backend: `server/src/common/bookingStates.ts`
- Frontend: `client/src/common/bookingStates.ts`
- Test tự động: `tests/unit/booking_states.test.ts`

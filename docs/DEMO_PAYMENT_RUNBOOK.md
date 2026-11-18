# SỔ TAY HƯỚNG DẪN THỰC THI DEMO NẠP TIỀN SEPAY (0Đ)
## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ DỊCH VỤ GAME COMPANION (INSTASQUAD)

> **Mục tiêu**: Hướng dẫn chi tiết từng bước chuẩn bị và thực hiện kịch bản demo nạp tiền tự động qua quét mã VietQR ngân hàng thực tế, chi phí 0đ, hạch toán Sổ cái kép và cập nhật số dư thời gian thực.  
> **Nguyên tắc an toàn**: Tuyệt đối không lưu khóa bí mật hoặc số tài khoản thật trong mã nguồn hoặc Git repository.

---

## 1. Chuẩn bị Hạ tầng & Tài khoản SePay (Chi phí 0đ)

### 1.1. Đăng ký tài khoản SePay Miễn phí
1. Truy cập [https://my.sepay.vn](https://my.sepay.vn) (hoặc môi trường thử nghiệm [https://my.dev.sepay.vn](https://my.dev.sepay.vn)).
2. Đăng ký tài khoản mới bằng email.
3. Chọn gói **FREE** (Miễn phí hoàn toàn, hỗ trợ tối đa 50 giao dịch tiền vào / tháng, phù hợp đồ án tốt nghiệp).
4. Vào mục **Ngân hàng kết nối**:
   - Chọn ngân hàng cá nhân của thành viên trong nhóm (ví dụ: MBBank, Vietcombank, Techcombank, TPBank...).
   - Nhập số tài khoản ngân hàng và tên chủ tài khoản.
5. Vào mục **Tích hợp Webhook** (Webhook Integration):
   - Nhấp **Tạo mới Webhook**.
   - Tạo một chuỗi **API Key** bí mật (ví dụ: `sepay_key_live_instasquad_2026`).

---

## 2. Thiết lập Tunnel Miễn phí (Exposing Local Server)

Webhook từ SePay cần gửi yêu cầu qua Internet công cộng đến máy tính chạy server local của bạn. Bạn có thể sử dụng một trong hai công cụ miễn phí sau:

### Phương án A: Cloudflare Tunnel (`cloudflared` - Khuyến nghị)
Ưu điểm: Không cần tài khoản, hoàn toàn miễn phí, hỗ trợ HTTPS tự động:
1. Tải `cloudflared` (hoặc cài qua `winget install Cloudflare.cloudflared`).
2. Mở cửa sổ PowerShell mới và chạy lệnh:
   ```powershell
   cloudflared tunnel --url http://localhost:4000
   ```
3. Quan sát kết quả trên console, tìm dòng URL HTTPS có dạng:
   ```
   https://xxxx-xxxx-xxxx.trycloudflare.com
   ```
4. Giữ cửa sổ PowerShell này luôn chạy trong suốt buổi demo.

### Phương án B: Ngrok
1. Mở cửa sổ PowerShell mới và chạy lệnh:
   ```powershell
   ngrok http 4000
   ```
2. Tìm dòng URL `Forwarding` có dạng `https://yyyy.ngrok-free.app`.

---

## 3. Cấu hình Môi trường Local (`.env`)

Mở tệp `.env` trong thư mục gốc của dự án (`C:\INSTASQUAD\INSTASQUAD\.env`) và điền các thông tin:

```bash
# 1. Bật chế độ SePay Webhook
PAYMENT_PROVIDER=sepay

# 2. Thông tin ngân hàng của nhóm
SEPAY_BANK_CODE=MBBank
SEPAY_ACCOUNT_NUMBER=0123456789
SEPAY_ACCOUNT_NAME=NGUYEN VAN A

# 3. API Key đã tạo trên SePay Dashboard
SEPAY_WEBHOOK_API_KEY=sepay_key_live_instasquad_2026

# 4. Domain Tunnel công khai vừa tạo ở Mục 2
PUBLIC_BASE_URL=https://xxxx-xxxx-xxxx.trycloudflare.com
```

### 3.1. Cập nhật Webhook URL trên SePay Dashboard
Truy cập vào trang quản trị SePay:
- **Webhook URL**: `https://xxxx-xxxx-xxxx.trycloudflare.com/api/webhooks/sepay`
- **Phương thức**: `POST`
- **Xác thực API Key**: Điền đúng chuỗi `sepay_key_live_instasquad_2026`
- Nhấp **Lưu cấu hình**.

> [!WARNING]
> Mỗi lần bạn tắt và mở lại `cloudflared` hoặc `ngrok`, domain tunnel sẽ thay đổi. Hãy nhớ cập nhật lại trường **Webhook URL** trên SePay Dashboard và trường `PUBLIC_BASE_URL` trong file `.env`!

---

## 4. Kịch bản Trình diễn Thực tế (Live Demo Runbook)

### Bước 1: Khởi động Ứng dụng
```powershell
# Chạy cả Client và Server
npm run dev
```
- Client: `http://localhost:5173`
- Server: `http://localhost:4000`

### Bước 2: Mở Modal Nạp tiền
1. Đăng nhập tài khoản Renter: `renter1@instasquad.test` (Mật khẩu: `Demo@123456`).
2. Nhấp vào nút **Nạp tiền** ở thanh bên trái (Sidebar).
3. Nhập số tiền nạp: `10.000` VND (để thử nghiệm thực tế với số tiền nhỏ).
4. Nhấp **Tạo mã QR nạp tiền**.

### Bước 3: Quét mã VietQR trên điện thoại
1. Màn hình máy tính hiển thị mã VietQR Compact2 kèm:
   - Ngân hàng thụ hưởng và Tên chủ tài khoản của nhóm.
   - Số tiền: `10.000 đ`.
   - Nội dung chuyển khoản duy nhất: dạng `INSQxxxxxxxx` (ví dụ `INSQHM5XXJGW`).
   - Đồng hồ đếm ngược hiệu lực: 15 phút.
2. Dùng điện thoại mở ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank, MoMo...).
3. Quét mã VietQR hiển thị trên màn hình máy tính.
4. Ứng dụng ngân hàng sẽ tự động điền đầy đủ số tiền và cú pháp `INSQxxxxxxxx`.
5. Bấm **Xác nhận chuyển khoản**.

### Bước 4: Quan sát Cập nhật Thời gian thực (Realtime Update)
1. Trong vòng **1 – 3 giây** sau khi chuyển khoản thành công:
   - SePay phát hiện biến động số dư tài khoản ngân hàng và kích hoạt Webhook gửi về URL Tunnel.
   - Backend INSTASQUAD xác thực chữ ký API Key, hạch toán Sổ cái kép và phát sự kiện WebSocket `TOPUP_SUCCESS`.
   - Màn hình máy tính của Renter **tự động đóng modal, hiển thị thông báo "Nạp tiền thành công" và cập nhật số dư ví khả dụng ngay lập tức mà KHÔNG cần tải lại trang (F5)**!

### Bước 5: Đối soát Sổ cái và Quản trị
1. **Kiểm tra Sổ cái**: Nhấp vào mục **Ví** $\rightarrow$ Xem lịch sử giao dịch. Bút toán `TOPUP` hiển thị rõ số tiền `+10.000 đ`, liên kết mã giao dịch ngân hàng và Sổ cái kép đối ứng.
2. **Kiểm tra Quota**: Đăng nhập tài khoản Quản trị viên `admin@instasquad.test`. Trên Admin Dashboard, chỉ rõ Card **Nạp SePay tháng này (0đ)** hiển thị số giao dịch đã tăng thêm 1 (ví dụ `6/50`), chứng minh việc kiểm soát chặt chẽ giới hạn gói miễn phí.

---

## 5. Phương án Dự phòng Offline / Khẩn cấp (Fallback Runbook)

Trường hợp tại hội đồng chấm thi mạng Wi-Fi trường chập chờn hoặc Tunnel bị lỗi kết nối:

### Kịch bản Dự phòng 1: Nút "Mô phỏng chuyển khoản" (DEV ONLY)
- Trong môi trường DEV (`NODE_ENV=development` và `PAYMENT_PROVIDER=simulator`):
- Trên Modal nạp tiền có sẵn nút **"Mô phỏng chuyển khoản (DEV ONLY)"**.
- Nhấp trực tiếp vào nút này: Hệ thống sẽ gửi yêu cầu Webhook giả lập nội bộ với chữ ký HMAC-SHA256, số dư ví Renter tự động nhảy thành công trong 0.1 giây.

### Kịch bản Dự phòng 2: Chuyển đổi nhanh qua File `.env`
1. Đổi `PAYMENT_PROVIDER=simulator` trong `.env`.
2. Khởi động lại server: Hệ thống hoạt động hoàn toàn độc lập mà không cần kết nối mạng bên ngoài.

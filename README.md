# INSTASQUAD — E-Commerce Game Companion Platform

> **Đồ án môn học Thương mại Điện tử / Kỹ thuật Phần mềm**  
> Nền tảng kết nối thuê Companion chơi game C2C an toàn, bảo vệ tài chính bằng cơ chế Ký quỹ (Escrow) và Sổ cái ghi kép bất biến (Double-Entry Ledger).

---

## 1. Giới thiệu tổng quan (Project Overview)

**INSTASQUAD** là nền tảng thương mại điện tử dịch vụ số theo mô hình **Khách hàng tới Khách hàng (C2C)**, cho phép người chơi game (Renter) tìm kiếm, đặt lịch và thuê bạn chơi cùng (Companion) theo khung giờ cố định.

Hệ thống giải quyết triệt để 3 vấn nạn nhức nhối nhất trong các giao dịch dịch vụ số ngang hàng hiện nay:
1. **Rủi ro bùng kèo, quỵt tiền và lừa đảo chuyển khoản ngoài**: Giải quyết bằng **Cơ chế Ký quỹ Escrow** và kênh chat phiên chơi có bộ lọc kiểm duyệt thông tin liên hệ nhạy cảm.
2. **Sai lệch và thất thoát tiền tệ**: Giải quyết bằng **Hệ thống Sổ cái ghi kép (Double-Entry Ledger)** bất biến, tuân thủ nguyên tắc kế toán $\sum \text{Debit} \equiv \sum \text{Credit}$.
3. **Tranh chấp và xung đột lịch đặt**: Giải quyết bằng **Khóa hàng nguyên tử trong DB Transaction (Atomic Slot Hold)** và **Quy trình phân xử khiếu nại (RMA)** minh bạch với CS Agent.

---

## 2. Tính năng cốt lõi (Core Capabilities)

- 🎮 **Danh mục & Hồ sơ Companion**: Tìm kiếm Companion theo Game, Rank kỹ năng, Giá/giờ; xem khung giờ rời rạc (Discrete Slots) và đánh giá uy tín.
- ⏱️ **Kiểm soát sức khỏe Companion**: Ràng buộc trần làm việc tối đa **10 giờ/ngày** theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh` UTC+7).
- 🔒 **Đặt lịch & Giữ chỗ nguyên tử (Slot Hold Lock)**: Chống Race Condition khi hai Renter cùng đặt một slot bằng DB Transaction mà không cần hạ tầng Redis phân tán. Chống đặt trùng bằng `request_key` (Idempotency).
- 💰 **Ký quỹ Escrow & Snapshot giá**: Chốt cứng `total_fee_snapshot` tại thời điểm đặt; khóa số dư ví khả dụng chuyển sang ký quỹ trong 1 transaction an toàn.
- ⏳ **Companion phản hồi 180s**: Đếm ngược 180 giây sau khi ký quỹ; Chấp nhận (khởi tạo Session) hoặc Từ chối/Quá hạn (tự động hủy và hoàn 100% Escrow cho Renter).
- 🚫 **Phân nhánh Hủy đơn trước giờ**: Hoàn 100% ($\ge 30$ phút), hoàn 70/30 (10–29 phút), phạt 100% theo tỷ lệ 88/12 ($< 10$ phút). Khóa nút hủy khi phiên chơi đã bắt đầu.
- 💬 **Phòng phiên chơi (Session Room) & Chat kiểm duyệt**: Phòng chat text nội bộ qua WebSocket; bộ lọc Regex tự động che số điện thoại, email, Zalo, Telegram và STK ngân hàng.
- ⚖️ **Nghiệm thu 15 phút & Tất toán 88/12**: Hết thời lượng thuê mở hạn 15m; Renter bấm Hoàn tất hoặc hết 15m tự động nghiệm thu giải ngân 88% cho Companion và 12% cho Sàn với thuật toán làm tròn số nguyên không mất 1 đồng.
- 🛡️ **Khiếu nại RMA & Đóng băng Escrow**: Renter báo sự cố lập tức khóa cứng Escrow (`FROZEN`); CS Agent thẩm định bằng chứng $\le 2$MB và phán quyết lỗi Companion $\ge 80\%$ (hoàn 100%, phạt 20% ghi nợ) hoặc $< 80\%$ (giải ngân 88/12).
- ⭐ **Đánh giá hai chiều & TrustScore**: Đánh giá 1–5 sao bất biến; tính toán điểm uy tín theo công thức BPMN chuẩn trong đoạn $[0, 100]$; tự động tạm khóa nếu điểm $< 40$.
- 🏦 **Vòng đời rút tiền mô phỏng (Withdrawal)**: Companion tạo yêu cầu rút $\rightarrow$ phong tỏa số dư ví khả dụng; Admin từ chối $\rightarrow$ Sổ cái sinh bút toán hoàn trả lại ví.
- 📊 **Đối soát Sổ cái kép thời gian thực**: Màn hình đối soát dành riêng cho Kiểm toán viên (`Auditor`) kiểm tra độ lệch phương sai ($\text{Variance} \equiv 0$) và xử lý cảnh báo ngoại lệ `LedgerAuditAlert`.

---

## 3. Công nghệ sử dụng (Technology Stack)

| Tầng kiến trúc | Công nghệ lựa chọn | Lý do học thuật & Ưu điểm |
|:---|:---|:---|
| **Kiến trúc** | **Modular Monolith** | Đóng gói trong 1 repository, phân chia module miền nghiệp vụ rõ rệt, dễ demo, không phát sinh chi phí hạ tầng. |
| **Backend** | **Node.js + Express (TypeScript)** | Toàn bộ codebase dùng TypeScript strict mode; xử lý bất đồng bộ mạnh mẽ với `async/await`. |
| **Frontend** | **React 18 + Vite + Tailwind CSS** | Khởi động tức thì, bundle tối ưu (73.78 kB gzip), giao diện người dùng chuyên nghiệp hỗ trợ 5 vai trò. |
| **Cơ sở dữ liệu** | **SQLite 3 qua Prisma ORM** | **100% Zero-config**, không cần cài database daemon, tương thích chuyển đổi tức thì sang PostgreSQL. |
| **Kênh Realtime** | **WebSocket Server (`ws`)** | Tích hợp trực tiếp vào Express HTTP server, không phụ thuộc dịch vụ trả phí bên thứ ba (Pusher/Firebase). |
| **Kiểm thử** | **Vitest + Supertest** | 22 test suites, **228 tests PASS (100% GREEN)**, bao phủ trọn vẹn 70 Acceptance Tests WBS cùng các ca kiểm thử bảo mật nâng cao P0, eKYC AES-256-GCM, Anti-Enumeration, SiteVisit bot filtering/HMAC và Sổ cái kép. |
| **Container hóa** | **Docker & Docker Compose** | Multi-stage build độc lập trên nền Linux Alpine, khởi chạy trọn gói bằng 1 lệnh duy nhất. |

---

## 4. Yêu cầu hệ thống (Prerequisites)

- **Hệ điều hành**: Windows 10/11, macOS hoặc Linux.
- **Node.js**: Phiên bản `18.x`, `20.x`, `22.x` hoặc `24.x` (Đã kiểm thử thực tế trên Node `v24.14.1`).
- **NPM**: Phiên bản `9.x` trở lên (Đã kiểm thử trên npm `11.11.0`).
- **Docker** *(Tùy chọn)*: Docker Desktop nếu muốn chạy trong môi trường containerized.

---

## 5. Cấu hình biến môi trường (.env Configuration)

Hệ thống đã có sẵn tệp cấu hình mẫu `.env.example`. Khi khởi tạo, sao chép sang `.env`:

```bash
cp .env.example .env
```

| Biến môi trường | Giá trị mặc định | Mô tả |
|:---|:---|:---|
| `PORT` | `4000` | Cổng lắng nghe của Backend API & WebSocket Server. |
| `NODE_ENV` | `development` | Môi trường chạy (`development` hoặc `production`). Khi ở `production`, API `reset-demo` sẽ tự động bị khóa. |
| `DATABASE_URL` | `"file:./prisma/dev.db"` | Đường dẫn file cơ sở dữ liệu SQLite cục bộ. |
| `JWT_SECRET` | `"instasquad_super_secret_jwt_demo_key_2026"` | Khóa ký mã hóa JSON Web Token định danh người dùng. |
| `CLIENT_URL` | `"http://localhost:5173"` | Địa chỉ CORS cho phép Frontend truy cập API. |
| `HOLD_TTL_MINUTES` | `10` | Thời hạn giữ slot tạm thời (áp dụng theo Quyết định D01). |

---

## 6. Hướng dẫn khởi chạy (Setup & Execution)

### Cách 1: Khởi chạy nhanh 1-click (Khuyến nghị cho chấm bài)

#### Trên Windows:
Nhấp đúp vào tệp kịch bản tự động:
```powershell
.\scripts\run-dev.bat
```
Hoặc mở terminal PowerShell tại thư mục dự án và chạy:
```powershell
npm run setup && npm run dev
```

#### Trên macOS / Linux:
```bash
chmod +x scripts/*.sh
./scripts/run-dev.sh
```

### Cách 2: Thiết lập từng bước thủ công

```bash
# 1. Cài đặt dependencies cho Backend và Frontend (với cờ --ignore-scripts nếu môi trường Node 18.16)
npm run setup

# Hoặc thiết lập thủ công:
npm install --ignore-scripts
npm --prefix client install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

# 2. Khởi chạy ứng dụng song song
npm run dev
```

> [!NOTE]
> **Tương thích Node 18.16**: Script `npm run setup` cấu hình cờ `--ignore-scripts` để vượt qua kiểm tra phiên bản preinstall của Prisma 6 trên Node 18.16. Mã nguồn và Prisma Client chạy ổn định 100% trên cả Node 18, 20, 22 và 24.
> 
> **Triển khai sạch (Clean Clone)**: Chỉ cần chạy lệnh `npx prisma migrate deploy` để áp dụng toàn bộ 3 migration của dự án vào cơ sở dữ liệu SQLite mới mà không gặp bất kỳ lỗi thiếu bảng/cột nào.

### Cách 3: Khởi chạy bằng Docker

```bash
docker compose up --build
```

Ứng dụng sẽ tự động chạy toàn bộ migrations, nạp seed data và mở tại:
- **Frontend Web UI**: `http://localhost:5173`
- **Backend API Server**: `http://localhost:4000` (Health check: `http://localhost:4000/api/health`)
- **WebSocket Endpoint**: `ws://localhost:4000/ws`

---

## 7. Quy trình Kiểm thử Tự động (Automated Testing)

Hệ thống sở hữu bộ kiểm thử tự động toàn diện gồm **228 test cases** thuộc **22 test files** (18 integration test suites với 187 tests, 3 unit test suites với 29 tests):

```bash
# Chạy toàn bộ 228 ca kiểm thử tự động
npm test

# Chạy riêng nhóm Unit Tests & Bất biến bảo toàn tiền tệ (29 tests)
npx vitest run tests/unit

# Chạy riêng nhóm Integration Tests & Kiểm thử bảo mật (187 tests)
npx vitest run tests/integration
```

---

## 8. Quy định thống nhất giới hạn Upload dữ liệu & Đệm Base64 qua JSON

Hệ thống thống nhất quy định kích thước tệp tải lên của người dùng trên toàn bộ các tài liệu và API:
- **Âm thanh giới thiệu Companion (`audio_intro`)**: $\le 2$MB (định dạng `audio/webm`, `audio/mp3`, `audio/ogg`).
- **File ảnh bằng chứng khiếu nại RMA (`evidence_file`)**: $\le 2$MB (định dạng `image/jpeg`, `image/png`, `image/webp`).
- **Mỗi ảnh giấy tờ tùy thân eKYC (`front`, `back`, `selfie`)**: $\le 2$MB/ảnh.
- **Cơ chế đệm HTTP Body Base64 (3MB và 10MB)**: Do mã hóa Base64 qua JSON làm tăng $\approx 33.3\%$ kích thước tệp nhị phân gốc, router Express cấu hình giới hạn sơ bộ `limit: '3mb'` (cho audio và ảnh khiếu nại) và `limit: '10mb'` (cho gói 3 ảnh eKYC) để tiếp nhận an toàn trước khi giải mã và kiểm tra dung lượng thật $\le 2$MB.

> [!NOTE]
> Báo cáo kiểm thử độc lập chi tiết về kết quả từng nhóm được lưu trữ tại [`docs/QA_REPORT.md`](file:///c:/Users/pc/Documents/INSTASQUAD/docs/QA_REPORT.md).

---

## 9. Danh sách tài khoản thử nghiệm có sẵn (Demo Seed Accounts)

> [!IMPORTANT]
> **Lưu ý bảo mật**: Toàn bộ tài khoản dưới đây là **tài khoản minh họa giả lập (Illustrative Mock Accounts)** phục vụ môi trường demo học thuật cục bộ. Không sử dụng mật khẩu này cho bất kỳ hệ thống sản xuất thực tế nào.

🔑 **Mật khẩu dùng chung cho tất cả tài khoản**: `Demo@123456`

| Vai trò | Email đăng nhập | Tên người dùng & Số dư ban đầu | Mục đích và Kịch bản Demo |
|:---|:---|:---|:---|
| **Renter** | `renter1@instasquad.test` | Minh Hoàng — **Ví có sẵn 500.000 VND** | Demo luồng đặt lịch tức thì, ký quỹ Escrow thành công, chat phiên chơi. |
| **Renter** | `renter2@instasquad.test` | Khánh Vy — **Ví 0 VND** | Demo cảnh báo thiếu số dư và nạp tiền qua Payment Simulator. |
| **Companion** | `companion1@instasquad.test` | Bảo Ngọc — **TrustScore 95.0**, giá 100k/h | Demo nhận đơn trong 180s, nghiệm thu giải ngân 88/12, rút tiền. |
| **Companion** | `companion2@instasquad.test` | Tuấn Anh — **TrustScore 80.0**, giá 150k/h | Demo tài khoản Companion mới, nhận đánh giá sao, tính TrustScore. |
| **CS Agent** | `cs_agent@instasquad.test` | CS Hỗ trợ khách hàng | Demo tiếp nhận hồ sơ RMA, xem ảnh chứng cứ, ra phán quyết lỗi. |
| **Auditor** | `auditor@instasquad.test` | Kiểm toán viên tài chính | Demo tra cứu Sổ cái kép, kiểm tra đối soát cân bằng và xem cảnh báo lỗi. |
| **Admin** | `admin@instasquad.test` | Quản trị viên hệ thống | Quản trị toàn sàn, phê duyệt rút tiền, quản lý danh mục game. |

---

## 10. Hai con số tổng kết đối chiếu tham chiếu vận hành (Playerduo & Lita)

Theo [`docs/REFERENCE_MAPPING.md`](file:///c:/INSTASQUAD/INSTASQUAD/docs/REFERENCE_MAPPING.md), hệ thống tách bạch rõ ràng ba phương diện đối chiếu chuẩn hóa (28 dòng REF):
1. **Mức hoàn thiện triển khai (28 dòng REF)**: **25 dòng ĐẦY ĐỦ (89.3%)**, **2 dòng MỘT PHẦN (7.1%)** (`REF-CHAT-01`, `REF-TAX-01`), **1 dòng CHƯA CÓ / CHƯA ĐÁP ỨNG (3.6%)** (`REF-AUTH-03` – Google OAuth2), **0 dòng thiếu ngoài tầm kiểm soát**.
2. **Độ chính xác tài liệu tham chiếu (28 dòng REF)**: **24 dòng KHỚP (85.7%)**, **3 dòng KHÁC NGUỒN (10.7%)** (`REF-DONE-01`, `REF-WDRAW-02`, `REF-TAX-01`), **1 dòng CHƯA KIỂM CHỨNG ĐƯỢC (3.6%)** (Ảnh Lita nút Nạp Xu `REF-TOPUP-01` chưa có tệp trên đĩa).
3. **Phân loại theo Loại thiết kế (28 dòng REF)**: **23 dòng LẤY THEO NGUỒN (82.1%)**, **2 dòng NHÓM PHÁT TRIỂN THÊM (7.1%)** (`REF-TOPUP-03`, `REF-TOPUP-05`), **3 dòng KHÁC NGUỒN (10.7%)** (`REF-DONE-01`, `REF-WDRAW-02`, `REF-TAX-01`).

---

## 11. Xử lý sự cố thường gặp (Troubleshooting)

1. **Lỗi `EADDRINUSE: address already in use :::4000` hoặc `:::5173`**:
   - Cổng 4000 hoặc 5173 đang bị tiến trình khác chiếm giữ.
   - *Cách xử lý nhanh trên Windows*: Mở PowerShell và chạy lệnh:
     ```powershell
     Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess -Force
     ```
   - Hoặc chỉnh sửa `PORT=4001` trong tệp `.env`.
2. **Cần khôi phục dữ liệu demo sạch trong 1 giây (Database Reset)**:
   - Trên thanh điều hướng Header của giao diện web, nhấp vào nút `[MOCK] Reset DB`.
   - Hoặc từ dòng lệnh terminal:
     ```bash
     npm run prisma:seed
     ```
   - Lệnh seed được thiết kế theo cơ chế **Idempotent**, tự động làm sạch các bảng và nạp lại trạng thái ban đầu an toàn.
3. **Mã nguồn Backend không tự reload khi sửa code**:
   - Server sử dụng `tsx watch`, tự động theo dõi các tệp trong `server/src/`. Nếu không nhận diện thay đổi, hãy kiểm tra lại quyền truy cập thư mục của hệ điều hành.

---

## 12. Giới hạn học thuật & Ranh giới phạm vi (Scope Limitations)

Dự án được xây dựng dưới dạng sản phẩm đồ án sinh viên đại học với mục tiêu chứng minh kiến trúc kỹ thuật và giải pháp an toàn tài chính. Để bảo đảm **100% miễn phí** và **chạy local độc lập**, các ranh giới học thuật được xác lập như sau:

1. **Cổng thanh toán & Ngân hàng**: Sử dụng **Payment Simulator nội bộ** mô phỏng đầy đủ giao thức Webhook có chữ ký bảo mật HMAC SHA-256. Không kết nối tài khoản ngân hàng thật hoặc cổng thanh toán thương mại có phí (VNPay/MoMo/Stripe).
2. **Kênh trao đổi phiên chơi**: Triển khai chat văn bản thời gian thực qua WebSocket cục bộ có bộ lọc regex kiểm duyệt từ khóa nhạy cảm. Không triển khai gọi thoại WebRTC hoặc streaming video đám mây (tránh chi phí hạ tầng STUN/TURN server).
3. **Hạ tầng phân tán**: Sử dụng khóa giao dịch nguyên tử trong Cơ sở dữ liệu (`prisma.$transaction`) để giải quyết bài toán chống đặt trùng slot. Không triển khai cụm Redis hoặc Apache Kafka phân tán.
4. **Hàng hóa vật lý**: Hệ thống là sàn giao dịch dịch vụ số C2C thuần túy, hoàn toàn không có thực thể kho bãi, giỏ hàng nhiều món hay phí vận chuyển giao nhận (theo Quy tắc BR-27).
5. **Đăng nhập mạng xã hội Google OAuth2 (FR-001)**: **FR-001 OAuth2: CHƯA ĐÁP ỨNG**. Lý do: Môi trường đánh giá học thuật cục bộ chạy Node.js v18.16.0 (thư viện chính thức `google-auth-library@11` yêu cầu Node.js $\ge 22$), thiếu thông tin định danh `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` từ Google Cloud Console và thiếu tên miền public SSL. Phía backend chưa triển khai endpoint xác thực chữ ký số ID token RSA-256 từ Google JWKS. Giao diện client chủ động không kích hoạt nút này nhằm bảo đảm an toàn. Hướng bổ sung: Nâng cấp Node runtime $\ge 22$, đăng ký GCP Console, cài đặt `google-auth-library` tại server để xác minh ID token (`audience`, `email_verified`), tự động liên kết/tạo tài khoản và cấp phát JWT token sàn.

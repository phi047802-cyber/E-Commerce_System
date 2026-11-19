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
| **Mobile** | **Flutter (iOS + Android)** | Renter & Companion; dùng chung REST API + SQL Server với Web; deep link `instasquad://`, App Links `/go/*` (`mobile/README.md`). |
| **Cơ sở dữ liệu** | **SQL Server 2022 qua Prisma ORM** | Khóa slot bằng `UPDATE … WHERE status='AVAILABLE'`, filtered unique index (D34); chạy trong container Docker (D33). |
| **Kênh Realtime** | **WebSocket Server (`ws`)** | Tích hợp trực tiếp vào Express HTTP server, không phụ thuộc dịch vụ trả phí bên thứ ba (Pusher/Firebase). |
| **Kiểm thử** | **Vitest + Supertest, Flutter test** | Backend 43 file / **435 test** trên SQL Server; E2E HTTP 44 kiểm tra; Mobile 29 test. Số liệu: `docs/QA_REPORT.md`. |
| **Container hóa** | **Docker & Docker Compose** | Multi-stage build độc lập trên nền Linux Alpine, khởi chạy trọn gói bằng 1 lệnh duy nhất. |

---

## 4. Yêu cầu hệ thống (Prerequisites)

- **Hệ điều hành**: Windows 10/11, macOS hoặc Linux.
- **Node.js**: `20.x`, `22.x` hoặc `24.x` (đã kiểm thử trên Node `v24.15.0`, npm `11.12.1`).
- **Docker Desktop**: chạy SQL Server 2022 trong container `instasquad-mssql` (cổng `14330`). Hoặc dùng SQL Server cài sẵn đã bật TCP/IP + SQL login (D33).
- **Flutter SDK** *(chỉ khi làm Mobile)*: ≥ 3.35, đã kiểm chứng trên `3.50.0` stable. Chạy App trên giả lập/thiết bị cần thêm Android SDK hoặc Xcode.

---

## 5. Cấu hình biến môi trường (.env Configuration)

Sao chép tệp mẫu (script khởi chạy nhanh tự làm việc này):

```powershell
Copy-Item .env.example .env
```

| Biến môi trường | Giá trị mặc định | Mô tả |
|:---|:---|:---|
| `PORT` | `4000` | Cổng Backend API & WebSocket (đồng thời phục vụ bản build Web). |
| `NODE_ENV` | `development` | Ở `production`, API `reset-demo` tự động bị khóa. |
| `DATABASE_URL` | `sqlserver://localhost:14330;database=instasquad;…` | Chuỗi kết nối SQL Server. Bộ test tự dùng DB `<tên>_test` (D41). |
| `JWT_SECRET` | *(xem `.env.example`)* | Khóa ký JWT — **đổi** ở môi trường thật. |
| `CORS_ORIGIN` | `http://localhost:5173` | Địa chỉ Web dev (Vite) được phép gọi API. |
| `SLOT_HOLD_TTL_MINUTES` / `BOOKING_RESPONSE_TIMEOUT_SECONDS` / `FULFILLMENT_ACCEPTANCE_TIMEOUT_MINUTES` | `10` / `180` / `15` | Giữ slot, hạn phản hồi Companion, hạn nghiệm thu. |
| `ENABLE_BACKGROUND_WORKER` | `true` | Worker nền quét hết hạn 180s / 15 phút (chu kỳ `BACKGROUND_WORKER_INTERVAL_MS`). |
| `REQUIRE_TERMS_ACCEPTANCE` | `true` | Chặn giao dịch khi chưa chấp thuận điều khoản hiện hành (D39). |
| `ANDROID_PACKAGE_NAME`, `ANDROID_SHA256_CERT_FINGERPRINTS`, `IOS_TEAM_ID`, `IOS_BUNDLE_ID` | `vn.instasquad.app`, giá trị mẫu | Nội dung `/.well-known/*` cho App Links / Universal Links. |

---

## 6. Hướng dẫn khởi chạy (Setup & Execution)

### Cách 1: Khởi chạy nhanh 1-click (Windows)

```powershell
.\scripts\run-dev.bat
```

Script tạo `.env` nếu chưa có, bật container SQL Server, tạo database, áp migration rồi chạy song song Backend (`http://localhost:4000`) và Web (`http://localhost:5173`). macOS / Linux: `./scripts/run-dev.sh`.

### Cách 2: Từng bước (3 lệnh — lần đầu)

```powershell
npm run db:up      # bật container SQL Server 2022 (cổng 14330)
npm run setup      # tạo .env từ .env.example nếu chưa có, cài package (gồm client/), prisma generate, tạo DB, migrate, seed
npm run dev        # Backend :4000 + Web :5173
```

`npm run db:reset` đưa DB dev về dữ liệu seed sạch (xóa dữ liệu hiện có của DB dev).

### Cách 3: Docker toàn bộ

```powershell
docker compose up -d --build
```

Mở `http://localhost:4000` (Backend phục vụ luôn bản build Web). Dữ liệu SQL Server nằm trong volume `instasquad_mssql_data`.

> [!WARNING]
> Không chạy `docker system prune --volumes` hoặc "Clean / Purge data" trong Docker Desktop: thao tác này xóa volume chứa CSDL.

### Mobile App (Flutter)

Xem [mobile/README.md](mobile/README.md). Tóm tắt:

```powershell
cd mobile
flutter pub get
flutter test
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000
```

---

## 7. Quy trình Kiểm thử Tự động (Automated Testing)

Chi tiết và số liệu đo: [docs/QA_REPORT.md](docs/QA_REPORT.md).

```powershell
# Backend: 43 file / 435 test trên DB SQL Server riêng `instasquad_test` (tự migrate + seed)
npm test
npx vitest run tests/unit           # 6 file / 69 test (toán tài chính, TrustScore, bất biến sổ cái)
npx vitest run tests/integration    # 35 file / 351 test (API, bảo mật, đồng thời trên SQL Server)

# Đối soát sổ cái trên DB đang trỏ tới (chỉ đọc)
npm run ledger:reconcile

# E2E qua HTTP thật — chạy trên DB QA riêng, KHÔNG chạy trên DB dev (xem QA_REPORT §8)
node scripts/qa/e2e-api-workflow.mjs http://localhost:4100

# Mobile
cd mobile; flutter analyze; flutter test
```

> [!NOTE]
> Tiến trình Node đôi khi sập ở tầng native khi chạy bộ test Backend trên Windows (mã `0xC0000409` hoặc `ERR_IPC_CHANNEL_CLOSED`) dù mọi test đều pass khi chạy trọn — chạy lại lệnh. Chi tiết: QA_REPORT §1.3, D44.

---

## 8. Quy định thống nhất giới hạn Upload dữ liệu & Đệm Base64 qua JSON

Hệ thống thống nhất quy định kích thước tệp tải lên của người dùng trên toàn bộ các tài liệu và API:
- **Âm thanh giới thiệu Companion (`audio_intro`)**: $\le 2$MB (định dạng `audio/webm`, `audio/mp3`, `audio/ogg`).
- **File ảnh bằng chứng khiếu nại RMA (`evidence_file`)**: $\le 2$MB (định dạng `image/jpeg`, `image/png`, `image/webp`).
- **Mỗi ảnh giấy tờ tùy thân eKYC (`front`, `back`, `selfie`)**: $\le 2$MB/ảnh.
- **Cơ chế đệm HTTP Body Base64 (3MB và 10MB)**: Do mã hóa Base64 qua JSON làm tăng $\approx 33.3\%$ kích thước tệp nhị phân gốc, router Express cấu hình giới hạn sơ bộ `limit: '3mb'` (cho audio và ảnh khiếu nại) và `limit: '10mb'` (cho gói 3 ảnh eKYC) để tiếp nhận an toàn trước khi giải mã và kiểm tra dung lượng thật $\le 2$MB.

> [!NOTE]
> Báo cáo kiểm thử độc lập chi tiết về kết quả từng nhóm được lưu trữ tại [`docs/QA_REPORT.md`](docs/QA_REPORT.md).

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

Theo [`docs/REFERENCE_MAPPING.md`](docs/REFERENCE_MAPPING.md), hệ thống tách bạch rõ ràng ba phương diện đối chiếu chuẩn hóa (28 dòng REF):
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
     npm run db:reset
     ```
   - `db:reset` xóa và dựng lại DB dev từ migration rồi seed dữ liệu demo (chỉ tác động DB trong `DATABASE_URL`).
3. **Mã nguồn Backend không tự reload khi sửa code**:
   - `npm run dev:server` chạy `tsx server/src/server.ts` (không bật chế độ watch). Sau khi sửa mã Backend, dừng (`Ctrl+C`) rồi chạy lại `npm run dev`.
4. **Không kết nối được SQL Server (Prisma `P1001` / Can't reach database server)**:
   - Kiểm tra Docker Desktop đang chạy rồi `npm run db:up`; container cần ~10–20 giây để sẵn sàng (`docker logs instasquad-mssql`).
   - Nếu Docker báo lỗi engine dừng: kiểm tra dung lượng ổ C (ổ đầy làm Docker không khởi động được). Giải phóng dung lượng **không** dùng `docker system prune --volumes` hay "Clean / Purge data" vì sẽ xóa CSDL.
   - Sau khi khởi động lại, SQL Server tự recovery các database; kiểm tra bằng `npm run ledger:reconcile`.

---

## 12. Giới hạn học thuật & Ranh giới phạm vi (Scope Limitations)

Dự án được xây dựng dưới dạng sản phẩm đồ án sinh viên đại học với mục tiêu chứng minh kiến trúc kỹ thuật và giải pháp an toàn tài chính. Để bảo đảm **100% miễn phí** và **chạy local độc lập**, các ranh giới học thuật được xác lập như sau:

1. **Cổng thanh toán & Ngân hàng**: Sử dụng **Payment Simulator nội bộ** mô phỏng đầy đủ giao thức Webhook có chữ ký bảo mật HMAC SHA-256. Không kết nối tài khoản ngân hàng thật hoặc cổng thanh toán thương mại có phí (VNPay/MoMo/Stripe).
2. **Kênh trao đổi phiên chơi**: Triển khai chat văn bản thời gian thực qua WebSocket cục bộ có bộ lọc regex kiểm duyệt từ khóa nhạy cảm. Không triển khai gọi thoại WebRTC hoặc streaming video đám mây (tránh chi phí hạ tầng STUN/TURN server).
3. **Hạ tầng phân tán**: Sử dụng khóa giao dịch nguyên tử trong Cơ sở dữ liệu (`prisma.$transaction`) để giải quyết bài toán chống đặt trùng slot. Không triển khai cụm Redis hoặc Apache Kafka phân tán.
4. **Hàng hóa vật lý**: Hệ thống là sàn giao dịch dịch vụ số C2C thuần túy, hoàn toàn không có thực thể kho bãi, giỏ hàng nhiều món hay phí vận chuyển giao nhận (theo Quy tắc BR-27).
5. **Đăng nhập mạng xã hội Google OAuth2 (FR-001)**: **FR-001 OAuth2: CHƯA ĐÁP ỨNG**. Lý do: Môi trường đánh giá học thuật cục bộ chạy Node.js v18.16.0 (thư viện chính thức `google-auth-library@11` yêu cầu Node.js $\ge 22$), thiếu thông tin định danh `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` từ Google Cloud Console và thiếu tên miền public SSL. Phía backend chưa triển khai endpoint xác thực chữ ký số ID token RSA-256 từ Google JWKS. Giao diện client chủ động không kích hoạt nút này nhằm bảo đảm an toàn. Hướng bổ sung: Nâng cấp Node runtime $\ge 22$, đăng ký GCP Console, cài đặt `google-auth-library` tại server để xác minh ID token (`audience`, `email_verified`), tự động liên kết/tạo tài khoản và cấp phát JWT token sàn.

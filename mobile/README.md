# INSTASQUAD Mobile (Flutter — iOS & Android)

App dành cho **Renter** và **Companion**, gọi **cùng Backend REST API và cùng CSDL SQL Server** với Web
(`docs/UNIFIED_WORKFLOW.md`). CS / Admin / Auditor dùng Web Portal. App không tự tính tiền hay quyết định trạng thái:
mọi số tiền, phí hủy, giải ngân 88/12 do server tính và ghi sổ cái.

## Yêu cầu

- Flutter SDK **≥ 3.35** (đã kiểm chứng trên **3.50.0 stable**, Dart 3.14). Máy dev: `D:\flutter` (D43).
- Backend chạy ở cổng `4000` (`npm run dev:server` ở thư mục gốc, SQL Server qua `npm run db:up`).
- Chạy trên thiết bị/giả lập cần Android SDK (Android Studio) hoặc Xcode (macOS) — **chưa cài trên máy dev**.

## Lệnh

```powershell
cd mobile
D:\flutter\bin\flutter.bat pub get
D:\flutter\bin\flutter.bat analyze
D:\flutter\bin\flutter.bat test
# Android Emulator (host = 10.0.2.2) — mặc định:
D:\flutter\bin\flutter.bat run
# Thiết bị thật / iOS Simulator: trỏ API về máy chạy backend
D:\flutter\bin\flutter.bat run --dart-define=API_BASE_URL=http://192.168.1.10:4000
```

Gợi ý: đặt `PUB_CACHE=D:\pub-cache` để cache package nằm trên ổ D.

## Màn hình ↔ 8 bước quy trình

| Bước | Màn hình (`lib/features/…`) |
|---|---|
| 1 Tìm kiếm | `discover/discover_screen.dart` (tab Game / Trò chuyện & Giải trí) |
| 2 Đặt lịch & giữ slot | `discover/companion_detail_screen.dart` → `BookingSheet` (`request_key` idempotency, chặn `TERMS_NOT_ACCEPTED`) |
| 3 Ký quỹ | `BookingSheet` / `booking/booking_detail_screen.dart`, nạp tiền mô phỏng ở `wallet/wallet_screen.dart` |
| 4 Phản hồi 180s, 4b hủy | `booking/booking_detail_screen.dart` |
| 5 Thực hiện phiên | `session/session_room_screen.dart` (chat chữ, server che SĐT/link/STK) |
| 6 Nghiệm thu / khiếu nại | `session/session_room_screen.dart` → `ReportIssueSheet` |
| 7 Giải ngân 88/12 | `wallet/wallet_screen.dart` (lịch sử sổ cái) |
| 8 Đánh giá | `review/review_sheet.dart` |
| Khác | `auth/login_screen.dart`, `legal/terms_screen.dart`, `workflow/workflow_screen.dart`, `home/home_shell.dart` |

## Deep link (`docs/NON_GAMER_GROWTH_STRATEGY.md` §4)

- Scheme tùy biến: `instasquad://companion/{id}`, `instasquad://discover?c=social`, `instasquad://booking/{id}`, `instasquad://wallet`.
- App Links / Universal Links: `https://<domain>/go/*` và `/app/*`; server phục vụ `/.well-known/assetlinks.json` và
  `/.well-known/apple-app-site-association`. ID ứng dụng: `vn.instasquad.app` (Android & iOS).
- Domain hiện là placeholder `instasquad.example`: Android đổi bằng `-PdeepLinkHost=<domain>`; iOS sửa
  `ios/Runner/Runner.entitlements`. Chứng chỉ ký, SHA-256 và Apple Team ID cấu hình khi phát hành (**DEFERRED**, D36).
- Deep link mặc định của Flutter bị tắt; `app_links` + `go_router` xử lý (`lib/core/deep_links.dart`). Link cần đăng nhập
  được giữ trong `?next=` và mở lại sau khi đăng nhập.

## Kiểm thử

`test/core_test.dart` (deep link, định dạng tiền/giờ, nhãn trạng thái, model) và `test/workflow_screens_test.dart`
(widget test từng bước trên màn hình 360×800, backend giả có JSON theo đúng hình dạng API thật).

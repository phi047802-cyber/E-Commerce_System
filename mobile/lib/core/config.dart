/// Cấu hình môi trường. Đổi khi build:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:4000
/// Mặc định `10.0.2.2` là địa chỉ máy host nhìn từ Android Emulator (iOS Simulator dùng `localhost`).
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  /// Phiên bản điều khoản App gửi kèm khi chấp thuận (server kiểm tra lại, D39).
  static const String termsVersion = 'TOS-2026.11';

  /// Scheme deep link tùy biến (khớp `/go/*` landing page phía server).
  static const String deepLinkScheme = 'instasquad';
}

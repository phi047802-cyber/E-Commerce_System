import 'dart:convert';

import 'package:http/http.dart' as http;

import 'config.dart';

/// Lỗi nghiệp vụ từ server: `{ success: false, error: { code, message } }`.
class ApiException implements Exception {
  ApiException(this.code, this.message, {this.status});

  final String code;
  final String message;
  final int? status;

  @override
  String toString() => '$message ($code)';
}

/// HTTP client mỏng dùng chung cho mọi màn hình. Mọi quy tắc tiền/trạng thái do server quyết định;
/// App chỉ gửi yêu cầu và hiển thị kết quả (UNIFIED_WORKFLOW.md §3).
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        _baseUrl = baseUrl ?? AppConfig.apiBaseUrl;

  final http.Client _http;
  final String _baseUrl;
  String? token;

  Map<String, String> _headers({Map<String, String>? extra}) => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
        ...?extra,
      };

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('$_baseUrl$path').replace(queryParameters: query);

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final res = await _http.get(_uri(path, query), headers: _headers());
    return _decode(res);
  }

  Future<dynamic> post(String path, {Object? body, Map<String, String>? headers}) async {
    final res = await _http.post(
      _uri(path),
      headers: _headers(extra: headers),
      body: jsonEncode(body ?? const <String, dynamic>{}),
    );
    return _decode(res);
  }

  dynamic _decode(http.Response res) {
    Map<String, dynamic> json;
    try {
      json = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('BAD_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ (HTTP ${res.statusCode}).', status: res.statusCode);
    }
    if (json['success'] == true) return json['data'];
    final err = (json['error'] as Map<String, dynamic>?) ?? const {};
    throw ApiException(
      (err['code'] as String?) ?? 'UNKNOWN_ERROR',
      (err['message'] as String?) ?? 'Đã có lỗi xảy ra.',
      status: res.statusCode,
    );
  }

  /// Khóa idempotency cho thao tác tiền/đặt lịch (BR-01): gửi lặp cùng khóa không tạo thêm bút toán.
  static String newRequestKey(String prefix) =>
      '$prefix-${DateTime.now().microsecondsSinceEpoch}-${Object().hashCode.toRadixString(36)}';
}

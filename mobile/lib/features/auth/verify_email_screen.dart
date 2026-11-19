import 'dart:async';

import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/api_client.dart';
import '../../core/config.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// UC01 — Xác minh email bằng OTP 6 số. Bắt buộc trước khi đặt lịch / nạp tiền (server trả `EMAIL_NOT_VERIFIED`).
/// Quy tắc do server quyết định: gửi lại sau 60 giây, mã hết hạn sau 10 phút, tối đa 5 lần nhập sai.
class VerifyEmailScreen extends StatefulWidget {
  const VerifyEmailScreen({super.key, this.next});

  /// Màn hình quay lại sau khi xác minh xong (mặc định /discover).
  final String? next;

  @override
  State<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends State<VerifyEmailScreen> {
  static const _resendSeconds = 60;
  final _otp = TextEditingController();
  Timer? _timer;
  int _cooldown = 0;
  bool _sent = false;
  bool _sending = false;
  bool _verifying = false;

  @override
  void dispose() {
    _timer?.cancel();
    _otp.dispose();
    super.dispose();
  }

  String get _next => widget.next ?? '/discover';

  void _startCooldown(int seconds) {
    _timer?.cancel();
    setState(() => _cooldown = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _cooldown--);
      if (_cooldown <= 0) t.cancel();
    });
  }

  Future<void> _send() async {
    setState(() => _sending = true);
    try {
      await AppScope.of(context).auth.sendVerificationOtp();
      if (!mounted) return;
      setState(() => _sent = true);
      _startCooldown(_resendSeconds);
      showInfo(context, 'Đã gửi mã xác minh. Mã có hiệu lực 10 phút.');
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.code == 'OTP_RATE_LIMITED') {
        // Mã trước đó vẫn còn hiệu lực — cho nhập mã và đếm đúng số giây server yêu cầu.
        final wait = int.tryParse(RegExp(r'(\d+)').firstMatch(e.message)?.group(1) ?? '') ?? _resendSeconds;
        setState(() => _sent = true);
        _startCooldown(wait);
      }
      showApiError(context, e);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _verify() async {
    final code = _otp.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      showInfo(context, 'Mã xác minh gồm 6 chữ số.');
      return;
    }
    setState(() => _verifying = true);
    try {
      await AppScope.of(context).auth.verifyEmail(code);
      if (!mounted) return;
      showInfo(context, 'Xác minh email thành công!');
      context.go(_next);
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).auth.user;
    final verified = user != null && !user.needsEmailVerification;
    return Scaffold(
      appBar: AppBar(title: const Text('Xác minh email')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: verified ? _verifiedView(context) : _form(context, user?.email ?? ''),
            ),
          ),
        ),
      ),
    );
  }

  Widget _verifiedView(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Icon(Icons.mark_email_read_outlined, size: 56, color: kGreen),
        const SizedBox(height: 12),
        const Text('Email của bạn đã được xác minh.', textAlign: TextAlign.center),
        const SizedBox(height: 20),
        FilledButton(onPressed: () => context.go(_next), child: const Text('Tiếp tục')),
      ]);

  Widget _form(BuildContext context, String email) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Icon(Icons.mark_email_unread_outlined, size: 56, color: kAmber),
        const SizedBox(height: 12),
        Text('Xác minh email để đặt lịch và nạp tiền vào ví.',
            textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Text('Mã gồm 6 chữ số sẽ được gửi tới\n$email', textAlign: TextAlign.center, style: const TextStyle(color: kMuted)),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          key: const Key('otp-send'),
          onPressed: (_sending || _cooldown > 0) ? null : _send,
          icon: const Icon(Icons.send_outlined),
          label: Text(_cooldown > 0 ? 'Gửi lại sau ${_cooldown}s' : (_sent ? 'Gửi lại mã' : 'Gửi mã xác minh')),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('otp-input'),
          controller: _otp,
          enabled: _sent,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          autofillHints: const [AutofillHints.oneTimeCode],
          style: const TextStyle(fontSize: 24, letterSpacing: 8),
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '••••••', counterText: ''),
          onSubmitted: (_) => _verify(),
        ),
        const SizedBox(height: 16),
        FilledButton(
          key: const Key('otp-verify'),
          onPressed: (!_sent || _verifying) ? null : _verify,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          child: const Text('Xác minh'),
        ),
        const SizedBox(height: 8),
        TextButton(onPressed: () => context.go(_next), child: const Text('Để sau')),
        if (AppConfig.demoEmail) ...[
          const SizedBox(height: 12),
          const Text(
            'Môi trường demo không gửi email thật: mã OTP được ghi vào log máy chủ (dòng [EMAIL-SERVICE]).',
            textAlign: TextAlign.center,
            style: TextStyle(color: kMuted, fontSize: 12),
          ),
        ],
      ]);
}

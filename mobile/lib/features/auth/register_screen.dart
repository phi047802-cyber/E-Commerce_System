import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import '../../core/config.dart';
import '../../core/scope.dart';
import '../../widgets/common.dart';

/// UC01 — Đăng ký tài khoản Renter / Companion trên App. Chấp thuận điều khoản hiện hành ngay lúc đăng ký (kênh MOBILE);
/// sau khi tạo tài khoản, App chuyển sang xác minh email bằng OTP.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String _role = 'RENTER';
  bool _over18 = false;
  bool _acceptTerms = false;
  bool _obscure = true;
  bool _busy = false;
  bool _triedSubmit = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _triedSubmit = true);
    final fieldsOk = _form.currentState!.validate();
    if (!fieldsOk || !_over18 || !_acceptTerms) return;
    setState(() => _busy = true);
    try {
      await AppScope.of(context).auth.register(
            email: _email.text,
            password: _password.text,
            displayName: _name.text,
            role: _role,
          );
      // Router chuyển sang /verify-email khi AuthState đổi sang đã đăng nhập.
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final error = Theme.of(context).colorScheme.error;
    return Scaffold(
      appBar: AppBar(title: const Text('Tạo tài khoản')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _form,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  const Text('Bạn tham gia với vai trò', style: TextStyle(color: kMuted)),
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'RENTER', icon: Icon(Icons.person_search_outlined), label: Text('Người thuê')),
                      ButtonSegment(value: 'COMPANION', icon: Icon(Icons.headset_mic_outlined), label: Text('Companion')),
                    ],
                    selected: {_role},
                    onSelectionChanged: (s) => setState(() => _role = s.first),
                  ),
                  if (_role == 'COMPANION')
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'Sau khi đăng ký, hoàn tất hồ sơ, eKYC và đặt khung giờ trên Web để bắt đầu nhận đơn.',
                        style: TextStyle(color: kMuted, fontSize: 12),
                      ),
                    ),
                  const SizedBox(height: 20),
                  TextFormField(
                    key: const Key('register-name'),
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    autofillHints: const [AutofillHints.name],
                    maxLength: 50,
                    decoration: const InputDecoration(labelText: 'Tên hiển thị', border: OutlineInputBorder(), counterText: ''),
                    validator: (v) => (v == null || v.trim().length < 2) ? 'Tên hiển thị tối thiểu 2 ký tự' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    key: const Key('register-email'),
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                    validator: (v) =>
                        (v == null || !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(v.trim())) ? 'Email không hợp lệ' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    key: const Key('register-password'),
                    controller: _password,
                    obscureText: _obscure,
                    autofillHints: const [AutofillHints.newPassword],
                    decoration: InputDecoration(
                      labelText: 'Mật khẩu (tối thiểu 6 ký tự)',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        tooltip: _obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                        icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    validator: (v) => (v == null || v.length < 6) ? 'Mật khẩu tối thiểu 6 ký tự' : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    key: const Key('register-confirm'),
                    controller: _confirm,
                    obscureText: _obscure,
                    decoration: const InputDecoration(labelText: 'Nhập lại mật khẩu', border: OutlineInputBorder()),
                    validator: (v) => v != _password.text ? 'Mật khẩu nhập lại không khớp' : null,
                  ),
                  const SizedBox(height: 8),
                  CheckboxListTile(
                    key: const Key('register-over18'),
                    value: _over18,
                    onChanged: (v) => setState(() => _over18 = v ?? false),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Tôi đã đủ 18 tuổi'),
                    subtitle: _triedSubmit && !_over18 ? Text('Bắt buộc để tham gia nền tảng', style: TextStyle(color: error)) : null,
                  ),
                  CheckboxListTile(
                    key: const Key('register-terms'),
                    value: _acceptTerms,
                    onChanged: (v) => setState(() => _acceptTerms = v ?? false),
                    controlAffinity: ListTileControlAffinity.leading,
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Tôi đã đọc và chấp thuận Điều khoản sử dụng ${AppConfig.termsVersion}'),
                    subtitle: _triedSubmit && !_acceptTerms
                        ? Text('Cần chấp thuận điều khoản để tạo tài khoản', style: TextStyle(color: error))
                        : Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
                              onPressed: () => context.push('/terms'),
                              child: const Text('Đọc điều khoản'),
                            ),
                          ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    key: const Key('register-submit'),
                    onPressed: _busy ? null : _submit,
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    child: _busy
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Tạo tài khoản'),
                  ),
                  const SizedBox(height: 8),
                  TextButton(onPressed: () => context.go('/login'), child: const Text('Đã có tài khoản? Đăng nhập')),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

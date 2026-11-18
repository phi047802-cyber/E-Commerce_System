import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../core/scope.dart';
import '../../widgets/common.dart';

/// Đăng nhập Renter / Companion (CS, Admin, Auditor dùng Web Portal — UNIFIED_WORKFLOW §3).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _busy = false;
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await AppScope.of(context).auth.login(_email.text, _password.text);
      // Router tự chuyển tới `next` (deep link) hoặc /discover khi AuthState đổi.
    } catch (e) {
      if (mounted) showApiError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _form,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Text('INSTASQUAD',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: Theme.of(context).colorScheme.primary,
                          )),
                  const SizedBox(height: 8),
                  const Text('Bạn đồng hành chơi game, trò chuyện & giải trí.\nTiền được giữ an toàn đến khi bạn hài lòng.',
                      textAlign: TextAlign.center, style: TextStyle(color: kMuted)),
                  const SizedBox(height: 32),
                  TextFormField(
                    key: const Key('login-email'),
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                    validator: (v) => (v == null || !v.contains('@')) ? 'Email không hợp lệ' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    key: const Key('login-password'),
                    controller: _password,
                    obscureText: _obscure,
                    autofillHints: const [AutofillHints.password],
                    decoration: InputDecoration(
                      labelText: 'Mật khẩu',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        tooltip: _obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                        icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    validator: (v) => (v == null || v.isEmpty) ? 'Nhập mật khẩu' : null,
                    onFieldSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    key: const Key('login-submit'),
                    onPressed: _busy ? null : _submit,
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                    child: _busy
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Đăng nhập'),
                  ),
                  const SizedBox(height: 16),
                  Wrap(alignment: WrapAlignment.center, children: [
                    TextButton(onPressed: () => context.push('/workflow'), child: const Text('Quy trình 8 bước')),
                    TextButton(onPressed: () => context.push('/terms'), child: const Text('Điều khoản sử dụng')),
                  ]),
                  const SizedBox(height: 8),
                  const Text('Tài khoản CS / Admin / Kiểm toán vui lòng dùng Web Portal.',
                      textAlign: TextAlign.center, style: TextStyle(color: kMuted, fontSize: 12)),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

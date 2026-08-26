import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../services/auth_controller.dart';
import '../theme/colors.dart';
import '../theme/text_styles.dart';
import '../widgets/ui.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _googleLoading = false;
  String _error = '';

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    final auth = context.read<AuthController>();
    final err = await auth.signIn(_email.text.trim(), _password.text);
    if (!mounted) return;
    setState(() {
      _loading = false;
      if (err != null) _error = err;
    });
  }

  Future<void> _googleSignIn() async {
    setState(() {
      _googleLoading = true;
      _error = '';
    });
    final auth = context.read<AuthController>();
    final err = await auth.signInWithGoogle();
    if (!mounted) return;
    setState(() {
      _googleLoading = false;
      if (err != null) _error = err;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 60,
                  height: 60,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(14)),
                  child: const Icon(Icons.confirmation_number_outlined, color: Colors.white, size: 28),
                ),
                Text('HEXLURA', style: AppText.heading(size: 34, color: AppColors.accent)),
                const SizedBox(height: 4),
                Text('Door Staff Scanner', style: AppText.body(size: 13, color: AppColors.muted)),
                const SizedBox(height: 28),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: Column(
                    children: [
                      AppLabel('Email'),
                      AppInput(
                        controller: _email,
                        placeholder: 'you@hexlura.com',
                        keyboardType: TextInputType.emailAddress,
                      ),
                      const SizedBox(height: 16),
                      AppLabel('Password'),
                      AppInput(controller: _password, placeholder: '••••••••', obscure: true),
                      if (_error.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(_error, style: AppText.body(size: 13, color: AppColors.accent)),
                        ),
                      ],
                      const SizedBox(height: 16),
                      AppButton(
                        label: _loading ? 'Signing in...' : 'Sign In',
                        onPressed: _loading ? null : _submit,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Expanded(child: Divider(color: AppColors.border)),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            child: Text('or', style: AppText.body(size: 12, color: AppColors.muted)),
                          ),
                          const Expanded(child: Divider(color: AppColors.border)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: _googleLoading ? null : _googleSignIn,
                          style: OutlinedButton.styleFrom(
                            backgroundColor: AppColors.card,
                            side: const BorderSide(color: AppColors.border),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(2)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (_googleLoading)
                                const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.text),
                                )
                              else
                                SvgPicture.asset('assets/icons/google.svg', width: 18, height: 18),
                              const SizedBox(width: 10),
                              Text(
                                _googleLoading ? 'Connecting to Google...' : 'Continue with Google',
                                style: AppText.body(size: 14, weight: FontWeight.w500, color: AppColors.text),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  "Works offline once signed in.\nScans queue locally and sync when you're back online.",
                  textAlign: TextAlign.center,
                  style: AppText.body(size: 12, color: AppColors.footnote),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

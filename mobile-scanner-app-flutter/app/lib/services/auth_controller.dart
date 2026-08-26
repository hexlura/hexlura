import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config.dart';
import 'supabase_service.dart';

/// Mirrors mobile-scanner-app/app/src/lib/AuthContext.tsx — same door-staff
/// role check shared by both the email/password and Google sign-in paths,
/// so the gate can't drift between platforms either.
class AuthController extends ChangeNotifier {
  Session? session;
  bool loading = true;

  Completer<String?>? _pendingSignIn;

  AuthController() {
    session = supabase.auth.currentSession;
    loading = false;
    supabase.auth.onAuthStateChange.listen((data) async {
      if (data.event == AuthChangeEvent.signedIn && data.session != null) {
        // A brand-new sign-in landed (password or Google — both raise this
        // same event) — verify door-staff access before exposing the
        // session to the UI. Previously the Google path only checked this
        // within a fixed 300ms window after launching the OAuth browser,
        // but that flow completes later and asynchronously via this same
        // listener — the real-world case routinely missed the window, so
        // the check silently never ran and any Google account got in.
        // Keying off the actual event instead of a guessed delay closes
        // that regardless of how long the redirect takes.
        final error = await _verifyDoorStaffAccess();
        if (error != null) {
          session = null;
          _pendingSignIn?.complete(error);
          _pendingSignIn = null;
          notifyListeners();
          return;
        }
      }
      session = data.session;
      _pendingSignIn?.complete(null);
      _pendingSignIn = null;
      notifyListeners();
    });
  }

  Future<String?> _verifyDoorStaffAccess() async {
    final user = supabase.auth.currentUser;
    if (user == null) return 'Login failed. Please try again.';

    final profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    final role = profile?['role'] as String?;

    if (role == 'door_staff' || role == 'organiser' || role == 'admin') {
      return null;
    }

    final teamRows = await supabase
        .from('organiser_team')
        .select('id')
        .eq('user_id', user.id)
        .eq('privilege', 'door_staff')
        .eq('status', 'active')
        .limit(1);

    if (teamRows.isNotEmpty) return null;

    await supabase.auth.signOut();
    return 'This account does not have door staff access.';
  }

  Future<String?> signIn(String email, String password) async {
    _pendingSignIn = Completer<String?>();
    try {
      await supabase.auth.signInWithPassword(email: email, password: password);
    } on AuthException catch (e) {
      _pendingSignIn = null;
      return e.message;
    }
    return _pendingSignIn!.future.timeout(
      const Duration(seconds: 15),
      onTimeout: () => 'Sign-in timed out. Please try again.',
    );
  }

  /// Reuses the Google OAuth provider already configured on the Supabase
  /// project for the web app — no new Google Cloud OAuth client needed.
  /// supabase_flutter handles opening the browser, capturing the deep-link
  /// redirect, and completing the session automatically; door-staff access
  /// is verified in the onAuthStateChange listener above once that lands.
  Future<String?> signInWithGoogle() async {
    _pendingSignIn = Completer<String?>();
    try {
      await supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: '${AppConfig.oauthScheme}://${AppConfig.oauthCallbackHost}',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
    } on AuthException catch (e) {
      _pendingSignIn = null;
      return e.message;
    }
    return _pendingSignIn!.future.timeout(
      const Duration(seconds: 60),
      onTimeout: () => null, // user likely cancelled the browser flow
    );
  }

  Future<void> signOut() => supabase.auth.signOut();
}

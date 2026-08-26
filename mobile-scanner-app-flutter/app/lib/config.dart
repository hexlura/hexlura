/// Same public anon client credentials as the web app (NEXT_PUBLIC_SUPABASE_URL /
/// NEXT_PUBLIC_SUPABASE_ANON_KEY) and the React Native build's .env — safe to ship
/// inside the APK, RLS enforces security server-side.
class AppConfig {
  AppConfig._();

  static const supabaseUrl = 'https://entxavzzjpjrmnuyvrgj.supabase.co';
  static const supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudHhhdnp6anBqcm1udXl2cmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMTUxMzMsImV4cCI6MjA4ODc5MTEzM30.5nWfWsKZgyP0so3-TCTO7SVfhZIgJq7Gadc6pTTpDTc';

  /// Base URL of the deployed Hexlura web app — the app calls its
  /// /api/checkin* routes, it does not talk to Supabase directly for check-ins.
  ///
  /// MUST be the canonical www host: the apex hexlura.com 301-redirects here,
  /// and a cross-host redirect drops the Authorization header, so every call
  /// arrived unauthenticated and came back 401. A 301 on the check-in POST is
  /// worse still — redirected POSTs can be downgraded to GET and lose their
  /// body, which would silently break scanning at the door.
  static const appUrl = 'https://www.hexlura.com';

  /// Deep-link scheme registered for the Google OAuth redirect —
  /// must match android/app/src/main/AndroidManifest.xml's intent-filter.
  static const oauthScheme = 'hexluradoorstaffflutter';
  static const oauthCallbackHost = 'auth-callback';
}

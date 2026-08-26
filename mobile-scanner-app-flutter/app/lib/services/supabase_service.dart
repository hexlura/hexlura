import 'package:supabase_flutter/supabase_flutter.dart';
import '../config.dart';

Future<void> initSupabase() async {
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    publishableKey: AppConfig.supabaseAnonKey,
  );
}

SupabaseClient get supabase => Supabase.instance.client;

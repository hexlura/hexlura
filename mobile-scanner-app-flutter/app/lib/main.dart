import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_controller.dart';
import 'services/offline_queue.dart';
import 'services/supabase_service.dart';
import 'theme/colors.dart';
import 'screens/login_screen.dart';
import 'screens/events_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initSupabase();
  runApp(const HexluraScannerApp());
}

class HexluraScannerApp extends StatelessWidget {
  const HexluraScannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthController()),
        ChangeNotifierProvider(create: (_) => CheckinQueueController()),
      ],
      child: MaterialApp(
        title: 'Hexlura Scanner',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          scaffoldBackgroundColor: AppColors.bg,
          colorScheme: ColorScheme.fromSeed(seedColor: AppColors.accent, brightness: Brightness.dark),
          useMaterial3: true,
        ),
        home: const _RootGate(),
      ),
    );
  }
}

class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (auth.loading) {
      return const Scaffold(backgroundColor: AppColors.bg, body: SizedBox.shrink());
    }
    return auth.session != null ? const EventsScreen() : const LoginScreen();
  }
}

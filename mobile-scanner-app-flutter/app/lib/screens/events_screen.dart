import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_controller.dart';
import '../theme/colors.dart';
import '../theme/text_styles.dart';
import '../widgets/ui.dart';
import 'scanner_screen.dart';

class EventsScreen extends StatefulWidget {
  const EventsScreen({super.key});

  @override
  State<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends State<EventsScreen> {
  final _api = ApiService();
  List<EventRow> _events = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final events = await _api.fetchEvents();
      if (mounted) setState(() => _events = events);
    } catch (e) {
      // Surface the real failure instead of silently falling back to the
      // last-known list — a 401/403/500 previously looked identical to a
      // genuinely empty event list, with no way to tell them apart.
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _formatEventDate(String iso) {
    final d = DateTime.parse(iso).toLocal();
    return DateFormat('EEE, d MMM y, h:mm a').format(d);
  }

  String _formatTime(String iso) {
    final d = DateTime.parse(iso).toLocal();
    return DateFormat('h:mm a').format(d);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            AppHeader(children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('HEXLURA', style: AppText.heading(size: 22, color: AppColors.accent)),
                    const SizedBox(height: 2),
                    Text('Signed in', style: AppText.body(size: 11, color: AppColors.muted)),
                  ],
                ),
              ),
              AppIconButton(
                icon: const Icon(Icons.logout, size: 16, color: AppColors.muted),
                tooltip: 'Sign out',
                onPressed: () => context.read<AuthController>().signOut(),
              ),
            ]),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                color: AppColors.accent,
                backgroundColor: AppColors.surface,
                child: _loading
                    ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                    : ListView(
                        padding: const EdgeInsets.all(20),
                        children: [
                          Text('SELECT EVENT', style: AppText.heading(size: 26)),
                          const SizedBox(height: 16),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 48),
                              child: Text(
                                'Could not load events.\n$_error\n\nPull down to retry.',
                                textAlign: TextAlign.center,
                                style: AppText.body(size: 14, color: AppColors.accent),
                              ),
                            )
                          else if (_events.isEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 48),
                              child: Text(
                                "No upcoming events yet. Your organiser hasn't published any events.",
                                textAlign: TextAlign.center,
                                style: AppText.body(size: 14, color: AppColors.muted),
                              ),
                            ),
                          for (final event in _events) ...[
                            _EventCard(
                              event: event,
                              dateLabel: _formatEventDate(event.startAt),
                              doorsLabel: (event.checkinStartAt != null || event.checkinEndAt != null)
                                  ? 'Doors: ${event.checkinStartAt != null ? _formatTime(event.checkinStartAt!) : '—'} — ${event.checkinEndAt != null ? _formatTime(event.checkinEndAt!) : '—'}'
                                  : null,
                              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                                builder: (_) => ScannerScreen(eventId: event.id, eventTitle: event.title),
                              )),
                            ),
                            const SizedBox(height: 12),
                          ],
                        ],
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final EventRow event;
  final String dateLabel;
  final String? doorsLabel;
  final VoidCallback onTap;

  const _EventCard({required this.event, required this.dateLabel, this.doorsLabel, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: AppColors.card, border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(event.title, style: AppText.body(size: 17, weight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(
            '$dateLabel${event.venueName != null ? ' · ${event.venueName}' : ''}',
            style: AppText.body(size: 12, color: AppColors.muted),
          ),
          if (doorsLabel != null) ...[
            const SizedBox(height: 8),
            Text(doorsLabel!, style: AppText.body(size: 11, color: AppColors.success)),
          ],
          const SizedBox(height: 14),
          AppButton(label: 'Start Scanning', onPressed: onTap),
        ],
      ),
    );
  }
}

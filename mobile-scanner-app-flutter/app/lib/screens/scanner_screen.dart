import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_controller.dart';
import '../services/offline_queue.dart';
import '../theme/colors.dart';
import '../theme/text_styles.dart';
import '../widgets/ui.dart';
import 'attendees_screen.dart';

class _ResultStyle {
  final Color bg;
  final Color border;
  final IconData icon;
  final String title;
  const _ResultStyle(this.bg, this.border, this.icon, this.title);
}

const Map<String, _ResultStyle> _resultStyles = {
  'SUCCESS': _ResultStyle(Color(0x1F00E5A0), AppColors.success, Icons.check_circle_outline, 'CHECK IN SUCCESSFUL'),
  'QUEUED': _ResultStyle(Color(0x1FF5A623), AppColors.warning, Icons.cloud_off, 'SAVED OFFLINE'),
  'ALREADY_SCANNED': _ResultStyle(Color(0x1FE63950), AppColors.accent, Icons.block, 'ALREADY CHECKED IN'),
  'WRONG_EVENT': _ResultStyle(Color(0x1FE63950), AppColors.accent, Icons.error_outline, 'WRONG EVENT'),
  'TOO_EARLY': _ResultStyle(Color(0x1FF5A623), AppColors.warning, Icons.schedule, 'TOO EARLY'),
  'EVENT_ENDED': _ResultStyle(Color(0x1FE63950), AppColors.accent, Icons.error_outline, 'EVENT ENDED'),
  'CANCELLED': _ResultStyle(Color(0x1FE63950), AppColors.accent, Icons.error_outline, 'EVENT CANCELLED'),
  'CANCELLED_TICKET': _ResultStyle(Color(0x1FE63950), AppColors.accent, Icons.error_outline, 'TICKET CANCELLED'),
  'INVALID': _ResultStyle(Color(0x1FE63950), AppColors.accent, Icons.error_outline, 'INVALID TICKET'),
};

class _ScanLogEntry {
  final String text;
  final bool success;
  final String time;
  _ScanLogEntry({required this.text, required this.success, required this.time});
}

class ScannerScreen extends StatefulWidget {
  final String eventId;
  final String eventTitle;
  const ScannerScreen({super.key, required this.eventId, required this.eventTitle});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final _controller = MobileScannerController(formats: [BarcodeFormat.qrCode]);
  final _api = ApiService();
  final _manualRefController = TextEditingController();

  bool _processing = false;
  bool _scanningPaused = false;
  CheckinResult? _result;
  final List<_ScanLogEntry> _scanLog = [];
  int _checkedIn = 0;
  int _total = 0;
  bool _lookingUp = false;

  @override
  void initState() {
    super.initState();
    _refreshTotals();
  }

  @override
  void dispose() {
    _controller.dispose();
    _manualRefController.dispose();
    super.dispose();
  }

  Future<void> _refreshTotals() async {
    try {
      final data = await _api.fetchAttendees(widget.eventId);
      if (mounted) {
        setState(() {
          _checkedIn = data.checkedIn;
          _total = data.total;
        });
      }
    } catch (_) {
      // Offline or transient — keep last known totals
    }
  }

  Future<void> _handleResult({String? qrToken, String? bookingRef, required String label}) async {
    if (_processing) return;
    setState(() {
      _processing = true;
      _scanningPaused = true;
    });

    final queue = context.read<CheckinQueueController>();
    final result = await queue.submitOrQueue(qrToken: qrToken, bookingRef: bookingRef, eventId: widget.eventId);

    if (!mounted) return;
    setState(() {
      _result = result;
      if (result.success && result.code != 'QUEUED') _checkedIn++;
      _scanLog.insert(
        0,
        _ScanLogEntry(
          text: result.success
              ? (result.data != null ? '${result.data!.attendeeName} — ${result.data!.ticketType}' : label)
              : result.message,
          success: result.success && result.code != 'ALREADY_SCANNED',
          time: TimeOfDay.now().format(context),
        ),
      );
      if (_scanLog.length > 50) _scanLog.removeLast();
    });

    await Future.delayed(const Duration(seconds: 3));
    if (!mounted) return;
    setState(() {
      _result = null;
      _scanningPaused = false;
      _processing = false;
    });
  }

  Future<void> _handleManualLookup() async {
    final ref = _manualRefController.text.trim().toUpperCase();
    if (ref.isEmpty) return;
    setState(() => _lookingUp = true);
    await _handleResult(bookingRef: ref, label: ref);
    if (!mounted) return;
    setState(() => _lookingUp = false);
    _manualRefController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final queue = context.watch<CheckinQueueController>();
    final style = _result != null ? (_resultStyles[_result!.code] ?? _resultStyles['INVALID']!) : null;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            AppHeader(children: [
              AppIconButton(
                icon: const Icon(Icons.arrow_back, size: 18, color: AppColors.muted),
                tooltip: 'Switch event',
                onPressed: () => Navigator.of(context).pop(),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(widget.eventTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.heading(size: 16, letterSpacing: 1)),
              ),
              AppIconButton(
                icon: const Icon(Icons.groups_outlined, size: 16, color: AppColors.muted),
                tooltip: 'View all attendees',
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => AttendeesScreen(eventId: widget.eventId, eventTitle: widget.eventTitle),
                )),
              ),
              const SizedBox(width: 8),
              AppIconButton(
                icon: const Icon(Icons.logout, size: 16, color: AppColors.muted),
                tooltip: 'Sign out',
                onPressed: () => context.read<AuthController>().signOut(),
              ),
            ]),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: const BoxDecoration(color: AppColors.surface, border: Border(bottom: BorderSide(color: AppColors.border))),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(queue.isOnline ? 'Online' : 'Offline', style: AppText.body(size: 11, color: AppColors.muted)),
                  RichText(
                    text: TextSpan(children: [
                      TextSpan(text: '$_checkedIn', style: AppText.heading(size: 15)),
                      TextSpan(text: ' of $_total in', style: AppText.body(size: 12, color: AppColors.muted)),
                    ]),
                  ),
                ],
              ),
            ),
            LinearProgressIndicator(
              value: _total > 0 ? _checkedIn / _total : 0,
              minHeight: 3,
              backgroundColor: AppColors.border,
              color: AppColors.accent,
            ),
            if (!queue.isOnline || queue.queueCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                color: const Color(0x1FF5A623),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      queue.isOnline ? '⚠ Syncing queued scans…' : '⚠ Offline — scans saved locally',
                      style: AppText.body(size: 12, color: AppColors.warning),
                    ),
                    if (queue.queueCount > 0)
                      Text('${queue.queueCount} queued', style: AppText.body(size: 12, weight: FontWeight.bold, color: AppColors.warning)),
                  ],
                ),
              ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  AspectRatio(
                    aspectRatio: 1,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Container(color: Colors.black),
                          MobileScanner(
                            controller: _controller,
                            onDetect: (capture) {
                              if (_scanningPaused || capture.barcodes.isEmpty) return;
                              final value = capture.barcodes.first.rawValue;
                              if (value != null) {
                                _handleResult(qrToken: value, label: value);
                              }
                            },
                          ),
                          Center(
                            child: FractionallySizedBox(
                              widthFactor: 0.68,
                              heightFactor: 0.68,
                              child: Container(
                                decoration: BoxDecoration(
                                  border: Border.all(color: AppColors.success, width: 2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                            ),
                          ),
                          if (_result != null && style != null)
                            Container(
                              color: Colors.black.withValues(alpha: 0.85),
                              padding: const EdgeInsets.all(24),
                              child: Center(
                                child: Container(
                                  constraints: const BoxConstraints(maxWidth: 320),
                                  padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 24),
                                  decoration: BoxDecoration(
                                    color: style.bg,
                                    border: Border.all(color: style.border),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(style.icon, color: style.border, size: 48),
                                      const SizedBox(height: 10),
                                      Text(style.title, textAlign: TextAlign.center, style: AppText.heading(size: 22, color: style.border, letterSpacing: 2)),
                                      const SizedBox(height: 8),
                                      Text(_result!.message, textAlign: TextAlign.center, style: AppText.body(size: 14, color: style.border)),
                                      if (_result!.success && _result!.data != null) ...[
                                        Container(
                                          margin: const EdgeInsets.only(top: 14),
                                          padding: const EdgeInsets.only(top: 14),
                                          decoration: BoxDecoration(border: Border(top: BorderSide(color: style.border))),
                                          child: Column(children: [
                                            Text(_result!.data!.attendeeName, style: AppText.body(size: 13, weight: FontWeight.w600, color: style.border)),
                                            Text(_result!.data!.ticketType, style: AppText.body(size: 13, color: style.border)),
                                          ]),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text('Point camera at attendee QR code', textAlign: TextAlign.center, style: AppText.body(size: 12, color: AppColors.muted)),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: AppColors.card, border: Border.all(color: AppColors.border)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Enter booking ref manually', style: AppText.body(size: 11, color: AppColors.muted)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: AppInput(
                                controller: _manualRefController,
                                placeholder: 'HXL-XXXXXX',
                                capitalization: TextCapitalization.characters,
                                onSubmitted: (_) => _handleManualLookup(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 90,
                              child: AppButton(
                                label: _lookingUp ? '...' : 'Search',
                                variant: AppButtonVariant.secondary,
                                onPressed: _lookingUp ? null : _handleManualLookup,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (_scanLog.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                      decoration: BoxDecoration(color: AppColors.card, border: Border.all(color: AppColors.border)),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
                            child: Text('RECENT SCANS (${_scanLog.length})', style: AppText.body(size: 11, weight: FontWeight.bold, color: AppColors.muted)),
                          ),
                          for (final entry in _scanLog)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
                              child: Row(
                                children: [
                                  Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: entry.success ? AppColors.success : AppColors.accent)),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(entry.text, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.body(size: 13, color: entry.success ? AppColors.text : AppColors.accent)),
                                  ),
                                  Text(entry.time, style: AppText.body(size: 11, color: AppColors.muted)),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/auth_controller.dart';
import '../services/offline_queue.dart';
import '../theme/colors.dart';
import '../theme/text_styles.dart';
import '../widgets/ui.dart';

enum _Filter { all, checkedIn, notCheckedIn }

class AttendeesScreen extends StatefulWidget {
  final String eventId;
  final String eventTitle;
  const AttendeesScreen({super.key, required this.eventId, required this.eventTitle});

  @override
  State<AttendeesScreen> createState() => _AttendeesScreenState();
}

class _AttendeesScreenState extends State<AttendeesScreen> {
  final _api = ApiService();
  final _searchController = TextEditingController();

  List<AttendeeRow> _attendees = [];
  int _total = 0;
  int _checkedIn = 0;
  bool _loading = true;
  _Filter _filter = _Filter.all;
  String? _checkingInId;

  @override
  void initState() {
    super.initState();
    _load();
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _api.fetchAttendees(widget.eventId);
      if (mounted) {
        setState(() {
          _attendees = data.attendees;
          _total = data.total;
          _checkedIn = data.checkedIn;
        });
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkIn(AttendeeRow item) async {
    setState(() => _checkingInId = item.id);
    final queue = context.read<CheckinQueueController>();
    final result = await queue.submitOrQueue(bookingItemId: item.id, eventId: widget.eventId);
    if (!mounted) return;
    setState(() {
      _checkingInId = null;
      if (result.success) {
        final idx = _attendees.indexWhere((a) => a.id == item.id);
        if (idx != -1) {
          final updated = _attendees[idx].scannedCount + 1;
          _attendees[idx] = _attendees[idx].copyWith(scannedCount: updated, checkedIn: updated >= item.quantity);
        }
      }
    });
  }

  List<AttendeeRow> get _filtered {
    final q = _searchController.text.trim().toLowerCase();
    return _attendees.where((a) {
      final matchSearch = q.isEmpty || a.name.toLowerCase().contains(q) || a.bookingRef.toLowerCase().contains(q);
      final matchFilter = _filter == _Filter.all || (_filter == _Filter.checkedIn ? a.checkedIn : !a.checkedIn);
      return matchSearch && matchFilter;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final notCheckedIn = _total - _checkedIn;
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: SafeArea(
        child: Column(
          children: [
            AppHeader(children: [
              AppIconButton(
                icon: const Icon(Icons.arrow_back, size: 18, color: AppColors.muted),
                tooltip: 'Back to scanner',
                onPressed: () => Navigator.of(context).pop(),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.eventTitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.heading(size: 16, letterSpacing: 1)),
                    const SizedBox(height: 2),
                    Text('$_checkedIn of $_total checked in', style: AppText.body(size: 11, color: AppColors.muted)),
                  ],
                ),
              ),
              AppIconButton(
                icon: const Icon(Icons.logout, size: 16, color: AppColors.muted),
                tooltip: 'Sign out',
                onPressed: () => context.read<AuthController>().signOut(),
              ),
            ]),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
              child: Column(
                children: [
                  AppInput(controller: _searchController, placeholder: 'Search name or booking ref...'),
                  const SizedBox(height: 10),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterChip(label: 'All ($_total)', active: _filter == _Filter.all, onTap: () => setState(() => _filter = _Filter.all)),
                        const SizedBox(width: 8),
                        _FilterChip(label: 'Checked In ($_checkedIn)', active: _filter == _Filter.checkedIn, onTap: () => setState(() => _filter = _Filter.checkedIn)),
                        const SizedBox(width: 8),
                        _FilterChip(label: 'Not Checked In ($notCheckedIn)', active: _filter == _Filter.notCheckedIn, onTap: () => setState(() => _filter = _Filter.notCheckedIn)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.accent,
                      backgroundColor: AppColors.surface,
                      child: filtered.isEmpty
                          ? ListView(children: [
                              Padding(
                                padding: const EdgeInsets.only(top: 40),
                                child: Text('No attendees found', textAlign: TextAlign.center, style: AppText.body(size: 13, color: AppColors.muted)),
                              ),
                            ])
                          : ListView.builder(
                              itemCount: filtered.length,
                              itemBuilder: (context, i) {
                                final item = filtered[i];
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.border))),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            RichText(
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              text: TextSpan(children: [
                                                TextSpan(text: item.name, style: AppText.body(size: 14, weight: FontWeight.w600)),
                                                if (item.quantity > 1)
                                                  TextSpan(text: '  (${item.scannedCount}/${item.quantity})', style: AppText.body(size: 14, color: AppColors.muted)),
                                              ]),
                                            ),
                                            const SizedBox(height: 2),
                                            RichText(
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              text: TextSpan(children: [
                                                TextSpan(text: '${item.ticketType} · ', style: AppText.body(size: 12, color: AppColors.muted)),
                                                TextSpan(text: item.bookingRef, style: AppText.body(size: 11, weight: FontWeight.w500, color: AppColors.accent)),
                                              ]),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (item.checkedIn)
                                        Text(
                                          '✓${item.checkedInAt != null ? ' ${item.checkedInAt}' : ''}',
                                          style: AppText.body(size: 11, weight: FontWeight.w600, color: AppColors.success),
                                        )
                                      else
                                        Material(
                                          color: AppColors.accent,
                                          borderRadius: BorderRadius.circular(3),
                                          child: InkWell(
                                            borderRadius: BorderRadius.circular(3),
                                            onTap: _checkingInId == item.id ? null : () => _checkIn(item),
                                            child: Padding(
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                              child: Text(
                                                _checkingInId == item.id ? '...' : 'Check In',
                                                style: AppText.body(size: 11, weight: FontWeight.w600, color: Colors.white),
                                              ),
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                );
                              },
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _FilterChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.accent : AppColors.card,
          border: Border.all(color: active ? AppColors.accent : AppColors.border),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(label, style: AppText.body(size: 12, color: active ? Colors.white : AppColors.muted)),
      ),
    );
  }
}

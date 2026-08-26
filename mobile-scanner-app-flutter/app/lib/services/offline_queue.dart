import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class QueuedScan {
  final String id;
  final String? qrToken;
  final String? bookingRef;
  final String? bookingItemId;
  final String eventId;

  QueuedScan({
    required this.id,
    this.qrToken,
    this.bookingRef,
    this.bookingItemId,
    required this.eventId,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'qrToken': qrToken,
        'bookingRef': bookingRef,
        'bookingItemId': bookingItemId,
        'eventId': eventId,
      };

  factory QueuedScan.fromJson(Map<String, dynamic> j) => QueuedScan(
        id: j['id'],
        qrToken: j['qrToken'],
        bookingRef: j['bookingRef'],
        bookingItemId: j['bookingItemId'],
        eventId: j['eventId'],
      );
}

/// Offline scan queue + connectivity-aware auto-sync + live submit fallback.
/// Mirrors mobile-scanner-app/app/src/lib/{offlineQueue.ts,useCheckinQueue.ts} —
/// same queue-then-sync design, same "server-rejected scans still count as
/// resolved" reasoning.
class CheckinQueueController extends ChangeNotifier {
  static const _prefsKey = 'hexlura_checkin_queue';
  final ApiService _api = ApiService();

  bool isOnline = true;
  int queueCount = 0;
  bool _flushing = false;

  CheckinQueueController() {
    _refreshCount();
    Connectivity().onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none);
      isOnline = online;
      notifyListeners();
      if (online) flush();
    });
    Connectivity().checkConnectivity().then((results) {
      isOnline = !results.contains(ConnectivityResult.none);
      notifyListeners();
    });
  }

  Future<List<QueuedScan>> _readQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_prefsKey);
    if (raw == null) return [];
    final list = jsonDecode(raw) as List;
    return list.map((e) => QueuedScan.fromJson(e)).toList();
  }

  Future<void> _writeQueue(List<QueuedScan> queue) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(queue.map((e) => e.toJson()).toList()));
  }

  Future<void> _refreshCount() async {
    queueCount = (await _readQueue()).length;
    notifyListeners();
  }

  Future<void> _enqueue(QueuedScan scan) async {
    final queue = await _readQueue();
    queue.add(scan);
    await _writeQueue(queue);
    await _refreshCount();
  }

  /// Tries a live submit first; on any network failure, queues the scan
  /// locally and returns a synthetic QUEUED result instead of throwing.
  Future<CheckinResult> submitOrQueue({
    String? qrToken,
    String? bookingRef,
    String? bookingItemId,
    required String eventId,
  }) async {
    try {
      return await _api.submitCheckin(
        qrToken: qrToken,
        bookingRef: bookingRef,
        bookingItemId: bookingItemId,
        eventId: eventId,
      );
    } catch (_) {
      await _enqueue(QueuedScan(
        id: '${DateTime.now().millisecondsSinceEpoch}-${eventId.hashCode}',
        qrToken: qrToken,
        bookingRef: bookingRef,
        bookingItemId: bookingItemId,
        eventId: eventId,
      ));
      return CheckinResult.queued();
    }
  }

  /// Submits every queued scan in order. Stops at the first network failure
  /// and keeps that item plus everything after it queued — a server-side
  /// rejection (e.g. already checked in by someone else while offline) still
  /// counts as resolved and is dropped.
  Future<void> flush() async {
    if (_flushing) return;
    _flushing = true;
    final queue = await _readQueue();
    var i = 0;
    for (; i < queue.length; i++) {
      final item = queue[i];
      try {
        await _api.submitCheckin(
          qrToken: item.qrToken,
          bookingRef: item.bookingRef,
          bookingItemId: item.bookingItemId,
          eventId: item.eventId,
        );
      } catch (_) {
        break;
      }
    }
    final remaining = queue.sublist(i);
    await _writeQueue(remaining);
    await _refreshCount();
    _flushing = false;
  }
}

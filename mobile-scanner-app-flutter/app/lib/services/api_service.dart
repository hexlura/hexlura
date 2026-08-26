import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import 'supabase_service.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class EventRow {
  final String id;
  final String title;
  final String startAt;
  final String? endAt;
  final String? venueName;
  final String? checkinStartAt;
  final String? checkinEndAt;

  EventRow({
    required this.id,
    required this.title,
    required this.startAt,
    this.endAt,
    this.venueName,
    this.checkinStartAt,
    this.checkinEndAt,
  });

  factory EventRow.fromJson(Map<String, dynamic> j) => EventRow(
        id: j['id'],
        title: j['title'],
        startAt: j['start_at'],
        endAt: j['end_at'],
        venueName: j['venue_name'],
        checkinStartAt: j['checkin_start_at'],
        checkinEndAt: j['checkin_end_at'],
      );
}

class AttendeeRow {
  final String id;
  final String bookingRef;
  final String name;
  final String ticketType;
  final int quantity;
  final int scannedCount;
  final bool checkedIn;
  final String? checkedInAt;

  AttendeeRow({
    required this.id,
    required this.bookingRef,
    required this.name,
    required this.ticketType,
    required this.quantity,
    required this.scannedCount,
    required this.checkedIn,
    this.checkedInAt,
  });

  factory AttendeeRow.fromJson(Map<String, dynamic> j) => AttendeeRow(
        id: j['id'],
        bookingRef: j['bookingRef'] ?? '',
        name: j['name'] ?? 'Guest',
        ticketType: j['ticketType'] ?? 'Ticket',
        quantity: j['quantity'] ?? 1,
        scannedCount: j['scannedCount'] ?? 0,
        checkedIn: j['checkedIn'] ?? false,
        checkedInAt: j['checkedInAt'],
      );

  AttendeeRow copyWith({int? scannedCount, bool? checkedIn}) => AttendeeRow(
        id: id,
        bookingRef: bookingRef,
        name: name,
        ticketType: ticketType,
        quantity: quantity,
        scannedCount: scannedCount ?? this.scannedCount,
        checkedIn: checkedIn ?? this.checkedIn,
        checkedInAt: checkedInAt,
      );
}

class AttendeesResponse {
  final int total;
  final int checkedIn;
  final List<AttendeeRow> attendees;
  AttendeesResponse({required this.total, required this.checkedIn, required this.attendees});
}

class CheckinResultData {
  final String attendeeName;
  final String ticketType;
  CheckinResultData({required this.attendeeName, required this.ticketType});
}

class CheckinResult {
  final bool success;
  final String message;
  final String code;
  final CheckinResultData? data;

  CheckinResult({required this.success, required this.message, required this.code, this.data});

  factory CheckinResult.fromJson(Map<String, dynamic> j) => CheckinResult(
        success: j['success'] ?? false,
        message: j['message'] ?? '',
        code: j['code'] ?? 'INVALID',
        data: j['data'] != null
            ? CheckinResultData(
                attendeeName: j['data']['attendee_name'] ?? '',
                ticketType: j['data']['ticket_type'] ?? '',
              )
            : null,
      );

  factory CheckinResult.queued() => CheckinResult(
        success: true,
        message: "Saved offline — will sync when you're back online",
        code: 'QUEUED',
      );
}

class ApiService {
  Future<Map<String, String>> _authHeaders() async {
    final session = supabase.auth.currentSession;
    final token = session?.accessToken;
    if (token == null) throw ApiException('Not signed in');
    return {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'};
  }

  Future<List<EventRow>> fetchEvents() async {
    final headers = await _authHeaders();
    final res = await http.get(Uri.parse('${AppConfig.appUrl}/api/checkin/events'), headers: headers);
    if (res.statusCode != 200) throw ApiException(_describeError('Failed to load events', res));
    final body = jsonDecode(res.body);
    return (body['events'] as List).map((e) => EventRow.fromJson(e)).toList();
  }

  /// Includes the HTTP status and, where the server sent one, its own error
  /// message — a bare "failed to load" swallows the actual reason (401 vs
  /// 403 vs 500 are very different problems) and makes a real failure look
  /// identical to a genuinely empty result once the caller catches it.
  String _describeError(String action, http.Response res) {
    String? serverMessage;
    try {
      final body = jsonDecode(res.body);
      if (body is Map && body['error'] is String) serverMessage = body['error'] as String;
    } catch (_) {
      // Response wasn't JSON — fall back to just the status code below.
    }
    return '$action (${res.statusCode}${serverMessage != null ? ': $serverMessage' : ''})';
  }

  Future<AttendeesResponse> fetchAttendees(String eventId) async {
    final headers = await _authHeaders();
    final res = await http.get(
      Uri.parse('${AppConfig.appUrl}/api/checkin/attendees?event_id=$eventId'),
      headers: headers,
    );
    if (res.statusCode != 200) throw ApiException(_describeError('Failed to load attendees', res));
    final body = jsonDecode(res.body);
    return AttendeesResponse(
      total: body['total'],
      checkedIn: body['checkedIn'],
      attendees: (body['attendees'] as List).map((a) => AttendeeRow.fromJson(a)).toList(),
    );
  }

  Future<CheckinResult> submitCheckin({
    String? qrToken,
    String? bookingRef,
    String? bookingItemId,
    required String eventId,
  }) async {
    final headers = await _authHeaders();
    final res = await http.post(
      Uri.parse('${AppConfig.appUrl}/api/checkin'),
      headers: headers,
      body: jsonEncode({
        'qr_token': qrToken,
        'booking_ref': bookingRef,
        'booking_item_id': bookingItemId,
        'event_id': eventId,
      }..removeWhere((_, v) => v == null)),
    );
    return CheckinResult.fromJson(jsonDecode(res.body));
  }
}

import 'package:flutter_test/flutter_test.dart';
import 'package:instasquad_mobile/core/booking_states.dart';
import 'package:instasquad_mobile/core/deep_links.dart';
import 'package:instasquad_mobile/core/format.dart';
import 'package:instasquad_mobile/core/models.dart';

import 'helpers/fake_backend.dart';

void main() {
  group('deepLinkToLocation (NON_GAMER_GROWTH_STRATEGY §4)', () {
    test('custom scheme', () {
      expect(deepLinkToLocation(Uri.parse('instasquad://companion/prof-comp-03')), '/companion/prof-comp-03');
      expect(deepLinkToLocation(Uri.parse('instasquad://discover?c=social')), '/discover?c=social');
      expect(deepLinkToLocation(Uri.parse('instasquad://wallet')), '/wallet');
      expect(deepLinkToLocation(Uri.parse('instasquad://booking/abc-123')), '/booking/abc-123');
    });

    test('universal / app links /go/* và /app/*', () {
      expect(deepLinkToLocation(Uri.parse('https://instasquad.vn/go/companion/prof-comp-03?utm_source=tiktok')),
          '/companion/prof-comp-03');
      expect(deepLinkToLocation(Uri.parse('https://instasquad.vn/go/discover?c=SOCIAL&utm_source=threads')), '/discover?c=social');
      expect(deepLinkToLocation(Uri.parse('https://instasquad.vn/app/wallet')), '/wallet');
      expect(deepLinkToLocation(Uri.parse('https://instasquad.vn/go/discover?c=hack')), '/discover?c=game');
    });

    test('từ chối link không hợp lệ', () {
      expect(deepLinkToLocation(Uri.parse('https://instasquad.vn/admin')), isNull);
      expect(deepLinkToLocation(Uri.parse('instasquad://companion/a.b')), isNull);
      expect(deepLinkToLocation(Uri.parse('instasquad://companion')), isNull);
      expect(deepLinkToLocation(Uri.parse('instasquad://companion/a%20b')), isNull);
      expect(deepLinkToLocation(Uri.parse('javascript://alert(1)')), isNull);
      expect(deepLinkToLocation(Uri.parse('instasquad://unknown/x')), isNull);
    });
  });

  test('utmFromUri: lấy utm_* của link mở App (G9)', () {
    expect(
      utmFromUri(Uri.parse('https://instasquad.vn/go/companion/prof-comp-03?utm_source=tiktok&utm_campaign=xem-phim&c=x')),
      {'utm_source': 'tiktok', 'utm_campaign': 'xem-phim'},
    );
    expect(utmFromUri(Uri.parse('instasquad://wallet')), isEmpty);
    expect(utmFromUri(Uri.parse('instasquad://discover?utm_source=%20%20')), isEmpty);
  });

  test('formatVnd giống Web', () {
    expect(formatVnd(176000), '176.000 đ');
    expect(formatVnd(0), '0 đ');
    expect(formatVnd(-60000), '-60.000 đ');
    expect(formatVnd(1234567), '1.234.567 đ');
  });

  test('formatVnDateTime hiển thị UTC+7', () {
    expect(formatVnDateTime(DateTime.utc(2026, 11, 19, 13)), '20:00 19/11/2026');
  });

  group('booking_states đồng bộ client/src/common/bookingStates.ts', () {
    test('nhãn', () {
      expect(bookingStatusLabel('PENDING_ACCEPTANCE').label, 'Chờ xác nhận (180s)');
      expect(bookingStatusLabel('DISPUTED', disputeStatus: 'RESOLVED').label, 'Khiếu nại đã giải quyết');
      expect(bookingStatusLabel('DISPUTED', disputeStatus: 'EVIDENCE_PENDING').label, 'Chờ bổ sung chứng cứ');
    });

    test('nhóm', () {
      expect(bookingGroup('IN_SESSION'), BookingGroup.active);
      expect(bookingGroup('COMPLETED'), BookingGroup.completed);
      expect(bookingGroup('DISPUTED', disputeStatus: 'UNDER_REVIEW'), BookingGroup.disputed);
      expect(bookingGroup('DISPUTED', disputeStatus: 'RESOLVED'), BookingGroup.closed);
      expect(bookingGroup('REFUNDED'), BookingGroup.closed);
    });
  });

  group('models khớp JSON server', () {
    test('Companion chỉ giữ slot AVAILABLE', () {
      final c = Companion.fromJson(FakeBackend.companionJson());
      expect(c.displayName, 'Lan Chi');
      expect(c.hourlyRate, 60000);
      expect(c.verified, isTrue);
      expect(c.service!.isSocial, isTrue);
      expect(c.slots.map((s) => s.id), ['slot-c3-01']);
      expect(c.slots.single.hours, 1);
    });

    test('Booking: cần ký quỹ khi chưa có escrow', () {
      final fb = FakeBackend();
      final pending = Booking.fromJson(fb.bookingJson(escrow: null));
      expect(pending.needsEscrow, isTrue);
      final held = Booking.fromJson(fb.bookingJson());
      expect(held.needsEscrow, isFalse);
      expect(held.escrowAmount, 60000);
      expect(held.companionUserId, 'u-comp-03');
      expect(held.serviceName, 'Tâm sự & Lắng nghe');
      final reviewed = Booking.fromJson(fb.bookingJson(status: 'COMPLETED', reviews: [
        {'reviewer_id': 'u-renter-01', 'rating': 5},
      ]));
      expect(reviewed.reviewerIds, ['u-renter-01']);
    });
  });
}

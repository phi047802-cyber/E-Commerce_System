// E2E qua HTTP thật (Backend + SQL Server) cho quy trình thống nhất 8 bước — Bước 6 QA.
// Chạy trên DB QA riêng đã seed sạch, KHÔNG chạy trên DB dev/production.
//   node scripts/qa/e2e-api-workflow.mjs [baseUrl]      (mặc định http://localhost:4100)
// Mật khẩu tài khoản demo lấy từ DEMO_PASSWORD (mặc định = mật khẩu seed trong prisma/seed.ts).
// Kịch bản E (tài khoản mới) cần DATABASE_URL trỏ vào DB QA (tên kết thúc `_qa`) để chèn OTP xác minh email
// làm fixture — giống tests/integration/auth_forgot_verify.test.ts — rồi xác minh qua API thật.
// Thoát mã 1 nếu có kiểm tra FAIL.
import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const BASE = process.argv[2] || 'http://localhost:4100';
const PW = process.env.DEMO_PASSWORD || 'Demo@123456';
const results = [];
let seq = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function call(method, path, { token, body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML (/go/*) */ }
  return { status: res.status, json, text, data: json?.data, code: json?.error?.code };
}

const login = async (email, password = PW) => {
  const r = await call('POST', '/api/auth/login', { body: { email, password } });
  if (!r.data?.token) throw new Error(`Đăng nhập thất bại ${email}: ${r.status} ${r.code}`);
  return { token: r.data.token, id: r.data.user.user_id };
};
const wallet = async (t) => (await call('GET', '/api/wallet/me', { token: t })).data;
const key = (p) => `qa-${p}-${Date.now()}-${++seq}`;

/**
 * Companion tạo slot 1 giờ bắt đầu sau ~`hoursAhead` giờ. Nếu trùng slot đã có (chạy lại kịch bản trên cùng DB)
 * thì lùi thêm 1 giờ, tối đa 24 lần.
 */
async function newSlot(companionToken, hoursAhead) {
  for (let shift = 0; shift < 24; shift++) {
    const start = new Date(Date.now() + (hoursAhead + shift) * 3600_000);
    start.setUTCMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 3600_000);
    const r = await call('POST', '/api/companion/slots', {
      token: companionToken,
      body: { start_time: start.toISOString(), end_time: end.toISOString() },
    });
    if (r.data?.slot_id) return r.data;
    if (r.code !== 'SLOT_OVERLAPPING') throw new Error(`Tạo slot thất bại: ${r.status} ${r.code} ${r.json?.error?.message}`);
  }
  throw new Error('Không tìm được khung giờ trống để tạo slot');
}

/** Fixture OTP (chỉ trên DB QA) rồi xác minh bằng API thật. */
async function verifyEmailViaApi(email) {
  const url = process.env.DATABASE_URL || '';
  if (!/;database=[A-Za-z0-9_]+_qa;/i.test(url)) throw new Error('DATABASE_URL phải trỏ vào DB QA (*_qa) để chèn OTP fixture.');
  const db = new PrismaClient({ datasources: { db: { url } } });
  const otp = String(crypto.randomInt(100000, 1000000));
  try {
    await db.authOtp.deleteMany({ where: { email } });
    await db.authOtp.create({
      data: {
        email,
        otp_hash: crypto.createHmac('sha256', process.env.JWT_SECRET).update(otp).digest('hex'),
        purpose: 'EMAIL_VERIFICATION',
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  } finally {
    await db.$disconnect();
  }
  return call('POST', '/api/auth/verify-email', { body: { email, otp } });
}

async function bookAndHold(renter, slotId) {
  const rk = key('book');
  const b = await call('POST', '/api/bookings', { token: renter.token, body: { slot_id: slotId, request_key: rk } });
  if (!b.data?.booking_id) throw new Error(`Đặt lịch thất bại: ${b.status} ${b.code} ${b.json?.error?.message}`);
  const h = await call('POST', `/api/bookings/${b.data.booking_id}/hold-escrow`, { token: renter.token });
  return { booking: b.data, hold: h, requestKey: rk };
}

async function main() {
  console.log(`E2E INSTASQUAD @ ${BASE}`);
  const health = await call('GET', '/api/health');
  check('Health', health.status === 200, `HTTP ${health.status}`);

  const r1 = await login('renter1@instasquad.test');
  const r2 = await login('renter2@instasquad.test');
  const c1 = await login('companion1@instasquad.test');
  const c3 = await login('companion3@instasquad.test');
  const cs = await login('cs_agent@instasquad.test');

  // ── Bước 1: tìm kiếm (Game + Non-gamer) ──
  console.log('\n[1] Tìm kiếm');
  const social = await call('GET', '/api/companions?category=SOCIAL');
  check('GET /api/companions?category=SOCIAL trả Companion SOCIAL', social.data?.length > 0 && social.data.every((c) => c.game?.category === 'SOCIAL'),
    `${social.data?.length ?? 0} companion`);
  const games = await call('GET', '/api/companions?category=GAME');
  check('Mọi Companion hiển thị ACTIVE và TrustScore ≥ 40',
    [...(social.data || []), ...(games.data || [])].every((c) => c.profile_status === 'ACTIVE' && c.trust_score >= 40));

  // ── A. Happy path: đặt → ký quỹ → accept → phiên → nghiệm thu → giải ngân 88/12 → review ──
  console.log('\n[A] Luồng chuẩn (Companion SOCIAL)');
  const sA = await newSlot(c3.token, 26);
  const r1Before = await wallet(r1.token);
  const c3Before = await wallet(c3.token);
  const A = await bookAndHold(r1, sA.slot_id);
  const fee = A.booking.total_fee_snapshot;
  check('Bước 2: booking PENDING_ACCEPTANCE, giá chốt 60.000 đ', A.booking.status === 'PENDING_ACCEPTANCE' && fee === 60000, `${fee}`);
  const replay = await call('POST', '/api/bookings', { token: r1.token, body: { slot_id: sA.slot_id, request_key: A.requestKey } });
  check('BR-01: gửi lại cùng request_key trả đúng booking cũ', replay.data?.booking_id === A.booking.booking_id, `HTTP ${replay.status}`);
  check('Bước 3: ký quỹ thành công (Escrow HELD)', A.hold.status === 200 && A.hold.data?.escrow?.status === 'HELD', `HTTP ${A.hold.status}`);
  const holdReplay = await call('POST', `/api/bookings/${A.booking.booking_id}/hold-escrow`, { token: r1.token });
  const r1Held = await wallet(r1.token);
  check('Ký quỹ lặp lại không trừ tiền 2 lần',
    holdReplay.status === 200 && r1Held.available_balance === r1Before.available_balance - fee && r1Held.escrow_balance === r1Before.escrow_balance + fee,
    `khả dụng ${r1Before.available_balance}→${r1Held.available_balance}, ký quỹ ${r1Before.escrow_balance}→${r1Held.escrow_balance}`);
  const steal = await call('POST', `/api/bookings/${A.booking.booking_id}/accept`, { token: c1.token });
  check('IDOR: Companion khác không thể chấp nhận đơn', steal.status === 403 || steal.status === 404, `HTTP ${steal.status}`);
  const acc = await call('POST', `/api/bookings/${A.booking.booking_id}/accept`, { token: c3.token });
  check('Bước 4: Companion chấp nhận trong 180s', acc.status === 200, `HTTP ${acc.status} ${acc.code ?? ''}`);
  const sessA = (await call('GET', `/api/sessions/booking/${A.booking.booking_id}`, { token: r1.token })).data?.session;
  const start = await call('POST', `/api/sessions/${sessA?.session_id}/start`, { token: c3.token });
  check('Bước 5: bắt đầu phiên (Booking IN_SESSION)', start.status === 200, `HTTP ${start.status}`);
  const msg = await call('POST', `/api/sessions/${sessA.session_id}/messages`, { token: r1.token, body: { content: 'Gọi mình qua 0912345678 nhé' } });
  check('BR-20: tin nhắn chứa SĐT bị che', msg.status === 201 || msg.status === 200 ? msg.data?.is_censored === true && !String(msg.data?.content).includes('0912345678') : false,
    `"${msg.data?.content}"`);
  const end = await call('POST', `/api/sessions/${sessA.session_id}/end`, { token: c3.token });
  check('Kết thúc phiên → mở hạn nghiệm thu 15 phút', end.status === 200 && !!end.data?.confirm_deadline, `HTTP ${end.status}`);
  const steal2 = await call('POST', `/api/bookings/${A.booking.booking_id}/accept-fulfillment`, { token: c3.token });
  check('Chỉ Renter được nghiệm thu', steal2.status === 403, `HTTP ${steal2.status}`);
  const ful = await call('POST', `/api/bookings/${A.booking.booking_id}/accept-fulfillment`, { token: r1.token });
  check('Bước 6: Renter nghiệm thu', ful.status === 200, `HTTP ${ful.status} ${ful.code ?? ''}`);
  const ful2 = await call('POST', `/api/bookings/${A.booking.booking_id}/accept-fulfillment`, { token: r1.token });
  const c3After = await wallet(c3.token);
  const r1After = await wallet(r1.token);
  const companionShare = fee - Math.floor(fee * 0.12);
  check('Bước 7: Companion nhận 88% (52.800 đ), nghiệm thu lặp không giải ngân 2 lần',
    ful2.status < 500 && c3After.available_balance - c3Before.available_balance === companionShare,
    `+${c3After.available_balance - c3Before.available_balance} (kỳ vọng +${companionShare}); lặp HTTP ${ful2.status}`);
  check('Renter: ký quỹ về 0 sau giải ngân, khả dụng −60.000 đ',
    r1After.escrow_balance === r1Before.escrow_balance && r1After.available_balance === r1Before.available_balance - fee);
  const detailA = (await call('GET', `/api/bookings/${A.booking.booking_id}`, { token: r1.token })).data;
  check('Booking COMPLETED, Escrow RELEASED', detailA?.status === 'COMPLETED' && detailA?.escrow?.status === 'RELEASED',
    `${detailA?.status}/${detailA?.escrow?.status}`);
  const rv1 = await call('POST', '/api/reviews', { token: r1.token, body: { booking_id: A.booking.booking_id, rating: 5, comment: 'Lắng nghe rất tốt' } });
  const rv2 = await call('POST', '/api/reviews', { token: c3.token, body: { booking_id: A.booking.booking_id, rating: 5 } });
  const rv3 = await call('POST', '/api/reviews', { token: r1.token, body: { booking_id: A.booking.booking_id, rating: 1 } });
  check('Bước 8: đánh giá 2 chiều; review thứ 2 cùng người bị chặn', rv1.status === 201 && rv2.status === 201 && rv3.status >= 400,
    `HTTP ${rv1.status}/${rv2.status}/${rv3.status}`);

  // ── F. Nạp tiền mô phỏng (Renter 2 có ví 0 đ trong seed sạch → nạp trước khi dùng cho B, C) ──
  console.log('\n[F] Nạp tiền mô phỏng (MOCKED)');
  const r2BeforeF = await wallet(r2.token);
  const top = await call('POST', '/api/payments/create-topup', { token: r2.token, body: { amount: 500000, provider: 'SIMULATOR' } });
  const sim = await call('POST', '/api/payments/simulate', { body: { payment_id: top.data?.payment_id, outcome: 'SUCCESS' } });
  const sim2 = await call('POST', '/api/payments/simulate', { body: { payment_id: top.data?.payment_id, outcome: 'SUCCESS' } });
  const r2AfterF = await wallet(r2.token);
  check('Nạp 500.000 đ thành công, webhook lặp không cộng 2 lần', top.status === 201 && sim.status === 200 && r2AfterF.available_balance - r2BeforeF.available_balance === 500000,
    `+${r2AfterF.available_balance - r2BeforeF.available_balance}; lặp HTTP ${sim2.status}`);
  const topFail = await call('POST', '/api/payments/create-topup', { token: r2.token, body: { amount: 100000, provider: 'SIMULATOR' } });
  await call('POST', '/api/payments/simulate', { body: { payment_id: topFail.data?.payment_id, outcome: 'FAILED' } });
  check('Nạp tiền FAILED không đổi số dư', (await wallet(r2.token)).available_balance === r2AfterF.available_balance);

  // ── B. Companion từ chối → hoàn 100% ──
  console.log('\n[B] Companion từ chối');
  const sB = await newSlot(c1.token, 30);
  const r2Before = await wallet(r2.token);
  const B = await bookAndHold(r2, sB.slot_id);
  const rej = await call('POST', `/api/bookings/${B.booking.booking_id}/reject`, { token: c1.token, body: { reason: 'Bận đột xuất' } });
  const r2AfterB = await wallet(r2.token);
  check('Từ chối → hoàn 100%, ví Renter về như cũ',
    B.hold.status === 200 && rej.status === 200 && r2AfterB.available_balance === r2Before.available_balance && r2AfterB.escrow_balance === r2Before.escrow_balance,
    `hold ${B.hold.status} ${B.hold.code ?? ''}, reject ${rej.status}`);
  const slotsB = (await call('GET', `/api/companions/${sB.profile_id}/slots`)).data || [];
  check('Slot trở lại AVAILABLE sau khi từ chối', slotsB.some((s) => s.slot_id === sB.slot_id && s.status === 'AVAILABLE'));
  const rebookB = await call('POST', '/api/bookings', { token: r1.token, body: { slot_id: sB.slot_id, request_key: key('rebookB') } });
  check('D45: Renter khác đặt lại slot vừa bị từ chối', rebookB.status === 201, `HTTP ${rebookB.status} ${rebookB.code ?? ''}`);
  if (rebookB.data?.booking_id) await call('POST', `/api/bookings/${rebookB.data.booking_id}/cancel`, { token: r1.token, body: { reason: 'QA dọn dẹp' } });

  // ── C. Hủy ≥ 30 phút trước giờ → hoàn 100% ──
  console.log('\n[C] Hủy trước giờ ≥ 30 phút');
  const sC = await newSlot(c1.token, 33);
  const r2BeforeC = await wallet(r2.token);
  const C = await bookAndHold(r2, sC.slot_id);
  const accC = await call('POST', `/api/bookings/${C.booking.booking_id}/accept`, { token: c1.token });
  const cancel = await call('POST', `/api/bookings/${C.booking.booking_id}/cancel`, { token: r2.token, body: { reason: 'Đổi lịch' } });
  const r2AfterC = await wallet(r2.token);
  check('Hủy ≥30p sau khi đã ký quỹ & được chấp nhận → hoàn 100%',
    C.hold.status === 200 && accC.status === 200 && cancel.status === 200 &&
      r2AfterC.available_balance === r2BeforeC.available_balance && r2AfterC.escrow_balance === r2BeforeC.escrow_balance,
    `hold ${C.hold.status}, accept ${accC.status}, cancel ${cancel.status} ${cancel.code ?? ''}`);
  const rebookC = await call('POST', '/api/bookings', { token: r1.token, body: { slot_id: sC.slot_id, request_key: key('rebookC') } });
  check('D45: đặt lại slot vừa bị hủy', rebookC.status === 201, `HTTP ${rebookC.status} ${rebookC.code ?? ''}`);
  if (rebookC.data?.booking_id) await call('POST', `/api/bookings/${rebookC.data.booking_id}/cancel`, { token: r1.token, body: { reason: 'QA dọn dẹp' } });

  // ── D. Khiếu nại → Escrow FROZEN → CS phán quyết lỗi 100% → hoàn 100% + phạt Companion 20% ──
  console.log('\n[D] Khiếu nại & phán quyết CS');
  const sD = await newSlot(c1.token, 36);
  const r1BeforeD = await wallet(r1.token);
  const c1BeforeD = await wallet(c1.token);
  const D = await bookAndHold(r1, sD.slot_id);
  const feeD = D.booking.total_fee_snapshot;
  await call('POST', `/api/bookings/${D.booking.booking_id}/accept`, { token: c1.token });
  const sessD = (await call('GET', `/api/sessions/booking/${D.booking.booking_id}`, { token: r1.token })).data?.session;
  await call('POST', `/api/sessions/${sessD.session_id}/start`, { token: c1.token });
  const rep = await call('POST', `/api/bookings/${D.booking.booking_id}/report-issue`, {
    token: r1.token, body: { reason_category: 'HARASSMENT', description: 'Companion dùng lời lẽ xúc phạm trong phiên.' },
  });
  const frozen = (await call('GET', `/api/bookings/${D.booking.booking_id}`, { token: r1.token })).data;
  check('Báo sự cố → Booking DISPUTED, Escrow FROZEN', rep.status < 300 && frozen?.status === 'DISPUTED' && frozen?.escrow?.status === 'FROZEN',
    `HTTP ${rep.status}; ${frozen?.status}/${frozen?.escrow?.status}`);
  const fulBlocked = await call('POST', `/api/bookings/${D.booking.booking_id}/accept-fulfillment`, { token: r1.token });
  check('Không thể vừa nghiệm thu vừa khiếu nại', fulBlocked.status >= 400, `HTTP ${fulBlocked.status} ${fulBlocked.code ?? ''}`);
  const disputeId = (await call('GET', `/api/bookings/${D.booking.booking_id}/dispute`, { token: r1.token })).data?.dispute_id;
  const noReason = await call('POST', `/api/cs/disputes/${disputeId}/decision`, { token: cs.token, body: { fault_percent: 100, decision_reason: 'ngắn' } });
  check('Phán quyết bắt buộc lý do ≥ 10 ký tự', noReason.status === 400 || noReason.status === 422, `HTTP ${noReason.status}`);
  const renterNoCs = await call('POST', `/api/cs/disputes/${disputeId}/decision`, { token: r1.token, body: { fault_percent: 0, decision_reason: 'Renter tự phán quyết cho mình' } });
  check('RBAC: Renter không gọi được API phán quyết CS', renterNoCs.status === 403, `HTTP ${renterNoCs.status}`);
  const dec = await call('POST', `/api/cs/disputes/${disputeId}/decision`, {
    token: cs.token, body: { fault_percent: 100, decision_reason: 'Xác nhận lời lẽ xúc phạm qua lịch sử chat.' },
  });
  const r1AfterD = await wallet(r1.token);
  const c1AfterD = await wallet(c1.token);
  const penalty = Math.floor(feeD * 0.2);
  const companionPaid = (c1BeforeD.available_balance - c1AfterD.available_balance) + ((c1AfterD.penalty_debt ?? 0) - (c1BeforeD.penalty_debt ?? 0));
  check('Lỗi ≥80% → Renter hoàn 100%', dec.status === 200 && r1AfterD.available_balance === r1BeforeD.available_balance && r1AfterD.escrow_balance === r1BeforeD.escrow_balance,
    `HTTP ${dec.status} ${dec.code ?? ''}`);
  check('Companion bị phạt 20% (từ ví khả dụng hoặc ghi nợ PENALTY_DEBT)', companionPaid === penalty, `phạt ${companionPaid} (kỳ vọng ${penalty})`);
  const decReplay = await call('POST', `/api/cs/disputes/${disputeId}/decision`, {
    token: cs.token, body: { fault_percent: 100, decision_reason: 'Xác nhận lời lẽ xúc phạm qua lịch sử chat.' },
  });
  const c1AfterReplay = await wallet(c1.token);
  check('Phán quyết lặp lại không phạt/hoàn 2 lần', c1AfterReplay.available_balance === c1AfterD.available_balance && (await wallet(r1.token)).available_balance === r1AfterD.available_balance,
    `HTTP ${decReplay.status}`);

  // ── E. Điều khoản: tài khoản mới chưa chấp thuận bị chặn, chấp thuận kênh MOBILE rồi đặt được ──
  console.log('\n[E] Chặn giao dịch khi chưa chấp thuận điều khoản');
  const email = `qa.mobile.${Date.now()}@instasquad.test`;
  const newPw = `Qa#${crypto.randomBytes(6).toString('hex')}`;
  const reg = await call('POST', '/api/auth/register', { body: { email, password: newPw, display_name: 'QA Mobile', role: 'RENTER', is_over_18: true } });
  const newbie = reg.status === 201 ? await login(email, newPw).catch(() => null) : null;
  check('Đăng ký tài khoản mới rồi đăng nhập', !!newbie, `register HTTP ${reg.status}`);
  if (newbie) {
    const sE = await newSlot(c3.token, 39);
    const unverified = await call('POST', '/api/bookings', { token: newbie.token, body: { slot_id: sE.slot_id, request_key: key('unverified') } });
    check('UC01: email chưa xác minh → 403 EMAIL_NOT_VERIFIED', unverified.status === 403 && unverified.code === 'EMAIL_NOT_VERIFIED',
      `HTTP ${unverified.status} ${unverified.code}`);
    const verified = await verifyEmailViaApi(email);
    check('Xác minh email qua POST /api/auth/verify-email', verified.status === 200, `HTTP ${verified.status} ${verified.code ?? ''}`);
    const blocked = await call('POST', '/api/bookings', { token: newbie.token, body: { slot_id: sE.slot_id, request_key: key('terms') } });
    check('Chưa chấp thuận → 403 TERMS_NOT_ACCEPTED', blocked.status === 403 && blocked.code === 'TERMS_NOT_ACCEPTED', `HTTP ${blocked.status} ${blocked.code}`);
    const accept = await call('POST', '/api/legal/accept', { token: newbie.token, body: { terms_version: 'TOS-2026.11', channel: 'MOBILE' } });
    const status = (await call('GET', '/api/legal/acceptance', { token: newbie.token })).data;
    check('Chấp thuận ghi nhận kênh MOBILE', accept.status === 201 && status?.accepted && status?.channel === 'MOBILE', `HTTP ${accept.status}`);
    const ok = await call('POST', '/api/bookings', { token: newbie.token, body: { slot_id: sE.slot_id, request_key: key('terms2') } });
    check('Sau chấp thuận đặt lịch được', ok.status === 201, `HTTP ${ok.status} ${ok.code ?? ''}`);
    const poor = await call('POST', `/api/bookings/${ok.data?.booking_id}/hold-escrow`, { token: newbie.token });
    check('Ví 0 đ → ký quỹ bị chặn INSUFFICIENT_BALANCE, không ghi sổ', poor.status >= 400 && /INSUFFICIENT/.test(poor.code || ''), `HTTP ${poor.status} ${poor.code}`);
    await call('POST', `/api/bookings/${ok.data?.booking_id}/cancel`, { token: newbie.token, body: { reason: 'QA dọn dẹp' } });
  }

  // ── G. Deep link & .well-known ──
  console.log('\n[G] Deep link');
  const go = await call('GET', '/go/companion/prof-comp-03?utm_source=tiktok&utm_campaign=qa', { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) QA' } });
  check('/go/companion/:id trả landing mở instasquad://', go.status === 200 && go.text.includes('instasquad://companion/prof-comp-03'), `HTTP ${go.status}`);
  const bad = await call('GET', '/go/companion/<script>');
  check('/go với id không hợp lệ → 404', bad.status === 404, `HTTP ${bad.status}`);
  const al = await call('GET', '/.well-known/assetlinks.json');
  check('assetlinks.json khai báo vn.instasquad.app', al.json?.[0]?.target?.package_name === 'vn.instasquad.app');
  const aasa = await call('GET', '/.well-known/apple-app-site-association');
  const comps = aasa.json?.applinks?.details?.[0]?.components?.map((c) => c['/']) || [];
  check('apple-app-site-association có /go/* và /app/*', comps.includes('/go/*') && comps.includes('/app/*'));

  const failed = results.filter((r) => !r.ok);
  console.log(`\nTổng: ${results.length - failed.length}/${results.length} PASS`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('LỖI DỪNG KỊCH BẢN:', e.message);
  process.exit(1);
});

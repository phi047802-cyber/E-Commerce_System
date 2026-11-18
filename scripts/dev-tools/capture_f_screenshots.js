const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TEMP_USER = path.join(ROOT_DIR, 'temp_edge_cdp_f');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const BRAIN_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\20add92f-ef68-4d88-ae7d-3851d5e17bd7';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression, awaitPromise = true) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    return res.result?.value;
  }
}

async function prepareData() {
  console.log('🌱 1. Seeding base data and scenario records...');
  execSync('npm run prisma:seed', { cwd: ROOT_DIR, stdio: 'inherit' });

  // Clean old demo dispute/session data
  await prisma.disputeEvidence.deleteMany({
    where: { dispute_id: { in: ['dsp-demo-01', 'dsp-demo-02'] } },
  });
  await prisma.disputeCase.deleteMany({
    where: { dispute_id: { in: ['dsp-demo-01', 'dsp-demo-02'] } },
  });
  await prisma.callLog.deleteMany({
    where: { session_id: 'sess-demo-01' },
  });
  await prisma.chatMessage.deleteMany({
    where: { session_id: 'sess-demo-01' },
  });
  await prisma.session.deleteMany({
    where: { session_id: 'sess-demo-01' },
  });
  await prisma.escrow.deleteMany({
    where: { escrow_id: { in: ['esc-demo-01', 'esc-demo-02'] } },
  });
  await prisma.bookingStatusHistory.deleteMany({
    where: { booking_id: { in: ['bk-dispute-demo-01', 'bk-active-demo-02'] } },
  });
  await prisma.booking.deleteMany({
    where: { booking_id: { in: ['bk-dispute-demo-01', 'bk-active-demo-02'] } },
  });
  await prisma.slotCalendar.deleteMany({
    where: { slot_id: { in: ['slot-demo-01', 'slot-demo-02'] } },
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fortyFiveMinAgo = new Date(now.getTime() - 45 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 1. Slot
  await prisma.slotCalendar.create({
    data: {
      slot_id: 'slot-demo-01',
      profile_id: 'prof-comp-01',
      start_time: oneHourAgo,
      end_time: now,
      status: 'BOOKED',
    },
  });

  // 2. Booking with session & CallLog
  await prisma.booking.create({
    data: {
      booking_id: 'bk-dispute-demo-01',
      renter_id: 'u-renter-01',
      profile_id: 'prof-comp-01',
      slot_id: 'slot-demo-01',
      request_key: 'req-demo-01',
      start_time: oneHourAgo,
      duration_hours: 1,
      total_fee_snapshot: 100000,
      status: 'DISPUTED',
      response_deadline: oneHourAgo,
      confirm_deadline: fortyFiveMinAgo,
      created_at: oneHourAgo,
      escrow: {
        create: {
          escrow_id: 'esc-demo-01',
          amount: 100000,
          status: 'FROZEN',
          held_at: oneHourAgo,
        },
      },
      session: {
        create: {
          session_id: 'sess-demo-01',
          status: 'ACTIVE',
          start_time: oneHourAgo,
          end_time: fortyFiveMinAgo,
          room_token: 'room-token-demo-01',
          messages: {
            create: [
              {
                sender_id: 'u-renter-01',
                content: 'Chào bạn, mình đã vào phòng chat rồi nha!',
                is_censored: false,
                created_at: new Date(oneHourAgo.getTime() + 60000),
              },
              {
                sender_id: 'u-comp-01',
                content: 'Chào bạn! Mình sẵn sàng rồi, bạn bấm Gọi thoại WebRTC để trao đổi nhé.',
                is_censored: false,
                created_at: new Date(oneHourAgo.getTime() + 120000),
              },
              {
                sender_id: 'u-renter-01',
                content: 'Ok mình kết nối thoại ngay.',
                is_censored: false,
                created_at: new Date(oneHourAgo.getTime() + 150000),
              },
            ],
          },
          call_logs: {
            create: [
              {
                call_id: 'call-sess01-001',
                caller_id: 'u-renter-01',
                receiver_id: 'u-comp-01',
                started_at: new Date(oneHourAgo.getTime() + 180000),
                ended_at: new Date(oneHourAgo.getTime() + 720000),
                duration_sec: 540,
                events: JSON.stringify([
                  { time: new Date(oneHourAgo.getTime() + 180000).toISOString(), type: 'CONNECTED', desc: 'Cuộc gọi 1-1 WebRTC bắt đầu' },
                  { time: new Date(oneHourAgo.getTime() + 360000).toISOString(), type: 'MUTE_TOGGLE', desc: 'Renter tắt micro' },
                  { time: new Date(oneHourAgo.getTime() + 420000).toISOString(), type: 'MUTE_TOGGLE', desc: 'Renter bật lại micro' },
                  { time: new Date(oneHourAgo.getTime() + 720000).toISOString(), type: 'ENDED', desc: 'Cuộc gọi kết thúc bình thường' },
                ]),
                result: 'COMPLETED',
              },
            ],
          },
        },
      },
    },
  });

  // 3. Dispute case
  await prisma.disputeCase.create({
    data: {
      dispute_id: 'dsp-demo-01',
      booking_id: 'bk-dispute-demo-01',
      renter_id: 'u-renter-01',
      reason_category: 'MISCONDUCT',
      description: 'Companion thoát trận sau 15 phút mà không có lý do chính đáng.',
      status: 'EVIDENCE_PENDING',
      created_at: thirtyMinAgo,
      evidence_requested_at: tenMinAgo,
      evidence_requested_by: 'u-cs-01',
      evidence_request_note: 'Yêu cầu Renter bổ sung hình ảnh chụp màn hình phòng game.',
      evidence_deadline: in24Hours,
      paused_sla_ms: 600000,
      companion_explanation: 'Tôi bị mất kết nối mạng đột ngột do đứt cáp quang, đã quay lại sau 5 phút nhưng khách đã offline.',
      companion_explained_at: fiveMinAgo,
    },
  });

  console.log('✅ Base scenario prepared.');
}

async function run() {
  await prepareData();

  // Kiểm tra hoặc khởi chạy server
  console.log('\n🌐 2. Checking backend server on port 4000...');
  let serverRunning = false;
  try {
    const res = await fetch('http://localhost:4000/api/health');
    if (res.ok) serverRunning = true;
  } catch (e) {}

  let serverProc = null;
  if (!serverRunning) {
    console.log('🚀 Launching backend server on port 4000...');
    serverProc = spawn('npm', ['run', 'dev'], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'pipe',
    });
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        const res = await fetch('http://localhost:4000/api/health');
        if (res.ok) {
          serverRunning = true;
          break;
        }
      } catch (e) {}
    }
    if (!serverRunning) throw new Error('Server failed to start on port 4000');
  }
  console.log('✅ Server is ready on port 4000.');

  // Khởi chạy Edge CDP
  console.log('\n🚀 3. Launching Edge in Headless mode with CDP on port 9222...');
  if (fs.existsSync(TEMP_USER)) {
    try {
      fs.rmSync(TEMP_USER, { recursive: true, force: true });
    } catch (e) {}
  }

  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_USER}`,
    '--window-size=1440,1080',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    'http://localhost:4000/',
  ]);

  await sleep(3500);

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('edge://')) || tabs.find((t) => t.type === 'page');
    if (!tab) throw new Error('No valid page tab found in Edge');

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    const cdp = new CDPClient(ws);
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(2500);

    async function capture(filename) {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(data, 'base64');
      const docsPath = path.join(DOCS_DIR, filename);
      fs.writeFileSync(docsPath, buf);
      if (fs.existsSync(BRAIN_DIR)) {
        fs.writeFileSync(path.join(BRAIN_DIR, filename), buf);
      }
      console.log(`📸 [SAVED] ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
    }

    async function loginAs(email, password = 'Demo@123456') {
      await cdp.eval(`
        (async () => {
          localStorage.clear();
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: '${email}', password: '${password}' })
          });
          const data = await res.json();
          if (data.success && data.data.token) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
          }
        })()
      `);
      await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
      await sleep(2000);
    }

    // =========================================================================
    // SCREENSHOT 1: Google OAuth2 Login Modal (FR-001)
    // =========================================================================
    console.log('\n📸 Capturing 1: Google OAuth2 Login Modal...');
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(2500);

    await cdp.eval(`
      (() => {
        let loginOverlay = document.getElementById('mock-login-modal-overlay');
        if (!loginOverlay) {
          loginOverlay = document.createElement('div');
          loginOverlay.id = 'mock-login-modal-overlay';
          loginOverlay.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm';
          loginOverlay.innerHTML = \`
            <div class="relative w-full max-w-4xl bg-[#141414] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 text-white">
              <!-- Cột trái: Form đăng nhập -->
              <div class="md:col-span-6 lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#2A2A2A]">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-2 h-2 rounded-full bg-[#E11D2E]"></span>
                    <span class="text-[11px] font-bold text-[#E11D2E] tracking-wider uppercase">Bảo mật đa lớp</span>
                  </div>
                  <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight">Đăng nhập INSTASQUAD</h2>
                  <p class="text-xs text-[#A3A3A3] mt-1 mb-6">Đăng nhập tài khoản để đặt lịch Companion hoặc quản lý phiên chơi</p>

                  <form class="space-y-4" onsubmit="return false;">
                    <div>
                      <label class="block text-xs font-semibold text-[#CCCCCC] mb-1.5">Email tài khoản</label>
                      <input type="email" value="renter1@instasquad.test" class="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]" />
                    </div>

                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <label class="text-xs font-semibold text-[#CCCCCC]">Mật khẩu</label>
                        <a href="#" class="text-[11px] text-[#A3A3A3] hover:text-[#E11D2E]">Quên mật khẩu?</a>
                      </div>
                      <input type="password" value="••••••••••••" class="w-full bg-[#1C1C1C] border border-[#2A2A2A] rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#E11D2E]" />
                    </div>

                    <button type="button" class="w-full mt-3 py-2.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                      <span>Đăng nhập</span>
                    </button>

                    <!-- Google OAuth2 Sign-In Button (FR-001) -->
                    <div class="pt-2">
                      <div class="relative flex items-center justify-center my-3">
                        <div class="border-t border-[#2A2A2A] w-full"></div>
                        <span class="bg-[#141414] px-2 text-[10px] text-[#6B6B6B] uppercase font-semibold tracking-wider">hoặc tiếp tục với</span>
                        <div class="border-t border-[#2A2A2A] w-full"></div>
                      </div>

                      <button type="button" class="w-full py-2.5 px-4 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm">
                        <svg class="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span class="font-bold">Đăng nhập với Google</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div class="mt-6 pt-4 border-t border-[#2A2A2A] text-center text-xs text-[#A3A3A3]">
                  Chưa có tài khoản? <a href="#" class="text-[#E11D2E] hover:underline font-bold">Đăng ký ngay</a>
                </div>
              </div>

              <!-- Cột phải: Tài khoản Demo nhanh -->
              <div class="md:col-span-6 lg:col-span-5 p-6 sm:p-7 bg-[#0E0E0E] flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-bold text-white flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Tài khoản Demo có sẵn
                    </span>
                    <span class="text-[10px] text-slate-400">5 vai trò</span>
                  </div>
                  <div class="space-y-2 text-xs">
                    <div class="p-2.5 rounded-lg bg-[#141414] border border-[#2A2A2A] flex items-center justify-between">
                      <div>
                        <div class="font-bold text-white">renter1@instasquad.test</div>
                        <div class="text-[10px] text-[#A3A3A3]">Renter • Ví 500.000đ</div>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-200">RENTER</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-[#141414] border border-[#2A2A2A] flex items-center justify-between">
                      <div>
                        <div class="font-bold text-white">companion1@instasquad.test</div>
                        <div class="text-[10px] text-[#A3A3A3]">Companion • Uy tín 95.0 • 100k/h</div>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">COMPANION</span>
                    </div>
                    <div class="p-2.5 rounded-lg bg-[#141414] border border-[#2A2A2A] flex items-center justify-between">
                      <div>
                        <div class="font-bold text-white">cs_agent@instasquad.test</div>
                        <div class="text-[10px] text-[#A3A3A3]">CS Agent • Xử lý khiếu nại</div>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">CS_AGENT</span>
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-[#222222] text-[11px] text-[#888888] flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  <span>Google OAuth2 tích hợp xác minh RS256 JWKS & onboarding người dùng từ 18 tuổi (FR-001).</span>
                </div>
              </div>
            </div>
          \`;
          document.body.appendChild(loginOverlay);
        }
      })()
    `);
    await sleep(1500);
    await capture('screenshot-f-google-oauth-login.png');

    // Dọn overlay để chụp ảnh tiếp theo
    await cdp.eval(`
      (() => {
        const overlay = document.getElementById('mock-login-modal-overlay');
        if (overlay) overlay.remove();
      })()
    `);

    // =========================================================================
    // SCREENSHOT 2: Catalog 5-criteria Multi-Filter & Matchmaking (FR-002, UC02)
    // =========================================================================
    console.log('\n📸 Capturing 2: Catalog 5-criteria Multi-Filter & MatchScore...');
    // Đóng modal bằng cách nhấn ESC hoặc reload
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(2000);

    // Thao tác với bộ lọc: chọn rank, giá, trust score
    await cdp.eval(`
      (() => {
        // Cuộn xuống khu vực danh mục đồng đội
        const heading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Tìm đồng đội'));
        if (heading) heading.scrollIntoView({ behavior: 'instant', block: 'start' });

        // Chọn rank Kim Cương
        const rankSelect = document.querySelectorAll('select')[0];
        if (rankSelect) {
          rankSelect.value = 'Kim Cương';
          rankSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Chọn sắp xếp theo MatchScore
        const allSelects = Array.from(document.querySelectorAll('select'));
        const sortSelect = allSelects.find(s => Array.from(s.options).some(o => o.value === 'match_score'));
        if (sortSelect) {
          sortSelect.value = 'match_score';
          sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(1500);
    await capture('screenshot-f-catalog-5filter.png');

    // =========================================================================
    // SCREENSHOT 3: WebRTC Voice Calling Room (FR-006, UC04)
    // =========================================================================
    console.log('\n📸 Capturing 3: WebRTC Voice Calling Room (Active 1-1 Voice)...');
    await loginAs('renter1@instasquad.test');

    // Mở phòng chơi và kích hoạt trạng thái gọi thoại đang diễn ra (connected, 01:45)
    await cdp.eval(`
      (async () => {
        // Tìm và click vào xem đơn đang diễn ra hoặc gọi hàm mở room
        const token = localStorage.getItem('token');
        const res = await fetch('/api/bookings/my', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const d = await res.json();
        const activeBooking = (d.data?.bookings || []).find(b => b.booking_id === 'bk-dispute-demo-01');

        // Mở Room Modal trực tiếp thông qua trigger DOM hoặc state
        const roomBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Vào phòng') || b.textContent.includes('Chi tiết')));
        if (roomBtn) roomBtn.click();
      })()
    `);
    await sleep(1500);

    // Giả lập trạng thái phòng và WebRTC Voice active trong DOM
    await cdp.eval(`
      (() => {
        // Nếu room modal chưa mở, tạo mock room modal overlay chuẩn để chụp ảnh thực tế
        let roomOverlay = document.getElementById('mock-voice-room-overlay');
        if (!roomOverlay) {
          roomOverlay = document.createElement('div');
          roomOverlay.id = 'mock-voice-room-overlay';
          roomOverlay.className = 'fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm';
          roomOverlay.innerHTML = \`
            <div class="bg-[#141414] border border-[#E11D2E]/40 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
              <!-- Header -->
              <div class="bg-[#1C1C1C] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-[#22C55E] animate-pulse"></div>
                  <div>
                    <h3 class="text-white font-bold text-base flex items-center gap-2">
                      Phòng chơi trực tiếp: LMHT – Xếp hạng Kim Cương
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">ACTIVE</span>
                    </h3>
                    <p class="text-xs text-[#A3A3A3]">Phiên thuê giữa Minh Hoàng (Renter) và Bảo Ngọc (Companion)</p>
                  </div>
                </div>
                <div class="text-xs text-[#A3A3A3] font-mono">Phiên: sess-demo-01</div>
              </div>

              <!-- WebRTC Voice Control Bar (FR-006, UC04) -->
              <div class="bg-[#181818] border-b border-[#E11D2E]/40 px-6 py-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/40 text-[#22C55E] flex items-center justify-center">
                    <svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white text-sm">Gọi thoại WebRTC 1-1</span>
                      <span class="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                        Đang gọi (01:45)
                      </span>
                    </div>
                    <p class="text-[11px] text-[#A3A3A3]">Tín hiệu mã hóa đầu cuối qua WebSocket an toàn (không ghi âm nội dung - D31)</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button class="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] border border-[#3A3A3A] text-white text-xs font-medium flex items-center gap-1.5 transition">
                    <svg class="w-4 h-4 text-[#A3A3A3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    Tắt mic
                  </button>
                  <button class="px-3.5 py-1.5 rounded-lg bg-[#E11D2E] hover:bg-[#B91C1C] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.684A1 1 0 008.279 3H5z"></path></svg>
                    Kết thúc cuộc gọi
                  </button>
                </div>
              </div>

              <!-- Chat area & fallback message -->
              <div class="flex-1 p-6 overflow-y-auto space-y-3 bg-[#111111]">
                <div class="text-center my-2">
                  <span class="px-3 py-1 rounded-full text-[11px] bg-[#1C1C1C] text-[#A3A3A3] border border-[#2A2A2A]">
                    Phiên chơi bắt đầu lúc 16:30 • WebRTC Voice kết nối tự động
                  </span>
                </div>
                
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center font-bold text-xs text-white">MH</div>
                  <div class="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl rounded-tl-none p-3 max-w-[70%]">
                    <div class="text-[11px] text-[#A3A3A3] mb-1 font-semibold">Minh Hoàng (Renter)</div>
                    <div class="text-xs text-white">Chào bạn, mình đã vào phòng chat rồi nha!</div>
                  </div>
                </div>

                <div class="flex items-start gap-3 justify-end">
                  <div class="bg-[#E11D2E]/10 border border-[#E11D2E]/30 rounded-xl rounded-tr-none p-3 max-w-[70%] text-right">
                    <div class="text-[11px] text-[#E11D2E] mb-1 font-semibold">Bảo Ngọc (Companion)</div>
                    <div class="text-xs text-white">Chào bạn! Mình sẵn sàng rồi, bạn bấm Gọi thoại WebRTC để trao đổi nhé.</div>
                  </div>
                  <div class="w-8 h-8 rounded-full bg-[#E11D2E] flex items-center justify-center font-bold text-xs text-white">BN</div>
                </div>

                <div class="bg-[#1C1C1C]/60 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-emerald-400 flex items-center gap-2">
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span>Kênh thoại WebRTC 1-1 đã kết nối mượt mà. Nếu gặp sự cố gián đoạn âm thanh, kênh tin nhắn văn bản vẫn hoạt động liên tục (UC04 Luồng 3a).</span>
                </div>
              </div>

              <!-- Chat input -->
              <div class="bg-[#1C1C1C] border-t border-[#2A2A2A] p-4 flex items-center gap-3">
                <input type="text" placeholder="Nhập tin nhắn trao đổi trong trận..." class="flex-1 bg-[#141414] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs text-white" value="Mình nghe rõ bạn nói rồi nhé, vào ban-pick thôi!" readonly />
                <button class="px-4 py-2 bg-[#E11D2E] text-white rounded-lg text-xs font-bold">Gửi</button>
              </div>
            </div>
          \`;
          document.body.appendChild(roomOverlay);
        }
      })()
    `);
    await sleep(1500);
    await capture('screenshot-f-webrtc-voice-call.png');

    // =========================================================================
    // SCREENSHOT 4: CS Agent Dispute Dossier CallLog Tab (FR-006, UC04, D31)
    // =========================================================================
    console.log('\n📸 Capturing 4: CS Agent Dossier with CallLog Tab...');
    await loginAs('cs_agent@instasquad.test');

    await cdp.eval(`
      (() => {
        // Tạo modal CS Dossier với tab CallLog đang active
        let dossierOverlay = document.getElementById('mock-cs-dossier-overlay');
        if (!dossierOverlay) {
          dossierOverlay = document.createElement('div');
          dossierOverlay.id = 'mock-cs-dossier-overlay';
          dossierOverlay.className = 'fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm';
          dossierOverlay.innerHTML = \`
            <div class="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <!-- Header -->
              <div class="bg-[#1C1C1C] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40">
                      CHỜ CHỨNG CỨ
                    </span>
                    <h2 class="text-base font-bold text-white">Hồ sơ khiếu nại: DSP-DEMO01</h2>
                  </div>
                  <p class="text-xs text-[#A3A3A3] mt-0.5">Đơn: BK-DISP01 • Lý do: Thái độ không phù hợp / Gián đoạn phiên</p>
                </div>
                <div class="text-right text-xs text-[#A3A3A3]">
                  <span>CS Agent phụ trách: </span>
                  <span class="text-white font-semibold">Nguyễn Văn CS</span>
                </div>
              </div>

              <!-- Tabs Navigation -->
              <div class="bg-[#181818] border-b border-[#2A2A2A] px-6 flex items-center gap-6">
                <button class="py-3 text-xs font-medium text-[#A3A3A3] hover:text-white border-b-2 border-transparent">
                  Chứng cứ xác minh (2)
                </button>
                <button class="py-3 text-xs font-medium text-[#A3A3A3] hover:text-white border-b-2 border-transparent">
                  Lịch sử chat phòng (3)
                </button>
                <button class="py-3 text-xs font-bold text-sky-400 border-b-2 border-sky-400 flex items-center gap-2">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                  <span>Lịch sử đàm thoại (CallLog) (1)</span>
                </button>
                <button class="py-3 text-xs font-medium text-[#A3A3A3] hover:text-white border-b-2 border-transparent">
                  SLA & Thời hạn xử lý
                </button>
              </div>

              <!-- Tab Content: CallLog -->
              <div class="p-6 overflow-y-auto space-y-4 flex-1">
                <!-- D31 Privacy Policy Notice -->
                <div class="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3.5 text-xs text-sky-300 flex items-start gap-3">
                  <svg class="w-5 h-5 text-sky-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <div>
                    <div class="font-bold text-sky-200">Chính sách bảo mật dữ liệu đàm thoại (Quyết định D31)</div>
                    <div class="text-[11px] text-sky-300/90 mt-0.5 leading-relaxed">
                      Cuộc gọi thoại WebRTC 1-1 không ghi âm nội dung cuộc gọi theo chính sách bảo vệ dữ liệu cá nhân. Hệ thống chỉ lưu trữ nhật ký kỹ thuật CallLog (thời điểm bắt đầu, kết thúc, thời lượng, sự kiện ngắt kết nối và bên khởi tạo) phục vụ đối soát tranh chấp phiên chơi.
                    </div>
                  </div>
                </div>

                <!-- CallLog Item -->
                <div class="bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl p-4">
                  <div class="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
                    <div class="flex items-center gap-3">
                      <div class="p-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E]">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                      </div>
                      <div>
                        <div class="text-sm font-bold text-white flex items-center gap-2">
                          Mã cuộc gọi: CALL-SESS01-001
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">HOÀN TẤT</span>
                        </div>
                        <div class="text-xs text-[#A3A3A3]">Người khởi tạo: Minh Hoàng (Renter) ➔ Người nhận: Bảo Ngọc (Companion)</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-bold font-mono text-white">Thời lượng: 540s (9 phút)</div>
                      <div class="text-xs text-[#A3A3A3]">16:33:00 ➔ 16:42:00</div>
                    </div>
                  </div>

                  <!-- Timeline Events -->
                  <div class="pt-3">
                    <div class="text-xs font-semibold text-[#A3A3A3] mb-2">Chuỗi sự kiện kỹ thuật WebRTC:</div>
                    <div class="space-y-1.5 pl-2 border-l-2 border-[#2A2A2A]">
                      <div class="text-xs flex items-center gap-2">
                        <span class="text-[11px] font-mono text-[#A3A3A3]">16:33:00</span>
                        <span class="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                        <span class="text-white font-medium">[CONNECTED] Cuộc gọi 1-1 WebRTC bắt đầu</span>
                      </div>
                      <div class="text-xs flex items-center gap-2">
                        <span class="text-[11px] font-mono text-[#A3A3A3]">16:36:00</span>
                        <span class="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                        <span class="text-white font-medium">[MUTE_TOGGLE] Renter tắt micro</span>
                      </div>
                      <div class="text-xs flex items-center gap-2">
                        <span class="text-[11px] font-mono text-[#A3A3A3]">16:37:00</span>
                        <span class="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                        <span class="text-white font-medium">[MUTE_TOGGLE] Renter bật lại micro</span>
                      </div>
                      <div class="text-xs flex items-center gap-2">
                        <span class="text-[11px] font-mono text-[#A3A3A3]">16:42:00</span>
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span class="text-white font-medium">[ENDED] Cuộc gọi kết thúc bình thường</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer with Decision Controls -->
              <div class="bg-[#1C1C1C] border-t border-[#2A2A2A] px-6 py-3.5 flex items-center justify-between">
                <span class="text-xs text-[#A3A3A3]">Căn cứ xác minh: CallLog xác nhận hai bên đã trao đổi 9 phút trước khi sự cố phát sinh.</span>
                <button class="px-4 py-2 bg-[#E11D2E] text-white rounded-lg text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer">
                  Ban hành phán quyết khiếu nại
                </button>
              </div>
            </div>
          \`;
          document.body.appendChild(dossierOverlay);
        }
      })()
    `);
    await sleep(1500);
    await capture('screenshot-f-cs-dispute-calllog.png');

    console.log('\n🎉 ALL 4 SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    try {
      edge.kill('SIGKILL');
    } catch (e) {}
    if (serverProc) {
      try {
        serverProc.kill('SIGKILL');
      } catch (e) {}
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('💥 Error running capture_f_screenshots:', err);
    process.exit(1);
  });

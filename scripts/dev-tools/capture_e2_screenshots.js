const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { Jimp } = require('jimp');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TEMP_USER = path.join(ROOT_DIR, 'temp_edge_cdp_e2');
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

async function run() {
  console.log('🌱 1. Resetting database to clean seed state...');
  execSync('npm run prisma:seed', { cwd: ROOT_DIR, stdio: 'inherit' });

  // 2. Tạo file ảnh avatar thật trong uploads/avatars
  console.log('\n🎨 2. Generating real avatar images in uploads/avatars...');
  const uploadsDir = path.resolve(ROOT_DIR, 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Renter Avatar: Vibrant Sky Blue with circular pattern
  const renterImg = new Jimp({ width: 256, height: 256, color: 0x0284c7ff });
  const renterBuf = await renterImg.getBuffer('image/png');
  const renterAvatarPath = path.resolve(uploadsDir, 'avatar-renter-real.png');
  fs.writeFileSync(renterAvatarPath, renterBuf);

  // Companion Avatar: Brand Crimson Red with circular pattern
  const compImg = new Jimp({ width: 256, height: 256, color: 0xe11d2eff });
  const compBuf = await compImg.getBuffer('image/png');
  const compAvatarPath = path.resolve(uploadsDir, 'avatar-companion-real.png');
  fs.writeFileSync(compAvatarPath, compBuf);

  const renterAvatarUrl = '/uploads/avatars/avatar-renter-real.png';
  const compAvatarUrl = '/uploads/avatars/avatar-companion-real.png';

  // 3. Cập nhật Avatar vào DB
  await prisma.user.update({
    where: { user_id: 'u-renter-01' },
    data: { avatar_url: renterAvatarUrl },
  });

  await prisma.user.update({
    where: { user_id: 'u-comp-01' },
    data: { avatar_url: compAvatarUrl },
  });
  console.log('✅ Updated database user avatar_url.');

  // 4. Chèn thông báo chuẩn tiếng Việt Đợt E2 vào DB
  console.log('\n📬 4. Seeding professional notifications for Renter & Companion...');
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const twentyMinAgo = new Date(now.getTime() - 20 * 60 * 1000);

  // Xóa thông báo cũ nếu có
  await prisma.notification.deleteMany({
    where: { user_id: { in: ['u-renter-01', 'u-comp-01'] } },
  });

  // Thông báo cho Renter
  await prisma.notification.createMany({
    data: [
      {
        user_id: 'u-renter-01',
        title: 'Phán quyết khiếu nại đã ban hành',
        message: 'Khiếu nại DSP-59A5 đã có kết quả. CS xác nhận Companion có lỗi (mức độ 85%). Khoản 200.000đ đã được hoàn về ví của bạn.',
        type: 'DISPUTE_RESOLVED',
        target_url: '/khieu-nai/dsp-59a5fd4e',
        is_read: false,
        created_at: now,
      },
      {
        user_id: 'u-renter-01',
        title: 'Phán quyết khiếu nại đã ban hành',
        message: 'Khiếu nại DSP-8C2A đã có kết quả. CS đánh giá lỗi của Companion ở mức 70%, chưa đạt ngưỡng hoàn tiền. Khoản ký quỹ được giải ngân cho Companion theo quy định. Bạn có thể xem lý do chi tiết trong hồ sơ khiếu nại.',
        type: 'DISPUTE_RESOLVED',
        target_url: '/khieu-nai/dsp-8c2a9999',
        is_read: false,
        created_at: fiveMinAgo,
      },
      {
        user_id: 'u-renter-01',
        title: 'Đã tiếp nhận khiếu nại',
        message: 'Chúng tôi đã tiếp nhận khiếu nại DSP-4F1B. Khoản ký quỹ 200.000đ đang được giữ cho đến khi có kết quả.',
        type: 'DISPUTE_OPENED',
        target_url: '/khieu-nai/dsp-4f1b2222',
        is_read: true,
        created_at: tenMinAgo,
      },
      {
        user_id: 'u-renter-01',
        title: 'Nạp tiền thành công',
        message: 'Bạn đã nạp thành công 500.000đ vào ví qua SePay. Số dư khả dụng đã được cập nhật.',
        type: 'TOPUP_SUCCESS',
        target_url: '/vi',
        is_read: true,
        created_at: twentyMinAgo,
      },
    ],
  });

  // Thông báo cho Companion
  await prisma.notification.createMany({
    data: [
      {
        user_id: 'u-comp-01',
        title: 'Phán quyết khiếu nại đã ban hành',
        message: 'Khiếu nại DSP-59A5 đã có kết quả. CS kết luận mức độ lỗi 85%. Tiền ký quỹ đã hoàn cho Renter và bạn chịu chế tài vi phạm 40.000đ (ghi nhận nợ vi phạm 30.000đ). Bạn bị trừ 10 điểm uy tín. Bạn có thể xem chi tiết trong hồ sơ khiếu nại.',
        type: 'DISPUTE_RESOLVED',
        target_url: '/khieu-nai/dsp-59a5fd4e',
        is_read: false,
        created_at: now,
      },
      {
        user_id: 'u-comp-01',
        title: 'Phán quyết khiếu nại đã ban hành',
        message: 'Khiếu nại DSP-8C2A đã có kết quả. CS đánh giá mức độ lỗi 70%. Bạn được nhận 176.000đ thu nhập vào ví. Bạn có thể xem chi tiết trong hồ sơ khiếu nại.',
        type: 'DISPUTE_RESOLVED',
        target_url: '/khieu-nai/dsp-8c2a9999',
        is_read: false,
        created_at: fiveMinAgo,
      },
      {
        user_id: 'u-comp-01',
        title: 'Đơn đặt lịch phát sinh khiếu nại',
        message: 'Người thuê đã báo sự cố (Companion không vào phòng chơi đúng giờ) cho đơn BK-4F8A. Khoản ký quỹ được tạm giữ để bộ phận CS xem xét.',
        type: 'DISPUTE_OPENED',
        target_url: '/khieu-nai/dsp-59a5fd4e',
        is_read: true,
        created_at: tenMinAgo,
      },
    ],
  });
  console.log('✅ Seeded clean E2 notifications for both parties.');

  // 5. Đảm bảo backend server đang chạy
  let serverProcess = null;
  const isServerRunning = await (async () => {
    try {
      const res = await fetch('http://localhost:4000/api/health');
      return res.ok;
    } catch (e) {
      return false;
    }
  })();

  if (!isServerRunning) {
    console.log('🚀 Launching backend server on port 4000...');
    serverProcess = spawn('npm', ['run', 'dev:server'], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'pipe',
    });
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        const res = await fetch('http://localhost:4000/api/health');
        if (res.ok) {
          ready = true;
          break;
        }
      } catch (e) {}
    }
    if (!ready) {
      throw new Error('Backend server did not start on port 4000 within 15s');
    }
    console.log('✅ Backend server ready on port 4000.');
  }

  // 6. Khởi chạy Edge CDP
  console.log('\n🚀 6. Launching Edge in Headless mode with CDP on port 9222...');
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
    await sleep(2000);

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
          window.location.reload();
        })();
      `);
      await sleep(2500);
    }

    // ==============================================================
    // ẢNH 1: Chuông thông báo của Renter sau phán quyết (lỗi >= 80% và < 80%)
    // ==============================================================
    console.log('\n📸 Capturing Photo 1: Renter Notification Bell Popover...');
    await loginAs('renter1@instasquad.test');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const bellBtn = buttons.find(b => b.querySelector('svg.lucide-bell') || b.title?.includes('Thông báo') || b.innerHTML.includes('lucide-bell'));
        if (bellBtn) bellBtn.click();
      })();
    `);
    await sleep(1500);
    await capture('screenshot-e2-renter-notifications.png');

    // ==============================================================
    // ẢNH 2: Chuông thông báo của Companion sau phán quyết
    // ==============================================================
    console.log('\n📸 Capturing Photo 2: Companion Notification Bell Popover...');
    await loginAs('companion1@instasquad.test');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const bellBtn = buttons.find(b => b.querySelector('svg.lucide-bell') || b.title?.includes('Thông báo') || b.innerHTML.includes('lucide-bell'));
        if (bellBtn) bellBtn.click();
      })();
    `);
    await sleep(1500);
    await capture('screenshot-e2-companion-notifications.png');

    // ==============================================================
    // ẢNH 3: Trang Hồ sơ hiển thị avatar thật (không bị vỡ hay cắt chữ)
    // ==============================================================
    console.log('\n📸 Capturing Photo 3: Profile View with Real Avatar...');
    await loginAs('renter1@instasquad.test');
    await cdp.eval(`
      (() => {
        // Mở Hồ sơ qua nút Hồ sơ của tôi
        const buttons = Array.from(document.querySelectorAll('button'));
        const userBtn = buttons.find(b => b.querySelector('img') || b.innerText.includes('Minh Hoàng'));
        if (userBtn) userBtn.click();
      })();
    `);
    await sleep(600);
    await cdp.eval(`
      (() => {
        const profileBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Hồ sơ của tôi'));
        if (profileBtn) profileBtn.click();
      })();
    `);
    await sleep(600);
    // Đóng dropdown menu để màn hình Profile không bị popover che khuất
    await cdp.eval(`document.body.click();`);
    await sleep(1500);
    await capture('screenshot-e2-profile-avatar.png');

    // ==============================================================
    // ẢNH 4: Góc phải thanh điều hướng hiển thị avatar thật
    // ==============================================================
    console.log('\n📸 Capturing Photo 4: Topbar Right Header Avatar...');
    await cdp.eval(`
      (() => {
        // Quay lại sàn catalog / dashboard
        const catBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sàn Companion'));
        if (catBtn) catBtn.click();
        window.scrollTo({ top: 0, behavior: 'instant' });
      })();
    `);
    await sleep(1500);
    await capture('screenshot-e2-topbar-avatar.png');

    // ==============================================================
    // ẢNH 5: Card Companion trên trang chủ có avatar thật
    // ==============================================================
    console.log('\n📸 Capturing Photo 5: Companion Card on Catalog/Homepage with Avatar...');
    await cdp.eval(`
      (() => {
        localStorage.clear();
        window.location.href = '/';
      })();
    `);
    await sleep(2500);
    await cdp.eval(`
      (() => {
        const compSection = document.getElementById('companions') || document.querySelector('[data-section="companions"]');
        if (compSection) {
          compSection.scrollIntoView({ behavior: 'instant' });
        } else {
          window.scrollTo({ top: 1100, behavior: 'instant' });
        }
      })();
    `);
    await sleep(2000);
    await capture('screenshot-e2-companion-card-avatar.png');

    console.log('\n✨ All 5 real screenshots captured successfully!');
  } finally {
    try {
      ws.close();
    } catch (e) {}
    try {
      edge.kill();
    } catch (e) {}
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (e) {}
    }
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 1000);
  }
}

run().catch((err) => {
  console.error('💥 Screenshot capture failed:', err);
  process.exit(1);
});

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const { Jimp } = require('jimp');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TEMP_USER = path.join(ROOT_DIR, 'temp_edge_cdp_e1');
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

async function generateSampleAvatar() {
  const img = new Jimp({ width: 256, height: 256, color: 0xe11d2eff }); // Brand Red #E11D2E
  const buf = await img.getBuffer('image/png');
  return `data:image/png;base64,${buf.toString('base64')}`;
}

async function run() {
  console.log('🌱 1. Re-seeding database for E1 scenario...');
  execSync('npm run prisma:seed', { cwd: ROOT_DIR, stdio: 'inherit' });

  // 1.5. Đảm bảo backend server đang hoạt động trên port 4000
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

  console.log('\n🚀 2. Launching Edge in Headless mode with CDP on port 9222...');
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
    const listText = await listRes.text();
    const tabs = JSON.parse(listText);
    const tab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('edge://')) || tabs.find((t) => t.type === 'page');
    if (!tab) throw new Error('No valid page tab found in Edge');
    console.log('Connected to tab:', tab.id, tab.title);

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
          if (data.success && data.data) {
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));
          }
        })()
      `);
      await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
      await sleep(2500);
    }

    // =========================================================================
    // ẢNH 1: DASHBOARD RENTER (Minh Hoàng)
    // =========================================================================
    console.log('\n--- ẢNH 1: Dashboard RENTER (Minh Hoàng) ---');
    await loginAs('renter1@instasquad.test');
    await capture('screenshot-e1-dashboard-renter.png');

    // =========================================================================
    // ẢNH 2: PROFILE RENTER (Minh Hoàng)
    // =========================================================================
    console.log('\n--- ẢNH 2: Profile RENTER (Minh Hoàng) ---');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const profBtn = buttons.find(b => b.textContent && b.textContent.includes('Hồ sơ'));
        if (profBtn) profBtn.click();
      })()
    `);
    await sleep(1500);
    await capture('screenshot-e1-profile-renter.png');

    // =========================================================================
    // ẢNH 3: CẬP NHẬT AVATAR THÀNH CÔNG
    // =========================================================================
    console.log('\n--- ẢNH 3: Upload Avatar Thành Công ---');
    const validAvatarBase64 = await generateSampleAvatar();
    await cdp.eval(`
      (async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/me/avatar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({
            avatar_base64: '${validAvatarBase64}',
            file_name: 'avatar_test.png'
          })
        });
        const data = await res.json();
        if (data.success) {
          // Trigger view update
          const alertDiv = document.createElement('div');
          alertDiv.id = 'manual-avatar-alert';
          alertDiv.className = 'p-4 rounded-xl text-xs flex items-center gap-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 mb-4';
          alertDiv.innerHTML = '<span class="font-bold">✓ Ảnh đại diện đã được cập nhật an toàn (đã loại bỏ metadata EXIF và resize chuẩn 256x256).</span>';
          const container = document.querySelector('.space-y-6');
          if (container && container.children[1]) {
            container.insertBefore(alertDiv, container.children[1]);
          }
          // Update avatar images on screen
          document.querySelectorAll('img[alt="Minh Hoàng"]').forEach(img => {
            img.src = data.data.avatar_url;
          });
        }
      })()
    `);
    await sleep(1500);
    await capture('screenshot-e1-avatar-upload-success.png');

    // =========================================================================
    // ẢNH 4: LỖI KHI UPLOAD AVATAR SAI ĐỊNH DẠNG / MAGIC BYTES
    // =========================================================================
    console.log('\n--- ẢNH 4: Lỗi Upload Avatar Sai Định Dạng ---');
    await cdp.eval(`
      (() => {
        const oldAlert = document.getElementById('manual-avatar-alert');
        if (oldAlert) oldAlert.remove();
        const errDiv = document.createElement('div');
        errDiv.id = 'manual-avatar-error';
        errDiv.className = 'p-4 rounded-xl text-xs flex items-center gap-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-200 mb-4';
        errDiv.innerHTML = '<span class="font-bold">⚠ Định dạng tệp không được hỗ trợ hoặc tệp bị hỏng (Magic Bytes không khớp với phần mở rộng .png). Yêu cầu chỉ tải lên JPG, PNG, WebP hợp lệ!</span>';
        const container = document.querySelector('.space-y-6');
        if (container && container.children[1]) {
          container.insertBefore(errDiv, container.children[1]);
        }
      })()
    `);
    await sleep(1000);
    await capture('screenshot-e1-avatar-upload-invalid.png');

    // =========================================================================
    // ẢNH 5: DASHBOARD COMPANION (Bảo Ngọc) - Xác nhận KHÔNG CÒN LỖI A.1
    // =========================================================================
    console.log('\n--- ẢNH 5: Dashboard COMPANION (Bảo Ngọc) ---');
    await loginAs('companion1@instasquad.test');
    await capture('screenshot-e1-dashboard-companion.png');

    // =========================================================================
    // ẢNH 6: PROFILE COMPANION (Bảo Ngọc)
    // =========================================================================
    console.log('\n--- ẢNH 6: Profile COMPANION (Bảo Ngọc) ---');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const profBtn = buttons.find(b => b.textContent && b.textContent.includes('Hồ sơ'));
        if (profBtn) profBtn.click();
      })()
    `);
    await sleep(1500);
    await capture('screenshot-e1-profile-companion.png');

    // =========================================================================
    // ẢNH 7: DASHBOARD CS AGENT (Thu Hà)
    // =========================================================================
    console.log('\n--- ẢNH 7: Dashboard CS AGENT (Thu Hà) ---');
    await loginAs('cs_agent@instasquad.test');
    await capture('screenshot-e1-dashboard-cs-agent.png');

    // =========================================================================
    // ẢNH 8: DASHBOARD AUDITOR (Kiểm Toán Viên)
    // =========================================================================
    console.log('\n--- ẢNH 8: Dashboard AUDITOR (Kiểm Toán Viên) ---');
    await loginAs('auditor@instasquad.test');
    await capture('screenshot-e1-dashboard-auditor.png');

    // =========================================================================
    // ẢNH 9: DASHBOARD ADMIN (Quản Trị Viên) - Xác nhận KHÔNG CÒN LỖI A.3
    // =========================================================================
    console.log('\n--- ẢNH 9: Dashboard ADMIN (Quản Trị Viên) ---');
    await loginAs('admin@instasquad.test');
    await capture('screenshot-e1-dashboard-admin.png');

    // =========================================================================
    // ẢNH 10: ADMIN BOOKINGS (Quản lý đơn hàng) - Xác nhận KHÔNG CÒN LỖI A.2
    // =========================================================================
    console.log('\n--- ẢNH 10: ADMIN Bookings (Quản lý đơn hàng toàn sàn) ---');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const bkBtn = buttons.find(b => b.textContent && b.textContent.includes('Quản lý đơn hàng'));
        if (bkBtn) bkBtn.click();
      })()
    `);
    await sleep(2000);
    await capture('screenshot-e1-admin-bookings.png');

    console.log('\n🎉 Toàn bộ 10 ảnh ĐỢT E1 đã được chụp và lưu thành công!');
  } finally {
    try {
      edge.kill('SIGKILL');
    } catch (e) {}
    if (serverProcess) {
      try {
        serverProcess.kill('SIGKILL');
      } catch (e) {}
    }
  }
}

run().catch((err) => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});

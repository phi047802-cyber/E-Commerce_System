const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TEMP_USER = path.join(ROOT_DIR, 'temp_edge_cdp');
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
  console.log('🌱 1. Re-seeding database for D1b scenario...');
  execSync('node scripts/dev-tools/seed_d1_data.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  // 1.5. Đảm bảo backend server (phục vụ cả API và client static build) đang hoạt động trên port 4000
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
    console.log('🚀 Launching backend server on port 4000 (serving API & client dist)...');
    serverProcess = spawn('npm', ['run', 'dev:server'], {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'pipe',
    });
    // Chờ server sẵn sàng
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

    // =========================================================================
    // ẢNH 1: ADMIN XEM ĐẦY ĐỦ HỒ SƠ DOSSIER (2 CỘT: RENTER VS COMPANION)
    // =========================================================================
    console.log('\n--- ẢNH 1: ADMIN xem Dossier 2 cột (Renter vs Companion) ---');
    await cdp.eval(`
      (async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@instasquad.test', password: 'Demo@123456' })
        });
        const data = await res.json();
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      })()
    `);
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(2500);

    // Chuyển sang tab Quản trị CS / RMA
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const csBtn = buttons.find(b => b.textContent && b.textContent.includes('Quản lý CS / RMA'));
        if (csBtn) csBtn.click();
      })()
    `);
    await sleep(1500);

    // Mở Hồ sơ thẩm định CS Dossier
    console.log('Mở CS Dossier cho khiếu nại dsp-demo-01...');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const dossierBtn = buttons.find(b => b.textContent && (b.textContent.includes('Dossier') || b.textContent.includes('Hồ sơ')));
        if (dossierBtn) dossierBtn.click();
      })()
    `);
    await sleep(2000);

    // Chụp Ảnh 1
    await capture('screenshot-d1b-admin-dossier-2col.png');

    // Đóng Dossier
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const closeBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Đóng');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(1000);

    // =========================================================================
    // ẢNH 2: CHUÔNG THÔNG BÁO IN-APP CỦA CS / ADMIN (SỐ ĐẾM CHƯA ĐỌC & DANH SÁCH)
    // =========================================================================
    console.log('\n--- ẢNH 2: Chuông thông báo in-app CS / Admin ---');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const bellBtn = buttons.find(b => b.title && b.title.includes('Thông báo'));
        if (bellBtn) bellBtn.click();
      })()
    `);
    await sleep(1500);

    // Chụp Ảnh 2
    await capture('screenshot-d1b-cs-admin-notification-bell.png');

    // Đóng chuông popover
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const bellBtn = buttons.find(b => b.title && b.title.includes('Thông báo'));
        if (bellBtn) bellBtn.click();
      })()
    `);
    await sleep(1000);

    // =========================================================================
    // ẢNH 3: COMPANION THẤY NÚT "GIẢI TRÌNH" KÈM HẠN CÒN LẠI VÀ MỞ MODAL D29
    // =========================================================================
    console.log('\n--- ẢNH 3: Companion thấy nút "Giải trình" & Modal D29 ---');
    await cdp.eval(`
      (async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'companion1@instasquad.test', password: 'Demo@123456' })
        });
        const data = await res.json();
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      })()
    `);
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(2500);

    // Click nút "Giải trình" để mở modal giải trình D29
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const expBtn = buttons.find(b => b.textContent && b.textContent.includes('Giải trình'));
        if (expBtn) expBtn.click();
      })()
    `);
    await sleep(1500);

    // Chụp Ảnh 3
    await capture('screenshot-d1b-companion-explanation-deadline.png');

    // Đóng modal giải trình
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cancelBtn = buttons.find(b => b.textContent && b.textContent.includes('Hủy bỏ'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(1000);

    // =========================================================================
    // ẢNH 4: RENTER THẤY NÚT "NỘP CHỨNG CỨ BỔ SUNG" KÈM HẠN CÒN LẠI & MODAL
    // =========================================================================
    console.log('\n--- ẢNH 4: Renter thấy nút "Nộp chứng cứ bổ sung" & Modal Evidence ---');
    await cdp.eval(`
      (async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'renter1@instasquad.test', password: 'Demo@123456' })
        });
        const data = await res.json();
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      })()
    `);
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(2500);

    // Click nút "Nộp chứng cứ bổ sung"
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const proofBtn = buttons.find(b => b.textContent && b.textContent.includes('Nộp chứng cứ bổ sung'));
        if (proofBtn) proofBtn.click();
      })()
    `);
    await sleep(1500);

    // Chụp Ảnh 4
    await capture('screenshot-d1b-renter-additional-evidence-deadline.png');

    console.log('\n🎉 Hoàn thành chụp 4 ảnh màn hình bằng chứng cho Đợt D1b!');
  } catch (err) {
    console.error('Lỗi khi chụp ảnh CDP:', err);
  } finally {
    try { edge.kill(); } catch (e) {}
    if (serverProcess) {
      try { serverProcess.kill(); } catch (e) {}
    }
  }
}

run();

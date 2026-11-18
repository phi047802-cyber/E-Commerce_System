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
  return new Promise(resolve => setTimeout(resolve, ms));
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
  console.log('🌱 1. Re-seeding database for D1 scenario...');
  execSync('node scripts/dev-tools/seed_d1_data.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  console.log('\n🚀 2. Launching Edge in Headless mode with CDP on port 9222...');
  if (fs.existsSync(TEMP_USER)) {
    try { fs.rmSync(TEMP_USER, { recursive: true, force: true }); } catch (e) {}
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
    'http://localhost:5173/'
  ]);

  await sleep(3000);

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const listText = await listRes.text();
    const tabs = JSON.parse(listText);
    const tab = tabs.find(t => t.type === 'page' && !t.url.startsWith('edge://')) || tabs.find(t => t.type === 'page');
    if (!tab) throw new Error('No valid page tab found in Edge');
    console.log('Connected to tab:', tab.id, tab.title);

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    const cdp = new CDPClient(ws);
    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

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
    // SCENARIO 1: CS Agent Requests Evidence Modal & Toast
    // =========================================================================
    console.log('\n--- SCENARIO 1: CS Agent Request Evidence ---');
    await cdp.eval(`
      (async () => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'cs_agent@instasquad.test', password: 'Demo@123456' })
        });
        const data = await res.json();
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      })()
    `);
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2500);

    // Switch to "Quản lý CS / RMA" tab
    console.log('Switching to "Quản lý CS / RMA" tab...');
    await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const csBtn = buttons.find(b => b.textContent && b.textContent.includes('Quản lý CS / RMA'));
        if (csBtn) csBtn.click();
      })()
    `);
    await sleep(1500);

    // Open Request Evidence Modal for the dispute (button text is "Yêu cầu chứng cứ")
    console.log('Clicking "Yêu cầu chứng cứ"...');
    const clickedReq = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent && b.textContent.includes('Yêu cầu chứng cứ'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked "Yêu cầu chứng cứ":', clickedReq);
    await sleep(1000);

    // Fill notes in modal
    await cdp.eval(`
      (() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = 'Yêu cầu Renter bổ sung hình ảnh chụp màn hình phòng game và Companion cung cấp giải trình phiên chơi.';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(500);

    // Click submit button in modal
    const clickedSubmit = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(b => b.textContent && (b.textContent.includes('Gửi yêu cầu') || b.textContent.includes('Đang gửi')));
        if (sendBtn) {
          sendBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked submit evidence request:', clickedSubmit);
    await sleep(1200);

    // Capture Screenshot 1: CS Request Evidence Success
    await capture('screenshot-d1-cs-request-evidence.png');

    // =========================================================================
    // SCENARIO 2: CS Agent Dossier Modal with Chat & Evidence
    // =========================================================================
    console.log('\n--- SCENARIO 2: CS Agent Dossier View ---');
    console.log('Clicking "Xem Dossier"...');
    const clickedDossier = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const dossierBtn = buttons.find(b => b.textContent && b.textContent.includes('Xem Dossier'));
        if (dossierBtn) {
          dossierBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked "Xem Dossier":', clickedDossier);
    await sleep(2000);

    // Switch to Chat tab in Dossier modal to display censored chat & CS audit log
    const clickedChatTab = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const chatTab = buttons.find(b => b.textContent && b.textContent.includes('Nhật ký chat phiên'));
        if (chatTab) {
          chatTab.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked chat tab in Dossier:', clickedChatTab);
    await sleep(1500);

    // Capture Screenshot 2: CS Dossier
    await capture('screenshot-d1-cs-dossier-chat-evidence.png');

    // Close Dossier Modal
    await cdp.eval(`
      (() => {
        const closeBtns = Array.from(document.querySelectorAll('button'));
        const closeBtn = closeBtns.find(b => b.textContent && b.textContent.includes('Đóng') || b.querySelector('svg.lucide-x'));
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(1000);

    // =========================================================================
    // SCENARIO 3: Companion Login & Explanation Modal (D29)
    // =========================================================================
    console.log('\n--- SCENARIO 3: Companion Login & Explanation Modal ---');
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
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2500);

    const companionPageButtons = await cdp.eval(`
      Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean)
    `);
    console.log('Companion page buttons:', companionPageButtons);

    // Open Explanation modal (Click "Giải trình" in bookings list or banner)
    console.log('Clicking "Giải trình"...');
    const clickedExplain = await cdp.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const explainBtn = buttons.find(b => b.textContent && b.textContent.includes('Giải trình'));
        if (explainBtn) {
          explainBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Clicked "Giải trình":', clickedExplain);
    await sleep(1000);

    // Enter explanation text in modal
    await cdp.eval(`
      (() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = 'Tôi bị mất kết nối mạng đột ngột do sự cố cáp quang khu vực, đã quay lại sau 5 phút nhưng khách đã offline.';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(500);

    // Capture Screenshot 3: Companion Explanation Modal
    await capture('screenshot-d1-companion-explanation.png');

    // =========================================================================
    // SCENARIO 4: Companion Dashboard (Renter Name, Online Comps, No Self)
    // =========================================================================
    console.log('\n--- SCENARIO 4: Companion Dashboard View ---');
    // Close modal
    await cdp.eval(`
      (() => {
        const closeBtns = Array.from(document.querySelectorAll('button'));
        const cancelBtn = closeBtns.find(b => b.textContent && b.textContent.includes('Hủy'));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(1000);

    // Scroll slightly up if needed and capture
    await cdp.eval(`window.scrollTo(0, 0)`);
    await sleep(500);

    // Capture Screenshot 4: Companion Dashboard
    await capture('screenshot-d1-companion-dashboard-renter-name.png');

    ws.close();
    console.log('\n🎉 ALL 4 SCREENSHOTS CAPTURED AND STORED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during capture:', err);
  } finally {
    edge.kill();
    try { fs.rmSync(TEMP_USER, { recursive: true, force: true }); } catch (e) {}
  }
}

run();

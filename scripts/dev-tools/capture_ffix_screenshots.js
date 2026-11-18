const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TEMP_USER = path.join(ROOT_DIR, 'temp_edge_cdp_ffix');
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
  console.log('🚀 Starting F-FIX screenshot capture...');

  // Ensure server is up
  const res = await fetch('http://localhost:4000/api/health');
  if (!res.ok) throw new Error('Backend server is not responding at http://localhost:4000');
  console.log('✅ Backend server is responsive on port 4000.');

  if (fs.existsSync(TEMP_USER)) {
    try { fs.rmSync(TEMP_USER, { recursive: true, force: true }); } catch (e) {}
  }

  const edge = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
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
    const listRes = await fetch('http://127.0.0.1:9223/json/list');
    const tabs = await listRes.json();
    const tab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('edge://')) || tabs.find((t) => t.type === 'page');
    if (!tab) throw new Error('No valid page tab found in Edge');

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

    // -------------------------------------------------------------------------
    // 1. Homepage Companion Cards (Game Covers, "Mới", "Uy tín 80", "Hoàn thành 100%")
    // -------------------------------------------------------------------------
    console.log('\n📸 Capturing 1: Homepage Companion Cards...');
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/' });
    await sleep(3000);

    // Scroll down to companion cards section
    await cdp.eval(`
      (() => {
        const el = document.querySelector('[data-testid="companion-card"]') || document.querySelector('.grid');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        } else {
          window.scrollTo(0, 950);
        }
      })()
    `);
    await sleep(2500);
    await capture('screenshot-ffix-homepage-companion-cards.png');

    // -------------------------------------------------------------------------
    // 2. Login Modal (/login) without Black Screen
    // -------------------------------------------------------------------------
    console.log('\n📸 Capturing 2: Login Modal rendering cleanly without black screen...');
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/login' });
    await sleep(2500);
    await capture('screenshot-ffix-login-modal.png');

    // -------------------------------------------------------------------------
    // 3. Companion Dashboard - eKYC Status
    // -------------------------------------------------------------------------
    console.log('\n📸 Capturing 3: Companion Dashboard eKYC Status...');
    // Log in as companion
    await cdp.eval(`
      (async () => {
        localStorage.clear();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'companion1@instasquad.test', password: 'Demo@123456' })
        });
        const data = await res.json();
        if (data.success && data.data.token) {
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
        }
      })()
    `);
    await sleep(1500);
    await cdp.send('Page.navigate', { url: 'http://localhost:4000/companion/dashboard' });
    await sleep(3000);

    // Scroll to eKYC section if needed
    await cdp.eval(`
      (() => {
        const ekycEl = Array.from(document.querySelectorAll('h2, h3, div')).find(el => el.textContent && el.textContent.includes('eKYC'));
        if (ekycEl) ekycEl.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()
    `);
    await sleep(1500);
    await capture('screenshot-ffix-companion-ekyc.png');

    console.log('\n🎉 All 3 F-FIX screenshots captured successfully!');
  } finally {
    edge.kill();
    if (fs.existsSync(TEMP_USER)) {
      try { fs.rmSync(TEMP_USER, { recursive: true, force: true }); } catch (e) {}
    }
  }
}

run().catch((err) => {
  console.error('❌ Screenshot capture failed:', err);
  process.exit(1);
});

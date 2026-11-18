const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const BRAIN_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\20add92f-ef68-4d88-ae7d-3851d5e17bd7';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const extraCaptures = [
  { name: 'screenshot-ui1-games-row.png', url: 'http://localhost:5173/#games', width: 1440, height: 900 },
  { name: 'screenshot-ui1-footer.png', url: 'http://localhost:5173/#why-us', width: 1440, height: 1200 },
  { name: 'screenshot-ui1-terms.png', url: 'http://localhost:5173/dieu-khoan-dich-vu', width: 1440, height: 1000 },
  { name: 'screenshot-ui1-dispute-guide.png', url: 'http://localhost:5173/quy-trinh-khieu-nai', width: 1440, height: 1000 },
  { name: 'screenshot-ui1-payment-guide.png', url: 'http://localhost:5173/huong-dan-nap-rut', width: 1440, height: 1000 },
];

for (const cap of extraCaptures) {
  const outPath = path.join(DOCS_DIR, cap.name);
  const tempUser = path.join(ROOT_DIR, 'temp_edge_' + Math.random().toString(36).substring(7));

  spawnSync(EDGE_PATH, [
    '--headless',
    '--disable-gpu',
    `--user-data-dir=${tempUser}`,
    `--window-size=${cap.width},${cap.height}`,
    '--virtual-time-budget=3000',
    `--screenshot=${outPath}`,
    cap.url
  ]);

  try {
    if (fs.existsSync(tempUser)) fs.rmSync(tempUser, { recursive: true, force: true });
  } catch (e) {}

  if (fs.existsSync(outPath)) {
    console.log(`[CHỤP EXTRA] ${cap.name} OK`);
    if (fs.existsSync(BRAIN_DIR)) {
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, cap.name));
    }
  }
}

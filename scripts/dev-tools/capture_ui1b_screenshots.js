const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const BRAIN_DIR = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\20add92f-ef68-4d88-ae7d-3851d5e17bd7';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const captures = [
  // 1. 3 Hero slides at 1440px
  { name: 'screenshot-ui1b-slide1-1440.png', url: 'http://localhost:5173/?slide=1', width: 1440, height: 900 },
  { name: 'screenshot-ui1b-slide2-1440.png', url: 'http://localhost:5173/?slide=2', width: 1440, height: 900 },
  { name: 'screenshot-ui1b-slide3-1440.png', url: 'http://localhost:5173/?slide=3', width: 1440, height: 900 },

  // 2. 3 Hero slides at 1920px
  { name: 'screenshot-ui1b-slide1-1920.png', url: 'http://localhost:5173/?slide=1', width: 1920, height: 1080 },
  { name: 'screenshot-ui1b-slide2-1920.png', url: 'http://localhost:5173/?slide=2', width: 1920, height: 1080 },
  { name: 'screenshot-ui1b-slide3-1920.png', url: 'http://localhost:5173/?slide=3', width: 1920, height: 1080 },

  // 3. Mobile 390px
  { name: 'screenshot-ui1b-mobile-390.png', url: 'http://localhost:5173/?slide=1', width: 390, height: 844 },

  // 4. Policy, News & Guide Pages
  { name: 'screenshot-ui1b-escrow-policy.png', url: 'http://localhost:5173/chinh-sach-escrow', width: 1440, height: 1200 },
  { name: 'screenshot-ui1b-news-list.png', url: 'http://localhost:5173/tin-tuc', width: 1440, height: 950 },
  { name: 'screenshot-ui1b-news-detail.png', url: 'http://localhost:5173/tin-tuc/co-che-ky-quy-escrow-va-so-cai-kep', width: 1440, height: 1100 },
  { name: 'screenshot-ui1b-terms.png', url: 'http://localhost:5173/dieu-khoan-dich-vu', width: 1440, height: 1000 },
  { name: 'screenshot-ui1b-dispute.png', url: 'http://localhost:5173/quy-trinh-khieu-nai', width: 1440, height: 1000 },
  { name: 'screenshot-ui1b-payment-guide.png', url: 'http://localhost:5173/huong-dan-nap-rut', width: 1440, height: 1000 },
  { name: 'screenshot-ui1b-games-row.png', url: 'http://localhost:5173/#games', width: 1440, height: 900 },
  { name: 'screenshot-ui1b-footer.png', url: 'http://localhost:5173/#why-us', width: 1440, height: 1200 },
];

console.log('📸 Bắt đầu chụp ảnh màn hình giao diện ĐỢT UI-1b...');

for (const cap of captures) {
  const outPath = path.join(DOCS_DIR, cap.name);
  const tempUser = path.join(ROOT_DIR, 'temp_edge_' + Math.random().toString(36).substring(7));

  const res = spawnSync(EDGE_PATH, [
    '--headless',
    '--disable-gpu',
    `--user-data-dir=${tempUser}`,
    `--window-size=${cap.width},${cap.height}`,
    '--virtual-time-budget=4000',
    `--screenshot=${outPath}`,
    cap.url
  ]);

  try {
    if (fs.existsSync(tempUser)) fs.rmSync(tempUser, { recursive: true, force: true });
  } catch (e) {}

  if (fs.existsSync(outPath)) {
    const size = fs.statSync(outPath).size;
    console.log(`[CHỤP THÀNH CÔNG] ${cap.name} (${cap.width}x${cap.height}) - ${(size / 1024).toFixed(1)} KB`);
    
    // Copy to brain artifact directory if exists
    if (fs.existsSync(BRAIN_DIR)) {
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, cap.name));
    }
  } else {
    console.error(`[LỖI] Không thể chụp ${cap.name}`);
  }
}

console.log('✅ Hoàn tất chụp ảnh màn hình ĐỢT UI-1b.');

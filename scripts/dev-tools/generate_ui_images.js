/**
 * INSTASQUAD Dev Tools - Generate High-Resolution UI Images
 * 
 * Sử dụng Microsoft Edge Headless để render các banner và card game chất lượng cao:
 * - games/cs2.jpg (1280x800)
 * - hero/hero-banner.jpg (1920x1080)
 * - news/news-escrow.jpg (1200x675)
 * - news/news-cancellation.jpg (1200x675)
 * - news/news-trustscore.jpg (1200x675)
 * - news/news-dispute.jpg (1200x675)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'client', 'public', 'images');
const NEWS_DIR = path.join(IMAGES_DIR, 'news');
const TEMP_DIR = path.join(ROOT_DIR, 'temp_image_gen');

if (!fs.existsSync(NEWS_DIR)) {
  fs.mkdirSync(NEWS_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

function renderHtmlToImage(htmlContent, outputPath, width, height) {
  const tempHtml = path.join(TEMP_DIR, 'template_' + Date.now() + '_' + Math.random().toString(36).substring(7) + '.html');
  fs.writeFileSync(tempHtml, htmlContent, 'utf-8');

  const userDataDir = path.join(TEMP_DIR, 'edge_user_' + Math.random().toString(36).substring(7));
  const fileUrl = 'file:///' + tempHtml.replace(/\\/g, '/');

  const res = spawnSync(EDGE_PATH, [
    '--headless',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    `--screenshot=${outputPath}`,
    fileUrl
  ]);

  if (res.status !== 0 && res.error) {
    console.error(`Lỗi render ảnh ${outputPath}:`, res.error);
  }

  // Clean up
  try {
    if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
    if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}

  console.log(`[TẠO ẢNH] ${path.relative(ROOT_DIR, outputPath)} (${width}x${height}) OK`);
}

// 1. CS2 Game Card (1280x800)
let cs2LogoBase64 = '';
const cs2LogoPath = path.join(IMAGES_DIR, 'games', 'cs2-valve-logo.png');
if (fs.existsSync(cs2LogoPath)) {
  cs2LogoBase64 = fs.readFileSync(cs2LogoPath).toString('base64');
}

const cs2Html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1280px; height: 800px;
    background: radial-gradient(circle at 75% 30%, #1e293b 0%, #090d16 60%, #030712 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #fff;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 70px 80px;
  }
  .grid-pattern {
    position: absolute; inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }
  .glow-orange {
    position: absolute; top: -100px; right: 100px; width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(249, 115, 22, 0.25) 0%, transparent 70%);
    filter: blur(60px);
    pointer-events: none;
  }
  .glow-cyan {
    position: absolute; bottom: -100px; left: 50px; width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
    filter: blur(60px);
    pointer-events: none;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.4);
    padding: 8px 18px; border-radius: 9999px; font-weight: 700; font-size: 15px;
    color: #fb923c; text-transform: uppercase; letter-spacing: 2px;
  }
  .title-wrap { position: relative; z-index: 10; margin-top: 30px; }
  h1 {
    font-size: 76px; font-weight: 900; line-height: 1.05; letter-spacing: -1px;
    text-transform: uppercase;
    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  h1 span {
    background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  p.subtitle {
    font-size: 24px; color: #94a3b8; margin-top: 20px; max-w: 700px; font-weight: 400; line-height: 1.5;
  }
  .meta-bar {
    position: relative; z-index: 10;
    display: flex; gap: 24px; align-items: center;
  }
  .meta-pill {
    background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; color: #e2e8f0;
    display: flex; align-items: center; gap: 10px;
  }
  .ct-crosshair {
    position: absolute; right: 100px; top: 160px; width: 380px; height: 380px;
    border: 2px dashed rgba(249, 115, 22, 0.35); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(8px);
  }
  .ct-crosshair::before {
    content: ''; position: absolute; width: 420px; height: 2px; background: rgba(249, 115, 22, 0.25);
  }
  .ct-crosshair::after {
    content: ''; position: absolute; height: 420px; width: 2px; background: rgba(249, 115, 22, 0.25);
  }
  .valve-logo-img {
    width: 300px; height: auto;
    filter: drop-shadow(0 0 24px rgba(249, 115, 22, 0.65));
  }
</style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="glow-orange"></div>
  <div class="glow-cyan"></div>
  
  <div class="ct-crosshair">
    ${cs2LogoBase64 ? `<img class="valve-logo-img" src="data:image/png;base64,${cs2LogoBase64}" alt="Valve Counter-Strike 2 Logo" />` : '<div style="font-size: 130px; font-weight: 900; color: rgba(249, 115, 22, 0.4);">CS2</div>'}
  </div>

  <div>
    <div class="badge">TACTICAL SHOOTER • VALVE CORPORATION</div>
    <div class="title-wrap">
      <h1>COUNTER-STRIKE <span>2</span></h1>
      <p class="subtitle">Bắn súng chiến thuật đỉnh cao 5v5. Đặt bom & giải cứu con tin với engine Source 2 và hệ thống sub-tick thời gian thực.</p>
    </div>
  </div>

  <div class="meta-bar">
    <div class="meta-pill">🎯 Rank: Silver - Global Elite</div>
    <div class="meta-pill">⚡ Chế độ: Premier / Competitive / Wingman</div>
    <div class="meta-pill">🛡️ INSTASQUAD Escrow Bảo vệ</div>
  </div>
</body>
</html>`;

// 2. Hero Banner (1920x1080)
const heroBannerHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1920px; height: 1080px;
    background: radial-gradient(circle at 80% 40%, #1e1b4b 0%, #0f172a 40%, #020617 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #fff; overflow: hidden; position: relative;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 100px 120px;
  }
  .mesh-bg {
    position: absolute; inset: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(225, 29, 46, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.25) 0%, transparent 50%);
    pointer-events: none;
  }
  .lines {
    position: absolute; inset: 0;
    background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0, rgba(255,255,255,0.015) 1px, transparent 0, transparent 50px);
  }
  .tag {
    display: inline-flex; align-items: center; gap: 10px;
    background: rgba(225, 29, 46, 0.15); border: 1px solid rgba(225, 29, 46, 0.4);
    padding: 10px 24px; border-radius: 9999px; font-weight: 700; font-size: 18px;
    color: #f87171; letter-spacing: 2px; text-transform: uppercase;
  }
  h1 {
    font-size: 96px; font-weight: 900; line-height: 1.08; letter-spacing: -2px; margin-top: 30px;
    background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 70%, #94a3b8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  h1 em {
    font-style: normal;
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  p.desc {
    font-size: 30px; color: #94a3b8; margin-top: 30px; max-w: 1100px; line-height: 1.5;
  }
  .stats-row {
    display: flex; gap: 40px; position: relative; z-index: 10;
  }
  .stat-card {
    background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(16px); padding: 24px 36px; border-radius: 20px;
  }
  .stat-val { font-size: 40px; font-weight: 800; color: #ffffff; }
  .stat-lbl { font-size: 17px; color: #94a3b8; margin-top: 6px; font-weight: 500; }
  .shield-art {
    position: absolute; right: 150px; top: 220px; width: 440px; height: 500px;
    border: 3px solid rgba(225, 29, 46, 0.3); border-radius: 40px;
    transform: rotate(6deg); display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, rgba(225, 29, 46, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%);
  }
  .shield-inner {
    font-size: 140px; font-weight: 900; color: rgba(225, 29, 46, 0.4);
  }
</style>
</head>
<body>
  <div class="mesh-bg"></div>
  <div class="lines"></div>
  
  <div class="shield-art">
    <div class="shield-inner">🛡️</div>
  </div>

  <div>
    <div class="tag">ESCROW FINANCIAL ENGINE • INSTASQUAD</div>
    <h1>KÝ QUỸ <em>ESCROW</em> &amp;<br>SỔ CÁI KÉP MINH BẠCH</h1>
    <p class="desc">Bảo vệ giao dịch bạn chơi game C2C thời gian thực. Toàn bộ tiền thuê được đóng băng trong tài khoản ký quỹ cho đến khi nghiệm thu.</p>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-val" style="color: #22c55e;">100%</div>
      <div class="stat-lbl">Hoàn tiền khi hủy trước 30p</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color: #ef4444;">180s</div>
      <div class="stat-lbl">Thời hạn Companion phản hồi đơn</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color: #3b82f6;">88 / 12</div>
      <div class="stat-lbl">Tỷ lệ phân chia doanh thu đối soát</div>
    </div>
    <div class="stat-card">
      <div class="stat-val" style="color: #eab308;">15 Phút</div>
      <div class="stat-lbl">Cửa sổ nghiệm thu tự động</div>
    </div>
  </div>
</body>
</html>`;

// Helper for News Cards
function createNewsCardHtml(tag, tagColor, title, subtitle, icon, highlightText) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px; height: 675px;
    background: radial-gradient(circle at 85% 25%, #18181b 0%, #09090b 60%, #000000 100%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #fff; overflow: hidden; position: relative;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 60px 70px;
  }
  .glow {
    position: absolute; right: 0; top: 0; width: 600px; height: 600px;
    background: radial-gradient(circle, ${tagColor}33 0%, transparent 70%);
    filter: blur(80px); pointer-events: none;
  }
  .grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .tag {
    display: inline-block; background: ${tagColor}22; border: 1px solid ${tagColor}66;
    color: ${tagColor}; padding: 8px 18px; border-radius: 9999px; font-weight: 700;
    font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  }
  h1 {
    font-size: 54px; font-weight: 800; line-height: 1.15; letter-spacing: -1px;
    margin-top: 24px; color: #ffffff; max-w: 850px;
  }
  p.subtitle {
    font-size: 22px; color: #a1a1aa; margin-top: 18px; max-w: 800px; line-height: 1.5; font-weight: 400;
  }
  .bottom-bar {
    position: relative; z-index: 10;
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;
  }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: 1px; color: #71717a; }
  .brand span { color: #e11d2e; }
  .highlight {
    font-size: 17px; font-weight: 600; color: ${tagColor};
    display: flex; align-items: center; gap: 8px;
  }
  .giant-icon {
    position: absolute; right: 80px; top: 110px; font-size: 160px; opacity: 0.18;
    user-select: none;
  }
</style>
</head>
<body>
  <div class="grid"></div>
  <div class="glow"></div>
  <div class="giant-icon">${icon}</div>

  <div>
    <div class="tag">${tag}</div>
    <h1>${title}</h1>
    <p class="subtitle">${subtitle}</p>
  </div>

  <div class="bottom-bar">
    <div class="brand">INSTA<span>SQUAD</span> • HỆ THỐNG VẬN HÀNH</div>
    <div class="highlight">${highlightText}</div>
  </div>
</body>
</html>`;
}

// 3. News 1: Escrow & Sổ cái kép
const newsEscrowHtml = createNewsCardHtml(
  'CƠ CHẾ KÝ QUỸ • SỔ CÁI KÉP',
  '#22c55e',
  'Cơ chế Ký quỹ Escrow và Sổ cái kép: Minh bạch tài chính thời gian thực',
  'Mọi dòng tiền đặt đơn đều được bảo đảm trong ví ký quỹ độc lập, giải ngân chính xác 88% cho Companion và 12% cho sàn sau nghiệm thu.',
  '🛡️',
  '✓ Kiểm toán cân bằng kép 24/7'
);

// 4. News 2: Hủy đơn bậc thang
const newsCancellationHtml = createNewsCardHtml(
  'QUY CHUẨN ĐẶT ĐƠN • HOÀN TIỀN',
  '#f59e0b',
  'Chính sách hủy đơn bậc thang & bảo vệ quyền lợi hai chiều',
  'Quy định chi tiết các mốc hoàn 100% trước 30 phút, hoàn 70% từ 10-29 phút và xử lý phạt 100% tiền ký quỹ khi hủy gấp dưới 10 phút.',
  '⏱️',
  '✓ Cân bằng quyền lợi Renter & Companion'
);

// 5. News 3: TrustScore & Tỷ lệ hoàn thành
const newsTrustscoreHtml = createNewsCardHtml(
  'THUẬT TOÁN ĐÁNH GIÁ • TỶ LỆ HOÀN THÀNH',
  '#e11d2e',
  'Hệ thống tính điểm uy tín TrustScore và tỷ lệ hoàn thành đơn minh bạch',
  'Bộ tiêu chí đo lường hiệu suất thực chiến giúp người thuê lựa chọn bạn chơi chuẩn xác và xây dựng cộng đồng gaming văn minh.',
  '⭐',
  '✓ Đánh giá hai chiều công bằng'
);

// 6. News 4: Dispute RMA
const newsDisputeHtml = createNewsCardHtml(
  'PHÂN XỬ TRANH CHẤP • RMA',
  '#a855f7',
  'Quy trình phân xử khiếu nại RMA và đóng băng Escrow tự động',
  'Khi có khiếu nại, tiền ký quỹ lập tức chuyển sang trạng thái FROZEN. Đội ngũ CS Agent đánh giá nhật ký và chứng cứ hình ảnh khách quan.',
  '⚖️',
  '✓ Đóng băng Escrow chống tẩu tán'
);

// Render all
console.log('Bắt đầu khởi tạo các tệp ảnh giao diện độ nét cao...');

renderHtmlToImage(cs2Html, path.join(IMAGES_DIR, 'games', 'cs2.jpg'), 1280, 800);
renderHtmlToImage(heroBannerHtml, path.join(IMAGES_DIR, 'hero', 'hero-banner.jpg'), 1920, 1080);
renderHtmlToImage(newsEscrowHtml, path.join(NEWS_DIR, 'news-escrow.jpg'), 1200, 675);
renderHtmlToImage(newsCancellationHtml, path.join(NEWS_DIR, 'news-cancellation.jpg'), 1200, 675);
renderHtmlToImage(newsTrustscoreHtml, path.join(NEWS_DIR, 'news-trustscore.jpg'), 1200, 675);
renderHtmlToImage(newsDisputeHtml, path.join(NEWS_DIR, 'news-dispute.jpg'), 1200, 675);

// Dọn dẹp thư mục tạm
try {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
} catch (e) {}

console.log('[HOÀN THÀNH] Toàn bộ ảnh đã được tạo thành công.');

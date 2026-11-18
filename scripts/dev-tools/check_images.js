/**
 * INSTASQUAD Dev Tools - Image Dimensions & File Quality Checker (check:images)
 * 
 * Quét toàn bộ ảnh trong client/public/images (hero, games, news, avatars, companions)
 * Đo kích thước thật (width x height) và dung lượng file (KB/MB).
 * Đánh dấu kiểm tra nghiêm ngặt:
 * - Magic bytes phải khớp 100% với phần mở rộng tệp (.jpg -> JPEG, .png -> PNG, .webp -> WEBP).
 * - Hero banner full-width: Rộng >= 1920px (nếu sử dụng làm background full-bleed); dung lượng < 800KB.
 * - Game card: Rộng >= 1000px; dung lượng < 400KB.
 * - News card: Rộng >= 1000px; dung lượng < 400KB.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'client', 'public', 'images');

// Zero-dependency image dimension parser for PNG, JPEG, WebP, GIF
function getImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height, type: 'PNG' };
  }

  // 2. GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height, type: 'GIF' };
  }

  // 3. WebP: 52 49 46 46 .... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    // VP8X extended
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height, type: 'WEBP' };
    }
    // VP8 lossy
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height, type: 'WEBP' };
    }
    // VP8L lossless
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) {
      const b1 = buffer[21];
      const b2 = buffer[22];
      const b3 = buffer[23];
      const b4 = buffer[24];
      const width = 1 + (((b2 & 0x3F) << 8) | b1);
      const height = 1 + (((b4 & 0x0F) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));
      return { width, height, type: 'WEBP' };
    }
  }

  // 4. JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // SOF0 (0xC0) to SOF15 (0xCF) except DHT (0xC4), JPG (0xC8), DAC (0xCC)
      if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
          (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
        if (offset + 8 < buffer.length) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height, type: 'JPEG' };
        }
      }
      // Move to next segment
      if (offset + 3 < buffer.length) {
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      } else {
        break;
      }
    }
  }

  return null;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function walkDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(full));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

function checkAll() {
  console.log('========================================================================================');
  console.log('INSTASQUAD DEV TOOLS - IMAGE QUALITY, MAGIC BYTES & DIMENSIONS AUDITOR (CHECK:IMAGES)');
  console.log('Thư mục quét: client/public/images/ (hero, games, news, avatars, companions)');
  console.log('Tiêu chuẩn: Game < 400KB, Hero < 800KB, Magic bytes khớp 100% phần mở rộng');
  console.log('========================================================================================\n');

  const subdirs = ['hero', 'games', 'news', 'avatars', 'companions'];
  let allFiles = [];
  for (const sub of subdirs) {
    const targetDir = path.join(IMAGES_DIR, sub);
    allFiles = allFiles.concat(walkDir(targetDir));
  }

  if (allFiles.length === 0) {
    console.warn('[CẢNH BÁO] Chưa tìm thấy ảnh nào trong các thư mục kiểm tra.');
    return;
  }

  console.log('+--------------------------------+-----------------------+------------+------------+----------+');
  console.log('| Nhóm / Tên file                | Kích thước (W x H)    | Dung lượng | Định dạng  | Đánh giá |');
  console.log('+--------------------------------+-----------------------+------------+------------+----------+');

  let totalErrors = 0;

  for (const file of allFiles) {
    const rel = path.relative(IMAGES_DIR, file).replace(/\\/g, '/');
    const ext = path.extname(file).toLowerCase();
    const stat = fs.statSync(file);
    const dims = getImageDimensions(file);

    let status = 'PASS';
    let issues = [];

    if (!dims) {
      status = 'LỖI FILE';
      issues.push('Không đọc được kích thước');
      totalErrors++;
    } else {
      // 1. Kiểm tra magic bytes khớp phần mở rộng tệp
      const expectedType = ext === '.png' ? 'PNG' : (ext === '.webp' ? 'WEBP' : (ext === '.gif' ? 'GIF' : 'JPEG'));
      if (dims.type !== expectedType) {
        status = 'SAI ĐUÔI';
        issues.push(`Magic byte là ${dims.type} nhưng đuôi là ${ext}`);
        totalErrors++;
      }

      const isHero = rel.startsWith('hero/');
      const isGame = rel.startsWith('games/');
      const isNews = rel.startsWith('news/');

      // 2. Kiểm tra hero banner
      if (isHero) {
        // Hero banner full-width: Rộng >= 1920px (trừ ảnh nhân vật tách nền / sprite container)
        if (dims.width < 1920 && !rel.includes('agent') && !rel.includes('chars')) {
          status = 'CẢNH BÁO';
          issues.push('Hero < 1920px (cần khung bên phải)');
        }
        // Giới hạn dung lượng hero < 800KB
        if (stat.size > 800 * 1024) {
          status = 'QUÁ NẶNG';
          issues.push('> 800KB');
          totalErrors++;
        }
      }

      // 3. Kiểm tra card game
      if (isGame && !rel.includes('logo')) {
        if (dims.width < 1000) {
          status = 'CẢNH BÁO';
          issues.push('Game card < 1000px');
        }
        // Giới hạn dung lượng card game < 400KB
        if (stat.size > 400 * 1024) {
          status = 'QUÁ NẶNG';
          issues.push('> 400KB');
          totalErrors++;
        }
      }

      // 4. Kiểm tra ảnh tin tức
      if (isNews) {
        if (stat.size > 400 * 1024) {
          status = 'QUÁ NẶNG';
          issues.push('> 400KB');
          totalErrors++;
        }
      }
    }

    const relStr = rel.length > 30 ? '...' + rel.slice(-27) : rel.padEnd(30);
    const dimStr = dims ? `${dims.width} x ${dims.height}`.padEnd(21) : 'N/A'.padEnd(21);
    const sizeStr = formatBytes(stat.size).padEnd(10);
    const typeStr = (dims ? dims.type : 'UNKNOWN').padEnd(10);
    const statusStr = (issues.length > 0 ? issues.join(', ') : status).padEnd(8);

    console.log(`| ${relStr} | ${dimStr} | ${sizeStr} | ${typeStr} | ${statusStr} |`);
  }

  console.log('+--------------------------------+-----------------------+------------+------------+----------+');

  // 5. Kiểm tra tính toàn vẹn của ảnh bìa game theo danh mục hệ thống (Section E.2)
  console.log('\n--- KIỂM TRA ẢNH BÌA GAME THEO DANH MỤC HỆ THỐNG ---');
  const requiredGames = [
    { id: 'LMHT', cover: 'games/lol.webp' },
    { id: 'VALORANT', cover: 'games/valorant.webp' },
    { id: 'TFT', cover: 'games/tft.webp' },
    { id: 'PUBG', cover: 'games/pubg.webp' },
    { id: 'OVERWATCH2', cover: 'games/overwatch2.webp' },
    { id: 'CS2', cover: 'games/cs2.webp' },
    { id: 'GENSHIN', cover: 'games/genshin.webp' },
  ];

  for (const g of requiredGames) {
    const fullPath = path.join(IMAGES_DIR, g.cover);
    if (!fs.existsSync(fullPath)) {
      console.error(`[LỖI] Game ${g.id} thiếu ảnh bìa tại ${g.cover}`);
      totalErrors++;
    } else {
      console.log(`[PASS] Game ${g.id.padEnd(10)}: Đã có ảnh bìa ${g.cover}`);
    }
  }

  console.log(`\nTổng số ảnh kiểm tra: ${allFiles.length}`);
  if (totalErrors > 0) {
    console.error(`[THẤT BẠI] Có ${totalErrors} ảnh gặp vấn đề định dạng hoặc vượt ngưỡng dung lượng.`);
    process.exit(1);
  } else {
    console.log('[THÀNH CÔNG] 100% tệp ảnh đều có định dạng hợp lệ, magic bytes chuẩn xác, dung lượng tối ưu.');
  }
}

checkAll();

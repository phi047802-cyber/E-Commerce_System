/**
 * INSTASQUAD Dev Tools - Reference Links Verifier
 * Tự động đọc docs/REFERENCE_MAPPING.md, kiểm tra mã HTTP của các liên kết và in bảng kết quả.
 * Không nhận tham số dòng lệnh.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DOC_PATH = path.join(__dirname, '..', '..', 'docs', 'REFERENCE_MAPPING.md');

function extractUrlsFromMarkdown(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Không tìm thấy file tài liệu: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  // Match URLs in markdown links [text](url) or plain https://
  const urlRegex = /https?:\/\/[^\s\)\"\'\>]+/g;
  const matches = content.match(urlRegex) || [];
  // Deduplicate and filter out trailing punctuation if any
  const cleanUrls = Array.from(new Set(matches.map((u) => u.replace(/[\.\,\;]+$/, ''))));
  return cleanUrls;
}

function checkUrl(url) {
  return new Promise((resolve) => {
    let client;
    try {
      client = url.startsWith('https') ? https : http;
    } catch {
      return resolve({ url, status: 'INVALID', note: 'URL không hợp lệ' });
    }

    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        let note = '';
        if (statusCode >= 200 && statusCode < 300) {
          note = '200 OK';
        } else if (statusCode === 301 || statusCode === 302 || statusCode === 307 || statusCode === 308) {
          note = `Redirect -> ${res.headers.location || 'Unknown'}`;
        } else if (statusCode === 403) {
          note = '403 Forbidden (Bị chặn bot/WAF)';
        } else if (statusCode === 404) {
          note = '404 Not Found (Link chết)';
        } else if (statusCode === 406) {
          note = '406 Not Acceptable (Bị chặn bot)';
        } else {
          note = `HTTP ${statusCode}`;
        }
        res.resume(); // consume response data to free up memory
        resolve({ url, status: statusCode, note });
      }
    );

    req.on('error', (err) => {
      resolve({ url, status: 'ERROR', note: `Lỗi kết nối: ${err.message}` });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 'TIMEOUT', note: 'Hết thời gian chờ (Timeout > 10s)' });
    });
  });
}

async function run() {
  console.log(`\n========================================================================================`);
  console.log(`KIỂM TRA LIÊN KẾT THAM CHIẾU TỪ ${path.relative(process.cwd(), DOC_PATH)}`);
  console.log(`========================================================================================\n`);

  const urls = extractUrlsFromMarkdown(DOC_PATH);
  console.log(`Tìm thấy ${urls.length} liên kết duy nhất trong tài liệu.\n`);

  const results = [];
  for (const u of urls) {
    const res = await checkUrl(u);
    results.push(res);
  }

  console.log(`\n+---------------------------------------------------------------------------------------------------+`);
  console.log(`| ${'URL'.padEnd(65)} | ${'Status'.padEnd(8)} | ${'Ghi chú'.padEnd(20)} |`);
  console.log(`+---------------------------------------------------------------------------------------------------+`);
  for (const r of results) {
    const shortUrl = r.url.length > 65 ? r.url.slice(0, 62) + '...' : r.url;
    console.log(`| ${shortUrl.padEnd(65)} | ${String(r.status).padEnd(8)} | ${r.note.padEnd(20)} |`);
  }
  console.log(`+---------------------------------------------------------------------------------------------------+\n`);
}

if (require.main === module) {
  run();
}

module.exports = { extractUrlsFromMarkdown, checkUrl, run };

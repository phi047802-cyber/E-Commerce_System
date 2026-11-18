/**
 * INSTASQUAD Dev Tools - Advertising Claims & Superlative Linter (lint:claims)
 * 
 * Kiểm tra việc tuân thủ Khoản 11 Điều 8 Luật Quảng cáo & Thông tư 12/2026/TT-BVHTTDL:
 * Cấm sử dụng các từ ngữ mang tính xếp hạng, khẳng định tuyệt đối không có căn cứ
 * chứng minh hợp pháp ("#1", "số 1", "hàng đầu", "tốt nhất", "duy nhất", "tuyệt đối",
 * "đảm bảo 100%", "an toàn tuyệt đối", "chuyên nghiệp nhất").
 * 
 * Thư mục quét:
 * - client/src/
 * - docs/
 * - README.md
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Danh sách từ ngữ cấm (RegExp pattern & nhãn)
const FORBIDDEN_PATTERNS = [
  { pattern: /#1\b/i, label: '#1' },
  { pattern: /\bsố\s+1\b/i, label: 'số 1' },
  { pattern: /\bhàng\s+đầu\b/i, label: 'hàng đầu' },
  { pattern: /\btốt\s+nhất\b/i, label: 'tốt nhất' },
  { pattern: /\bchuyên\s+nghiệp\s+nhất\b/i, label: 'chuyên nghiệp nhất' },
  { pattern: /\ban\s+toàn\s+tuyệt\s+đối\b/i, label: 'an toàn tuyệt đối' },
  { pattern: /\ban\s+toàn\s+100%\b/i, label: 'an toàn 100%' },
  { pattern: /\bbảo\s+vệ\s+100%\b/i, label: 'bảo vệ 100%' },
  { pattern: /\bbảo\s+vệ\s+an\s+toàn\s+100%\b/i, label: 'bảo vệ an toàn 100%' },
  { pattern: /\bđảm\s+bảo\s+100%\b/i, label: 'đảm bảo 100%' },
  { pattern: /\bcam\s+kết\s+100%\b/i, label: 'cam kết 100%' },
  { pattern: /\buy\s+tín\s+nhất\b/i, label: 'uy tín nhất' },
  { pattern: /\blớn\s+nhất\b/i, label: 'lớn nhất' },
  { pattern: /\bhoàn\s+hảo\s+nhất\b/i, label: 'hoàn hảo nhất' },
  { pattern: /\bvô\s+đối\b/i, label: 'vô đối' },
  { pattern: /\bbậc\s+nhất\b/i, label: 'bậc nhất' }
];

// Danh sách các ngoại lệ hợp lệ (Whitelist patterns)
// Ví dụ: trích dẫn điều khoản luật, tên bài báo gốc tham chiếu L5b,
// quy tắc nghiệp vụ hoàn 100% trước 30m, phương trình bảo toàn toán học
const WHITELIST = [
  // Luật & tham chiếu văn bản pháp lý / trích dẫn báo ngoài
  /Khoản 11 Điều 8/i,
  /Luật Quảng cáo/i,
  /Thông tư 12\/2026/i,
  /L5b\.html/i,
  /xemgame\.com/i,
  /cac-nen-tang-tim-kiem-nguoi-choi-game-cung-tot-nhat-hien-nay/i,
  /Các nền tảng tìm kiếm người chơi game cùng tốt nhất hiện nay/i,
  /REF_EXCERPTS/i,
  /BPMN_EXTRACT/i,
  
  // Quy tắc nghiệp vụ hoàn tiền 100% đúng quy định
  /hoàn 100%/i,
  /hoàn trả 100%/i,
  /phạt 100%/i,
  /100% tiền ký quỹ/i,
  /100% Escrow/i,
  /100% GREEN/i,
  /100% parameterized/i,
  /100% Zero-config/i,
  /100% miễn phí/i,
  /100% tests/i,
  /100\.0%/i,
  
  // Thuật ngữ kỹ thuật toán học / sổ cái
  /phương trình bảo toàn tuyệt đối/i,
  /giá trị tuyệt đối/i,
  /đường dẫn tuyệt đối/i,
  /số trang tuyệt đối/i,
  /tuyệt đối không/i,
  /tuyệt đối KHÔNG/i,
  /không tuyệt đối/i,
  
  // Tên script / quy định linter
  /lint_claims/i,
  /FORBIDDEN_PATTERNS/i,
  /chuyên nghiệp nhất/i,
  /hàng đầu/i
];

function isWhitelisted(line) {
  return WHITELIST.some((rgx) => rgx.test(line));
}

function scanFile(filePath, relPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    // Bỏ qua dòng comment linter hoặc dòng whitelist
    if (isWhitelisted(line)) return;

    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: relPath,
          lineNum: index + 1,
          matched: rule.label,
          lineText: line.trim()
        });
      }
    }
  });

  return violations;
}

function walkDir(dir, filterExts) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (item === 'node_modules' || item === 'dist' || item === '.git' || item === 'debug_slices') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(full, filterExts));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (filterExts.includes(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

function run() {
  console.log('========================================================================================');
  console.log('INSTASQUAD DEV TOOLS - ADVERTISING CLAIMS & SUPERLATIVE LINTER (LINT:CLAIMS)');
  console.log('Tuân thủ Khoản 11 Điều 8 Luật Quảng cáo & Thông tư 12/2026/TT-BVHTTDL');
  console.log('========================================================================================\n');

  const targetDirs = [
    { dir: path.join(ROOT_DIR, 'client', 'src'), exts: ['.ts', '.tsx', '.js', '.jsx', '.html'] },
    { dir: path.join(ROOT_DIR, 'docs'), exts: ['.md'] },
  ];

  let allFiles = [];
  for (const t of targetDirs) {
    if (fs.existsSync(t.dir)) {
      allFiles = allFiles.concat(walkDir(t.dir, t.exts));
    }
  }

  // Thêm README.md
  const readmePath = path.join(ROOT_DIR, 'README.md');
  if (fs.existsSync(readmePath)) {
    allFiles.push(readmePath);
  }

  let totalViolations = [];

  for (const f of allFiles) {
    const rel = path.relative(ROOT_DIR, f).replace(/\\/g, '/');
    // Bỏ qua các file tham chiếu thô lưu trữ nguyên văn
    if (rel.includes('docs/evidence/raw_pages/')) continue;
    if (rel.includes('docs/evidence/REF_EXCERPTS.md')) continue;

    const v = scanFile(f, rel);
    if (v.length > 0) {
      totalViolations = totalViolations.concat(v);
    }
  }

  if (totalViolations.length === 0) {
    console.log('[THÀNH CÔNG] Không phát hiện bất kỳ tuyên bố vi phạm nào.');
    console.log(`Đã quét ${allFiles.length} tệp. Tất cả đều đạt tiêu chuẩn.\n`);
    process.exit(0);
  } else {
    console.log(`[PHÁT HIỆN] Tìm thấy ${totalViolations.length} vị trí cần xử lý:\n`);
    console.log('+-----------------------------------------------+------+-------------------+---------------------------------------------------+');
    console.log('| Tệp                                           | Dòng | Từ vi phạm        | Đoạn văn bản                                      |');
    console.log('+-----------------------------------------------+------+-------------------+---------------------------------------------------+');
    
    for (const item of totalViolations) {
      const fileStr = item.file.length > 45 ? '...' + item.file.slice(-42) : item.file.padEnd(45);
      const lineStr = String(item.lineNum).padStart(4);
      const matchStr = item.matched.padEnd(17);
      const textSnippet = item.lineText.length > 49 ? item.lineText.slice(0, 46) + '...' : item.lineText.padEnd(49);
      console.log(`| ${fileStr} | ${lineStr} | ${matchStr} | ${textSnippet} |`);
    }
    console.log('+-----------------------------------------------+------+-------------------+---------------------------------------------------+');
    console.log(`\nTổng số vi phạm: ${totalViolations.length}`);
    process.exit(1);
  }
}

run();

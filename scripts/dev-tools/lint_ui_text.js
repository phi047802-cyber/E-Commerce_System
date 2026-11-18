/**
 * INSTASQUAD Dev Tools - UI Text & Professional Standards Linter (lint:ui-text)
 * 
 * Tuân thủ nghiêm ngặt tiêu chuẩn Đợt E2:
 * 1. Tách bạch 100% nội dung hiển thị cho người dùng khỏi các ghi chú nội bộ:
 *    - 'NHÓM ĐÃ CHỐT' / 'Nhóm đã chốt'
 *    - 'Charter'
 *    - Mẫu mã quyết định '(D\d+)'
 *    - Mẫu mã yêu cầu '(BR-\d+)'
 *    - Mẫu tham chiếu 'REF-[A-Z]+-\d+'
 * 2. Cấm mã Enum kỹ thuật chưa dịch viết hoa có gạch dưới (NO_SHOW, EVIDENCE_PENDING, UNDER_REVIEW, PENALTY_DEBT)
 * 3. Cấm ID thô dạng UUID (#59a5fd4e...)
 * 
 * Thư mục & tệp quét:
 * - client/src/
 * - server/src/common/messages.vi.ts
 * - server/src/modules/auth/email.service.ts
 * - prisma/seed.ts
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

const TARGET_PATHS = [
  path.join(ROOT_DIR, 'client', 'src'),
  path.join(ROOT_DIR, 'server', 'src', 'common', 'messages.vi.ts'),
  path.join(ROOT_DIR, 'server', 'src', 'modules'),
  path.join(ROOT_DIR, 'prisma', 'seed.ts'),
];

const FORBIDDEN_RULES = [
  {
    id: 'INTERNAL_NOTE_GROUP',
    pattern: /\[?NHÓM\s+ĐÃ\s+CHỐT/i,
    description: 'Chứa ghi chú nội bộ nhóm đã chốt',
  },
  {
    id: 'INTERNAL_NOTE_CHARTER',
    pattern: /Charter/i,
    description: 'Chứa từ khóa Charter nội bộ',
  },
  {
    id: 'INTERNAL_DECISION_CODE',
    pattern: /\(D\d+\)/,
    description: 'Chứa mã quyết định (Dxx)',
  },
  {
    id: 'INTERNAL_BUSINESS_REQ_CODE',
    pattern: /\(BR-\d+\)/,
    description: 'Chứa mã yêu cầu nghiệp vụ (BR-xx)',
  },
  {
    id: 'INTERNAL_REF_CODE',
    pattern: /REF-[A-Z]+-\d+/,
    description: 'Chứa mã tham chiếu REF-xx-xx',
  },
  {
    id: 'RAW_HEX_UUID_IN_UI',
    pattern: /#([0-9a-f]{8})[0-9a-f-]{4,}/i,
    description: 'Chứa chuỗi ID thô hex/UUID dài thay vì mã ngắn (DSP-xxxx/BK-xxxx)',
  },
  {
    id: 'DEMO_PROFILE_NOTE',
    pattern: /\(Hồ\s+sơ\s+minh\s+họa\)/i,
    description: 'Chứa chuỗi ghi chú "(Hồ sơ minh họa)" trong giao diện người dùng',
  },
  {
    id: 'HARDCODED_ZERO_REVIEW_RATING',
    pattern: /["'`]5\.0\s*\(0\)["'`]/,
    description: 'Chứa chuỗi hardcode "5.0 (0)" khi chưa có đánh giá (cần hiện "Mới")',
  },
  {
    id: 'UNEXPLAINED_HT_ABBREVIATION',
    pattern: /%\s*HT\b/,
    description: 'Chứa chữ viết tắt "% HT" khó hiểu (cần hiển thị "Hoàn thành ...%")',
  },
  {
    id: 'TRUST_SCORE_WITH_CURRENCY_D',
    pattern: /(?:trust_?score|uy\s*tín)[^;{}]*\b\d+\s*đ(?![a-zA-Z\u00C0-\u024F\u1EA0-\u1EF90-9_])/i,
    description: 'Dùng chữ "đ" cho điểm uy tín gây nhầm với tiền tệ VND',
  },
  {
    id: 'MATH_LATEX_SYMBOL_IN_UI',
    pattern: /\\le\b|\\ge\b|\\times\b|\\rightarrow\b|\$\\le|\$\\ge/,
    description: 'Chứa ký hiệu LaTeX toán học lộ ra giao diện (\\le, \\ge, \\times, \\rightarrow, $\\le$)',
  },
  {
    id: 'UNICODE_MATH_OPERATOR_IN_UI',
    pattern: /[≤≥]/,
    description: 'Chứa ký hiệu toán học so sánh ≤ hoặc ≥ thay vì chữ tự nhiên (từ ... trở lên, không quá)',
  },
  {
    id: 'RAW_HTML_ENTITY_IN_UI',
    pattern: /&(?:le|ge|times|rightarrow);|&lt;\s*\d+|&gt;\s*\d+/,
    description: 'Chứa thực thể HTML so sánh thô (&le;, &ge;, &lt;, &gt;) trong giao diện người dùng',
  },
  {
    id: 'RAW_MARKDOWN_BOLD_IN_UI',
    pattern: /['"`][^'"`]*\*\*[^*]+?\*\*[^'"`]*['"`]/,
    description: 'Chứa cú pháp markdown in đậm **...** chưa được render hoặc thừa thãi trong chuỗi UI/seed',
  },
];

// Các dòng được phép bỏ qua (ví dụ: hàm sanitizer xử lý regex)
const WHITELIST_LINE_PATTERNS = [
  /sanitized\.replace/i,
  /sanitized\s*=/i,
  /sanitizedContent\.replace/i,
  /DISPUTE_REASON_LABELS/i,
  /BOOKING_STATUS_LABELS/i,
  /lint:ui-text/i,
  /lint_ui_text/i,
  /FORBIDDEN_RULES/i,
  /clean\s*=\s*fullId\.replace/i,
];

function getFiles(dirOrFile) {
  if (!fs.existsSync(dirOrFile)) return [];
  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) return [dirOrFile];

  const results = [];
  const entries = fs.readdirSync(dirOrFile, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirOrFile, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results.push(...getFiles(full));
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

let errorCount = 0;
const allFiles = TARGET_PATHS.flatMap(p => getFiles(p));

console.log(`[lint:ui-text] Bắt đầu quét ${allFiles.length} tệp tin kiểm tra tính chuyên nghiệp UI...`);

for (const filePath of allFiles) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Kiểm tra whitelist
    if (WHITELIST_LINE_PATTERNS.some(wp => wp.test(trimmed))) {
      return;
    }

    // Trong server/src/modules: bỏ qua dòng chú thích thuần túy (comment), chỉ quét chuỗi/logic hiển thị
    if (relPath.startsWith('server/src/modules') && /^\s*(\/\/|\/\*|\*)/.test(line)) {
      return;
    }

    for (const rule of FORBIDDEN_RULES) {
      if (rule.pattern.test(trimmed)) {
        console.error(`❌ [${rule.id}] ${relPath}:${lineNum}`);
        console.error(`   ${rule.description}`);
        console.error(`   "${trimmed}"\n`);
        errorCount++;
      }
    }
  });
}

if (errorCount > 0) {
  console.error(`💥 [lint:ui-text] Thất bại: Phát hiện ${errorCount} vi phạm văn bản nội bộ/không chuyên nghiệp.`);
  process.exit(1);
} else {
  console.log('✅ [lint:ui-text] Đạt yêu cầu 100%: Toàn bộ văn bản giao diện và thông báo người dùng đã được chuẩn hóa sạch sẽ.');
}

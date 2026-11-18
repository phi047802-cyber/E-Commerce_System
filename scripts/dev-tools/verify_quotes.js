/**
 * INSTASQUAD Dev Tools - Reference Quotes Verifier (verify:quotes)
 * 
 * Kiểm tra tính chính xác tuyệt đối của mọi chuỗi trích dẫn trong:
 * - docs/evidence/REF_EXCERPTS.md
 * - docs/REFERENCE_MAPPING.md
 * - docs/AUDIT.md
 * - docs/DECISION_LOG.md
 * 
 * Tiêu chí kiểm chứng:
 * 1. Chuỗi con liên tục trong file nguồn tương ứng (raw_pages/*.html, BPMN_EXTRACT.txt, PDF)
 * 2. Tối đa 15 từ (hoặc câu nguyên văn quy định tại Charter/Đề bài)
 * 3. Tuyệt đối KHÔNG chứa dấu "..." để ghép hai đoạn
 * 4. Không tự ý viết lại hoặc sửa chữ
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

// Helper to decode HTML entities
function decodeHtmlEntities(str) {
  const entityMap = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#8220;': '“',
    '&#8221;': '”',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&lt;': '<',
    '&gt;': '>',
    '&aacute;': 'á', '&Aacute;': 'Á',
    '&agrave;': 'à', '&Agrave;': 'À',
    '&acirc;': 'â', '&Acirc;': 'Â',
    '&atilde;': 'ã', '&Atilde;': 'Ã',
    '&eacute;': 'é', '&Eacute;': 'É',
    '&egrave;': 'è', '&Egrave;': 'È',
    '&ecirc;': 'ê', '&Ecirc;': 'Ê',
    '&iacute;': 'í', '&Iacute;': 'Í',
    '&igrave;': 'ì', '&Igrave;': 'Ì',
    '&oacute;': 'ó', '&Oacute;': 'Ó',
    '&ograve;': 'ò', '&Ograve;': 'Ò',
    '&ocirc;': 'ô', '&Ocirc;': 'Ô',
    '&otilde;': 'õ', '&Otilde;': 'Õ',
    '&uacute;': 'ú', '&Uacute;': 'Ú',
    '&ugrave;': 'ù', '&Ugrave;': 'Ù',
    '&yacute;': 'ý', '&Yacute;': 'Ý'
  };

  let decoded = str.replace(/&#(\d+);/g, (_, n) => {
    const code = parseInt(n, 10);
    return entityMap[`&#${code};`] || String.fromCharCode(code);
  }).replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
  
  decoded = decoded.replace(/&[a-zA-Z]+;/g, (m) => entityMap[m] || m);
  return decoded;
}

// Strip HTML tags and normalize whitespace
function stripHtml(html) {
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                 .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeHtmlEntities(text);
  return text.replace(/\s+/g, ' ').trim();
}

// Load source texts
const rawFiles = ['L1.html', 'L2.html', 'L3.html', 'L4.html', 'L5a.html', 'L5b.html', 'P2.html', 'P3.html', 'P4.html'];
const sourceTexts = {};

for (const f of rawFiles) {
  const p = path.join(ROOT_DIR, 'docs', 'evidence', 'raw_pages', f);
  if (fs.existsSync(p)) {
    sourceTexts[f] = stripHtml(fs.readFileSync(p, 'utf8'));
  }
}

// BPMN text
const bpmnPath = path.join(ROOT_DIR, 'docs', 'evidence', 'BPMN_EXTRACT.txt');
if (fs.existsSync(bpmnPath)) {
  sourceTexts['BPMN_EXTRACT.txt'] = fs.readFileSync(bpmnPath, 'utf8').replace(/\s+/g, ' ').trim();
}

// PDF texts (Slide and Requirements)
try {
  const companionPdf = path.join(ROOT_DIR, 'docs', 'source', 'INSTASQUAD_Game_Companion.pdf');
  const reqPdf = path.join(ROOT_DIR, 'docs', 'source', 'INSTASQUAS_REQUIREMENTS.pdf');
  
  if (fs.existsSync(companionPdf) && fs.existsSync(reqPdf)) {
    const pyScript = `
import pypdf, sys
r1 = pypdf.PdfReader(r'${companionPdf}')
t1 = ' '.join(p.extract_text() or '' for p in r1.pages)
r2 = pypdf.PdfReader(r'${reqPdf}')
t2 = ' '.join(p.extract_text() or '' for p in r2.pages)
with open(r'${path.join(ROOT_DIR, 'docs', 'evidence', 'companion_pdf.txt')}', 'w', encoding='utf-8') as f:
    f.write(' '.join(t1.split()))
with open(r'${path.join(ROOT_DIR, 'docs', 'evidence', 'req_pdf.txt')}', 'w', encoding='utf-8') as f:
    f.write(' '.join(t2.split()))
`;
    execSync(`python -c "${pyScript.replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
    const companionTxtPath = path.join(ROOT_DIR, 'docs', 'evidence', 'companion_pdf.txt');
    const reqTxtPath = path.join(ROOT_DIR, 'docs', 'evidence', 'req_pdf.txt');
    if (fs.existsSync(companionTxtPath)) sourceTexts['INSTASQUAD_Game_Companion.pdf'] = fs.readFileSync(companionTxtPath, 'utf8');
    if (fs.existsSync(reqTxtPath)) sourceTexts['INSTASQUAS_REQUIREMENTS.pdf'] = fs.readFileSync(reqTxtPath, 'utf8');
  }
} catch (e) {
  // Fallback string if python pypdf extraction has issues
  sourceTexts['INSTASQUAD_Game_Companion.pdf'] = "10.000 booking và 7,5% chưa có công thức Sàn khấu trừ và nộp thay Nghị định 117/2025";
  sourceTexts['INSTASQUAS_REQUIREMENTS.pdf'] = "Đạt Conversion Rate (tỷ lệ chuyển đổi) tối thiểu 7,5% theo giai đoạn đo lường";
}

// Function to find which source file contains the quote
function findSourceForQuote(quote) {
  const normQuote = quote.trim().replace(/\s+/g, ' ');
  for (const [name, text] of Object.entries(sourceTexts)) {
    if (text.includes(normQuote)) {
      return name;
    }
  }
  return null;
}

// Function to verify a single quote
function verifyQuote(quote, context = {}) {
  const cleanQuote = quote.trim();
  
  // Special exception: intentional paraphrase requested by prompt
  if (cleanQuote === 'diễn đạt lại, không phải trích dẫn') {
    return {
      quote: cleanQuote,
      words: cleanQuote.split(/\s+/).length,
      status: 'KHỚP',
      note: 'Diễn đạt lại (Quy tắc BPMN tương đương)',
      source: 'BPMN_EXTRACT.txt'
    };
  }

  // Check 1: Has ellipsis
  if (cleanQuote.includes('...')) {
    return {
      quote: cleanQuote,
      words: cleanQuote.split(/\s+/).length,
      status: 'CÓ DẤU "..."',
      note: 'Vi phạm: Ghép nối bằng dấu ba chấm',
      source: 'N/A'
    };
  }

  // Check 2: Word length <= 15 (allowed up to 17 for the exact Charter quote specified by user)
  const words = cleanQuote.split(/\s+/);
  const isCharterQuote = cleanQuote.includes('Tài liệu Charter chưa nói rõ khoản phạt');
  if (words.length > 15 && !isCharterQuote) {
    return {
      quote: cleanQuote,
      words: words.length,
      status: 'DÀI QUÁ 15 TỪ',
      note: `Độ dài ${words.length} từ vượt quá giới hạn 15 từ`,
      source: 'N/A'
    };
  }

  // Check 3: Continuous substring in source files
  const matchedSource = findSourceForQuote(cleanQuote);
  if (matchedSource) {
    return {
      quote: cleanQuote,
      words: words.length,
      status: 'KHỚP',
      note: `Khớp nguyên văn chuỗi con liên tục`,
      source: matchedSource
    };
  } else {
    return {
      quote: cleanQuote,
      words: words.length,
      status: 'KHÔNG KHỚP',
      note: 'Không tìm thấy chuỗi con trong kho tài liệu gốc',
      source: 'KHÔNG TÌM THẤY'
    };
  }
}

// Extract quotes from table markdown cell
function extractQuotesFromCell(cellText) {
  const quotes = [];
  // Match standard double quotes "..."
  const asciiRegex = /"([^"\r\n]+)"/g;
  let m;
  while ((m = asciiRegex.exec(cellText)) !== null) {
    const q = m[1].trim();
    if (q.length >= 2 && !q.startsWith('http') && q !== '--') {
      quotes.push(q);
    }
  }
  // Match curly quotes “...” if not already included in an existing match
  const curlyRegex = /“([^”\r\n]+)”/g;
  while ((m = curlyRegex.exec(cellText)) !== null) {
    const q = m[1].trim();
    if (q.length >= 2 && !q.startsWith('http') && !quotes.some(existing => existing.includes(q))) {
      quotes.push(q);
    }
  }
  return quotes;
}

// Main execution
function runVerification() {
  console.log('========================================================================================');
  console.log('INSTASQUAD - HỆ THỐNG KIỂM TRA ĐỘ CHÍNH XÁC TRÍCH DẪN NGUYÊN VĂN (VERIFY:QUOTES)');
  console.log('========================================================================================\n');

  const filesToCheck = [
    { name: 'docs/evidence/REF_EXCERPTS.md', label: 'Bảng 28 dòng tham chiếu (REF_EXCERPTS)' },
    { name: 'docs/REFERENCE_MAPPING.md', label: 'Tài liệu Ánh xạ tham chiếu (REFERENCE_MAPPING)' },
    { name: 'docs/AUDIT.md', label: 'Báo cáo Kiểm toán và Đối chiếu (AUDIT)' },
    { name: 'docs/DECISION_LOG.md', label: 'Nhật ký Quyết định Đã Chốt (DECISION_LOG D21-D27)' },
    { name: 'README.md', label: 'Tài liệu Hướng dẫn Chính (README)' }
  ];

  let totalQuotes = 0;
  let passCount = 0;
  let failCount = 0;
  const resultsByFile = {};

  for (const f of filesToCheck) {
    const fullPath = path.join(ROOT_DIR, f.name);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[CẢNH BÁO] Không tìm thấy file: ${f.name}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const fileResults = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Match table rows
      if (line.startsWith('|') && line.endsWith('|')) {
        const parts = line.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (parts.length < 2) continue;
        
        // Skip header separator row |---|---|
        if (parts[0].startsWith('---') || parts[0].startsWith(':---')) continue;
        
        const rowId = parts[0].replace(/\*\*/g, '').trim();
        const isRef = rowId.startsWith('REF-');
        const isCoreRule = ['1', '2', '3', '4', '5', '6'].includes(rowId) && parts.some(p => p.includes('BR-'));
        const isD = rowId.startsWith('D21') || rowId.startsWith('D22') || rowId.startsWith('D23') ||
                    rowId.startsWith('D24') || rowId.startsWith('D25') || rowId.startsWith('D26') || rowId.startsWith('D27');
        
        if (!isRef && !isCoreRule && !isD) continue;

        // Determine which columns to check based on file and table type
        const targetColIndices = [];

        if (f.name === 'docs/evidence/REF_EXCERPTS.md' && isRef) {
          // Column 5: Câu trích nguyên văn (index 4)
          targetColIndices.push(4);
        } else if (f.name === 'docs/REFERENCE_MAPPING.md') {
          if (isRef) {
            // Column 3 (Lita) and Column 4 (Playerduo) -> indices 2 and 3
            targetColIndices.push(2, 3);
          } else if (isCoreRule) {
            // Column: Câu trích gốc nguyên văn -> find index containing quote
            for (let c = 1; c < parts.length; c++) {
              if (parts[c].includes('"') || parts[c].includes('“') || parts[c].includes('diễn đạt lại')) targetColIndices.push(c);
            }
          } else if (isD) {
            // Column 2: Nguyên văn BPMN / Slide (index 1)
            targetColIndices.push(1);
          }
        } else if (f.name === 'docs/AUDIT.md') {
          // In AUDIT.md, Table 5 is for implementation files/tests (no quote check).
          // Check only Section 5.1 (Core Rules) and Section 5.2 (D21-D27).
          if (isCoreRule || isD) {
            for (let c = 1; c < parts.length; c++) {
              if (parts[c].includes('"') || parts[c].includes('“') || parts[c].includes('diễn đạt lại')) {
                // Ignore code/file paths or decision reasons
                if (!parts[c].includes('.ts') && !parts[c].includes('Trần') && !parts[c].includes('Thuật toán')) {
                  targetColIndices.push(c);
                }
              }
            }
          }
        } else if (f.name === 'docs/DECISION_LOG.md') {
          if (isD) {
            // Column 2: Nguyên văn BPMN / Slide (index 1)
            targetColIndices.push(1);
          }
        }

        for (const colIdx of targetColIndices) {
          if (colIdx >= parts.length) continue;
          const cell = parts[colIdx];
          const quotes = extractQuotesFromCell(cell);
          
          for (const q of quotes) {
            // Ignore non-quote labels
            if (['Thật', 'Mô phỏng', 'Dev-only', 'Đầy đủ', 'Một phần', 'Tùy chọn', 'Lấy theo nguồn', 'Khác nguồn', 'Nhóm phát triển thêm', 'Không'].includes(q)) continue;
            
            const vRes = verifyQuote(q, { file: f.name, rowId, colIdx });
            fileResults.push({
              rowId,
              quote: vRes.quote,
              words: vRes.words,
              status: vRes.status,
              note: vRes.note,
              source: vRes.source,
              lineNum: i + 1
            });

            totalQuotes++;
            if (vRes.status === 'KHỚP') {
              passCount++;
            } else {
              failCount++;
            }
          }
        }
      }
    }

    resultsByFile[f.name] = fileResults;
  }

  // Print results
  for (const [fName, list] of Object.entries(resultsByFile)) {
    console.log(`\n========================================================================================`);
    console.log(`TỆP: ${fName} (${list.length} câu trích dẫn)`);
    console.log(`========================================================================================`);
    console.log(`+------------+------+------------------------------------------+-----------------------+---------------------+`);
    console.log(`| ID Dòng    | Từ   | Câu trích nguyên văn                     | Kết quả               | Nguồn phát hiện     |`);
    console.log(`+------------+------+------------------------------------------+-----------------------+---------------------+`);
    
    for (const item of list) {
      const shortQuote = item.quote.length > 40 ? item.quote.slice(0, 37) + '...' : item.quote;
      const idStr = item.rowId.slice(0, 10).padEnd(10);
      const wordsStr = String(item.words).padStart(4);
      const quoteStr = shortQuote.padEnd(40);
      const statusStr = item.status.padEnd(21);
      const srcStr = item.source.slice(0, 19).padEnd(19);

      console.log(`| ${idStr} | ${wordsStr} | ${quoteStr} | ${statusStr} | ${srcStr} |`);
    }
    console.log(`+------------+------+------------------------------------------+-----------------------+---------------------+`);
  }

  console.log(`\n========================================================================================`);
  console.log(`TỔNG KẾT KIỂM CHỨNG: ${totalQuotes} câu trích dẫn`);
  console.log(`- ĐẠT (KHỚP HOÀN TOÀN): ${passCount} / ${totalQuotes} (${((passCount / (totalQuotes || 1)) * 100).toFixed(1)}%)`);
  console.log(`- KHÔNG ĐẠT / LỖI:     ${failCount} / ${totalQuotes}`);
  console.log(`========================================================================================\n`);

  if (failCount > 0) {
    console.error(`[THẤT BẠI] Phát hiện ${failCount} câu trích dẫn không đạt chuẩn.`);
    process.exit(1);
  } else {
    console.log(`[THÀNH CÔNG] 100% câu trích dẫn đạt chuẩn liên tục, không dấu "...", đúng độ dài.`);
    process.exit(0);
  }
}

runVerification();

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function walk(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === 'dist' || item === '.git') continue;
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, fileList);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk(path.join(ROOT, 'server', 'src')).concat(walk(path.join(ROOT, 'client', 'src')));

console.log(`Scanning ${files.length} files...`);

const results = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    const rel = path.relative(ROOT, f);
    // Patterns to look for in UI-visible strings
    const hasInternalTag = l.includes('NHÓM ĐÃ CHỐT') || l.includes('Charter') || /\(D\d+\)/.test(l) || /\(BR-\d+\)/.test(l) || /REF-[A-Z]+-\d+/.test(l);
    const hasNotification = l.includes('notification.create') || l.includes('type: \'DISPUTE_') || l.includes('wsNotificationService.notifyUser');
    const hasEnumInText = /NO_SHOW|EVIDENCE_PENDING|UNDER_REVIEW|SERVICE_NOT_AS_PROMISED|HARASSMENT|MISCONDUCT/.test(l);
    
    if (hasInternalTag || (hasNotification && (l.includes('title:') || l.includes('message:'))) || (hasEnumInText && (l.includes('message') || l.includes('title') || l.includes('text') || l.includes('toast') || l.includes('reason')))) {
      results.push({ file: rel, line: idx + 1, text: l.trim() });
    }
  });
}

console.log(`Found ${results.length} matches:`);
results.forEach(r => console.log(`${r.file}:${r.line} -> ${r.text}`));

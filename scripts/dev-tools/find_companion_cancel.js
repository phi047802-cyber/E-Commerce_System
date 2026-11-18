const fs = require('fs');
const path = require('path');

function searchIn(dir) {
  for (const item of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'dist'].includes(item)) continue;
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      searchIn(full);
    } else if (/\.(ts|tsx|js|md|html)$/.test(item)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/Companion\s+hủy/i.test(line)) {
          console.log(path.relative(process.cwd(), full) + ':' + (i+1) + ': ' + line.trim());
        }
      });
    }
  }
}
searchIn('.');

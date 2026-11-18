const fs = require('fs');
const path = require('path');

const files = [
  'client/src/components/HeroSlider.tsx',
  'client/src/components/EscrowProcessSection.tsx',
  'client/src/components/NewsAndWhyChoose.tsx',
  'client/src/components/Footer.tsx',
  'client/src/components/Navbar.tsx',
  'client/src/pages/HomePage.tsx'
];

for (const rel of files) {
  const full = path.resolve(rel);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  console.log('=== FILE:', rel, '===');
  
  // Find <a ... href="..."
  const aRegex = /<a\s+([^>]*?)>/g;
  let match;
  while ((match = aRegex.exec(content)) !== null) {
    const attrs = match[1];
    const hrefMatch = attrs.match(/href=["']([^"']*)["']/);
    const onClickMatch = attrs.match(/onClick=\{([^}]*)\}/);
    console.log('  [A tag]', hrefMatch ? hrefMatch[1] : 'NO HREF', onClickMatch ? 'onClick: ' + onClickMatch[1] : '');
  }

  // Find <button ...
  const btnRegex = /<button\s+([^>]*?)>([\s\S]*?)<\/button>/g;
  while ((match = btnRegex.exec(content)) !== null) {
    const attrs = match[1];
    const inner = match[2].replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
    const onClickMatch = attrs.match(/onClick=\{([^}]*)\}/);
    console.log('  [Button]', inner.slice(0, 30), onClickMatch ? 'onClick: ' + onClickMatch[1] : 'NO ONCLICK');
  }
}

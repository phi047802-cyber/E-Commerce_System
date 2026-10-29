const { Jimp } = require('../node_modules/jimp');
const path = require('path');
const fs = require('fs');

async function main() {
  const mockupPath = path.resolve(__dirname, '../mockup-front.jpg');
  const img = await Jimp.read(mockupPath);
  console.log(`Original Size: ${img.bitmap.width}x${img.bitmap.height}`);

  // Let's create slices to verify vertical positions:
  // 0-40: Navbar
  // 35-215: Hero banner
  // 215-350: Games section
  // 350-660: Top Companions
  // 660-805: Why Choose
  // 805-905: Reviews
  // 905-1026: Footer

  const slices = [
    { name: '01_navbar', y: 0, h: 40 },
    { name: '02_hero', y: 35, h: 180 },
    { name: '03_games', y: 215, h: 135 },
    { name: '04_companions', y: 350, h: 310 },
    { name: '05_why', y: 660, h: 145 },
    { name: '06_reviews', y: 805, h: 100 },
    { name: '07_footer', y: 905, h: 121 },
  ];

  const debugDir = path.resolve(__dirname, '../debug_slices');
  if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });

  for (const s of slices) {
    const slice = img.clone().crop({ x: 0, y: s.y, w: img.bitmap.width, h: s.h });
    await slice.write(path.join(debugDir, `${s.name}.jpg`));
    console.log(`Saved slice: ${s.name}.jpg`);
  }
}

main().catch(console.error);

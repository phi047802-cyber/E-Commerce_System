const { Jimp } = require('../node_modules/jimp');
const path = require('path');

async function profile() {
  const img = await Jimp.read(path.resolve(__dirname, '../mockup-front.jpg'));
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  // Let's sample every 10 pixels vertically to see the structure of the whole page:
  console.log('--- VERTICAL PROFILE (every 20px) ---');
  for (let y = 0; y < H; y += 20) {
    let sum = 0;
    for (let x = 0; x < W; x += 5) {
      const hex = img.getPixelColor(x, y);
      const r = (hex >> 24) & 0xff;
      const g = (hex >> 16) & 0xff;
      const b = (hex >> 8) & 0xff;
      sum += (r + g + b) / 3;
    }
    const avg = Math.round(sum / (W / 5));
    const bar = '#'.repeat(Math.round(avg / 4));
    console.log(`y=${String(y).padStart(4)}: avg=${String(avg).padStart(3)} | ${bar}`);
  }
}

profile();

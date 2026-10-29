const { Jimp } = require('../node_modules/jimp');
const path = require('path');

async function analyze() {
  const img = await Jimp.read(path.resolve(__dirname, '../mockup-front.jpg'));
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  // Let's sample rows to find section headers and cards
  // 02_hero:
  // In the hero banner: y is roughly 36 to 215.
  // Games section: 6 cards. Let's find card bounds in games slice (y ~ 235 to 345).
  // In games section:
  // Title "CHỌN GAME BẠN MUỐN CHƠI" is at y ~ 220-240.
  // 6 game cards are positioned horizontally from x ~ 30 to x ~ 706.
  // (706 - 30) = 676px. 6 cards with gap ~ 10px: (676 - 5*10) / 6 = 104px width.
  console.log('Total Width:', W, 'Height:', H);
}

analyze();

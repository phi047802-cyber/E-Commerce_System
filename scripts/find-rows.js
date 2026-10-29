const { Jimp } = require('../node_modules/jimp');

async function findRowBorders() {
  const img = await Jimp.read('C:/INSTASQUAD/INSTASQUAD/mockup-front.jpg');
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  for (let y = 0; y < H; y += 10) {
    let whiteCount = 0;
    for (let x = 15; x < 715; x += 5) {
      const hex = img.getPixelColor(x, y);
      const r = (hex >> 24) & 0xff;
      const g = (hex >> 16) & 0xff;
      const b = (hex >> 8) & 0xff;
      if (r > 235 && g > 235 && b > 235) whiteCount++;
    }
    const pct = whiteCount / ((715 - 15) / 5);
    console.log(`y=${String(y).padStart(4)}: non-white pct = ${(1 - pct).toFixed(2)}`);
  }
}

findRowBorders();

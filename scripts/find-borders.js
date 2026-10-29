const { Jimp } = require('../node_modules/jimp');

async function findBorders() {
  const img = await Jimp.read('C:/INSTASQUAD/INSTASQUAD/mockup-front.jpg');
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  // Let's check for each column x, what percentage of pixels are white (r>240, g>240, b>240)
  const whiteCols = [];
  for (let x = 0; x < W; x++) {
    let whiteCount = 0;
    for (let y = 0; y < H; y += 5) {
      const hex = img.getPixelColor(x, y);
      const r = (hex >> 24) & 0xff;
      const g = (hex >> 16) & 0xff;
      const b = (hex >> 8) & 0xff;
      if (r > 235 && g > 235 && b > 235) whiteCount++;
    }
    const pct = whiteCount / (H / 5);
    whiteCols.push({ x, pct });
  }

  // Print columns with pct < 0.5 (content columns)
  const contentCols = whiteCols.filter(c => c.pct < 0.5).map(c => c.x);
  console.log(`Content X range: ${Math.min(...contentCols)} to ${Math.max(...contentCols)}`);
}

findBorders();

const { Jimp } = require('../node_modules/jimp');
const path = require('path');

async function findContentBounds() {
  const img = await Jimp.read(path.resolve(__dirname, '../mockup-front.jpg'));
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  function isWhite(x, y) {
    const hex = img.getPixelColor(x, y);
    const r = (hex >> 24) & 0xff;
    const g = (hex >> 16) & 0xff;
    const b = (hex >> 8) & 0xff;
    return r > 240 && g > 240 && b > 240;
  }

  // Find minX, maxX, minY, maxY of non-white
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!isWhite(x, y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Content Bounds: left=${minX}, right=${maxX}, top=${minY}, bottom=${maxY}, width=${maxX - minX + 1}, height=${maxY - minY + 1}`);

  // Let's also check column by column at y=100
  // And let's find multiple boxes if there are multiple slides/panels
}

findContentBounds();

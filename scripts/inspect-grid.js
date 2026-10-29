const { Jimp } = require('../node_modules/jimp');
const path = require('path');

async function inspectGrid() {
  const img = await Jimp.read(path.resolve(__dirname, '../mockup-front.jpg'));
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  // Let's create a 30x40 ASCII visualization of brightness
  const cols = 40;
  const rows = 50;
  const blockW = Math.floor(W / cols);
  const blockH = Math.floor(H / rows);

  console.log('ASCII Map of mockup (darker = ., medium = +, bright = #):');
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let count = 0;
      for (let y = r * blockH; y < (r + 1) * blockH; y += 2) {
        for (let x = c * blockW; x < (c + 1) * blockW; x += 2) {
          const hex = img.getPixelColor(x, y);
          const red = (hex >> 24) & 0xff;
          const green = (hex >> 16) & 0xff;
          const blue = (hex >> 8) & 0xff;
          sum += (red + green + blue) / 3;
          count++;
        }
      }
      const b = sum / count;
      if (b < 50) line += '.';
      else if (b < 120) line += '-';
      else if (b < 180) line += '+';
      else if (b < 230) line += '=';
      else line += '#';
    }
    console.log(`${String(r * blockH).padStart(4)}: ${line}`);
  }
}

inspectGrid();

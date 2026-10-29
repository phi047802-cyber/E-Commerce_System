const { Jimp } = require('../node_modules/jimp');
const path = require('path');

async function detect() {
  const img = await Jimp.read(path.resolve(__dirname, '../mockup-front.jpg'));
  const W = img.bitmap.width;
  const H = img.bitmap.height;

  // Let's examine row y=280 (inside games section)
  const gamesRow = [];
  for (let x = 0; x < W; x++) {
    const hex = img.getPixelColor(x, 280);
    const r = (hex >> 24) & 0xff;
    const g = (hex >> 16) & 0xff;
    const b = (hex >> 8) & 0xff;
    gamesRow.push({ x, r, g, b, brightness: (r+g+b)/3 });
  }

  // Find card boundaries
  let inCard = false;
  let cardStart = 0;
  const cards = [];
  for (let i = 0; i < gamesRow.length; i++) {
    // Background is dark (#0A0A1F is around rgb(10, 10, 31) -> brightness ~ 17)
    // Card background is brighter or has image
    const isBright = gamesRow[i].brightness > 25;
    if (!inCard && isBright) {
      inCard = true;
      cardStart = i;
    } else if (inCard && !isBright && (i - cardStart > 60)) {
      inCard = false;
      cards.push({ start: cardStart, end: i, width: i - cardStart });
    }
  }
  console.log('Detected game cards on row 280:', cards);

  // Companion row detection around y=420 (row 1) and y=540 (row 2)
  console.log('--- Companions Row 1 (y=420) ---');
  let compRow1 = [];
  for (let x = 0; x < W; x++) {
    const hex = img.getPixelColor(x, 420);
    const r = (hex >> 24) & 0xff;
    const g = (hex >> 16) & 0xff;
    const b = (hex >> 8) & 0xff;
    compRow1.push({ x, brightness: (r+g+b)/3 });
  }
  let compCards = [];
  inCard = false;
  for (let i = 0; i < compRow1.length; i++) {
    const isBright = compRow1[i].brightness > 22;
    if (!inCard && isBright) {
      inCard = true;
      cardStart = i;
    } else if (inCard && !isBright && (i - cardStart > 50)) {
      inCard = false;
      compCards.push({ start: cardStart, end: i, width: i - cardStart });
    }
  }
  console.log('Detected companion cards on row 420:', compCards);
}

detect();

const { Jimp } = require('../node_modules/jimp');
const path = require('path');

async function compare() {
  const img1 = await Jimp.read('C:/Users/Asus/Downloads/front.jpg');
  const img2 = await Jimp.read('C:/Users/Asus/Downloads/front -.jpg');

  console.log('front.jpg:', img1.bitmap.width, 'x', img1.bitmap.height);
  console.log('front -.jpg:', img2.bitmap.width, 'x', img2.bitmap.height);

  // Let's check aspect ratio and content
  // In front.jpg: width 736, height 1026.
  // In front -.jpg: width 736, height 1318.
  // Let's see why front -.jpg is taller! Is front -.jpg the FULL long page screenshot?
}

compare();

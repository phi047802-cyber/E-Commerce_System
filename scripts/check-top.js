const { Jimp } = require('../node_modules/jimp');

async function checkTop() {
  const img1 = await Jimp.read('C:/Users/Asus/Downloads/front.jpg');
  const img2 = await Jimp.read('C:/Users/Asus/Downloads/front -.jpg');

  console.log('img1 (front.jpg) top-left 10x10:');
  for (let y = 0; y < 5; y++) {
    let row = '';
    for (let x = 0; x < 5; x++) {
      const c = img1.getPixelColor(x*20, y*20);
      row += '#' + c.toString(16).slice(0, 6) + ' ';
    }
    console.log(row);
  }

  console.log('img2 (front -.jpg) top-left 10x10:');
  for (let y = 0; y < 5; y++) {
    let row = '';
    for (let x = 0; x < 5; x++) {
      const c = img2.getPixelColor(x*20, y*20);
      row += '#' + c.toString(16).slice(0, 6) + ' ';
    }
    console.log(row);
  }
}

checkTop();

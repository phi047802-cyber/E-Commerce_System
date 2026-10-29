const { Jimp } = require('../node_modules/jimp');
const path = require('path');
const fs = require('fs');

async function cropAll() {
  const mockupPath = path.resolve(__dirname, '../mockup-front.jpg');
  const img = await Jimp.read(mockupPath);

  const baseDir = path.resolve(__dirname, '../client/public/images');
  const dirs = ['hero', 'games', 'companions', 'avatars', 'logo', 'icons', 'why-us'];
  for (const d of dirs) {
    const dirPath = path.join(baseDir, d);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  }

  // 1. Hero banner
  // x: 12, y: 44, w: 710, h: 195
  const hero = img.clone().crop({ x: 12, y: 44, w: 710, h: 195 });
  await hero.write(path.join(baseDir, 'hero/hero-banner.jpg'));
  console.log('Cropped hero-banner.jpg');

  // Also crop right-hand side character illustration for hero
  const heroChars = img.clone().crop({ x: 340, y: 44, w: 382, h: 195 });
  await heroChars.write(path.join(baseDir, 'hero/hero-chars.jpg'));

  // 2. Logo
  const logo = img.clone().crop({ x: 15, y: 8, w: 105, h: 32 });
  await logo.write(path.join(baseDir, 'logo/instasquad-logo.png'));
  console.log('Cropped instasquad-logo.png');

  // 3. 6 Game Cards (y: 265 to 365, w: ~108, h: ~100)
  // x positions for 6 cards across 15..715:
  // (715 - 15 - 5*gap) / 6. gap ~ 12px.
  // Card 1: 15..123
  // Card 2: 133..241
  // Card 3: 251..359
  // Card 4: 369..477
  // Card 5: 487..595
  // Card 6: 605..715
  const gameNames = ['valorant', 'lol', 'pubg', 'overwatch2', 'cs2', 'genshin'];
  const gameStarts = [15, 133, 251, 369, 487, 605];
  const gameCardW = 108;
  const gameCardY = 265;
  const gameCardH = 100;

  for (let i = 0; i < gameNames.length; i++) {
    const gCrop = img.clone().crop({ x: gameStarts[i], y: gameCardY, w: gameCardW, h: gameCardH });
    await gCrop.write(path.join(baseDir, `games/${gameNames[i]}.jpg`));
    console.log(`Cropped games/${gameNames[i]}.jpg`);
  }

  // 4. 12 Companion Cards (2 rows x 6 cols)
  // Row 1: y = 422, h = 76
  // Row 2: y = 506, h = 76
  // Col x starts: 15, 133, 251, 369, 487, 605
  // Width: 108
  const compNames = [
    'c01', 'c02', 'c03', 'c04', 'c05', 'c06',
    'c07', 'c08', 'c09', 'c10', 'c11', 'c12'
  ];

  for (let col = 0; col < 6; col++) {
    // Row 1: c01..c06
    const c1 = img.clone().crop({ x: gameStarts[col], y: 422, w: gameCardW, h: 76 });
    await c1.write(path.join(baseDir, `companions/${compNames[col]}.jpg`));

    // Row 2: c07..c12
    const c2 = img.clone().crop({ x: gameStarts[col], y: 506, w: gameCardW, h: 76 });
    await c2.write(path.join(baseDir, `companions/${compNames[col + 6]}.jpg`));
  }
  console.log('Cropped 12 companion cards');

  // 5. Why Choose right banner (gamer photo)
  // x: 380, y: 615, w: 335, h: 90
  const whyRight = img.clone().crop({ x: 375, y: 615, w: 340, h: 90 });
  await whyRight.write(path.join(baseDir, 'why-us/gamer-banner.jpg'));
  console.log('Cropped gamer-banner.jpg');

  // 6. 5 Review Cards / Avatars (y: 730 to 805)
  // 5 cards across x=15 to 715:
  // Card width ~ 130, gap ~ 15
  const revStarts = [15, 155, 295, 435, 575];
  const revW = 135;
  const revY = 730;
  const revH = 75;
  for (let i = 0; i < 5; i++) {
    const rCrop = img.clone().crop({ x: revStarts[i], y: revY, w: revW, h: revH });
    await rCrop.write(path.join(baseDir, `avatars/review-card-0${i + 1}.jpg`));
    // Also crop the small avatar headshot from inside the review card (x: ~10, y: ~10, 24x24)
    const avCrop = img.clone().crop({ x: revStarts[i] + 6, y: revY + 6, w: 26, h: 26 });
    await avCrop.write(path.join(baseDir, `avatars/av0${i + 1}.jpg`));
  }
  console.log('Cropped reviews and avatars');
}

cropAll().catch(console.error);

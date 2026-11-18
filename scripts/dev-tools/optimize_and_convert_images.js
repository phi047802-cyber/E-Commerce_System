const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(ROOT_DIR, 'client', 'public', 'images');
const TEMP_USER = path.join(ROOT_DIR, 'temp_edge_converter');
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

// Target list of images to convert/optimize
// Format: { source: relativePath, outputs: [{ path: relativePath, format: 'webp'|'jpeg', quality: 0.85, maxW: 1920, maxH: 1080 }] }
const tasks = [
  // 1. Game cards: create .webp (< 400KB, width >= 1000px) and fix .jpg if fake PNG
  {
    source: 'games/valorant.jpg',
    outputs: [
      { path: 'games/valorant.webp', format: 'webp', quality: 0.82, maxW: 1920, maxH: 1080 },
      { path: 'games/valorant.jpg', format: 'jpeg', quality: 0.80, maxW: 1920, maxH: 1080 },
    ],
  },
  {
    source: 'games/tft.jpg',
    outputs: [
      { path: 'games/tft.webp', format: 'webp', quality: 0.82, maxW: 1920, maxH: 1080 },
      { path: 'games/tft.jpg', format: 'jpeg', quality: 0.80, maxW: 1920, maxH: 1080 },
    ],
  },
  {
    source: 'games/lol.jpg',
    outputs: [
      { path: 'games/lol.webp', format: 'webp', quality: 0.85, maxW: 1215, maxH: 717 },
      { path: 'games/lol.jpg', format: 'jpeg', quality: 0.82, maxW: 1215, maxH: 717 },
    ],
  },
  {
    source: 'games/overwatch2.jpg',
    outputs: [
      { path: 'games/overwatch2.webp', format: 'webp', quality: 0.82, maxW: 1920, maxH: 1080 },
      { path: 'games/overwatch2.jpg', format: 'jpeg', quality: 0.78, maxW: 1920, maxH: 1080 },
    ],
  },
  {
    source: 'games/genshin.jpg',
    outputs: [
      { path: 'games/genshin.webp', format: 'webp', quality: 0.80, maxW: 1920, maxH: 1080 },
      { path: 'games/genshin.jpg', format: 'jpeg', quality: 0.75, maxW: 1920, maxH: 1080 },
    ],
  },
  {
    source: 'games/pubg.jpg',
    outputs: [
      { path: 'games/pubg.webp', format: 'webp', quality: 0.82, maxW: 1920, maxH: 1080 },
      { path: 'games/pubg.jpg', format: 'jpeg', quality: 0.78, maxW: 1920, maxH: 1080 },
    ],
  },
  {
    source: 'games/cs2.jpg',
    outputs: [
      { path: 'games/cs2.webp', format: 'webp', quality: 0.85, maxW: 1280, maxH: 800 },
      { path: 'games/cs2.jpg', format: 'jpeg', quality: 0.82, maxW: 1280, maxH: 800 },
    ],
  },

  // 2. Hero banners
  {
    source: 'hero/hero-chars.jpg',
    outputs: [
      { path: 'hero/hero-chars.webp', format: 'webp', quality: 0.85, maxW: 1215, maxH: 717 },
    ],
  },
  {
    source: 'hero/hero-banner.jpg',
    outputs: [
      { path: 'hero/hero-banner.webp', format: 'webp', quality: 0.85, maxW: 1920, maxH: 1080 },
      { path: 'hero/hero-banner.jpg', format: 'jpeg', quality: 0.82, maxW: 1920, maxH: 1080 },
    ],
  },

  // 3. News images to webp
  {
    source: 'news/news-escrow.jpg',
    outputs: [{ path: 'news/news-escrow.webp', format: 'webp', quality: 0.85, maxW: 1200, maxH: 675 }],
  },
  {
    source: 'news/news-cancellation.jpg',
    outputs: [{ path: 'news/news-cancellation.webp', format: 'webp', quality: 0.85, maxW: 1200, maxH: 675 }],
  },
  {
    source: 'news/news-trustscore.jpg',
    outputs: [{ path: 'news/news-trustscore.webp', format: 'webp', quality: 0.85, maxW: 1200, maxH: 675 }],
  },
  {
    source: 'news/news-dispute.jpg',
    outputs: [{ path: 'news/news-dispute.webp', format: 'webp', quality: 0.85, maxW: 1200, maxH: 675 }],
  },

  // 4. Avatars that are fake PNGs -> convert to true JPEGs & WebPs
  {
    source: 'avatars/av01.jpg',
    outputs: [
      { path: 'avatars/av01.jpg', format: 'jpeg', quality: 0.85, maxW: 200, maxH: 200 },
      { path: 'avatars/av01.webp', format: 'webp', quality: 0.85, maxW: 200, maxH: 200 },
    ],
  },
  {
    source: 'avatars/av02.jpg',
    outputs: [
      { path: 'avatars/av02.jpg', format: 'jpeg', quality: 0.85, maxW: 200, maxH: 200 },
      { path: 'avatars/av02.webp', format: 'webp', quality: 0.85, maxW: 200, maxH: 200 },
    ],
  },
  {
    source: 'avatars/av03.jpg',
    outputs: [
      { path: 'avatars/av03.jpg', format: 'jpeg', quality: 0.85, maxW: 200, maxH: 200 },
      { path: 'avatars/av03.webp', format: 'webp', quality: 0.85, maxW: 200, maxH: 200 },
    ],
  },
  {
    source: 'avatars/av04.jpg',
    outputs: [
      { path: 'avatars/av04.jpg', format: 'jpeg', quality: 0.85, maxW: 200, maxH: 200 },
      { path: 'avatars/av04.webp', format: 'webp', quality: 0.85, maxW: 200, maxH: 200 },
    ],
  },
  {
    source: 'avatars/av05.jpg',
    outputs: [
      { path: 'avatars/av05.jpg', format: 'jpeg', quality: 0.85, maxW: 200, maxH: 200 },
      { path: 'avatars/av05.webp', format: 'webp', quality: 0.85, maxW: 200, maxH: 200 },
    ],
  },

  // 5. Companions that are fake PNGs -> convert to true JPEGs & WebPs
  {
    source: 'companions/c01.jpg',
    outputs: [
      { path: 'companions/c01.jpg', format: 'jpeg', quality: 0.85, maxW: 800, maxH: 800 },
      { path: 'companions/c01.webp', format: 'webp', quality: 0.85, maxW: 800, maxH: 800 },
    ],
  },
  {
    source: 'companions/c04.jpg',
    outputs: [
      { path: 'companions/c04.jpg', format: 'jpeg', quality: 0.85, maxW: 800, maxH: 800 },
      { path: 'companions/c04.webp', format: 'webp', quality: 0.85, maxW: 800, maxH: 800 },
    ],
  },
  {
    source: 'companions/c09.jpg',
    outputs: [
      { path: 'companions/c09.jpg', format: 'jpeg', quality: 0.85, maxW: 800, maxH: 800 },
      { path: 'companions/c09.webp', format: 'webp', quality: 0.85, maxW: 800, maxH: 800 },
    ],
  },
];

const PORT = 4998;

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (parsedUrl.pathname === '/') {
    // Serve conversion runner HTML
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>Image Optimizer</title></head>
<body>
<h1>Processing ${tasks.length} tasks...</h1>
<div id="log"></div>
<script>
  const tasks = ${JSON.stringify(tasks)};
  const logDiv = document.getElementById('log');

  function log(msg) {
    const p = document.createElement('div');
    p.textContent = msg;
    logDiv.appendChild(p);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error('Failed to load: ' + src));
      img.src = src;
    });
  }

  async function processTasks() {
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      log('Loading [' + (i+1) + '/' + tasks.length + ']: ' + t.source);
      try {
        const img = await loadImage('/image/' + t.source);
        for (const out of t.outputs) {
          const canvas = document.createElement('canvas');
          let w = img.naturalWidth;
          let h = img.naturalHeight;

          // Scale down if exceeds maxW/maxH while preserving aspect ratio
          if (out.maxW && out.maxH) {
            const ratio = Math.min(out.maxW / w, out.maxH / h, 1.0);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const mime = out.format === 'webp' ? 'image/webp' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, out.quality || 0.85);

          const res = await fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetPath: out.path,
              dataUrl: dataUrl,
              width: w,
              height: h
            })
          });
          const result = await res.json();
          log('  -> Saved ' + out.path + ' (' + w + 'x' + h + ') ' + result.sizeKB + ' KB');
        }
      } catch (err) {
        log('  ERROR: ' + err.message);
      }
    }

    log('ALL DONE! Notifying server...');
    await fetch('/done');
  }

  processTasks();
</script>
</body>
</html>`);
    return;
  }

  if (parsedUrl.pathname.startsWith('/image/')) {
    const rel = decodeURIComponent(parsedUrl.pathname.replace('/image/', ''));
    const full = path.join(IMAGES_DIR, rel);
    if (!fs.existsSync(full)) {
      res.writeHead(404);
      res.end('Not found: ' + full);
      return;
    }
    const buf = fs.readFileSync(full);
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    res.end(buf);
    return;
  }

  if (parsedUrl.pathname === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { targetPath, dataUrl, width, height } = JSON.parse(body);
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid data URL' }));
          return;
        }
        const buffer = Buffer.from(matches[2], 'base64');
        const fullOut = path.join(IMAGES_DIR, targetPath);
        fs.mkdirSync(path.dirname(fullOut), { recursive: true });
        fs.writeFileSync(fullOut, buffer);

        const sizeKB = (buffer.length / 1024).toFixed(1);
        console.log(`[OPTIMIZED] ${targetPath} (${width}x${height}) -> ${sizeKB} KB [${matches[1]}]`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sizeKB }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

let edgeProc = null;

  if (parsedUrl.pathname === '/done') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ done: true }));
    console.log('✅ Hoàn tất toàn bộ tối ưu ảnh.');
    setTimeout(() => {
      if (edgeProc) {
        try { edgeProc.kill(); } catch (e) {}
      }
      try {
        if (fs.existsSync(TEMP_USER)) fs.rmSync(TEMP_USER, { recursive: true, force: true });
      } catch (e) {}
      server.close();
      process.exit(0);
    }, 500);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 Image Optimization Server listening on http://localhost:${PORT}`);
  console.log('Khởi chạy Edge Headless để chuyển đổi WebP/JPEG và nén dung lượng...');

  edgeProc = spawn(EDGE_PATH, [
    '--headless',
    '--disable-gpu',
    `--user-data-dir=${TEMP_USER}`,
    `http://localhost:${PORT}/`
  ]);

  edgeProc.on('exit', () => {
    console.log('Edge process exited.');
  });
});

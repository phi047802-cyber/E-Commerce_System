import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../common/prisma.js';
import { env } from '../../config/env.js';
import { extractUtm } from '../../common/utm.js';
import { logger } from '../../common/logger.js';

/**
 * Tăng trưởng & Deep Link (NON_GAMER_GROWTH_STRATEGY.md §4, G8).
 * - GET /go/:target/:id?  → ghi nhận lượt truy cập theo kênh (UTM) rồi trả trang Landing/Redirect:
 *   thử mở App bằng custom scheme `instasquad://…`, có nút tải App và nút "Xem trên Web".
 * - GET /.well-known/assetlinks.json, /.well-known/apple-app-site-association → Android App Links / iOS Universal Links.
 * Domain thật, SHA-256 chứng chỉ ký và Apple Team ID là cấu hình môi trường (placeholder trong demo — DEFERRED).
 */
export const growthRouter = Router();

type DeepTarget = { app: string; web: string; title: string };

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function resolveDeepLink(target: string, id: string | undefined, query: Record<string, unknown>): DeepTarget | null {
  switch (target) {
    case 'discover': {
      const c = typeof query.c === 'string' && ['game', 'social'].includes(query.c.toLowerCase()) ? query.c.toLowerCase() : 'game';
      return { app: `instasquad://discover?c=${c}`, web: `/?category=${c}`, title: c === 'social' ? 'Trò chuyện & Giải trí' : 'Tìm bạn chơi game' };
    }
    case 'companion':
      if (!id || !ID_RE.test(id)) return null;
      return { app: `instasquad://companion/${id}`, web: `/?companion=${encodeURIComponent(id)}`, title: 'Hồ sơ Companion' };
    case 'booking':
      if (!id || !ID_RE.test(id)) return null;
      return { app: `instasquad://booking/${id}`, web: '/', title: 'Chi tiết đơn đặt lịch' };
    case 'wallet':
      return { app: 'instasquad://wallet', web: '/', title: 'Ví của tôi' };
    default:
      return null;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
}

function renderLanding(link: DeepTarget): string {
  const app = escapeHtml(link.app);
  const web = escapeHtml(link.web);
  const title = escapeHtml(link.title);
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>INSTASQUAD — ${title}</title>
<meta property="og:title" content="INSTASQUAD — ${title}">
<meta property="og:description" content="Tìm bạn đồng hành chơi game, trò chuyện, xem phim. Tiền được giữ an toàn đến khi bạn hài lòng.">
<style>
:root{--bg:#0b0f1a;--card:#141a2b;--fg:#f4f6fb;--muted:#a3acc2;--accent:#7c5cff}
@media (prefers-color-scheme: light){:root{--bg:#f5f6fa;--card:#fff;--fg:#151826;--muted:#5b6275}}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg);display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:var(--card);border-radius:16px;padding:28px;max-width:420px;width:100%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)}
h1{font-size:22px;margin:0 0 8px}p{color:var(--muted);line-height:1.5;margin:0 0 20px}
a.btn{display:block;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:10px}
.primary{background:var(--accent);color:#fff}.ghost{border:1px solid var(--muted);color:var(--fg)}
small{display:block;margin-top:16px;color:var(--muted)}
</style></head>
<body><main class="card">
<h1>INSTASQUAD</h1>
<p>${title}. Thanh toán được giữ an toàn (Escrow) đến khi bạn hài lòng.</p>
<a class="btn primary" id="open" href="${app}">Mở trong ứng dụng</a>
<a class="btn ghost" href="${web}">Xem trên Web</a>
<small>Chưa có ứng dụng? Bản cài đặt sẽ có trên App Store / Google Play (đang phát triển).</small>
</main>
<script>setTimeout(function(){window.location.href=${JSON.stringify(link.app)};},300);</script>
</body></html>`;
}

async function recordChannelVisit(req: Request): Promise<void> {
  const userAgent = (req.headers['user-agent'] as string) || '';
  if (/bot|crawl|spider|slurp|facebookexternalhit|headless|wget|curl/i.test(userAgent)) return;
  const clientIp = ((req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()) || req.socket.remoteAddress || '127.0.0.1';
  const ipHash = crypto.createHmac('sha256', env.JWT_SECRET).update(clientIp).digest('hex');
  // Một lượt / IP / ngày / đường dẫn (khóa phiên ẩn danh, không lưu IP thô)
  const day = new Date().toISOString().slice(0, 10);
  const sessionKey = 'go-' + crypto.createHash('sha256').update(`${ipHash}|${day}|${req.path}`).digest('hex').slice(0, 40);
  const utm = extractUtm({ ...req.query, landing_path: req.path } as Record<string, unknown>);
  try {
    await prisma.siteVisit.upsert({
      where: { session_key: sessionKey },
      update: {},
      create: { session_key: sessionKey, ip_hash: ipHash, user_agent: userAgent.slice(0, 255), ...utm },
    });
  } catch (err) {
    logger.warn(`[growth] Không ghi được lượt truy cập /go: ${(err as Error).message}`);
  }
}

growthRouter.get(['/go/:target', '/go/:target/:id'], async (req: Request, res: Response) => {
  const link = resolveDeepLink(req.params.target, req.params.id, req.query as Record<string, unknown>);
  if (!link) {
    res.status(404).type('text/plain').send('Liên kết không hợp lệ.');
    return;
  }
  await recordChannelVisit(req);
  res.type('html').send(renderLanding(link));
});

growthRouter.get('/.well-known/assetlinks.json', (_req: Request, res: Response) => {
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: env.ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: env.ANDROID_SHA256_CERT_FINGERPRINTS.split(',').map((s) => s.trim()).filter(Boolean),
      },
    },
  ]);
});

growthRouter.get('/.well-known/apple-app-site-association', (_req: Request, res: Response) => {
  res.type('application/json').send(
    JSON.stringify({
      applinks: {
        apps: [],
        details: [{ appIDs: [`${env.IOS_TEAM_ID}.${env.IOS_BUNDLE_ID}`], components: [{ '/': '/go/*' }, { '/': '/app/*' }] }],
      },
    })
  );
});

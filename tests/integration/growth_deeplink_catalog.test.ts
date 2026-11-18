import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';
import { prisma } from '../../server/src/common/prisma.js';
import { resolveDeepLink } from '../../server/src/modules/growth/growth.router.js';

/** G7/G8 — Dịch vụ Non-gamer, đo kênh Social (UTM) và Deep Link về App. */
describe('Growth: SOCIAL services, UTM channel tracking, deep links (G7, G8)', () => {
  afterAll(async () => {
    await prisma.siteVisit.deleteMany({ where: { OR: [{ session_key: { startsWith: 'go-' } }, { session_key: { startsWith: 'test-utm-' } }] } });
  });

  it('GET /api/games?category=SOCIAL returns only non-gamer services', async () => {
    const res = await request(app).get('/api/games?category=SOCIAL');
    expect(res.status).toBe(200);
    const ids = res.body.data.map((g: { game_id: string }) => g.game_id).sort();
    expect(ids).toEqual(['SOCIAL_MOVIE', 'SOCIAL_MUSIC', 'SOCIAL_PARTY', 'SOCIAL_TALK']);
    for (const g of res.body.data) expect(g.category).toBe('SOCIAL');
  });

  it('GET /api/games without category keeps backward compatibility (GAME + SOCIAL)', async () => {
    const res = await request(app).get('/api/games');
    const cats = new Set(res.body.data.map((g: { category: string }) => g.category));
    expect(cats.has('GAME')).toBe(true);
    expect(cats.has('SOCIAL')).toBe(true);
  });

  it('GET /api/companions?category=SOCIAL lists only non-gamer companions', async () => {
    const res = await request(app).get('/api/companions?category=SOCIAL');
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body.data) ? res.body.data : res.body.data.items;
    const ids = items.map((c: { profile_id: string }) => c.profile_id).sort();
    expect(ids).toEqual(['prof-comp-03', 'prof-comp-04']);
  });

  it('POST /api/analytics/visit stores sanitized UTM source', async () => {
    const res = await request(app).post('/api/analytics/visit')
      .set('User-Agent', 'Mozilla/5.0 test')
      .send({ session_key: 'test-utm-001', utm_source: 'TikTok<script>', utm_campaign: 'non_gamer_week1' });
    expect(res.status).toBe(200);
    const v = await prisma.siteVisit.findUnique({ where: { session_key: 'test-utm-001' } });
    expect(v?.utm_source).toBe('tiktokscript');
    expect(v?.utm_campaign).toBe('non_gamer_week1');
  });

  it('GET /go/companion/:id returns landing page with app scheme and records channel visit', async () => {
    const res = await request(app).get('/go/companion/prof-comp-03?utm_source=threads&utm_medium=social')
      .set('User-Agent', 'Mozilla/5.0 (iPhone)');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('instasquad://companion/prof-comp-03');
    const v = await prisma.siteVisit.findFirst({ where: { landing_path: '/go/companion/prof-comp-03', utm_source: 'threads' } });
    expect(v).not.toBeNull();
  });

  it('rejects unknown targets and unsafe ids (no HTML injection)', async () => {
    expect((await request(app).get('/go/unknown')).status).toBe(404);
    expect((await request(app).get('/go/companion/%3Cscript%3E')).status).toBe(404);
    expect(resolveDeepLink('discover', undefined, { c: '"><img>' })?.app).toBe('instasquad://discover?c=game');
  });

  it('serves Android App Links and iOS Universal Links association files', async () => {
    const a = await request(app).get('/.well-known/assetlinks.json');
    expect(a.status).toBe(200);
    expect(a.body[0].target.package_name).toBe('vn.instasquad.app');
    const i = await request(app).get('/.well-known/apple-app-site-association');
    expect(i.status).toBe(200);
    const json = JSON.parse(i.text);
    expect(json.applinks.details[0].components).toContainEqual({ '/': '/go/*' });
  });
});

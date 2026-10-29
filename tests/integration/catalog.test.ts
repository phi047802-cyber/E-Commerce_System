import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';

describe('Catalog & Companion Discovery API', () => {
  it('GET /api/games should return active games with skill tiers', async () => {
    const res = await request(app).get('/api/games');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    const gameIds = res.body.data.map((g: any) => g.game_id);
    expect(gameIds).toContain('LMHT');
    expect(gameIds).toContain('VALORANT');
    expect(gameIds).toContain('TFT');
  });

  it('GET /api/companions should return companions with profile details and available slots', async () => {
    const res = await request(app).get('/api/companions');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);

    const companion1 = res.body.data.find((c: any) => c.user_id === 'u-comp-01');
    expect(companion1).toBeDefined();
    expect(companion1.hourly_rate).toBeGreaterThanOrEqual(100000);
    expect(companion1.trust_score).toBe(95);
    expect(companion1.slots.length).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';

describe('Integration Tests: News & Announcements API (GET /api/news & GET /api/news/:slug)', () => {
  it('GET /api/news should return 200 and an array of news items', async () => {
    const res = await request(app).get('/api/news');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.news)).toBe(true);
    expect(res.body.data.news.length).toBeGreaterThanOrEqual(4);

    const firstItem = res.body.data.news[0];
    expect(firstItem).toHaveProperty('slug');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('summary');
    expect(firstItem).toHaveProperty('category');
    expect(firstItem).toHaveProperty('image_url');
  });

  it('GET /api/news/:slug should return 200 and article content for a valid slug', async () => {
    const slug = 'co-che-ky-quy-escrow-va-so-cai-kep';
    const res = await request(app).get(`/api/news/${slug}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.news.slug).toBe(slug);
    expect(res.body.data.news.title).toContain('Ký quỹ Escrow');
    expect(res.body.data.news.content).toContain('Sổ cái kép');
  });

  it('GET /api/news/:slug should return 404 for a non-existent slug', async () => {
    const res = await request(app).get('/api/news/non-existent-article-slug-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NEWS_NOT_FOUND');
  });
});

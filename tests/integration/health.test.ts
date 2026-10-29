import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/server.js';

describe('Health Check API', () => {
  it('GET /api/health should return status UP and CONNECTED database', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UP');
    expect(res.body.data.database).toBe('CONNECTED');
    expect(res.body.data.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(res.body.data.version).toBe('1.0.0-mvp');
  });
});

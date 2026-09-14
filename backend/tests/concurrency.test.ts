import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Concurrency & Idempotency Tests', () => {
  let tokenWorker: string;
  let reportId: string;

  beforeAll(async () => {
    await seedDatabase();

    const wRes = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-worker-1' });
    tokenWorker = wRes.body.token;

    // Create initial report
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        projectId: 'proj-shibuya',
        workDate: '2026-11-20',
        weather: '晴',
        workers: [{ name: '佐藤 健太', trade: '普通作業員', workHours: 8, overtimeHours: 0 }],
        workItems: [{ workType: '掘削', description: '基礎掘削', quantity: 10, unit: 'm³' }],
      });
    reportId = res.body.id;
  });

  it('Device A updates report with version 1 -> success, version becomes 2', async () => {
    const res = await request(app)
      .put(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        version: 1,
        weather: '曇',
      });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect(res.body.weather).toBe('曇');
  });

  it('Device B updates report with outdated version 1 -> rejected with HTTP 409 Conflict', async () => {
    const res = await request(app)
      .put(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        version: 1, // Stale version!
        weather: '雨',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Konflik versi');
    expect(res.body.currentServerData).toBeDefined();
    expect(res.body.currentServerData.version).toBe(2);
  });

  it('Idempotency Key: identical retry returns cached response without duplication', async () => {
    const idempotencyKey = 'idem-test-uuid-001';
    const payload = {
      projectId: 'proj-shibuya',
      workDate: '2026-09-15',
      weather: '晴',
      workers: [{ name: '佐藤 健太', trade: '普通作業員', workHours: 8, overtimeHours: 0 }],
      workItems: [{ workType: '整地', description: '路床整地', quantity: 100, unit: 'm²' }],
    };

    // First attempt
    const res1 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(201);
    const firstId = res1.body.id;

    // Retry with SAME idempotency key and SAME payload
    const res2 = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(200);
    expect(res2.body.id).toBe(firstId); // Identical cached response, no new report created!
  });

  it('Idempotency Key: same key with DIFFERENT payload is rejected with 400', async () => {
    const idempotencyKey = 'idem-test-uuid-001'; // already used
    const differentPayload = {
      projectId: 'proj-shibuya',
      workDate: '2026-09-16', // Changed date!
      weather: '雨',
    };

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(differentPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Idempotency key conflict');
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Tahap A: Tenant Isolation and Project RBAC Authorization', () => {
  let tokenWorker1: string; // Assigned to Shibuya (Org 1)
  let tokenWorker2: string; // Assigned to Shinjuku (Org 1)
  let tokenOtherOrg: string; // Assigned to Yokohama (Org 2)

  beforeAll(async () => {
    await seedDatabase();

    // Login worker 1 (Assigned to proj-shibuya)
    const res1 = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-worker-1' });
    tokenWorker1 = res1.body.token;

    // Login worker 2 (Assigned to proj-shinjuku)
    const res2 = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-worker-2' });
    tokenWorker2 = res2.body.token;

    // Login other org user (Org 2 - satou-gumi)
    const res3 = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-other-org' });
    tokenOtherOrg = res3.body.token;
  });

  it('Worker 1 can access assigned project (proj-shibuya)', async () => {
    const res = await request(app)
      .get('/api/projects/proj-shibuya')
      .set('Authorization', `Bearer ${tokenWorker1}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('渋谷区本町道路改良工事');
  });

  it('Worker 1 is FORBIDDEN from accessing unassigned project in same org (proj-shinjuku)', async () => {
    const res = await request(app)
      .get('/api/projects/proj-shinjuku')
      .set('Authorization', `Bearer ${tokenWorker1}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('You are not assigned to this project');
  });

  it('Worker from Org 2 is FORBIDDEN from accessing project of Org 1 (Cross-tenant attack)', async () => {
    const res = await request(app)
      .get('/api/projects/proj-shibuya')
      .set('Authorization', `Bearer ${tokenOtherOrg}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('belongs to another organization');
  });

  it('Unauthorized request without token is rejected with 401', async () => {
    const res = await request(app).get('/api/projects/proj-shibuya');
    expect(res.status).toBe(401);
  });
});

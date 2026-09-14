import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Admin Master Data Management and Tenant Isolation', () => {
  let tokenAdmin: string;      // Admin in Org 1 (Tokyo-doboku)
  let tokenWorker: string;     // Worker in Org 1 (Tokyo-doboku)
  let tokenOtherOrg: string;   // Worker in Org 2 (Satou-gumi)
  let createdWorkerId: string;
  let createdEquipId: string;

  beforeAll(async () => {
    await seedDatabase();

    const resAdmin = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-admin' });
    tokenAdmin = resAdmin.body.token;

    const resWorker = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-worker-1' });
    tokenWorker = resWorker.body.token;

    const resOther = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-other-org' });
    tokenOtherOrg = resOther.body.token;
  });

  it('Worker can READ active master workers and master equipment', async () => {
    const resWorkers = await request(app)
      .get('/api/master/workers')
      .set('Authorization', `Bearer ${tokenWorker}`);
    expect(resWorkers.status).toBe(200);
    expect(Array.isArray(resWorkers.body)).toBe(true);
    expect(resWorkers.body.length).toBeGreaterThan(0);

    const resEquip = await request(app)
      .get('/api/master/equipment')
      .set('Authorization', `Bearer ${tokenWorker}`);
    expect(resEquip.status).toBe(200);
    expect(Array.isArray(resEquip.body)).toBe(true);
    expect(resEquip.body.length).toBeGreaterThan(0);
  });

  it('Worker is FORBIDDEN (403) from creating master workers', async () => {
    const res = await request(app)
      .post('/api/master/workers')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        name: '不正ワーカー',
        trade: '土工',
      });
    expect(res.status).toBe(403);
  });

  it('Worker is FORBIDDEN (403) from creating master equipment', async () => {
    const res = await request(app)
      .post('/api/master/equipment')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        name: '不正重機',
      });
    expect(res.status).toBe(403);
  });

  it('Admin can CREATE new master worker and master equipment', async () => {
    const resWorker = await request(app)
      .post('/api/master/workers')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        name: '山田 太郎',
        company: '自社',
        trade: '重機オペレーター',
        default_work_hours: 8,
        phone: '090-1234-5678',
      });
    expect(resWorker.status).toBe(201);
    expect(resWorker.body.name).toBe('山田 太郎');
    expect(resWorker.body.trade).toBe('重機オペレーター');
    createdWorkerId = resWorker.body.id;

    const resEquip = await request(app)
      .post('/api/master/equipment')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        name: '0.7BH (バックホウ大型)',
        code_number: 'BH-07',
        category: 'heavy_machinery',
        vendor: '株式会社レンタルのニッケン',
        unit: '台',
      });
    expect(resEquip.status).toBe(201);
    expect(resEquip.body.name).toBe('0.7BH (バックホウ大型)');
    createdEquipId = resEquip.body.id;
  });

  it('Admin can UPDATE and DEACTIVATE master entries', async () => {
    // Update worker
    const updateRes = await request(app)
      .put(`/api/master/workers/${createdWorkerId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        trade: '特殊作業員',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.trade).toBe('特殊作業員');

    // Deactivate worker
    const delRes = await request(app)
      .delete(`/api/master/workers/${createdWorkerId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Active query should no longer include deactivated worker
    const listRes = await request(app)
      .get('/api/master/workers')
      .set('Authorization', `Bearer ${tokenWorker}`);
    const found = listRes.body.find((w: any) => w.id === createdWorkerId);
    expect(found).toBeUndefined();
  });

  it('Admin can CREATE and UPDATE projects', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        name: '横浜港第3工区土工工事',
        code: 'YOKOHAMA-2026-03',
        location: '神奈川県横浜市鶴見区',
        main_contractor: '大成建設株式会社',
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('横浜港第3工区土工工事');
    const newProjId = res.body.id;

    const updateRes = await request(app)
      .put(`/api/projects/${newProjId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        location: '神奈川県横浜市鶴見区大黒町',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.location).toBe('神奈川県横浜市鶴見区大黒町');
  });

  it('Cross-tenant user CANNOT see master workers of another organization', async () => {
    const res = await request(app)
      .get('/api/master/workers')
      .set('Authorization', `Bearer ${tokenOtherOrg}`);
    expect(res.status).toBe(200);
    // Org 2 should not have Sato or Yamada
    const foundSato = res.body.find((w: any) => w.name.includes('佐藤 健太'));
    expect(foundSato).toBeUndefined();
  });
});

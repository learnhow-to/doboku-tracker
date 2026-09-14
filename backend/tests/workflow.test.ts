import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Tahap B: Vertical Slice Nippou Workflow (Draft -> Submit -> Return -> Approve -> Immutability)', () => {
  let tokenWorker: string;
  let tokenForeman: string;
  let createdReportId: string;

  beforeAll(async () => {
    await seedDatabase();

    const wRes = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-worker-1' });
    tokenWorker = wRes.body.token;

    const fRes = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-foreman' });
    tokenForeman = fRes.body.token;
  });

  it('Step 1: Worker creates a new Nippou draft', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        projectId: 'proj-shibuya',
        workDate: '2026-10-01',
        weather: '晴',
        siteStartTime: '08:00',
        siteEndTime: '17:00',
        breakMinutes: 60,
        handoverNotes: '明日は雨天予報のため、掘削面の養生シートを二重に展張しました。',
        workers: [
          { name: '佐藤 健太', company: '自社', trade: '普通作業員', workHours: 8, overtimeHours: 1 },
          { name: '高橋 雄二', company: '自社', trade: '重機オペレーター', workHours: 8, overtimeHours: 0 }
        ],
        workItems: [
          { workType: '土工', description: '路床掘削工・残土搬出', locationSta: 'STA 1+20', quantity: 45.5, unit: 'm³' }
        ],
        equipment: [
          { name: '2TDT', vendor: '自社', quantity: 2, unit: '台', operatingHours: 6.5, dieselLiters: 40 },
          { name: 'バックホウ 0.25m3', vendor: '自社', quantity: 1, unit: '台', operatingHours: 7.0, dieselLiters: 65 }
        ],
        materials: [
          { name: '砕石 (RC-40)', vendor: '自社', quantity: 12, unit: 't', isPurchased: false }
        ],
        ky: {
          meetingTime: '07:50',
          attendeesCount: 2,
          specificHazards: '重機旋回範囲への立ち入り、掘削法面の崩落',
          countermeasures: '誘導員の配置、合図確認の徹底、法肩から0.5m離隔',
          supervisorName: '鈴木 一郎',
          isChecked: true,
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.version).toBe(1);
    expect(res.body.workers.length).toBe(2);
    expect(res.body.workItems.length).toBe(1);
    createdReportId = res.body.id;
  });

  it('Step 2: Worker submits the report draft', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/submit`)
      .set('Authorization', `Bearer ${tokenWorker}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUBMITTED');
  });

  it('Step 3: Worker cannot approve own report (Separation of Duties)', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/review`)
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  it('Step 4: Foreman reviews and returns the report with reason', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/review`)
      .set('Authorization', `Bearer ${tokenForeman}`)
      .send({
        action: 'return',
        reason: '残土搬出の数量をマニフェスト控えと照合して再確認してください。',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RETURNED');
    expect(res.body.rejection_reason).toBe('残土搬出の数量をマニフェスト控えと照合して再確認してください。');
  });

  it('Step 5: Worker updates data and resubmits', async () => {
    // Update quantity
    const updateRes = await request(app)
      .put(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        version: 1,
        workItems: [
          { workType: '土工', description: '路床掘削工・残土搬出（マニフェスト確認済）', locationSta: 'STA 1+20', quantity: 48.0, unit: 'm³' }
        ]
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.version).toBe(2);

    // Resubmit
    const submitRes = await request(app)
      .post(`/api/reports/${createdReportId}/submit`)
      .set('Authorization', `Bearer ${tokenWorker}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.status).toBe('SUBMITTED');
  });

  it('Step 6: Foreman approves the report', async () => {
    const res = await request(app)
      .post(`/api/reports/${createdReportId}/review`)
      .set('Authorization', `Bearer ${tokenForeman}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.approved_by).toBe('usr-foreman');
    expect(res.body.revisions.length).toBe(1);
    expect(res.body.revisions[0].status).toBe('APPROVED');
  });

  it('Step 7: Approved report is strictly IMMUTABLE to direct edit', async () => {
    const res = await request(app)
      .put(`/api/reports/${createdReportId}`)
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        version: 2,
        weather: '雨'
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('APPROVED');
  });

  it('Step 8: Export A4 template contains verified Japanese text and DRAFT warning', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportId}/export/html`)
      .set('Authorization', `Bearer ${tokenWorker}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('原本・電子決裁済');
    expect(res.text).toContain('作業日報');
    expect(res.text).toContain('渋谷区本町道路改良工事');
    expect(res.text).toContain('大林道路株式会社');
    expect(res.text).toContain('佐藤 健太');
    expect(res.text).toContain('高橋 雄二');
    expect(res.text).toContain('土工');
    expect(res.text).toContain('2TDT');
    // Verify Hanko stamp seal is rendered
    expect(res.text).toContain('hanko-seal');
    expect(res.text).toContain('グレイス');
  });

  it('Step 9: Get latest previous report for "Copy from yesterday" feature', async () => {
    const res = await request(app)
      .get(`/api/reports/project/proj-shibuya/latest-previous?beforeDate=2026-10-02`)
      .set('Authorization', `Bearer ${tokenWorker}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.id).toBe(createdReportId);
    expect(res.body.workers.length).toBeGreaterThan(0);
    expect(res.body.equipment.length).toBeGreaterThan(0);
  });

  it('Step 10: Retrieve Monthly Matrix for calendar view', async () => {
    const res = await request(app)
      .get(`/api/reports/project/proj-shibuya/monthly-matrix?yearMonth=2026-10`)
      .set('Authorization', `Bearer ${tokenForeman}`);

    expect(res.status).toBe(200);
    expect(res.body.yearMonth).toBe('2026-10');
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports.some((r: any) => r.id === createdReportId)).toBe(true);
  });

  it('Step 11: Batch approve submitted reports', async () => {
    // 1. Create a second report as worker
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${tokenWorker}`)
      .send({
        projectId: 'proj-shibuya',
        workDate: '2026-10-02',
        weather: '晴',
        workers: [{ name: '佐藤 健太', company: '自社', trade: '普通作業員', workHours: 8 }],
        workItems: [{ workType: '土工', description: '残土搬出', locationSta: 'STA 0+50', quantity: 15, unit: 'm³' }],
      });
    const secondReportId = createRes.body.id;

    // 2. Submit it
    await request(app)
      .post(`/api/reports/${secondReportId}/submit`)
      .set('Authorization', `Bearer ${tokenWorker}`);

    // 3. Batch approve via Foreman
    const batchRes = await request(app)
      .post('/api/reports/batch-approve')
      .set('Authorization', `Bearer ${tokenForeman}`)
      .send({ reportIds: [secondReportId] });

    expect(batchRes.status).toBe(200);
    expect(batchRes.body.approvedCount).toBe(1);
    expect(batchRes.body.failedCount).toBe(0);

    // Verify it is now APPROVED
    const checkRes = await request(app)
      .get(`/api/reports/${secondReportId}`)
      .set('Authorization', `Bearer ${tokenForeman}`);
    expect(checkRes.body.status).toBe('APPROVED');
  });
});

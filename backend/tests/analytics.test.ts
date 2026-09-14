import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Admin Analytics KPI and Excel-Compatible CSV Export', () => {
  let tokenAdmin: string;

  beforeAll(async () => {
    await seedDatabase();

    const res = await request(app).post('/api/auth/dev-login').send({ userId: 'usr-admin' });
    tokenAdmin = res.body.token;
  });

  it('Admin can retrieve Analytics KPI Summary and Project Progress Matrix', async () => {
    const res = await request(app)
      .get('/api/reports/analytics/summary')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body.kpi).toBeDefined();
    expect(res.body.kpi.totalReports).toBeGreaterThan(0);
    expect(res.body.todayMatrix).toBeDefined();
    expect(Array.isArray(res.body.todayMatrix)).toBe(true);
  });

  it('Admin can retrieve Workforce Summary and download CSV with UTF-8 BOM', async () => {
    // JSON summary
    const summaryRes = await request(app)
      .get('/api/reports/export/summary/workforce')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.summary).toBeDefined();
    expect(summaryRes.body.details).toBeDefined();

    // CSV download
    const csvRes = await request(app)
      .get('/api/reports/export/csv/workforce')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    // Verify UTF-8 BOM is present for Excel compatibility
    expect(csvRes.text.startsWith('\uFEFF')).toBe(true);
    expect(csvRes.text).toContain('作業年月日');
    expect(csvRes.text).toContain('通常現場時間(h)');
  });

  it('Admin can retrieve Equipment Summary and download CSV with UTF-8 BOM', async () => {
    const csvRes = await request(app)
      .get('/api/reports/export/csv/equipment')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text.startsWith('\uFEFF')).toBe(true);
    expect(csvRes.text).toContain('重機・車両・工具名称');
    expect(csvRes.text).toContain('給油軽油(L)');
  });

  it('Admin can retrieve Work Items (Dekidaka) Summary and download CSV with UTF-8 BOM', async () => {
    const csvRes = await request(app)
      .get('/api/reports/export/csv/work-items')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text.startsWith('\uFEFF')).toBe(true);
    expect(csvRes.text).toContain('出来高数量');
  });

  it('Admin can download genuine Excel (.xlsx) files with formatting for Workforce, Equipment, and Work Items', async () => {
    // Workforce Excel
    const wfExcelRes = await request(app)
      .get('/api/reports/export/excel/workforce')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(wfExcelRes.status).toBe(200);
    expect(wfExcelRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(wfExcelRes.headers['content-disposition']).toContain('.xlsx');
    expect(wfExcelRes.body).toBeDefined();

    // Equipment Excel
    const eqExcelRes = await request(app)
      .get('/api/reports/export/excel/equipment')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(eqExcelRes.status).toBe(200);
    expect(eqExcelRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(eqExcelRes.headers['content-disposition']).toContain('.xlsx');

    // Work Items Excel
    const wiExcelRes = await request(app)
      .get('/api/reports/export/excel/work-items')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(wiExcelRes.status).toBe(200);
    expect(wiExcelRes.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(wiExcelRes.headers['content-disposition']).toContain('.xlsx');
  });
});
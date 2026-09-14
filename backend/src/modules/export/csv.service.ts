import { query } from '../../config/database.js';

export interface ExportMeta {
  projectName?: string;
  startDate?: string;
  endDate?: string;
  companyName?: string;
}

interface FilterOptions {
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvDocument(
  title: string,
  meta: ExportMeta,
  headers: string[],
  rows: (string | number)[][],
  summaryRow?: (string | number)[]
): string {
  const lines: string[] = [];

  // Line 1: Corporate Title
  lines.push(`"${title.replace(/"/g, '""')}"`);

  // Line 2: Corporate Meta Block (Project, Date Range, Print Timestamp)
  const metaCells = [
    '対象現場:',
    meta.projectName || '【全現場】',
    '',
    '対象期間:',
    `${meta.startDate || '最初'} ～ ${meta.endDate || '最新'}`,
    '',
    '出力日時:',
    new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
  ];
  lines.push(metaCells.map(escapeCsvCell).join(','));

  // Line 3: Blank separator
  lines.push('');

  // Line 4: Column Headers
  lines.push(headers.map(escapeCsvCell).join(','));

  // Line 5..N: Data Rows
  for (const r of rows) {
    lines.push(r.map(escapeCsvCell).join(','));
  }

  // Line N+1: Summary / Total Row
  if (summaryRow) {
    lines.push(summaryRow.map(escapeCsvCell).join(','));
  }

  return '\uFEFF' + lines.join('\r\n');
}

// -------------------------------------------------------------
// 1. ANALYTICS KPI SUMMARY (FOR DESKTOP DASHBOARD)
// -------------------------------------------------------------

export async function getAnalyticsSummary(organizationId: string, filters: FilterOptions = {}) {
  let whereClauses = ['dr.organization_id = $1'];
  let params: any[] = [organizationId];

  if (filters.projectId) {
    params.push(filters.projectId);
    whereClauses.push(`dr.project_id = $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    whereClauses.push(`dr.work_date >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    whereClauses.push(`dr.work_date <= $${params.length}`);
  }

  const whereStr = whereClauses.join(' AND ');

  // KPI Metrics
  const reportsKpi = await query(
    `SELECT 
       COUNT(*) as total_reports,
       COUNT(*) FILTER (WHERE dr.status = 'APPROVED') as approved_count,
       COUNT(*) FILTER (WHERE dr.status = 'SUBMITTED') as submitted_count,
       COUNT(*) FILTER (WHERE dr.status = 'RETURNED') as returned_count,
       COUNT(*) FILTER (WHERE dr.status = 'DRAFT') as draft_count
     FROM daily_reports dr
     WHERE ${whereStr}`,
    params
  );

  const workforceKpi = await query(
    `SELECT 
       COALESCE(SUM(rw.work_hours), 0) as total_regular_hours,
       COALESCE(SUM(rw.overtime_hours), 0) as total_overtime_hours,
       COUNT(DISTINCT rw.name) as unique_workers_count
     FROM report_workers rw
     JOIN daily_reports dr ON rw.report_id = dr.id
     WHERE ${whereStr}`,
    params
  );

  const equipKpi = await query(
    `SELECT 
       COALESCE(SUM(ee.operating_hours), 0) as total_operating_hours,
       COALESCE(SUM(ee.diesel_liters), 0) as total_diesel_liters,
       COUNT(DISTINCT ee.name) as unique_equipment_count
     FROM equipment_entries ee
     JOIN daily_reports dr ON ee.report_id = dr.id
     WHERE ${whereStr}`,
    params
  );

  // Today's Project Progress Matrix
  const todayStr = new Date().toISOString().split('T')[0];
  const projectMatrix = await query(
    `SELECT 
       p.id as project_id,
       p.name as project_name,
       p.code as project_code,
       p.main_contractor,
       dr.id as today_report_id,
       dr.status as today_status,
       dr.reporter_name as today_reporter,
       dr.updated_at as today_updated_at
     FROM projects p
     LEFT JOIN daily_reports dr 
       ON p.id = dr.project_id 
       AND dr.work_date = $2
     WHERE p.organization_id = $1 AND p.status = 'active'
     ORDER BY p.name ASC`,
    [organizationId, todayStr]
  );

  return {
    kpi: {
      totalReports: parseInt(reportsKpi.rows[0]?.total_reports || 0, 10),
      approvedCount: parseInt(reportsKpi.rows[0]?.approved_count || 0, 10),
      submittedCount: parseInt(reportsKpi.rows[0]?.submitted_count || 0, 10),
      returnedCount: parseInt(reportsKpi.rows[0]?.returned_count || 0, 10),
      draftCount: parseInt(reportsKpi.rows[0]?.draft_count || 0, 10),
      totalRegularHours: parseFloat(workforceKpi.rows[0]?.total_regular_hours || 0),
      totalOvertimeHours: parseFloat(workforceKpi.rows[0]?.total_overtime_hours || 0),
      uniqueWorkersCount: parseInt(workforceKpi.rows[0]?.unique_workers_count || 0, 10),
      totalOperatingHours: parseFloat(equipKpi.rows[0]?.total_operating_hours || 0),
      totalDieselLiters: parseFloat(equipKpi.rows[0]?.total_diesel_liters || 0),
      uniqueEquipmentCount: parseInt(equipKpi.rows[0]?.unique_equipment_count || 0, 10),
    },
    todayMatrix: projectMatrix.rows,
  };
}

// -------------------------------------------------------------
// 2. WORKFORCE AGGREGATION & CSV EXPORT
// -------------------------------------------------------------

export async function getWorkforceReport(organizationId: string, filters: FilterOptions = {}) {
  let whereClauses = ['dr.organization_id = $1'];
  let params: any[] = [organizationId];

  if (filters.projectId) {
    params.push(filters.projectId);
    whereClauses.push(`dr.project_id = $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    whereClauses.push(`dr.work_date >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    whereClauses.push(`dr.work_date <= $${params.length}`);
  }

  const whereStr = whereClauses.join(' AND ');

  // Aggregated by worker
  const summaryRes = await query(
    `SELECT 
       rw.name,
       rw.company,
       rw.trade,
       COUNT(DISTINCT dr.work_date) as work_days,
       SUM(rw.work_hours) as total_regular_hours,
       SUM(rw.overtime_hours) as total_overtime_hours,
       SUM(rw.work_hours + rw.overtime_hours) as total_hours
     FROM report_workers rw
     JOIN daily_reports dr ON rw.report_id = dr.id
     WHERE ${whereStr}
     GROUP BY rw.name, rw.company, rw.trade
     ORDER BY rw.company ASC, total_hours DESC`,
    params
  );

  // Detailed rows for export
  const detailsRes = await query(
    `SELECT 
       dr.work_date,
       p.code as project_code,
       p.name as project_name,
       rw.name as worker_name,
       rw.company,
       rw.trade,
       rw.work_hours,
       rw.overtime_hours,
       (rw.work_hours + rw.overtime_hours) as total_hours,
       dr.status as report_status,
       dr.reporter_name
     FROM report_workers rw
     JOIN daily_reports dr ON rw.report_id = dr.id
     JOIN projects p ON dr.project_id = p.id
     WHERE ${whereStr}
     ORDER BY dr.work_date DESC, rw.company ASC, rw.name ASC`,
    params
  );

  return {
    summary: summaryRes.rows,
    details: detailsRes.rows,
  };
}

export function generateWorkforceCsv(rows: any[], meta: ExportMeta = {}): string {
  const headers = [
    '作業年月日',
    '現場管理コード',
    '現場名称',
    '作業員氏名',
    '所属会社(自社/協力会社)',
    '工種・職種',
    '通常現場時間(h)',
    '残業時間(h)',
    '合計就業時間(h)',
    '日報ステータス',
    '記入報告者',
  ];

  let totalReg = 0;
  let totalOt = 0;
  let totalAll = 0;

  const data = rows.map((r) => {
    const reg = Number(r.work_hours ?? 0);
    const ot = Number(r.overtime_hours ?? 0);
    const sum = Number(r.total_hours ?? (reg + ot));
    totalReg += reg;
    totalOt += ot;
    totalAll += sum;

    return [
      typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : new Date(r.work_date).toISOString().substring(0, 10),
      r.project_code || '',
      r.project_name || '',
      r.worker_name || '',
      r.company || '自社',
      r.trade || '',
      reg.toFixed(1),
      ot.toFixed(1),
      sum.toFixed(1),
      r.report_status || '',
      r.reporter_name || '',
    ];
  });

  const summaryRow = [
    '【合計】',
    '',
    '',
    `${rows.length} 名・工数`,
    '',
    '',
    totalReg.toFixed(1),
    totalOt.toFixed(1),
    totalAll.toFixed(1),
    '',
    '',
  ];

  return formatCsvDocument(
    '東京土木建設株式会社 — 現場労務・出役人工集計実績台帳',
    meta,
    headers,
    data,
    summaryRow
  );
}

// -------------------------------------------------------------
// 3. EQUIPMENT & FUEL AGGREGATION & CSV EXPORT
// -------------------------------------------------------------

export async function getEquipmentReport(organizationId: string, filters: FilterOptions = {}) {
  let whereClauses = ['dr.organization_id = $1'];
  let params: any[] = [organizationId];

  if (filters.projectId) {
    params.push(filters.projectId);
    whereClauses.push(`dr.project_id = $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    whereClauses.push(`dr.work_date >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    whereClauses.push(`dr.work_date <= $${params.length}`);
  }

  const whereStr = whereClauses.join(' AND ');

  const summaryRes = await query(
    `SELECT 
       ee.name,
       ee.vendor,
       ee.unit,
       COUNT(*) as deployment_days,
       SUM(COALESCE(ee.operating_hours, 0)) as total_operating_hours,
       SUM(COALESCE(ee.diesel_liters, 0)) as total_diesel_liters
     FROM equipment_entries ee
     JOIN daily_reports dr ON ee.report_id = dr.id
     WHERE ${whereStr}
     GROUP BY ee.name, ee.vendor, ee.unit
     ORDER BY ee.vendor ASC, total_operating_hours DESC`,
    params
  );

  const detailsRes = await query(
    `SELECT 
       dr.work_date,
       p.code as project_code,
       p.name as project_name,
       ee.name as equipment_name,
       ee.vendor,
       ee.quantity,
       ee.unit,
       ee.operating_hours,
       ee.diesel_liters,
       ee.notes,
       dr.status as report_status
     FROM equipment_entries ee
     JOIN daily_reports dr ON ee.report_id = dr.id
     JOIN projects p ON dr.project_id = p.id
     WHERE ${whereStr}
     ORDER BY dr.work_date DESC, ee.name ASC`,
    params
  );

  return {
    summary: summaryRes.rows,
    details: detailsRes.rows,
  };
}

export function generateEquipmentCsv(rows: any[], meta: ExportMeta = {}): string {
  const headers = [
    '作業年月日',
    '現場管理コード',
    '現場名称',
    '重機・車両・工具名称',
    '調達先(自社/リース)',
    '台数/数量',
    '単位',
    '稼働時間(h)',
    '給油軽油(L)',
    '備考・号車',
    '日報ステータス',
  ];

  let totalHours = 0;
  let totalDiesel = 0;

  const data = rows.map((r) => {
    const hours = Number(r.operating_hours ?? 0);
    const diesel = Number(r.diesel_liters ?? 0);
    totalHours += hours;
    totalDiesel += diesel;

    return [
      typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : new Date(r.work_date).toISOString().substring(0, 10),
      r.project_code || '',
      r.project_name || '',
      r.equipment_name || '',
      r.vendor || '自社',
      r.quantity ?? 1,
      r.unit || '台',
      hours.toFixed(1),
      diesel.toFixed(1),
      r.notes || '',
      r.report_status || '',
    ];
  });

  const summaryRow = [
    '【合計】',
    '',
    '',
    `${rows.length} 稼働記録`,
    '',
    '',
    '',
    totalHours.toFixed(1),
    totalDiesel.toFixed(1),
    '',
    '',
  ];

  return formatCsvDocument(
    '東京土木建設株式会社 — 重機稼働・給油軽油集計実績台帳',
    meta,
    headers,
    data,
    summaryRow
  );
}

// -------------------------------------------------------------
// 4. WORK ITEMS (DEKIDAKA) AGGREGATION & CSV EXPORT
// -------------------------------------------------------------

export async function getWorkItemsReport(organizationId: string, filters: FilterOptions = {}) {
  let whereClauses = ['dr.organization_id = $1'];
  let params: any[] = [organizationId];

  if (filters.projectId) {
    params.push(filters.projectId);
    whereClauses.push(`dr.project_id = $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    whereClauses.push(`dr.work_date >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    whereClauses.push(`dr.work_date <= $${params.length}`);
  }

  const whereStr = whereClauses.join(' AND ');

  const summaryRes = await query(
    `SELECT 
       wi.work_type,
       wi.unit,
       SUM(wi.quantity) as total_quantity,
       COUNT(*) as entry_count
     FROM work_items wi
     JOIN daily_reports dr ON wi.report_id = dr.id
     WHERE ${whereStr}
     GROUP BY wi.work_type, wi.unit
     ORDER BY total_quantity DESC`,
    params
  );

  const detailsRes = await query(
    `SELECT 
       dr.work_date,
       p.code as project_code,
       p.name as project_name,
       wi.work_type,
       wi.description,
       wi.location_sta,
       wi.quantity,
       wi.unit,
       dr.status as report_status
     FROM work_items wi
     JOIN daily_reports dr ON wi.report_id = dr.id
     JOIN projects p ON dr.project_id = p.id
     WHERE ${whereStr}
     ORDER BY dr.work_date DESC, wi.work_type ASC`,
    params
  );

  return {
    summary: summaryRes.rows,
    details: detailsRes.rows,
  };
}

export function generateWorkItemsCsv(rows: any[], meta: ExportMeta = {}): string {
  const headers = [
    '作業年月日',
    '現場管理コード',
    '現場名称',
    '工種',
    '作業内容・細別',
    '施工箇所/STA',
    '出来高数量',
    '単位',
    '日報ステータス',
  ];

  let totalQty = 0;

  const data = rows.map((r) => {
    const qty = Number(r.quantity ?? 0);
    totalQty += qty;

    return [
      typeof r.work_date === 'string' ? r.work_date.substring(0, 10) : new Date(r.work_date).toISOString().substring(0, 10),
      r.project_code || '',
      r.project_name || '',
      r.work_type || '',
      r.description || '',
      r.location_sta || '',
      qty.toFixed(2),
      r.unit || '',
      r.report_status || '',
    ];
  });

  const summaryRow = [
    '【合計】',
    '',
    '',
    `${rows.length} 施工記録`,
    '',
    '',
    totalQty.toFixed(2),
    '',
    '',
  ];

  return formatCsvDocument(
    '東京土木建設株式会社 — 工種別出来高施工記録集計台帳',
    meta,
    headers,
    data,
    summaryRow
  );
}
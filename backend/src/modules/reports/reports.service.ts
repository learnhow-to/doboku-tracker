import crypto from 'crypto';
import { query } from '../../config/database.js';
import { logAuditEvent } from '../audit/audit.service.js';
import { DailyReport, ReportStatus, ReportWorker, WorkItem, EquipmentEntry, MaterialEntry, KYRecord, AuthenticatedUser } from '../../types/index.js';

export interface CreateReportInput {
  projectId: string;
  workDate: string; // YYYY-MM-DD
  weather: string;
  siteStartTime?: string;
  siteEndTime?: string;
  breakMinutes?: number;
  handoverNotes?: string;
  workers?: Omit<ReportWorker, 'id' | 'reportId'>[];
  workItems?: Omit<WorkItem, 'id' | 'reportId'>[];
  equipment?: Omit<EquipmentEntry, 'id' | 'reportId'>[];
  materials?: Omit<MaterialEntry, 'id' | 'reportId'>[];
  ky?: Omit<KYRecord, 'id' | 'reportId'>;
}

export interface UpdateReportInput {
  version: number;
  weather?: string;
  siteStartTime?: string;
  siteEndTime?: string;
  breakMinutes?: number;
  handoverNotes?: string;
  workers?: Omit<ReportWorker, 'id' | 'reportId'>[];
  workItems?: Omit<WorkItem, 'id' | 'reportId'>[];
  equipment?: Omit<EquipmentEntry, 'id' | 'reportId'>[];
  materials?: Omit<MaterialEntry, 'id' | 'reportId'>[];
  ky?: Omit<KYRecord, 'id' | 'reportId'>;
}

export class ReportConflictError extends Error {
  statusCode = 409;
  currentServerData: any;
  constructor(message: string, currentServerData: any) {
    super(message);
    this.name = 'ReportConflictError';
    this.currentServerData = currentServerData;
  }
}

export class ValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function getFullReport(reportId: string, user: AuthenticatedUser) {
  const repRes = await query(`SELECT r.*, p.name as project_name, p.main_contractor FROM daily_reports r JOIN projects p ON r.project_id = p.id WHERE r.id = $1`, [reportId]);
  if (repRes.rows.length === 0) return null;

  const report = repRes.rows[0];

  // Verify tenant isolation
  if (report.organization_id !== user.organizationId) {
    throw new ForbiddenError('Forbidden: Report belongs to another organization');
  }

  // Verify project assignment
  if (user.orgRole !== 'admin' && !user.projectRoles[report.project_id]) {
    throw new ForbiddenError('Forbidden: Not assigned to this project');
  }

  const [workersRes, workItemsRes, equipRes, matRes, kyRes, photosRes, revisionsRes] = await Promise.all([
    query(`SELECT * FROM report_workers WHERE report_id = $1 ORDER BY created_at ASC`, [reportId]),
    query(`SELECT * FROM work_items WHERE report_id = $1 ORDER BY created_at ASC`, [reportId]),
    query(`SELECT * FROM equipment_entries WHERE report_id = $1 ORDER BY created_at ASC`, [reportId]),
    query(`SELECT * FROM material_entries WHERE report_id = $1 ORDER BY created_at ASC`, [reportId]),
    query(`SELECT * FROM ky_records WHERE report_id = $1 LIMIT 1`, [reportId]),
    query(`SELECT * FROM photos WHERE report_id = $1 ORDER BY created_at ASC`, [reportId]),
    query(`SELECT * FROM report_revisions WHERE report_id = $1 ORDER BY revision_number DESC`, [reportId]),
  ]);

  return {
    ...report,
    workers: workersRes.rows,
    workItems: workItemsRes.rows,
    equipment: equipRes.rows,
    materials: matRes.rows,
    ky: kyRes.rows[0] || null,
    photos: photosRes.rows,
    revisions: revisionsRes.rows,
  };
}

export async function createReportDraft(input: CreateReportInput, user: AuthenticatedUser) {
  // Check project membership
  if (user.orgRole !== 'admin' && !user.projectRoles[input.projectId]) {
    throw new ForbiddenError('You are not assigned to this project');
  }

  // Check duplication policy (1 report per project/work_date/reporter)
  const existing = await query(
    `SELECT id, status FROM daily_reports WHERE project_id = $1 AND work_date = $2 AND reporter_id = $3`,
    [input.projectId, input.workDate, user.id]
  );

  if (existing.rows.length > 0) {
    throw new ValidationError(`Laporan untuk tanggal ${input.workDate} pada proyek ini sudah ada.`);
  }

  const reportId = crypto.randomUUID();

  await query(
    `INSERT INTO daily_reports (
      id, project_id, organization_id, work_date, weather, reporter_id, reporter_name,
      status, version, site_start_time, site_end_time, break_minutes, handover_notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', 1, $8, $9, $10, $11)`,
    [
      reportId,
      input.projectId,
      user.organizationId,
      input.workDate,
      input.weather || '晴',
      user.id,
      user.displayName,
      input.siteStartTime || '08:00',
      input.siteEndTime || '17:00',
      input.breakMinutes ?? 60,
      input.handoverNotes || '',
    ]
  );

  // Insert initial workers if provided
  if (input.workers && input.workers.length > 0) {
    for (const w of input.workers) {
      await query(
        `INSERT INTO report_workers (id, report_id, name, company, trade, work_hours, overtime_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [crypto.randomUUID(), reportId, w.name, w.company || '自社', w.trade || '普通作業員', w.workHours ?? 8, w.overtimeHours ?? 0]
      );
    }
  }

  // Insert work items if provided
  if (input.workItems && input.workItems.length > 0) {
    for (const wi of input.workItems) {
      await query(
        `INSERT INTO work_items (id, report_id, work_type, description, location_sta, quantity, unit, calculation_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [crypto.randomUUID(), reportId, wi.workType, wi.description, wi.locationSta || null, wi.quantity ?? 0, wi.unit, wi.calculationDetails ? JSON.stringify(wi.calculationDetails) : null]
      );
    }
  }

  // Insert equipment if provided
  if (input.equipment && input.equipment.length > 0) {
    for (const eq of input.equipment) {
      await query(
        `INSERT INTO equipment_entries (id, report_id, name, vendor, quantity, unit, operating_hours, diesel_liters, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), reportId, eq.name, eq.vendor || '自社', eq.quantity ?? 1, eq.unit || '台', eq.operatingHours || null, eq.dieselLiters || null, eq.notes || null]
      );
    }
  }

  // Insert materials if provided
  if (input.materials && input.materials.length > 0) {
    for (const mat of input.materials) {
      await query(
        `INSERT INTO material_entries (id, report_id, name, vendor, quantity, unit, is_purchased, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [crypto.randomUUID(), reportId, mat.name, mat.vendor || '自社', mat.quantity ?? 0, mat.unit || '袋', mat.isPurchased ?? false, mat.notes || null]
      );
    }
  }

  // Insert KY if provided
  if (input.ky) {
    await query(
      `INSERT INTO ky_records (id, report_id, meeting_time, attendees_count, specific_hazards, countermeasures, supervisor_name, is_checked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [crypto.randomUUID(), reportId, input.ky.meetingTime || '08:00', input.ky.attendeesCount || 0, input.ky.specificHazards || '', input.ky.countermeasures || '', input.ky.supervisorName || user.displayName, input.ky.isChecked ?? false]
    );
  }

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'REPORT_CREATED',
    entityType: 'daily_report',
    entityId: reportId,
    payload: { projectId: input.projectId, workDate: input.workDate },
  });

  return getFullReport(reportId, user);
}

export async function updateReport(reportId: string, input: UpdateReportInput, user: AuthenticatedUser) {
  const current = await getFullReport(reportId, user);
  if (!current) throw new ValidationError('Report not found');

  if (current.status === 'APPROVED') {
    throw new ForbiddenError('Laporan sudah disetujui (APPROVED) dan tidak dapat diubah secara langsung. Buat revisi koreksi ber-snapshot.');
  }

  // Optimistic Concurrency Control: verify version matches
  if (current.version !== input.version) {
    throw new ReportConflictError(
      `Konflik versi: Versi laporan di server adalah ${current.version}, tetapi permintaan Anda berbasis versi ${input.version}.`,
      current
    );
  }

  // Only author, foreman, or admin can edit DRAFT / RETURNED
  const isAuthor = current.reporter_id === user.id;
  const isPrivileged = user.orgRole === 'admin' || user.projectRoles[current.project_id] === 'foreman';
  if (!isAuthor && !isPrivileged) {
    throw new ForbiddenError('Anda tidak memiliki izin untuk mengedit laporan ini.');
  }

  const newVersion = current.version + 1;

  await query(
    `UPDATE daily_reports SET
      weather = COALESCE($1, weather),
      site_start_time = COALESCE($2, site_start_time),
      site_end_time = COALESCE($3, site_end_time),
      break_minutes = COALESCE($4, break_minutes),
      handover_notes = COALESCE($5, handover_notes),
      version = $6,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [input.weather, input.siteStartTime, input.siteEndTime, input.breakMinutes, input.handoverNotes, newVersion, reportId]
  );

  // Update workers if supplied
  if (input.workers) {
    await query(`DELETE FROM report_workers WHERE report_id = $1`, [reportId]);
    for (const w of input.workers) {
      if (w.workHours < 0 || w.overtimeHours < 0) {
        throw new ValidationError('Jam kerja atau lembur tidak boleh bernilai negatif');
      }
      await query(
        `INSERT INTO report_workers (id, report_id, name, company, trade, work_hours, overtime_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [crypto.randomUUID(), reportId, w.name, w.company || '自社', w.trade || '普通作業員', w.workHours, w.overtimeHours]
      );
    }
  }

  // Update work items if supplied
  if (input.workItems) {
    await query(`DELETE FROM work_items WHERE report_id = $1`, [reportId]);
    for (const wi of input.workItems) {
      if (wi.quantity < 0) throw new ValidationError('Kuantitas tidak boleh bernilai negatif');
      if (!wi.unit || wi.unit.trim() === '') throw new ValidationError('Unit/satuan pekerjaan wajib diisi');
      await query(
        `INSERT INTO work_items (id, report_id, work_type, description, location_sta, quantity, unit, calculation_details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [crypto.randomUUID(), reportId, wi.workType, wi.description, wi.locationSta || null, wi.quantity, wi.unit, wi.calculationDetails ? JSON.stringify(wi.calculationDetails) : null]
      );
    }
  }

  // Update equipment if supplied
  if (input.equipment) {
    await query(`DELETE FROM equipment_entries WHERE report_id = $1`, [reportId]);
    for (const eq of input.equipment) {
      await query(
        `INSERT INTO equipment_entries (id, report_id, name, vendor, quantity, unit, operating_hours, diesel_liters, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), reportId, eq.name, eq.vendor || '自社', eq.quantity, eq.unit || '台', eq.operatingHours || null, eq.dieselLiters || null, eq.notes || null]
      );
    }
  }

  // Update materials if supplied
  if (input.materials) {
    await query(`DELETE FROM material_entries WHERE report_id = $1`, [reportId]);
    for (const mat of input.materials) {
      await query(
        `INSERT INTO material_entries (id, report_id, name, vendor, quantity, unit, is_purchased, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [crypto.randomUUID(), reportId, mat.name, mat.vendor || '自社', mat.quantity, mat.unit, mat.isPurchased ?? false, mat.notes || null]
      );
    }
  }

  // Update KY if supplied
  if (input.ky) {
    await query(`DELETE FROM ky_records WHERE report_id = $1`, [reportId]);
    await query(
      `INSERT INTO ky_records (id, report_id, meeting_time, attendees_count, specific_hazards, countermeasures, supervisor_name, is_checked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [crypto.randomUUID(), reportId, input.ky.meetingTime || '08:00', input.ky.attendeesCount || 0, input.ky.specificHazards || '', input.ky.countermeasures || '', input.ky.supervisorName || user.displayName, input.ky.isChecked ?? false]
    );
  }

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'REPORT_UPDATED',
    entityType: 'daily_report',
    entityId: reportId,
    payload: { newVersion },
  });

  return getFullReport(reportId, user);
}

export async function submitReport(reportId: string, user: AuthenticatedUser) {
  const current = await getFullReport(reportId, user);
  if (!current) throw new ValidationError('Report not found');

  if (current.status !== 'DRAFT' && current.status !== 'RETURNED') {
    throw new ValidationError(`Hanya laporan DRAFT atau RETURNED yang dapat diajukan (status saat ini: ${current.status}).`);
  }

  // Validate minimum completeness
  if (!current.weather) throw new ValidationError('Cuaca wajib diisi sebelum mengirim laporan.');
  if (!current.workers || current.workers.length === 0) {
    throw new ValidationError('Daftar pekerja lapangan (現場作業員) minimal 1 orang harus dicatat.');
  }
  if (!current.workItems || current.workItems.length === 0) {
    throw new ValidationError('Minimal 1 rincian pekerjaan (作業内容) harus dicatat.');
  }

  await query(
    `UPDATE daily_reports SET status = 'SUBMITTED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [reportId]
  );

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'REPORT_SUBMITTED',
    entityType: 'daily_report',
    entityId: reportId,
  });

  return getFullReport(reportId, user);
}

export async function reviewReport(
  reportId: string,
  action: 'return' | 'approve',
  reason: string | undefined,
  user: AuthenticatedUser
) {
  const current = await getFullReport(reportId, user);
  if (!current) throw new ValidationError('Report not found');

  if (current.status !== 'SUBMITTED') {
    throw new ValidationError(`Hanya laporan berstatus SUBMITTED yang dapat ditinjau (status saat ini: ${current.status}).`);
  }

  // Authorization check: Only foreman, office, or admin
  const isForeman = user.projectRoles[current.project_id] === 'foreman';
  const isOffice = user.orgRole === 'office' || user.projectRoles[current.project_id] === 'office';
  const isAdmin = user.orgRole === 'admin';

  if (!isForeman && !isOffice && !isAdmin) {
    throw new ForbiddenError('Pekerja biasa (worker) tidak memiliki kewenangan untuk mereview atau menyetujui laporan.');
  }

  if (action === 'return') {
    if (!reason || reason.trim() === '') {
      throw new ValidationError('Alasan pengembalian (rejection_reason) wajib disertakan agar dapat diperbaiki.');
    }

    await query(
      `UPDATE daily_reports SET status = 'RETURNED', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [reason, reportId]
    );

    await logAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'REPORT_RETURNED',
      entityType: 'daily_report',
      entityId: reportId,
      payload: { reason },
    });
  } else if (action === 'approve') {
    // Separation of duties check: default policy requires approver !== reporter
    if (current.reporter_id === user.id) {
      throw new ForbiddenError(
        'Kebijakan perusahaan (Separation of Duties): Pembuat laporan tidak boleh menyetujui laporannya sendiri.'
      );
    }

    await query(
      `UPDATE daily_reports SET status = 'APPROVED', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [user.id, reportId]
    );

    // Create immutable snapshot in report_revisions
    const revisionNumber = (current.revisions?.length || 0) + 1;
    const snapshot = {
      reportId: current.id,
      projectId: current.project_id,
      projectName: current.project_name,
      mainContractor: current.main_contractor,
      workDate: current.work_date,
      weather: current.weather,
      reporterId: current.reporter_id,
      reporterName: current.reporter_name,
      siteStartTime: current.site_start_time,
      siteEndTime: current.site_end_time,
      breakMinutes: current.break_minutes,
      handoverNotes: current.handover_notes,
      approvedBy: user.displayName,
      approvedAt: new Date().toISOString(),
      workers: current.workers,
      workItems: current.workItems,
      equipment: current.equipment,
      materials: current.materials,
      ky: current.ky,
      photosCount: current.photos?.length || 0,
    };

    await query(
      `INSERT INTO report_revisions (id, report_id, revision_number, status, snapshot_json, changed_by, reason)
       VALUES ($1, $2, $3, 'APPROVED', $4, $5, $6)`,
      [crypto.randomUUID(), reportId, revisionNumber, JSON.stringify(snapshot), user.id, reason || 'Persetujuan resmi laporan']
    );

    await logAuditEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      action: 'REPORT_APPROVED',
      entityType: 'daily_report',
      entityId: reportId,
      payload: { revisionNumber },
    });
  }

  return getFullReport(reportId, user);
}

export async function createCorrectionRevision(
  reportId: string,
  reason: string,
  user: AuthenticatedUser
) {
  const current = await getFullReport(reportId, user);
  if (!current) throw new ValidationError('Report not found');

  if (current.status !== 'APPROVED') {
    throw new ValidationError('Koreksi revisi ber-snapshot hanya untuk laporan yang sudah APPROVED.');
  }

  if (!reason || reason.trim() === '') {
    throw new ValidationError('Alasan koreksi revisi wajib dicatat untuk audit trail.');
  }

  // Create new draft revision from current snapshot
  const nextVersion = current.version + 1;

  await query(
    `UPDATE daily_reports SET status = 'DRAFT', version = $1, rejection_reason = NULL, approved_by = NULL, approved_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [nextVersion, reportId]
  );

  await logAuditEvent({
    organizationId: user.organizationId,
    actorId: user.id,
    action: 'REPORT_CORRECTION_OPENED',
    entityType: 'daily_report',
    entityId: reportId,
    payload: { reason, previousVersion: current.version, nextVersion },
  });

  return getFullReport(reportId, user);
}

export async function listReports(projectId: string, user: AuthenticatedUser) {
  // Check project membership
  if (user.orgRole !== 'admin' && !user.projectRoles[projectId]) {
    throw new ForbiddenError('You are not assigned to this project');
  }

  const res = await query(
    `SELECT r.*, p.name as project_name, p.main_contractor,
      (SELECT COUNT(*) FROM report_workers WHERE report_id = r.id) as worker_count,
      (SELECT COUNT(*) FROM photos WHERE report_id = r.id) as photo_count
     FROM daily_reports r
     JOIN projects p ON r.project_id = p.id
     WHERE r.project_id = $1 AND r.organization_id = $2
     ORDER BY r.work_date DESC, r.created_at DESC`,
    [projectId, user.organizationId]
  );

  return res.rows;
}

export async function getLatestPreviousReport(projectId: string, beforeDate: string, user: AuthenticatedUser) {
  if (user.orgRole !== 'admin' && !user.projectRoles[projectId]) {
    throw new ForbiddenError('You are not assigned to this project');
  }

  const res = await query(
    `SELECT id FROM daily_reports
     WHERE project_id = $1 AND organization_id = $2 AND work_date < $3
     ORDER BY work_date DESC, created_at DESC
     LIMIT 1`,
    [projectId, user.organizationId, beforeDate]
  );

  if (res.rows.length === 0) {
    return null;
  }

  return getFullReport(res.rows[0].id, user);
}

export async function getMonthlyMatrix(projectId: string, yearMonth: string, user: AuthenticatedUser) {
  if (user.orgRole !== 'admin' && !user.projectRoles[projectId]) {
    throw new ForbiddenError('You are not assigned to this project');
  }

  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  const res = await query(
    `SELECT r.id, r.work_date, r.status, r.reporter_name, r.version,
      (SELECT COUNT(*) FROM report_workers WHERE report_id = r.id) as worker_count,
      (SELECT COUNT(*) FROM equipment_entries WHERE report_id = r.id) as equipment_count
     FROM daily_reports r
     WHERE r.project_id = $1 AND r.organization_id = $2
       AND r.work_date >= $3 AND r.work_date <= $4
     ORDER BY r.work_date ASC`,
    [projectId, user.organizationId, startDate, endDate]
  );

  return {
    yearMonth,
    startDate,
    endDate,
    lastDay,
    reports: res.rows,
  };
}

export async function batchApproveReports(reportIds: string[], user: AuthenticatedUser) {
  const isAuthorized = user.orgRole === 'admin' || user.orgRole === 'office';
  if (!isAuthorized) {
    // Check if user has foreman role in all projects of the reports
    const repProjects = await query(
      `SELECT DISTINCT project_id FROM daily_reports WHERE id = ANY($1) AND organization_id = $2`,
      [reportIds, user.organizationId]
    );
    const allForeman = repProjects.rows.every(r => user.projectRoles[r.project_id] === 'foreman');
    if (!allForeman) {
      throw new ForbiddenError('Hanya Admin, Office, atau Foreman yang berwenang menyetujui laporan sekaligus.');
    }
  }

  let approvedCount = 0;
  const errors: { id: string; message: string }[] = [];

  for (const reportId of reportIds) {
    try {
      await reviewReport(reportId, 'approve', '一括承認 (Batch Approval)', user);
      approvedCount++;
    } catch (err: any) {
      errors.push({ id: reportId, message: err.message || 'Gagal menyetujui laporan' });
    }
  }

  return {
    totalRequested: reportIds.length,
    approvedCount,
    failedCount: errors.length,
    errors,
  };
}

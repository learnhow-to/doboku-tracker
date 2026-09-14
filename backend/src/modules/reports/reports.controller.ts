import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authenticate } from '../../middlewares/auth.js';
import * as reportsService from './reports.service.js';
import * as csvService from '../export/csv.service.js';
import * as excelService from '../export/excel.service.js';
import { generateNippouHtml } from '../export/pdf.service.js';
import { query } from '../../config/database.js';

const router = Router();

router.use(authenticate);

// Get latest previous report for copying
router.get('/project/:projectId/latest-previous', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const beforeDate = (req.query.beforeDate as string) || new Date().toISOString().split('T')[0];
    const report = await reportsService.getLatestPreviousReport(req.params.projectId, beforeDate, req.user!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Monthly report matrix for calendar view
router.get('/project/:projectId/monthly-matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const yearMonth = (req.query.yearMonth as string) || new Date().toISOString().substring(0, 7);
    const matrix = await reportsService.getMonthlyMatrix(req.params.projectId, yearMonth, req.user!);
    res.json(matrix);
  } catch (err) {
    next(err);
  }
});

// List reports in project
router.get('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reports = await reportsService.listReports(req.params.projectId, req.user!);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

// Analytics KPI Summary
router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const summary = await csvService.getAnalyticsSummary(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// Workforce Summary & CSV Export
router.get('/export/summary/workforce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getWorkforceReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

async function getProjectName(projectId: any, organizationId: string): Promise<string> {
  if (!projectId) return '【全社・全現場】';
  const pRes = await query('SELECT name FROM projects WHERE id = $1 AND organization_id = $2', [projectId, organizationId]);
  if (pRes.rows.length > 0) return pRes.rows[0].name;
  return '【全社・全現場】';
}

router.get('/export/csv/workforce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getWorkforceReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const projectName = await getProjectName(projectId, req.user!.organizationId);
    const csv = csvService.generateWorkforceCsv(data.details, {
      projectName,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `workforce_report_${new Date().toISOString().substring(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/export/excel/workforce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getWorkforceReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const projectName = await getProjectName(projectId, req.user!.organizationId);
    const buffer = await excelService.generateWorkforceExcel(data.details, {
      projectName,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `workforce_report_${new Date().toISOString().substring(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// Equipment Summary & CSV/Excel Export
router.get('/export/summary/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getEquipmentReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/export/csv/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getEquipmentReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const projectName = await getProjectName(projectId, req.user!.organizationId);
    const csv = csvService.generateEquipmentCsv(data.details, {
      projectName,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `equipment_fuel_report_${new Date().toISOString().substring(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/export/excel/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getEquipmentReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const projectName = await getProjectName(projectId, req.user!.organizationId);
    const buffer = await excelService.generateEquipmentExcel(data.details, {
      projectName,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `equipment_fuel_report_${new Date().toISOString().substring(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// Work Items (Dekidaka) Summary & CSV/Excel Export
router.get('/export/summary/work-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getWorkItemsReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/export/csv/work-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getWorkItemsReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const projectName = await getProjectName(projectId, req.user!.organizationId);
    const csv = csvService.generateWorkItemsCsv(data.details, {
      projectName,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `dekidaka_volume_report_${new Date().toISOString().substring(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/export/excel/work-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const data = await csvService.getWorkItemsReport(req.user!.organizationId, {
      projectId: projectId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const projectName = await getProjectName(projectId, req.user!.organizationId);
    const buffer = await excelService.generateWorkItemsExcel(data.details, {
      projectName,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    const filename = `dekidaka_volume_report_${new Date().toISOString().substring(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// Get full report
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportsService.getFullReport(req.params.id, req.user!);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Batch Approve Multiple Reports
router.post('/batch-approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reportIds } = req.body;
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      res.status(400).json({ error: 'reportIds must be a non-empty array of report IDs' });
      return;
    }
    const result = await reportsService.batchApproveReports(reportIds, req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Create report draft (with Idempotency support)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

  try {
    if (idempotencyKey) {
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(req.body)).digest('hex');
      const existingOp = await query(
        `SELECT * FROM sync_operations WHERE idempotency_key = $1`,
        [idempotencyKey]
      );

      if (existingOp.rows.length > 0) {
        const op = existingOp.rows[0];
        if (op.payload_hash !== payloadHash) {
          res.status(400).json({ error: 'Idempotency key conflict: Key used with differing payload' });
          return;
        }
        // Identical retry -> return cached response
        res.status(200).json(op.response_json);
        return;
      }

      const report = await reportsService.createReportDraft(req.body, req.user!);

      await query(
        `INSERT INTO sync_operations (id, idempotency_key, user_id, operation_name, payload_hash, status, response_json)
         VALUES ($1, $2, $3, 'CREATE_REPORT', $4, 'PROCESSED', $5)`,
        [crypto.randomUUID(), idempotencyKey, req.user!.id, payloadHash, JSON.stringify(report)]
      );

      res.status(201).json(report);
      return;
    }

    const report = await reportsService.createReportDraft(req.body, req.user!);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

// Update report draft
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await reportsService.updateReport(req.params.id, req.body, req.user!);
    res.json(updated);
  } catch (err: any) {
    if (err.name === 'ReportConflictError') {
      res.status(409).json({
        error: err.message,
        currentServerData: err.currentServerData,
      });
      return;
    }
    next(err);
  }
});

// Submit report
router.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await reportsService.submitReport(req.params.id, req.user!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Review report (return or approve)
router.post('/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, reason } = req.body;
    if (!action || (action !== 'return' && action !== 'approve')) {
      res.status(400).json({ error: 'Action must be "return" or "approve"' });
      return;
    }
    const report = await reportsService.reviewReport(req.params.id, action, reason, req.user!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Open correction revision for APPROVED report
router.post('/:id/correction', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const report = await reportsService.createCorrectionRevision(req.params.id, reason, req.user!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

// Export Japanese A4 Template
router.get('/:id/export/html', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await generateNippouHtml(req.params.id, req.user!);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

export default router;

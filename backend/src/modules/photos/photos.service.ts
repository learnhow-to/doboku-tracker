import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query } from '../../config/database.js';
import { config } from '../../config/env.js';
import { AuthenticatedUser, PhotoStage } from '../../types/index.js';
import { getFullReport } from '../reports/reports.service.js';

// Ensure local upload dir exists if using local storage driver
if (config.storage.driver === 'local') {
  const dir = path.resolve(config.storage.localDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export interface SavePhotoParams {
  reportId: string;
  projectId: string;
  stage: PhotoStage;
  locationSta?: string;
  workType?: string;
  caption?: string;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
}

export async function savePhoto(params: SavePhotoParams, user: AuthenticatedUser) {
  // Verify access to report & project
  const report = await getFullReport(params.reportId, user);
  if (!report) throw new Error('Report not found or forbidden');

  // Verify project assignment
  if (report.project_id !== params.projectId) {
    throw new Error('Project ID mismatch with report');
  }

  // Calculate SHA-256 hash
  const fileHash = crypto.createHash('sha256').update(params.fileBuffer).digest('hex');
  const fileSize = params.fileBuffer.length;

  // Generate safe filename to prevent path traversal
  const ext = path.extname(params.originalName).toLowerCase() || '.jpg';
  const safeFileName = `${fileHash}_${Date.now()}${ext}`;
  const storagePath = path.join(config.storage.localDir, safeFileName);

  // Write file to local disk (or upload to Supabase storage if enabled)
  fs.writeFileSync(storagePath, params.fileBuffer);

  const photoId = crypto.randomUUID();

  await query(
    `INSERT INTO photos (
      id, report_id, project_id, file_name, file_path, file_hash, file_size,
      mime_type, stage, location_sta, work_type, caption, uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      photoId,
      params.reportId,
      params.projectId,
      params.originalName,
      safeFileName,
      fileHash,
      fileSize,
      params.mimeType,
      params.stage,
      params.locationSta || null,
      params.workType || null,
      params.caption || null,
      user.id,
    ]
  );

  const res = await query(`SELECT * FROM photos WHERE id = $1`, [photoId]);
  return res.rows[0];
}

export async function getPhotoForDownload(photoId: string, user: AuthenticatedUser) {
  const res = await query(
    `SELECT p.*, r.organization_id FROM photos p
     JOIN daily_reports r ON p.report_id = r.id
     WHERE p.id = $1`,
    [photoId]
  );

  if (res.rows.length === 0) return null;
  const photo = res.rows[0];

  // Verify organization isolation
  if (photo.organization_id !== user.organizationId) {
    throw new Error('Forbidden: Photo belongs to another organization');
  }

  // Verify project assignment
  if (user.orgRole !== 'admin' && !user.projectRoles[photo.project_id]) {
    throw new Error('Forbidden: You are not assigned to this project');
  }

  const filePath = path.resolve(config.storage.localDir, photo.file_path);
  if (!fs.existsSync(filePath)) {
    throw new Error('Photo file not found on disk');
  }

  return {
    photo,
    filePath,
  };
}

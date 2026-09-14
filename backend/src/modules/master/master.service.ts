import { query } from '../../config/database.js';
import { AuthenticatedUser } from '../../types/index.js';
import crypto from 'crypto';

export class ForbiddenError extends Error {
  statusCode = 403;
}

export class NotFoundError extends Error {
  statusCode = 404;
}

// -------------------------------------------------------------
// MASTER WORKERS
// -------------------------------------------------------------

export async function getMasterWorkers(user: AuthenticatedUser, includeInactive = false) {
  const filterClause = includeInactive && user.orgRole === 'admin' ? '' : 'AND is_active = true';
  const res = await query(
    `SELECT * FROM master_workers 
     WHERE organization_id = $1 ${filterClause} 
     ORDER BY company ASC, name ASC`,
    [user.organizationId]
  );
  return res.rows;
}

export async function createMasterWorker(
  data: {
    name: string;
    company?: string;
    trade: string;
    default_work_hours?: number;
    phone?: string;
  },
  user: AuthenticatedUser
) {
  if (user.orgRole !== 'admin') {
    throw new ForbiddenError('Hanya admin yang berwenang menambah data master pekerja.');
  }

  if (!data.name || !data.trade) {
    throw new Error('Nama pekerja dan spesialisasi (trade) wajib diisi.');
  }

  const id = `mw-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const res = await query(
    `INSERT INTO master_workers (id, organization_id, name, company, trade, default_work_hours, phone, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      id,
      user.organizationId,
      data.name.trim(),
      (data.company || '自社').trim(),
      data.trade.trim(),
      data.default_work_hours ?? 8.0,
      data.phone?.trim() || null,
    ]
  );

  return res.rows[0];
}

export async function updateMasterWorker(
  id: string,
  data: Partial<{
    name: string;
    company: string;
    trade: string;
    default_work_hours: number;
    phone: string;
    is_active: boolean;
  }>,
  user: AuthenticatedUser
) {
  if (user.orgRole !== 'admin') {
    throw new ForbiddenError('Hanya admin yang berwenang mengubah data master pekerja.');
  }

  // Ensure exists and belongs to tenant
  const existing = await query(
    `SELECT * FROM master_workers WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId]
  );
  if (existing.rows.length === 0) {
    throw new NotFoundError('Data pekerja tidak ditemukan.');
  }

  const current = existing.rows[0];
  const updatedName = data.name !== undefined ? data.name.trim() : current.name;
  const updatedCompany = data.company !== undefined ? data.company.trim() : current.company;
  const updatedTrade = data.trade !== undefined ? data.trade.trim() : current.trade;
  const updatedHours = data.default_work_hours !== undefined ? data.default_work_hours : current.default_work_hours;
  const updatedPhone = data.phone !== undefined ? data.phone.trim() : current.phone;
  const updatedActive = data.is_active !== undefined ? data.is_active : current.is_active;

  const res = await query(
    `UPDATE master_workers
     SET name = $1, company = $2, trade = $3, default_work_hours = $4, phone = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7 AND organization_id = $8
     RETURNING *`,
    [
      updatedName,
      updatedCompany,
      updatedTrade,
      updatedHours,
      updatedPhone,
      updatedActive,
      id,
      user.organizationId,
    ]
  );

  return res.rows[0];
}

export async function deleteMasterWorker(id: string, user: AuthenticatedUser) {
  if (user.orgRole !== 'admin') {
    throw new ForbiddenError('Hanya admin yang berwenang menghapus data master pekerja.');
  }

  // Safe soft delete
  const res = await query(
    `UPDATE master_workers SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, user.organizationId]
  );

  if (res.rows.length === 0) {
    throw new NotFoundError('Data pekerja tidak ditemukan.');
  }

  return { success: true, message: 'Pekerja dinonaktifkan dari master.' };
}

// -------------------------------------------------------------
// MASTER EQUIPMENT
// -------------------------------------------------------------

export async function getMasterEquipment(user: AuthenticatedUser, includeInactive = false) {
  const filterClause = includeInactive && user.orgRole === 'admin' ? '' : 'AND is_active = true';
  const res = await query(
    `SELECT * FROM master_equipment 
     WHERE organization_id = $1 ${filterClause} 
     ORDER BY category ASC, name ASC`,
    [user.organizationId]
  );
  return res.rows;
}

export async function createMasterEquipment(
  data: {
    name: string;
    code_number?: string;
    category?: string;
    vendor?: string;
    unit?: string;
  },
  user: AuthenticatedUser
) {
  if (user.orgRole !== 'admin') {
    throw new ForbiddenError('Hanya admin yang berwenang menambah master alat berat.');
  }

  if (!data.name) {
    throw new Error('Nama unit/alat berat wajib diisi.');
  }

  const id = `me-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const res = await query(
    `INSERT INTO master_equipment (id, organization_id, name, code_number, category, vendor, unit, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)
     RETURNING *`,
    [
      id,
      user.organizationId,
      data.name.trim(),
      data.code_number?.trim() || null,
      data.category?.trim() || 'heavy_machinery',
      (data.vendor || '自社').trim(),
      data.unit?.trim() || '台',
    ]
  );

  return res.rows[0];
}

export async function updateMasterEquipment(
  id: string,
  data: Partial<{
    name: string;
    code_number: string;
    category: string;
    vendor: string;
    unit: string;
    is_active: boolean;
  }>,
  user: AuthenticatedUser
) {
  if (user.orgRole !== 'admin') {
    throw new ForbiddenError('Hanya admin yang berwenang mengubah master alat berat.');
  }

  const existing = await query(
    `SELECT * FROM master_equipment WHERE id = $1 AND organization_id = $2`,
    [id, user.organizationId]
  );
  if (existing.rows.length === 0) {
    throw new NotFoundError('Data alat berat tidak ditemukan.');
  }

  const current = existing.rows[0];
  const updatedName = data.name !== undefined ? data.name.trim() : current.name;
  const updatedCode = data.code_number !== undefined ? data.code_number.trim() : current.code_number;
  const updatedCat = data.category !== undefined ? data.category.trim() : current.category;
  const updatedVendor = data.vendor !== undefined ? data.vendor.trim() : current.vendor;
  const updatedUnit = data.unit !== undefined ? data.unit.trim() : current.unit;
  const updatedActive = data.is_active !== undefined ? data.is_active : current.is_active;

  const res = await query(
    `UPDATE master_equipment
     SET name = $1, code_number = $2, category = $3, vendor = $4, unit = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
     WHERE id = $7 AND organization_id = $8
     RETURNING *`,
    [
      updatedName,
      updatedCode,
      updatedCat,
      updatedVendor,
      updatedUnit,
      updatedActive,
      id,
      user.organizationId,
    ]
  );

  return res.rows[0];
}

export async function deleteMasterEquipment(id: string, user: AuthenticatedUser) {
  if (user.orgRole !== 'admin') {
    throw new ForbiddenError('Hanya admin yang berwenang menghapus master alat berat.');
  }

  const res = await query(
    `UPDATE master_equipment SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [id, user.organizationId]
  );

  if (res.rows.length === 0) {
    throw new NotFoundError('Data alat berat tidak ditemukan.');
  }

  return { success: true, message: 'Alat berat dinonaktifkan dari master.' };
}

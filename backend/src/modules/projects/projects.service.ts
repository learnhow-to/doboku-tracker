import { query } from '../../config/database.js';
import { AuthenticatedUser } from '../../types/index.js';

export async function getUserProjects(user: AuthenticatedUser) {
  if (user.orgRole === 'admin') {
    // Admin sees all projects in their organization
    const res = await query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM daily_reports WHERE project_id = p.id) as report_count
       FROM projects p
       WHERE p.organization_id = $1
       ORDER BY p.created_at DESC`,
      [user.organizationId]
    );
    return res.rows;
  }

  // Non-admin sees only assigned projects
  const res = await query(
    `SELECT p.*, pm.role as assigned_role,
      (SELECT COUNT(*) FROM daily_reports WHERE project_id = p.id) as report_count
     FROM projects p
     JOIN project_memberships pm ON p.id = pm.project_id
     WHERE p.organization_id = $1 AND pm.user_id = $2
     ORDER BY p.created_at DESC`,
    [user.organizationId, user.id]
  );
  return res.rows;
}

export async function getProjectById(projectId: string, user: AuthenticatedUser) {
  const res = await query(
    `SELECT p.* FROM projects p WHERE p.id = $1 AND p.organization_id = $2`,
    [projectId, user.organizationId]
  );
  if (res.rows.length === 0) return null;

  const project = res.rows[0];
  if (user.orgRole !== 'admin' && !user.projectRoles[projectId]) {
    return null; // Not assigned
  }

  // Also fetch project members
  const membersRes = await query(
    `SELECT u.id, u.display_name, u.email, pm.role
     FROM project_memberships pm
     JOIN users u ON pm.user_id = u.id
     WHERE pm.project_id = $1`,
    [projectId]
  );

  return {
    ...project,
    members: membersRes.rows,
  };
}

export async function createProject(
  data: {
    name: string;
    code: string;
    location?: string;
    main_contractor?: string;
    status?: 'active' | 'completed' | 'archived';
  },
  user: AuthenticatedUser
) {
  if (user.orgRole !== 'admin') {
    const err: any = new Error('Hanya admin yang berwenang menambah proyek baru.');
    err.statusCode = 403;
    throw err;
  }

  if (!data.name || !data.code) {
    const err: any = new Error('Nama proyek dan kode proyek wajib diisi.');
    err.statusCode = 400;
    throw err;
  }

  const id = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const res = await query(
    `INSERT INTO projects (id, organization_id, name, code, location, main_contractor, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      id,
      user.organizationId,
      data.name.trim(),
      data.code.trim().toUpperCase(),
      data.location?.trim() || null,
      data.main_contractor?.trim() || null,
      data.status || 'active',
    ]
  );

  return res.rows[0];
}

export async function updateProject(
  projectId: string,
  data: Partial<{
    name: string;
    code: string;
    location: string;
    main_contractor: string;
    status: 'active' | 'completed' | 'archived';
  }>,
  user: AuthenticatedUser
) {
  if (user.orgRole !== 'admin') {
    const err: any = new Error('Hanya admin yang berwenang mengubah proyek.');
    err.statusCode = 403;
    throw err;
  }

  const existing = await query(
    `SELECT * FROM projects WHERE id = $1 AND organization_id = $2`,
    [projectId, user.organizationId]
  );
  if (existing.rows.length === 0) {
    const err: any = new Error('Proyek tidak ditemukan.');
    err.statusCode = 404;
    throw err;
  }

  const current = existing.rows[0];
  const name = data.name !== undefined ? data.name.trim() : current.name;
  const code = data.code !== undefined ? data.code.trim().toUpperCase() : current.code;
  const location = data.location !== undefined ? data.location.trim() : current.location;
  const mainContractor = data.main_contractor !== undefined ? data.main_contractor.trim() : current.main_contractor;
  const status = data.status !== undefined ? data.status : current.status;

  const res = await query(
    `UPDATE projects
     SET name = $1, code = $2, location = $3, main_contractor = $4, status = $5
     WHERE id = $6 AND organization_id = $7
     RETURNING *`,
    [name, code, location, mainContractor, status, projectId, user.organizationId]
  );

  return res.rows[0];
}


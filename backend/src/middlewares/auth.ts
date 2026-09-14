import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../config/database.js';
import { AuthenticatedUser, UserRole } from '../types/index.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.substring(7)
    : (typeof req.query.token === 'string' ? req.query.token : null);

  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header or token query parameter' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.supabase.jwtSecret) as { sub: string; email?: string };
    const authId = decoded.sub;

    // Strict Server-Side Verification: Query DB directly for active membership.
    // Never trust role or organization claims sent from client.
    const userRes = await query(
      `SELECT u.id, u.auth_id, u.email, u.display_name, om.organization_id, om.role as org_role, om.is_active
       FROM users u
       JOIN organization_memberships om ON u.id = om.user_id
       WHERE u.auth_id = $1 AND om.is_active = TRUE`,
      [authId]
    );

    if (userRes.rows.length === 0) {
      // Check if user exists but was revoked
      const revokedCheck = await query(
        `SELECT om.is_active FROM users u
         JOIN organization_memberships om ON u.id = om.user_id
         WHERE u.auth_id = $1`,
        [authId]
      );

      if (revokedCheck.rows.length > 0 && !revokedCheck.rows[0].is_active) {
        res.status(403).json({ error: 'Access revoked by company administrator' });
        return;
      }

      res.status(401).json({ error: 'User or active organization membership not found' });
      return;
    }

    const row = userRes.rows[0];

    // Load active project assignments
    const projRes = await query(
      `SELECT project_id, role FROM project_memberships WHERE user_id = $1`,
      [row.id]
    );

    const projectRoles: Record<string, UserRole> = {};
    for (const p of projRes.rows) {
      projectRoles[p.project_id] = p.role as UserRole;
    }

    req.user = {
      id: row.id,
      authId: row.auth_id,
      email: row.email,
      displayName: row.display_name,
      organizationId: row.organization_id,
      orgRole: row.org_role as UserRole,
      projectRoles,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token has expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid authentication token' });
    return;
  }
}

/**
 * Middleware ensuring user is assigned to the specified project within their organization.
 */
export function requireProjectAccess(projectIdParam = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = req.params[projectIdParam] || req.body[projectIdParam] || req.query[projectIdParam];
    if (!projectId) {
      res.status(400).json({ error: 'Missing projectId parameter' });
      return;
    }

    // Verify project belongs to user's organization
    const projRes = await query(
      `SELECT id, organization_id, status FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projRes.rows.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = projRes.rows[0];
    if (project.organization_id !== req.user.organizationId) {
      // Cross-tenant attack prevention: Deny immediately
      res.status(403).json({ error: 'Forbidden: Project belongs to another organization' });
      return;
    }

    // Admins have organization-wide project oversight; otherwise user must have explicit project assignment
    const assignedRole = req.user.projectRoles[projectId];
    if (!assignedRole && req.user.orgRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden: You are not assigned to this project' });
      return;
    }

    next();
  };
}

/**
 * Require specific organization-level role
 */
export function requireOrgRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.orgRole)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      return;
    }
    next();
  };
}

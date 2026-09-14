import crypto from 'crypto';
import { query } from '../../config/database.js';

export interface AuditLogParams {
  organizationId: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: any;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const id = crypto.randomUUID();
  // Ensure sensitive tokens/passwords are never logged
  const sanitizedPayload = params.payload ? JSON.parse(JSON.stringify(params.payload)) : null;
  if (sanitizedPayload) {
    delete sanitizedPayload.token;
    delete sanitizedPayload.password;
    delete sanitizedPayload.jwt;
    delete sanitizedPayload.secret;
  }

  await query(
    `INSERT INTO audit_events (id, organization_id, actor_id, action, entity_type, entity_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      params.organizationId,
      params.actorId || null,
      params.action,
      params.entityType,
      params.entityId,
      sanitizedPayload ? JSON.stringify(sanitizedPayload) : null,
    ]
  );
}

export async function getAuditEvents(organizationId: string, limit = 50) {
  const res = await query(
    `SELECT a.*, u.display_name as actor_name, u.email as actor_email
     FROM audit_events a
     LEFT JOIN users u ON a.actor_id = u.id
     WHERE a.organization_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2`,
    [organizationId, limit]
  );
  return res.rows;
}

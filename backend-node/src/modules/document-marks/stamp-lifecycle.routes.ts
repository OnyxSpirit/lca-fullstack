import { unlink } from 'node:fs/promises';
import { Router, type Request } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { query, transaction } from '../../config/database.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { HttpError } from '../../shared/http-error.js';
import { writeAudit } from '../activity/audit-writer.js';
import { resolveDocumentPath } from '../documents/document-storage.js';
import { assertPermission, type PermissionScope } from '../rbac/rbac.service.js';

export const stampLifecycleRouter = Router();
export const STAMP_USED_MESSAGE = 'Ce cachet a déjà été utilisé dans des documents. Il ne peut pas être supprimé. Vous pouvez toutefois le révoquer.';

const id = (value: unknown) => {
  const text = String(value ?? '');
  if (!/^[1-9]\d*$/.test(text)) throw new HttpError(400, 'Identifiant invalide');
  return text;
};

function predicate(request: Request, scope: PermissionScope | null, alias = 'st') {
  if (scope === 'GLOBAL') return { sql: '1=1', params: [] as any[] };
  if (scope === 'CONCESSION') return { sql: `${alias}.concession_id=(SELECT concession_id FROM agencies WHERE id=?)`, params: [request.user!.agencyId] };
  if (scope === 'AGENCY') return { sql: `${alias}.agency_id=?`, params: [request.user!.agencyId] };
  throw new HttpError(403, 'Le scope OWN ne gouverne pas les cachets');
}

async function managedStamp(request: Request, stampId: string, lock = false) {
  const scope = await assertPermission(request, 'stamp.manage');
  const where = predicate(request, scope);
  const rows = await query<RowDataPacket[]>(`SELECT st.* FROM service_stamps st WHERE st.id=? AND ${where.sql}${lock ? ' FOR UPDATE' : ''}`, [stampId, ...where.params]);
  if (!rows[0]) throw new HttpError(404, 'Cachet introuvable');
  return rows[0];
}

// Ces gardes précèdent les routes historiques et empêchent toute réutilisation
// ou réactivation d'un cachet définitivement révoqué.
stampLifecycleRouter.post('/document-marks/stamps/:id/version', requirePermission('stamp.manage'), asyncHandler(async (request, _response, next) => {
  const stamp = await managedStamp(request, id(request.params.id));
  if (stamp.revoked_at) throw new HttpError(409, 'Un cachet révoqué ne peut pas recevoir de nouvelle version');
  next();
}));

stampLifecycleRouter.patch('/document-marks/stamps/:id/status', requirePermission('stamp.manage'), asyncHandler(async (request, _response, next) => {
  if (request.body?.isActive === true) {
    const stamp = await managedStamp(request, id(request.params.id));
    if (stamp.revoked_at) throw new HttpError(409, 'Un cachet révoqué ne peut pas être réactivé');
  }
  next();
}));

stampLifecycleRouter.post('/document-marks/stamps/:id/revoke', requirePermission('stamp.manage'), asyncHandler(async (request, response) => {
  const stampId = id(request.params.id);
  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim().slice(0, 500) : '';
  if (reason.length < 3) throw new HttpError(400, 'Le motif de révocation doit contenir au moins 3 caractères');
  const scope = await assertPermission(request, 'stamp.manage');
  const where = predicate(request, scope);
  await transaction(async connection => {
    const [rows] = await connection.execute<RowDataPacket[]>(`SELECT st.* FROM service_stamps st WHERE st.id=? AND ${where.sql} FOR UPDATE`, [stampId, ...where.params]);
    const stamp = rows[0];
    if (!stamp) throw new HttpError(404, 'Cachet introuvable');
    if (stamp.revoked_at) throw new HttpError(409, 'Ce cachet est déjà révoqué');
    await connection.execute('UPDATE service_stamps SET is_active=FALSE,revoked_by=?,revoked_at=NOW(),revocation_reason=?,updated_by=? WHERE id=?', [request.user!.sub, reason, request.user!.sub, stamp.id]);
    await connection.execute('UPDATE service_stamp_versions SET is_active=FALSE,revoked_by=?,revoked_at=NOW() WHERE stamp_id=? AND is_active=TRUE', [request.user!.sub, stamp.id]);
    await writeAudit(connection, request, {
      module: 'documents', entityType: 'service_stamp', entityId: String(stamp.id), action: 'stamp.revoked', newValues: { reason },
      context: { mode: 'EXPLICIT', agencyId: stamp.agency_id == null ? null : String(stamp.agency_id), concessionId: String(stamp.concession_id) },
    });
  });
  response.json({ id: stampId, success: true });
}));

stampLifecycleRouter.delete('/document-marks/stamps/:id', requirePermission('stamp.manage'), asyncHandler(async (request, response) => {
  const stampId = id(request.params.id);
  const scope = await assertPermission(request, 'stamp.manage');
  const where = predicate(request, scope);
  const result = await transaction(async connection => {
    const [rows] = await connection.execute<RowDataPacket[]>(`SELECT st.* FROM service_stamps st WHERE st.id=? AND ${where.sql} FOR UPDATE`, [stampId, ...where.params]);
    const stamp = rows[0];
    if (!stamp) throw new HttpError(404, 'Cachet introuvable');
    const [versions] = await connection.execute<RowDataPacket[]>('SELECT id,file_url,file_hash FROM service_stamp_versions WHERE stamp_id=? ORDER BY id FOR UPDATE', [stamp.id]);
    const [dependencies] = await connection.execute<RowDataPacket[]>(`SELECT
      EXISTS(SELECT 1 FROM document_mark_snapshots WHERE stamp_id=? OR stamp_version_id IN (SELECT id FROM service_stamp_versions WHERE stamp_id=?)) snapshot_used,
      EXISTS(SELECT 1 FROM delivery_signatures WHERE service_stamp_version_id IN (SELECT id FROM service_stamp_versions WHERE stamp_id=?)) delivery_used,
      EXISTS(SELECT 1 FROM document_mark_policies WHERE default_stamp_id=?) policy_used`, [stamp.id, stamp.id, stamp.id, stamp.id]);
    if (dependencies[0] && Object.values(dependencies[0]).some(value => Number(value) > 0)) throw new HttpError(409, STAMP_USED_MESSAGE);
    await connection.execute('DELETE FROM service_stamp_role_authorizations WHERE stamp_id=?', [stamp.id]);
    await connection.execute('DELETE FROM service_stamp_document_types WHERE stamp_id=?', [stamp.id]);
    await connection.execute('DELETE FROM service_stamp_versions WHERE stamp_id=?', [stamp.id]);
    await connection.execute('DELETE FROM service_stamps WHERE id=?', [stamp.id]);
    await writeAudit(connection, request, {
      module: 'documents', entityType: 'service_stamp', entityId: String(stamp.id), action: 'stamp.deleted',
      oldValues: { name: stamp.name, documentContext: stamp.document_context, versionIds: versions.map(version => String(version.id)) },
      context: { mode: 'EXPLICIT', agencyId: stamp.agency_id == null ? null : String(stamp.agency_id), concessionId: String(stamp.concession_id) },
    });
    return { files: versions.map(version => String(version.file_url)) };
  });
  for (const file of result.files) await unlink(resolveDocumentPath(file)).catch(() => undefined);
  response.json({ id: stampId, success: true });
}));

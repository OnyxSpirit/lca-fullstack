import { Router } from 'express';
import { execute, query } from '../../config/database.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
export const notificationRouter = Router();
const routeId = (value) => { const id = Array.isArray(value) ? value[0] : value; if (!id || !/^\d+$/.test(id))
    throw new HttpError(400, 'Identifiant invalide'); return id; };
notificationRouter.get('/notifications', asyncHandler(async (request, response) => { const rows = await query(`SELECT id,user_id,customer_id,channel,subject,message,status,sent_at,read_at,reference_type,reference_id,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 200`, [request.user.sub]); response.json(rows); }));
notificationRouter.patch('/notifications/read-all', asyncHandler(async (request, response) => { await execute(`UPDATE notifications SET status='read',read_at=NOW() WHERE user_id=? AND status<>'read'`, [request.user.sub]); response.json({ success: true }); }));
notificationRouter.patch('/notifications/:id/read', asyncHandler(async (request, response) => { const result = await execute(`UPDATE notifications SET status='read',read_at=NOW() WHERE id=? AND user_id=?`, [routeId(request.params.id), request.user.sub]); if (!result.affectedRows)
    throw new HttpError(404, 'Notification introuvable'); response.json({ success: true }); }));
notificationRouter.delete('/notifications/:id', asyncHandler(async (request, response) => { const result = await execute('DELETE FROM notifications WHERE id=? AND user_id=?', [routeId(request.params.id), request.user.sub]); if (!result.affectedRows)
    throw new HttpError(404, 'Notification introuvable'); response.json({ success: true }); }));

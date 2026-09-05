import { Router } from 'express';
import { execute, query } from '../../config/database.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
export const notificationRouter = Router();
const routeId = (v) => { const x = Array.isArray(v) ? v[0] : v; if (!x || !/^\d+$/.test(x))
    throw new HttpError(400, 'Identifiant invalide'); return x; }, txt = (v, max = 100) => typeof v === 'string' ? v.trim().slice(0, max) : '';
notificationRouter.get('/notifications', asyncHandler(async (r, res) => { const page = Math.max(1, Number(r.query.page) || 1), pageSize = Math.min(100, Math.max(1, Number(r.query.pageSize) || 25)), where = [`user_id=?`, `channel='notification'`], params = [r.user.sub]; if (['1', 'true'].includes(txt(r.query.unreadOnly)))
    where.push('read_at IS NULL'); for (const [key, column] of [['eventType', 'event_type'], ['referenceType', 'reference_type'], ['priority', 'priority']])
    if (r.query[key]) {
        where.push(`${column}=?`);
        params.push(txt(r.query[key]));
    } if (r.query.from) {
    where.push('DATE(created_at)>=?');
    params.push(txt(r.query.from, 10));
} if (r.query.to) {
    where.push('DATE(created_at)<=?');
    params.push(txt(r.query.to, 10));
} const sql = where.join(' AND '), [[total], [unread], items] = await Promise.all([query(`SELECT COUNT(*) total FROM notifications WHERE ${sql}`, params), query(`SELECT COUNT(*) total FROM notifications WHERE user_id=? AND channel='notification' AND read_at IS NULL`, [r.user.sub]), query(`SELECT id,subject,message,delivery_status,event_type,priority,read_at,reference_type,reference_id,created_at FROM notifications WHERE ${sql} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize])]); res.json({ items: items.map(x => ({ id: String(x.id), subject: x.subject ?? 'Notification', message: x.message, deliveryStatus: x.delivery_status ?? 'sent', eventType: x.event_type, priority: x.priority ?? 'normal', readAt: x.read_at, referenceType: x.reference_type, referenceId: x.reference_id == null ? null : String(x.reference_id), createdAt: x.created_at, isRead: x.read_at != null })), page, pageSize, total: Number(total?.total ?? 0), unreadCount: Number(unread?.total ?? 0) }); }));
notificationRouter.get('/notifications/unread-count', asyncHandler(async (r, res) => { const [row] = await query(`SELECT COUNT(*) unreadCount FROM notifications WHERE user_id=? AND channel='notification' AND read_at IS NULL`, [r.user.sub]); res.json({ unreadCount: Number(row?.unreadCount ?? 0) }); }));
notificationRouter.patch('/notifications/read-all', asyncHandler(async (r, res) => { const result = await execute(`UPDATE notifications SET read_at=NOW() WHERE user_id=? AND channel='notification' AND read_at IS NULL`, [r.user.sub]); res.json({ success: true, updated: result.affectedRows }); }));
notificationRouter.patch('/notifications/:id/read', asyncHandler(async (r, res) => { const result = await execute(`UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND user_id=? AND channel='notification'`, [routeId(r.params.id), r.user.sub]); if (!result.affectedRows)
    throw new HttpError(404, 'Notification introuvable'); res.json({ success: true }); }));
notificationRouter.delete('/notifications/:id', asyncHandler(async (r, res) => { const result = await execute(`DELETE FROM notifications WHERE id=? AND user_id=? AND channel='notification'`, [routeId(r.params.id), r.user.sub]); if (!result.affectedRows)
    throw new HttpError(404, 'Notification introuvable'); res.json({ success: true }); }));

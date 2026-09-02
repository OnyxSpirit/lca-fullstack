import { Router } from 'express';
import { query } from '../../config/database.js';
import { scopedAgencyId, unrestricted } from '../../middleware/authorize.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
export const coreRouter = Router();
const saleSelect = `SELECT s.*,CONCAT_WS(' ',c.first_name,c.last_name) customer_name,si.vehicle_id,v.vin,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,CONCAT_WS(' ',u.first_name,u.last_name) salesperson_name FROM sales s JOIN customers c ON c.id=s.customer_id LEFT JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL LEFT JOIN vehicles v ON v.id=si.vehicle_id LEFT JOIN versions ve ON ve.id=v.version_id LEFT JOIN models m ON m.id=ve.model_id LEFT JOIN brands b ON b.id=m.brand_id LEFT JOIN users u ON u.id=s.salesperson_id`;
coreRouter.get('/users', asyncHandler(async (request, response) => {
    const agencyId = scopedAgencyId(request);
    const rows = await query(`SELECT u.id,u.first_name,u.last_name,u.email,u.phone,u.job_title,u.agency_id,a.name agency_name,u.is_active,GROUP_CONCAT(r.code ORDER BY r.code) roles FROM users u LEFT JOIN agencies a ON a.id=u.agency_id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id WHERE (? IS NULL OR u.agency_id=?) GROUP BY u.id ORDER BY u.last_name,u.first_name`, [agencyId, agencyId]);
    response.json(rows.map(row => ({ id: row.id, firstName: row.first_name, lastName: row.last_name, name: `${row.first_name} ${row.last_name}`, email: row.email, phone: row.phone, jobTitle: row.job_title, agencyId: row.agency_id, agencyName: row.agency_name, isActive: Boolean(row.is_active), roles: row.roles ? String(row.roles).split(',') : [] })));
}));
coreRouter.get('/agencies', asyncHandler(async (request, response) => { const agencyId = scopedAgencyId(request); const rows = await query('SELECT id,concession_id,name,code,address,city,phone,email,is_active FROM agencies WHERE (? IS NULL OR id=?) ORDER BY name', [agencyId, agencyId]); response.json(rows.map(row => ({ id: row.id, concessionId: row.concession_id, name: row.name, code: row.code, address: row.address, city: row.city, phone: row.phone, email: row.email, isActive: Boolean(row.is_active) }))); }));
coreRouter.get('/sales', asyncHandler(async (request, response) => { const agencyId = scopedAgencyId(request); response.json(await query(`${saleSelect} WHERE (? IS NULL OR s.agency_id=?) ORDER BY s.created_at DESC`, [agencyId, agencyId])); }));
coreRouter.get('/sales/:id', asyncHandler(async (request, response) => { const [row] = await query(`${saleSelect} WHERE s.id=?`, [request.params.id]); if (!row)
    throw new HttpError(404, 'Vente introuvable'); if (!unrestricted(request) && String(row.agency_id) !== String(request.user?.agencyId))
    throw new HttpError(403, 'Vente rattachée à une autre agence'); response.json(row); }));

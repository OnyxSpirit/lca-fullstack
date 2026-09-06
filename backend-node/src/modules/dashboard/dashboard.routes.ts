import { Router, type Request } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../../config/database.js';
import { authorize, unrestricted } from '../../middleware/authorize.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';

export const dashboardRouter = Router();

const ALL_ROLES = ['SUPER_ADMIN','DIRECTOR','ACCOUNTANT','SALES_MANAGER','SALES_AGENT','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','TECHNICIAN','PARTS_MANAGER','WAREHOUSE_CLERK','DELIVERY_MANAGER'];
const FINANCE_ROLES = ['SUPER_ADMIN','DIRECTOR','ACCOUNTANT','SALES_MANAGER','SALES_AGENT','SERVICE_MANAGER','SERVICE_ADVISOR'];
const SALES_ROLES = ['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','DELIVERY_MANAGER','ACCOUNTANT'];
const CRM_ROLES = ['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST'];
const VEHICLE_ROLES = ['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','WAREHOUSE_CLERK','DELIVERY_MANAGER'];
const SHOWROOM_ROLES = ['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST','DELIVERY_MANAGER'];
const DELIVERY_ROLES = ['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','RECEPTIONIST','DELIVERY_MANAGER','ACCOUNTANT'];
const WORKSHOP_ROLES = ['SUPER_ADMIN','DIRECTOR','SERVICE_MANAGER','SERVICE_ADVISOR','WORKSHOP_MANAGER','TECHNICIAN','PARTS_MANAGER','WAREHOUSE_CLERK'];

const number = (value: unknown) => Number(value ?? 0);
const allowed = (request: Request, roles: string[]) => Boolean(request.user?.roles.some(role => roles.includes(role)));
export const dashboardComparison = (currentValue: unknown, previousValue: unknown) => {
  const current = number(currentValue), previous = number(previousValue), delta = current - previous;
  return { current, previous, delta, deltaPercent: previous === 0 ? null : delta / previous * 100 };
};
const first = async (sql: string, params: unknown[]): Promise<RowDataPacket> => (await query<RowDataPacket[]>(sql, params))[0] ?? ({} as RowDataPacket);

function agencyScope(request: Request) {
  const requested = typeof request.query.agencyId === 'string' && request.query.agencyId ? request.query.agencyId : null;
  if (requested && !/^\d+$/.test(requested)) throw new HttpError(400, 'Agence invalide');
  if (unrestricted(request)) return requested;
  if (!request.user?.agencyId) throw new HttpError(403, 'Aucune agence associée');
  if (requested && requested !== request.user.agencyId) throw new HttpError(403, 'Cette agence est inaccessible');
  return request.user.agencyId;
}

const scope = (alias: string, agencyId: string | null) => agencyId
  ? { sql: `${alias}.agency_id=?`, params: [agencyId] }
  : { sql: '1=1', params: [] as unknown[] };

dashboardRouter.get('/dashboard/overview', authorize(...ALL_ROLES), asyncHandler(async (request, response) => {
  const agencyId = agencyScope(request);
  const invoiceScope = scope('i', agencyId), salesScope = scope('s', agencyId), vehicleScope = scope('v', agencyId);
  const showroomScope = scope('sv', agencyId), deliveryScope = scope('d', agencyId), workshopScope = scope('ro', agencyId);
  const permissions = {
    revenue: allowed(request, FINANCE_ROLES), sales: allowed(request, SALES_ROLES), crm: allowed(request, CRM_ROLES),
    vehicles: allowed(request, VEHICLE_ROLES), showroom: allowed(request, SHOWROOM_ROLES), deliveries: allowed(request, DELIVERY_ROLES), workshop: allowed(request, WORKSHOP_ROLES),
  };

  const financialPromise = permissions.revenue ? Promise.all([
    first(`SELECT
      COALESCE(SUM(CASE WHEN i.issue_date>=DATE_FORMAT(CURDATE(),'%Y-%m-01') AND i.issue_date<DATE_ADD(CURDATE(),INTERVAL 1 DAY) THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) current_revenue,
      COALESCE(SUM(CASE WHEN i.issue_date>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH) AND i.issue_date<DATE_ADD(DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH),INTERVAL (DAY(CURDATE())) DAY) THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) previous_revenue
      FROM invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) amount FROM credit_notes WHERE status IN('issued','applied') GROUP BY invoice_id) cn ON cn.invoice_id=i.id
      WHERE i.status<>'cancelled' AND i.issue_date>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH) AND ${invoiceScope.sql}`,[...invoiceScope.params]),
    first(`SELECT
      COALESCE(SUM(CASE WHEN s.sold_at>=DATE_FORMAT(CURDATE(),'%Y-%m-01') AND s.sold_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY) THEN si.line_total-(v.purchase_price+v.refurbishment_cost+v.transport_cost+v.administrative_cost+v.additional_costs) ELSE 0 END),0) current_margin,
      COALESCE(SUM(CASE WHEN s.sold_at>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH) AND s.sold_at<DATE_ADD(DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH),INTERVAL (DAY(CURDATE())) DAY) THEN si.line_total-(v.purchase_price+v.refurbishment_cost+v.transport_cost+v.administrative_cost+v.additional_costs) ELSE 0 END),0) previous_margin
      FROM sales s JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL JOIN vehicles v ON v.id=si.vehicle_id
      WHERE s.status IN('confirmed','preparation','ready_for_delivery','delivered') AND s.sold_at>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH) AND ${salesScope.sql}`,[...salesScope.params]),
    first(`SELECT
      COALESCE(SUM(CASE WHEN i.issue_date>=DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY) THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) current_week,
      COALESCE(SUM(CASE WHEN i.issue_date>=DATE_SUB(DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY),INTERVAL 7 DAY) AND i.issue_date<DATE_SUB(DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY),INTERVAL 7 DAY)+INTERVAL (WEEKDAY(CURDATE())+1) DAY THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) previous_week
      FROM invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) amount FROM credit_notes WHERE status IN('issued','applied') GROUP BY invoice_id) cn ON cn.invoice_id=i.id
      WHERE i.status<>'cancelled' AND i.issue_date>=DATE_SUB(DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY),INTERVAL 7 DAY) AND ${invoiceScope.sql}`,[...invoiceScope.params]),
    query<RowDataPacket[]>(`SELECT DATE(i.issue_date) day,COALESCE(SUM(i.total-COALESCE(cn.amount,0)),0) revenue FROM invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) amount FROM credit_notes WHERE status IN('issued','applied') GROUP BY invoice_id) cn ON cn.invoice_id=i.id WHERE i.status<>'cancelled' AND i.issue_date>=DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY) AND i.issue_date<DATE_ADD(CURDATE(),INTERVAL 1 DAY) AND ${invoiceScope.sql} GROUP BY DATE(i.issue_date) ORDER BY day`,[...invoiceScope.params]),
    query<RowDataPacket[]>(`SELECT DATE_FORMAT(i.issue_date,'%Y-%m') month,
      COALESCE(SUM(CASE WHEN i.invoice_type='vehicle' AND st.vehicle_type='new' THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) vn,
      COALESCE(SUM(CASE WHEN i.invoice_type='vehicle' AND st.vehicle_type='used' THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) vo,
      COALESCE(SUM(CASE WHEN i.invoice_type IN('workshop','parts') THEN i.total-COALESCE(cn.amount,0) ELSE 0 END),0) sav
      FROM invoices i LEFT JOIN (SELECT invoice_id,SUM(amount) amount FROM credit_notes WHERE status IN('issued','applied') GROUP BY invoice_id) cn ON cn.invoice_id=i.id
      LEFT JOIN (SELECT si.sale_id,MAX(v.vehicle_type) vehicle_type FROM sale_items si JOIN vehicles v ON v.id=si.vehicle_id GROUP BY si.sale_id) st ON st.sale_id=i.sale_id
      WHERE i.status<>'cancelled' AND i.issue_date>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 5 MONTH) AND ${invoiceScope.sql} GROUP BY DATE_FORMAT(i.issue_date,'%Y-%m') ORDER BY month`,[...invoiceScope.params]),
  ]) : null;

  const [financial, sales, crm, vehicles, stockDistribution, showroom, testDrives, deliveries, workshop] = await Promise.all([
    financialPromise,
    permissions.sales ? first(`SELECT COUNT(DISTINCT CASE WHEN s.sold_at>=DATE_FORMAT(CURDATE(),'%Y-%m-01') AND s.sold_at<DATE_ADD(CURDATE(),INTERVAL 1 DAY) THEN si.vehicle_id END) current_count,COUNT(DISTINCT CASE WHEN s.sold_at>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH) AND s.sold_at<DATE_ADD(DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH),INTERVAL (DAY(CURDATE())) DAY) THEN si.vehicle_id END) previous_count FROM sales s JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL WHERE s.status IN('confirmed','preparation','ready_for_delivery','delivered') AND s.sold_at>=DATE_SUB(DATE_FORMAT(CURDATE(),'%Y-%m-01'),INTERVAL 1 MONTH) AND ${salesScope.sql}`,[...salesScope.params]) : null,
    permissions.crm ? first(`SELECT COUNT(*) active FROM leads l LEFT JOIN users u ON u.id=l.assigned_user_id LEFT JOIN users creator ON creator.id=l.created_by WHERE l.status NOT IN('converted','lost') AND ${agencyId ? 'COALESCE(u.agency_id,creator.agency_id)=?' : '1=1'}`,agencyId?[agencyId]:[]) : null,
    permissions.vehicles ? first(`SELECT COUNT(*) total,SUM(v.status='available') available,SUM(v.status='reserved') reserved,SUM(v.status='sold') sold,SUM(v.status='available' AND DATEDIFF(CURDATE(),v.entry_date)>60) dormant FROM vehicles v WHERE ${vehicleScope.sql}`,[...vehicleScope.params]) : null,
    permissions.vehicles ? query<RowDataPacket[]>(`SELECT COALESCE(NULLIF(v.body_type,''),NULLIF(v.fuel_type,''),'Autres') name,COUNT(*) value FROM vehicles v WHERE v.status IN('received','preparation','available','reserved') AND ${vehicleScope.sql} GROUP BY name ORDER BY value DESC`,[...vehicleScope.params]) : null,
    permissions.showroom ? first(`SELECT COUNT(*) today_visitors,SUM(sv.status='waiting') waiting,SUM(sv.status IN('assigned','in_progress')) in_progress FROM showroom_visits sv WHERE DATE(sv.arrival_at)=CURDATE() AND ${showroomScope.sql}`,[...showroomScope.params]) : null,
    permissions.crm ? first(`SELECT COUNT(*) scheduled FROM activities act LEFT JOIN leads l ON l.id=act.lead_id LEFT JOIN users u ON u.id=l.assigned_user_id LEFT JOIN users creator ON creator.id=l.created_by WHERE act.type='test_drive' AND act.status='planned' AND act.due_at>=DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY) AND act.due_at<DATE_ADD(DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY),INTERVAL 7 DAY) AND ${agencyId ? 'COALESCE(u.agency_id,creator.agency_id)=?' : '1=1'}`,agencyId?[agencyId]:[]) : null,
    permissions.deliveries ? first(`SELECT SUM(d.status='planned' AND (d.scheduled_at IS NULL OR d.scheduled_at>=NOW())) scheduled,SUM(d.status IN('preparing','quality_control','ready')) in_progress FROM deliveries d WHERE ${deliveryScope.sql}`,[...deliveryScope.params]) : null,
    permissions.workshop ? first(`SELECT COUNT(*) active FROM repair_orders ro WHERE ro.status IN('planned','received','diagnosis','waiting_approval','in_progress','quality_control','ready') AND ${workshopScope.sql}`,[...workshopScope.params]) : null,
  ]);

  const [financeRows, marginRows, weeklyRows, weeklySeries = [], trend = []] = financial ?? [];
  const revenue = financeRows ? dashboardComparison(financeRows.current_revenue, financeRows.previous_revenue) : null;
  const grossMargin = marginRows ? dashboardComparison(marginRows.current_margin, marginRows.previous_margin) : null;
  const weeklyRevenue = weeklyRows ? { ...dashboardComparison(weeklyRows.current_week, weeklyRows.previous_week), peakDay: weeklySeries.length ? String(weeklySeries.reduce((best,row)=>number(row.revenue)>number(best.revenue)?row:best).day) : null } : null;

  response.json({
    agencyId, permissions,
    revenue, grossMargin,
    sales: sales ? { ...dashboardComparison(sales.current_count,sales.previous_count), currentMonth:number(sales.current_count), previousMonth:number(sales.previous_count) } : null,
    crm: crm ? { activeLeads:number(crm.active), scheduledTestDrivesThisWeek:number(testDrives?.scheduled), deltaPercent:null } : null,
    vehicles: vehicles ? { total:number(vehicles.total),available:number(vehicles.available),reserved:number(vehicles.reserved),sold:number(vehicles.sold),dormant:number(vehicles.dormant),deltaPercent:null } : null,
    showroom: showroom ? { todayVisitors:number(showroom.today_visitors),waiting:number(showroom.waiting),inProgress:number(showroom.in_progress) } : null,
    deliveries: deliveries ? { scheduled:number(deliveries.scheduled),inProgress:number(deliveries.in_progress) } : null,
    workshop: workshop ? { activeRepairOrders:number(workshop.active) } : null,
    weeklyRevenue,
    weeklySeries: weeklySeries.map(row=>({day:String(row.day),revenue:number(row.revenue)})),
    revenueTrend: trend.map(row=>({month:String(row.month),vn:number(row.vn),vo:number(row.vo),sav:number(row.sav)})),
    stockDistribution: (stockDistribution??[]).map(row=>({name:String(row.name),value:number(row.value)})),
  });
}));

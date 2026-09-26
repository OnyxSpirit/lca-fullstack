import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import type{Request}from'express';
import{query}from'../../config/database.js';
import{HttpError}from'../../shared/http-error.js';
import{assertPermission,type PermissionScope}from'../rbac/rbac.service.js';

export const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;

export async function assertWarrantyScope(request:Request,permission:string,order:{agency_id:unknown;advisor_id?:unknown}){
 const granted=(request.rbac?.isSuperAdmin?'GLOBAL':await assertPermission(request,permission))as PermissionScope;
 const agency=String(order.agency_id),actorAgency=String(request.user?.agencyId??'');
 if(granted==='GLOBAL')return;
 if(granted==='OWN'){if(String(order.advisor_id)!==String(request.user!.sub))throw new HttpError(403,'Garantie hors périmètre OWN');return}
 if(granted==='AGENCY'){if(agency!==actorAgency)throw new HttpError(403,'Garantie hors agence');return}
 if(granted!=='CONCESSION')throw new HttpError(403,'Scope garantie invalide');
 const[allowed]=await query<RowDataPacket[]>('SELECT target.id FROM agencies target JOIN agencies actor ON actor.concession_id=target.concession_id WHERE actor.id=? AND target.id=?',[actorAgency,agency]);
 if(!allowed)throw new HttpError(403,'Garantie hors concession');
}

export async function warrantyDetail(repairOrderId:string){
 const[rows,allocations,claims]=await Promise.all([
  query<RowDataPacket[]>(`SELECT w.*,p.code provider_code,p.name provider_name,CONCAT_WS(' ',u.first_name,u.last_name) decided_by_name FROM repair_order_warranties w LEFT JOIN warranty_providers p ON p.id=w.provider_id LEFT JOIN users u ON u.id=w.decided_by WHERE w.repair_order_id=?`,[repairOrderId]),
  query<RowDataPacket[]>(`SELECT a.*,i.item_type,i.description,i.line_total,i.tax_rate,i.status item_status,ROUND(a.manufacturer_share_ht*(1+i.tax_rate/100),2) manufacturer_total,ROUND((i.line_total-a.manufacturer_share_ht)*(1+i.tax_rate/100),2) customer_total FROM repair_order_warranty_allocations a JOIN repair_order_warranties w ON w.id=a.warranty_id JOIN repair_order_items i ON i.id=a.repair_order_item_id WHERE w.repair_order_id=? ORDER BY i.id`,[repairOrderId]),
  query<RowDataPacket[]>(`SELECT c.* FROM warranty_claims c JOIN repair_order_warranties w ON w.id=c.warranty_id WHERE w.repair_order_id=?`,[repairOrderId]),
 ]);
 const warranty=rows[0];if(!warranty)return null;
 const active=allocations.filter(x=>x.item_status==='active'),realTotal=active.reduce((s,x)=>s+Number(x.line_total)*(1+Number(x.tax_rate)/100),0),manufacturerTotal=active.reduce((s,x)=>s+Number(x.manufacturer_total),0);
 return{...warranty,allocations,summary:{realTotal:money(realTotal),manufacturerTotal:money(manufacturerTotal),customerTotal:money(realTotal-manufacturerTotal)},claim:claims[0]??null};
}

export async function invalidateWarrantyAllocation(connection:PoolConnection,repairOrderId:string,userId:string){
 await connection.execute("UPDATE repair_order_warranties SET allocation_status=CASE WHEN decision_status='APPROVED' THEN 'DRAFT' ELSE allocation_status END,version=version+1,updated_by=? WHERE repair_order_id=? AND allocation_status='CONFIRMED'",[userId,repairOrderId]);
}

export async function assertWarrantyMayStart(connection:PoolConnection,repairOrderId:string){
 const[rows]=await connection.execute<RowDataPacket[]>('SELECT decision_status FROM repair_order_warranties WHERE repair_order_id=? FOR UPDATE',[repairOrderId]);
 if(rows[0]?.decision_status==='PENDING')throw new HttpError(409,'La décision de garantie constructeur est encore en attente');
}

export async function assertWarrantyDecisionMade(connection:PoolConnection,repairOrderId:string){
 const[rows]=await connection.execute<RowDataPacket[]>('SELECT decision_status FROM repair_order_warranties WHERE repair_order_id=? FOR UPDATE',[repairOrderId]);
 if(rows[0]?.decision_status==='PENDING')throw new HttpError(409,'La décision de garantie constructeur doit être enregistrée avant la réception du véhicule');
}

export async function assertWarrantyReadyForQuality(connection:PoolConnection,repairOrderId:string){
 const[rows]=await connection.execute<RowDataPacket[]>('SELECT decision_status,allocation_status FROM repair_order_warranties WHERE repair_order_id=? FOR UPDATE',[repairOrderId]),w=rows[0];
 if(w?.decision_status==='PENDING')throw new HttpError(409,'La décision de garantie constructeur est encore en attente');
 if(w?.decision_status==='APPROVED'&&w.allocation_status!=='CONFIRMED')throw new HttpError(409,'Confirmez la ventilation garantie finale avant le contrôle qualité');
}

export async function auditWarranty(connection:PoolConnection,request:Request,entityId:string,action:string,oldValues:unknown,newValues:unknown){
 await connection.execute("INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,old_values,new_values,ip_address,user_agent)VALUES(?,'service','repair_order_warranty',?,?,?,?,?,?)",[request.user!.sub,entityId,action,oldValues==null?null:JSON.stringify(oldValues),newValues==null?null:JSON.stringify(newValues),request.ip??null,request.get('user-agent')??null]);
}

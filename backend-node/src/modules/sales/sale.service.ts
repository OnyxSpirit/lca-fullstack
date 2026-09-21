import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { query, transaction } from '../../config/database.js';
import { emitToAgency } from '../../realtime/socket.js';
import { HttpError } from '../../shared/http-error.js';
import { archiveSaleOrder, safelyArchive } from '../documents/business-document.service.js';
import { notifyPermissions } from '../notifications/notification.service.js';
import { assertPermission, type PermissionScope } from '../rbac/rbac.service.js';
import { assertSaleTransition, saleTotals, validateCreateSale } from './sale.domain.js';
import {operationalCandidateSql} from '../users/operational-candidate.js';
import {assertVehicleMargin} from '../../shared/vehicle-margin.js';
import{cancelUnpaidInvoice,cancellationActor}from'../billing/invoice-cancellation.service.js';

const SELECT=`SELECT s.*,a.name agency_name,COALESCE(c.company_name,CONCAT_WS(' ',c.first_name,c.last_name)) customer_name,si.vehicle_id,v.vin,v.stock_number,CONCAT(b.name,' ',m.name,' ',ve.name) vehicle_label,CONCAT_WS(' ',u.first_name,u.last_name) salesperson_name,f.financing_type,f.financier_name,f.financed_amount,f.monthly_payment,f.duration_months,ti.trade_in_value,CONCAT_WS(' ',ti.brand,ti.model,ti.version,ti.year) trade_in_vehicle_details,(SELECT MIN(d.scheduled_at) FROM deliveries d WHERE d.sale_id=s.id AND d.status<>'cancelled') expected_delivery_date,(SELECT i.id FROM invoices i WHERE i.sale_id=s.id AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1) invoice_id,(SELECT i.amount_paid FROM invoices i WHERE i.sale_id=s.id AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1) invoice_amount_paid,(SELECT i.balance_due FROM invoices i WHERE i.sale_id=s.id AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1) invoice_balance_due,(SELECT i.status FROM invoices i WHERE i.sale_id=s.id AND i.status<>'cancelled' ORDER BY i.id DESC LIMIT 1) invoice_status FROM sales s JOIN agencies a ON a.id=s.agency_id JOIN customers c ON c.id=s.customer_id LEFT JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL LEFT JOIN vehicles v ON v.id=si.vehicle_id LEFT JOIN versions ve ON ve.id=v.version_id LEFT JOIN models m ON m.id=ve.model_id LEFT JOIN brands b ON b.id=m.brand_id LEFT JOIN users u ON u.id=s.salesperson_id LEFT JOIN financing f ON f.id=s.financing_id LEFT JOIN trade_ins ti ON ti.id=s.trade_in_id`;
const id=(value:unknown)=>{const result=String(value??'');if(!/^[1-9]\d*$/.test(result))throw new HttpError(400,'Identifiant invalide');return result};
const grant=(request:Request,permission:string):PermissionScope|undefined=>request.rbac?.isSuperAdmin?'GLOBAL':request.rbac?.permissions.get(permission)??undefined;

export function saleScope(request:Request,permission:string,alias='s'){
  const value=grant(request,permission),agencyId=request.user?.agencyId,userId=request.user?.sub;
  if(value==='GLOBAL')return{sql:'1=1',params:[] as unknown[]};
  if(!agencyId)throw new HttpError(403,'Aucune agence associée');
  if(value==='CONCESSION')return{sql:`${alias}.agency_id IN (SELECT id FROM agencies WHERE concession_id=(SELECT concession_id FROM agencies WHERE id=?))`,params:[agencyId]};
  if(value==='AGENCY')return{sql:`${alias}.agency_id=?`,params:[agencyId]};
  if(value==='OWN')return{sql:`${alias}.agency_id=? AND ${alias}.salesperson_id=?`,params:[agencyId,userId]};
  throw new HttpError(403,`Scope manquant pour ${permission}`);
}

async function targetAgency(request:Request,permission:string,requested?:string){
  const value=grant(request,permission),current=request.user?.agencyId,target=requested??current;
  if(!target)throw new HttpError(403,'Aucune agence associée');
  if(value==='GLOBAL')return target;
  if(value==='OWN'||value==='AGENCY'){if(target!==current)throw new HttpError(403,'Agence hors périmètre');return target}
  if(value==='CONCESSION'){
    const[row]=await query<RowDataPacket[]>('SELECT id FROM agencies WHERE id=? AND is_active=TRUE AND concession_id=(SELECT concession_id FROM agencies WHERE id=?)',[target,current]);
    if(row)return target;
  }
  throw new HttpError(403,'Agence hors périmètre');
}

async function audit(connection:PoolConnection,request:Request,saleId:string,action:string,oldValues:unknown,newValues:unknown){await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,old_values,new_values,ip_address,user_agent) VALUES(?,'sales','sale',?,?,?,?,?,?)`,[request.user!.sub,saleId,action,oldValues==null?null:JSON.stringify(oldValues),newValues==null?null:JSON.stringify(newValues),request.ip??null,request.get('user-agent')??null])}
async function validateSalesperson(connection:PoolConnection,userId:string,agencyId:string){const[rows]=await connection.execute<RowDataPacket[]>(`SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.id=? AND u.agency_id=? AND u.is_active=TRUE AND r.is_active=TRUE AND p.is_active=TRUE AND p.code='sales.create' AND ${operationalCandidateSql('u')} LIMIT 1`,[userId,agencyId]);if(!rows[0])throw new HttpError(400,'Commercial inactif, non autorisé ou incompatible avec cette agence')}
async function assertCanAssign(request:Request){await assertPermission(request,'sales.assign');if(grant(request,'sales.assign')==='OWN')throw new HttpError(403,'Le scope OWN ne permet pas de réaffecter une vente')}

const hidePaymentDetails=(row:RowDataPacket,request:Request)=>request.rbac?.isSuperAdmin||request.rbac?.permissions.has('billing.payment.view')?row:{...row,invoice_amount_paid:null,invoice_balance_due:null,invoice_status:null,deposit_amount:0,balance_due:0};
export async function one(saleId:string,request:Request,permission='sales.view'){const scoped=saleScope(request,permission);const[row]=await query<RowDataPacket[]>(`${SELECT} WHERE s.id=? AND ${scoped.sql}`,[id(saleId),...scoped.params]);if(!row)throw new HttpError(404,'Vente introuvable');return hidePaymentDetails(row,request)}
export async function list(filters:Record<string,unknown>,request:Request){const scoped=saleScope(request,'sales.view'),where=[scoped.sql],params=[...scoped.params];for(const[field,column]of[['status','s.status'],['customerId','s.customer_id'],['salespersonId','s.salesperson_id'],['agencyId','s.agency_id']]as const)if(filters[field]){where.push(`${column}=?`);params.push(String(filters[field]))}if(filters.search){where.push(`(s.sale_number LIKE ? OR COALESCE(c.company_name,CONCAT_WS(' ',c.first_name,c.last_name)) LIKE ? OR v.vin LIKE ? OR v.stock_number LIKE ?)`);const term=`%${String(filters.search).trim()}%`;params.push(term,term,term,term)}if(filters.from){where.push('DATE(s.created_at)>=?');params.push(String(filters.from))}if(filters.to){where.push('DATE(s.created_at)<=?');params.push(String(filters.to))}return(await query<RowDataPacket[]>(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY s.created_at DESC`,params)).map(row=>hidePaymentDetails(row,request))}

export async function create(body:unknown,request:Request){
  const input=validateCreateSale(body),agencyId=await targetAgency(request,'sales.create',input.agencyId),createScope=grant(request,'sales.create');
  if(input.depositAmount>0)throw new HttpError(409,"L’acompte doit être enregistré comme un règlement distinct sur la facture de vente");
  if(input.discount>0&&!input.quotationId)await assertPermission(request,'sales.discount.manage');
  if(input.opportunityId&&!input.quotationId)throw new HttpError(400,'Un devis est obligatoire pour transformer une opportunité en vente');
  if(input.quotationId&&!input.opportunityId)throw new HttpError(400,'Le devis doit être lié à une opportunité');
  if(input.quotationId)await assertPermission(request,'quotations.convert');
  let requestedSalesperson=input.salespersonId??request.user!.sub;
  if(createScope==='OWN'&&requestedSalesperson!==request.user!.sub)throw new HttpError(403,'Le scope OWN impose le commercial connecté');
  if(requestedSalesperson!==request.user!.sub)await assertCanAssign(request);
  const result=await transaction(async connection=>{
    const[duplicate]=await connection.execute<RowDataPacket[]>('SELECT id,agency_id FROM sales WHERE idempotency_key=? FOR UPDATE',[input.idempotencyKey]);if(duplicate[0])return{saleId:String(duplicate[0].id),duplicate:true,agencyId:String(duplicate[0].agency_id)};
    const[agencyRows]=await connection.execute<RowDataPacket[]>('SELECT id FROM agencies WHERE id=? AND is_active=TRUE FOR UPDATE',[agencyId]);if(!agencyRows[0])throw new HttpError(400,'Agence inexistante ou inactive');
    const[customers]=await connection.execute<RowDataPacket[]>('SELECT id,agency_id FROM customers WHERE id=? FOR UPDATE',[input.customerId]);if(!customers[0])throw new HttpError(404,'Client introuvable');if(String(customers[0].agency_id)!==agencyId)throw new HttpError(403,'Client hors périmètre de la vente');
    const[vehicles]=await connection.execute<RowDataPacket[]>('SELECT id,agency_id,status,vin,stock_number,catalog_price,sale_price,purchase_price,refurbishment_cost,transport_cost,administrative_cost,additional_costs FROM vehicles WHERE id=? FOR UPDATE',[input.vehicleId]),vehicle=vehicles[0];if(!vehicle)throw new HttpError(404,'Véhicule introuvable');if(String(vehicle.agency_id)!==agencyId)throw new HttpError(403,'Véhicule hors périmètre de la vente');if(vehicle.status!=='available')throw new HttpError(409,'Ce véhicule n’est pas disponible');
    const[activeSale]=await connection.execute<RowDataPacket[]>(`SELECT s.id FROM sales s JOIN sale_items si ON si.sale_id=s.id WHERE si.vehicle_id=? AND s.status NOT IN('cancelled','delivered') FOR UPDATE`,[input.vehicleId]);if(activeSale[0])throw new HttpError(409,'Ce véhicule possède déjà une vente active');
    const[reservation]=await connection.execute<RowDataPacket[]>(`SELECT id FROM reservations WHERE vehicle_id=? AND status IN('pending','confirmed') AND (expires_at IS NULL OR expires_at>NOW()) FOR UPDATE`,[input.vehicleId]);if(reservation[0])throw new HttpError(409,'Ce véhicule possède déjà une réservation active');
    let opportunity:RowDataPacket|undefined,quotation:RowDataPacket|undefined,effectiveDiscount=input.discount,effectiveSubtotal=Number(vehicle.sale_price);
    if(input.opportunityId){const[rows]=await connection.execute<RowDataPacket[]>('SELECT id,lead_id,customer_id,assigned_user_id,stage FROM opportunities WHERE id=? FOR UPDATE',[input.opportunityId]);opportunity=rows[0];if(!opportunity||String(opportunity.customer_id)!==input.customerId)throw new HttpError(400,'Opportunité incompatible avec le client');if(!['negotiation','offer'].includes(String(opportunity.stage)))throw new HttpError(409,'L’opportunité doit avoir un devis en offre ou négociation');if(!opportunity.assigned_user_id)throw new HttpError(409,'L’opportunité doit avoir un commercial responsable');requestedSalesperson=String(opportunity.assigned_user_id);if(createScope==='OWN'&&requestedSalesperson!==request.user!.sub)throw new HttpError(403,'Cette opportunité appartient à un autre commercial');if(requestedSalesperson!==request.user!.sub)await assertCanAssign(request);const[existing]=await connection.execute<RowDataPacket[]>('SELECT id FROM sales WHERE opportunity_id=? FOR UPDATE',[input.opportunityId]);if(existing[0])throw new HttpError(409,'Cette opportunité a déjà été transformée en vente')}
    if(input.quotationId){
      const[rows]=await connection.execute<RowDataPacket[]>(`SELECT q.*,qi.vehicle_id,o.assigned_user_id,CASE WHEN q.valid_until IS NOT NULL AND q.valid_until<CURDATE() THEN 1 ELSE 0 END is_expired FROM quotations q JOIN quotation_items qi ON qi.quotation_id=q.id JOIN opportunities o ON o.id=q.opportunity_id WHERE q.id=? FOR UPDATE`,[input.quotationId]);
      quotation=rows[0];
      if(!quotation||String(quotation.opportunity_id)!==input.opportunityId||String(quotation.customer_id)!==input.customerId||String(quotation.vehicle_id)!==input.vehicleId)throw new HttpError(400,'Devis incompatible avec la vente');
      if(String(quotation.agency_id)!==agencyId)throw new HttpError(403,'Devis hors périmètre de la vente');
      const conversionScope=grant(request,'quotations.convert');
      if(conversionScope==='OWN'&&String(quotation.assigned_user_id)!==request.user!.sub)throw new HttpError(403,'Ce devis appartient à un autre commercial');
      if((conversionScope==='OWN'||conversionScope==='AGENCY')&&String(quotation.agency_id)!==String(request.user!.agencyId))throw new HttpError(403,'Devis hors agence');
      if(conversionScope==='CONCESSION'){
        const[allowedAgencies]=await connection.execute<RowDataPacket[]>('SELECT target.id FROM agencies target JOIN agencies current ON current.concession_id=target.concession_id WHERE target.id=? AND current.id=?',[quotation.agency_id,request.user!.agencyId]);
        if(!allowedAgencies[0])throw new HttpError(403,'Devis hors concession');
      }
      if(!['sent','negotiation'].includes(String(quotation.status)))throw new HttpError(409,'Seul un devis émis ou en négociation peut être transformé');
      if(Number(quotation.is_expired)===1)throw new HttpError(409,'Ce devis est expiré');
      effectiveDiscount=Number(quotation.discount_total);
      effectiveSubtotal=Number(quotation.subtotal);
      const[existing]=await connection.execute<RowDataPacket[]>('SELECT id FROM sales WHERE quotation_id=? FOR UPDATE',[input.quotationId]);if(existing[0])throw new HttpError(409,'Ce devis a déjà été transformé en vente');
    }
    await validateSalesperson(connection,requestedSalesperson,agencyId);
    // Final, locked backend gate for both direct sales and quotation conversions.
    assertVehicleMargin(vehicle,effectiveSubtotal-effectiveDiscount);
    const totals=quotation?{subtotal:Number(quotation.subtotal),discount:Number(quotation.discount_total),tax:Number(quotation.tax_total),total:Number(quotation.total),depositAmount:0,balanceDue:Number(quotation.total)}:{...saleTotals(effectiveSubtotal,effectiveDiscount,0),tax:0},saleNumber=`V-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8).toUpperCase()}`,[sale]=await connection.execute<ResultSetHeader>(`INSERT INTO sales(sale_number,customer_id,opportunity_id,quotation_id,agency_id,salesperson_id,status,subtotal,discount_total,tax_total,total,tax_mode,price_input_mode,tax_rate_snapshot,currency_code,deposit_amount,balance_due,notes,idempotency_key,created_by) VALUES(?,?,?,?,?,?,'reserved',?,?,?,?,?,?,?,?,?,?,?,?,?)`,[saleNumber,input.customerId,input.opportunityId??null,input.quotationId??null,agencyId,requestedSalesperson,totals.subtotal,totals.discount,totals.tax,totals.total,quotation?.tax_mode??'TAX_EXEMPT',quotation?.price_input_mode??'HT',Number(quotation?.tax_rate_snapshot??0),quotation?.currency_code??null,0,totals.balanceDue,input.notes,input.idempotencyKey,request.user!.sub]),saleId=String(sale.insertId);
    await connection.execute(`INSERT INTO sale_items(sale_id,vehicle_id,description,quantity,catalog_price,unit_price,discount,tax_rate,line_total) VALUES(?,?,?,1,?,?,?,?,?)`,[saleId,input.vehicleId,`${vehicle.vin} - ${vehicle.stock_number}`,vehicle.catalog_price,totals.subtotal,totals.discount,Number(quotation?.tax_rate_snapshot??0),totals.total]);
    await connection.execute(`INSERT INTO reservations(reservation_number,customer_id,vehicle_id,sale_id,created_by,status,amount) VALUES(?,?,?,?,?,'confirmed',0)`,[`RES-${randomUUID().slice(0,12).toUpperCase()}`,input.customerId,input.vehicleId,saleId,request.user!.sub]);
    const[changed]=await connection.execute<ResultSetHeader>("UPDATE vehicles SET status='reserved' WHERE id=? AND status='available'",[input.vehicleId]);if(changed.affectedRows!==1)throw new HttpError(409,'Le véhicule vient d’être réservé par une autre opération');
    await connection.execute("INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,'available','reserved',?,'Création vente')",[input.vehicleId,request.user!.sub]);
    if(opportunity&&quotation){await connection.execute("UPDATE opportunities SET stage='won',won_at=NOW(),lost_reason=NULL,lost_at=NULL WHERE id=?",[opportunity.id]);await connection.execute("UPDATE leads SET status='converted',converted_at=NOW() WHERE id=?",[opportunity.lead_id]);await connection.execute("UPDATE quotations SET status='accepted' WHERE id=?",[quotation.id])}
    await audit(connection,request,saleId,'sale.created',null,{saleNumber,agencyId,customerId:input.customerId,vehicleId:input.vehicleId,salespersonId:requestedSalesperson,...totals});return{saleId,duplicate:false,agencyId,saleNumber};
  });
  if(!result.duplicate){emitToAgency(result.agencyId,'sales:created',{id:result.saleId,saleNumber:result.saleNumber,vehicleId:input.vehicleId});await notifyPermissions({agencyId:result.agencyId,permissions:['sales.view'],excludeUserIds:[request.user!.sub],subject:'Nouvelle vente',message:`La vente ${result.saleNumber} a été créée.`,eventType:'sale.created',referenceType:'sale',referenceId:result.saleId,eventKey:`sale.created:${result.saleId}`})}
  return one(result.saleId,request,'sales.create');
}

export async function update(saleId:string,body:unknown,request:Request){
  const current=await one(saleId,request,'sales.update'),payload=(body??{})as Record<string,unknown>,sets:string[]=[],values:Array<string|null>=[],next:Record<string,unknown>={};
  if(!['draft','reserved'].includes(String(current.status)))throw new HttpError(409,'Une vente engagée ne permet plus de modifier ses données commerciales');
  if(Object.hasOwn(payload,'notes')){const notes=String(payload.notes??'').trim();if(notes.length>10000)throw new HttpError(400,'Notes trop longues');sets.push('notes=?');values.push(notes||null);next.notes=notes||null}
  if(Object.hasOwn(payload,'salespersonId')){await assertCanAssign(request);const salespersonId=id(payload.salespersonId);await transaction(connection=>validateSalesperson(connection,salespersonId,String(current.agency_id)));sets.push('salesperson_id=?');values.push(salespersonId);next.salespersonId=salespersonId}
  if(!sets.length)throw new HttpError(400,'Aucun champ de vente modifiable fourni');
  await transaction(async connection=>{await connection.execute(`UPDATE sales SET ${sets.join(',')} WHERE id=?`,[...values,id(saleId)]);await audit(connection,request,id(saleId),'sale.updated',{notes:current.notes,salespersonId:String(current.salesperson_id??'')},next)});emitToAgency(String(current.agency_id),'sales:updated',{id:saleId});return one(saleId,request,Object.hasOwn(payload,'salespersonId')?'sales.assign':'sales.update');
}

export async function updateStatus(saleId:string,value:unknown,reasonValue:unknown,request:Request,permission:'sales.confirm'|'sales.cancel'){
  const reason=String(reasonValue??'').trim(),scoped=saleScope(request,permission);
  const result=await transaction(async connection=>{
    const[rows]=await connection.execute<RowDataPacket[]>(`SELECT s.id,s.status,s.agency_id,s.salesperson_id,si.vehicle_id,v.status vehicle_status FROM sales s LEFT JOIN sale_items si ON si.sale_id=s.id AND si.vehicle_id IS NOT NULL LEFT JOIN vehicles v ON v.id=si.vehicle_id WHERE s.id=? AND ${scoped.sql} FOR UPDATE`,[id(saleId),...scoped.params] as Array<string|number>),sale=rows[0];if(!sale)throw new HttpError(404,'Vente introuvable');
    const status=assertSaleTransition(String(sale.status),value);if(status==='delivered')throw new HttpError(409,'La livraison effective doit être validée depuis le module Livraisons');
    if(status==='cancelled'){
      if(permission!=='sales.cancel')throw new HttpError(403,'Permission d’annulation requise');if(!reason)throw new HttpError(400,"Le motif d’annulation est obligatoire");if(['ready_for_delivery','delivered'].includes(String(sale.status)))throw new HttpError(409,'Une vente prête à livrer ou livrée ne peut plus être annulée');
      const[invoices]=await connection.execute<RowDataPacket[]>("SELECT id,amount_paid FROM invoices WHERE sale_id=? AND status<>'cancelled' FOR UPDATE",[saleId]);if(invoices.reduce((sum,row)=>sum+Number(row.amount_paid??0),0)>.001)throw new HttpError(409,'Une vente ayant reçu un paiement ne peut plus être annulée');
      const[deliveries]=await connection.execute<RowDataPacket[]>("SELECT id FROM deliveries WHERE sale_id=? AND status<>'cancelled' LIMIT 1 FOR UPDATE",[saleId]);if(deliveries[0])throw new HttpError(409,'Une vente dont la livraison est planifiée ne peut plus être annulée');
      for(const invoice of invoices)await cancelUnpaidInvoice(connection,String(invoice.id),reason,cancellationActor(request));
    }else if(permission!=='sales.confirm')throw new HttpError(403,'Permission de confirmation requise');
    if(status==='ready_for_delivery'){const[invoices]=await connection.execute<RowDataPacket[]>("SELECT id,balance_due FROM invoices WHERE sale_id=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1 FOR UPDATE",[saleId]);if(!invoices[0])throw new HttpError(409,'Une facture active est requise avant la mise en livraison');if(Number(invoices[0].balance_due)>.001)throw new HttpError(409,'La vente doit être entièrement réglée avant de pouvoir être déclarée prête à livrer')}
    let nextVehicleStatus=String(sale.vehicle_status??'');
    if(sale.vehicle_id&&status==='confirmed'){if(nextVehicleStatus!=='reserved')throw new HttpError(409,'Le véhicule réservé n’est plus disponible pour confirmation');nextVehicleStatus='sold'}
    if(sale.vehicle_id&&status==='cancelled'&&['reserved','sold'].includes(nextVehicleStatus))nextVehicleStatus='available';
    await connection.execute('UPDATE sales SET status=?,cancellation_reason=IF(?="cancelled",?,cancellation_reason) WHERE id=?',[status,status,reason||null,saleId]);
    if(sale.vehicle_id&&nextVehicleStatus!==String(sale.vehicle_status)){const[changed]=await connection.execute<ResultSetHeader>('UPDATE vehicles SET status=? WHERE id=? AND status=?',[nextVehicleStatus,sale.vehicle_id,sale.vehicle_status]);if(changed.affectedRows!==1)throw new HttpError(409,'Le véhicule a été modifié par une autre opération');await connection.execute('INSERT INTO vehicle_status_history(vehicle_id,old_status,new_status,changed_by,reason) VALUES(?,?,?,?,?)',[sale.vehicle_id,sale.vehicle_status,nextVehicleStatus,request.user!.sub,status==='cancelled'?reason:'Confirmation commerciale de la vente'])}
    if(status==='cancelled')await connection.execute("UPDATE reservations SET status='cancelled' WHERE sale_id=? AND status IN('pending','confirmed')",[saleId]);else if(status==='ordered')await connection.execute("UPDATE reservations SET status='converted' WHERE sale_id=? AND status IN('pending','confirmed')",[saleId]);
    await audit(connection,request,saleId,status==='cancelled'?'sale.cancelled':'sale.status_changed',{status:sale.status,vehicleStatus:sale.vehicle_status},{status,vehicleStatus:nextVehicleStatus,reason:reason||null});return{agencyId:String(sale.agency_id),status,vehicleId:sale.vehicle_id?String(sale.vehicle_id):null};
  });
  emitToAgency(result.agencyId,'sales:status',{id:saleId,status:result.status,vehicleId:result.vehicleId});if(result.status==='confirmed')await safelyArchive(`sale:${saleId}:confirmed`,()=>archiveSaleOrder(saleId,request.user!.sub));if(['cancelled','ready_for_delivery'].includes(result.status))await notifyPermissions({agencyId:result.agencyId,permissions:[result.status==='ready_for_delivery'?'delivery.view':'sales.view'],subject:result.status==='ready_for_delivery'?'Vente prête pour livraison':'Vente annulée',message:`La vente ${saleId} est au statut ${result.status}.`,eventType:`sale.${result.status}`,referenceType:'sale',referenceId:saleId,eventKey:`sale.status:${saleId}:${result.status}`});return one(saleId,request,permission);
}

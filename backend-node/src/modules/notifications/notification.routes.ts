import {Router} from 'express';
import type {RowDataPacket} from 'mysql2/promise';
import {execute,query,transaction} from '../../config/database.js';
import {asyncHandler} from '../../middleware/error-handler.js';
import {HttpError} from '../../shared/http-error.js';
import {requirePermission} from '../../middleware/require-permission.js';
import type {PermissionScope} from '../rbac/rbac.service.js';

export const notificationRouter=Router();
const routeId=(value:string|string[]|undefined)=>{const id=Array.isArray(value)?value[0]:value;if(!id||!/^[1-9]\d*$/.test(id))throw new HttpError(400,'Identifiant invalide');return id};
const text=(value:unknown,max=100)=>typeof value==='string'?value.trim().slice(0,max):'';
type NotificationViewScope='mine'|'agency'|'concession'|'global';
const scopeRank:Record<PermissionScope,number>={OWN:1,AGENCY:2,CONCESSION:3,GLOBAL:4},requestedRank:Record<NotificationViewScope,number>={mine:1,agency:2,concession:3,global:4};
export function notificationVisibility(request:any,raw:unknown){const requested=(text(raw)||'mine')as NotificationViewScope;if(!Object.hasOwn(requestedRank,requested))throw new HttpError(400,'Portée Notifications invalide');const granted=request.rbac?.isSuperAdmin?'GLOBAL':request.rbac?.permissions.get('notifications.view');if(!granted||requestedRank[requested]>scopeRank[granted as PermissionScope])throw new HttpError(403,'Portée Notifications non autorisée');if(requested==='mine')return{scope:requested,sql:'recipient.id=?',params:[request.user!.sub]};if(requested==='agency')return{scope:requested,sql:'recipient.agency_id=?',params:[request.user!.agencyId]};if(requested==='concession')return{scope:requested,sql:'recipient_agency.concession_id=(SELECT concession_id FROM agencies WHERE id=?)',params:[request.user!.agencyId]};return{scope:requested,sql:'1=1',params:[] as unknown[]}}

notificationRouter.get('/notifications',requirePermission('notifications.view'),asyncHandler(async(request,response)=>{
  const page=Math.max(1,Number(request.query.page)||1),pageSize=Math.min(100,Math.max(1,Number(request.query.pageSize)||25));
  const visibility=notificationVisibility(request,request.query.scope),baseWhere=[visibility.sql,`n.channel='notification'`,`n.archived_at IS NULL`,`n.deleted_at IS NULL`],baseParams:unknown[]=[...visibility.params];
  for(const[key,column]of[['eventType','event_type'],['referenceType','reference_type'],['priority','priority']]as const)if(request.query[key]){baseWhere.push(`n.${column}=?`);baseParams.push(text(request.query[key]))}
  if(request.query.from){baseWhere.push('DATE(n.created_at)>=?');baseParams.push(text(request.query.from,10))}
  if(request.query.to){baseWhere.push('DATE(n.created_at)<=?');baseParams.push(text(request.query.to,10))}
  const listWhere=[...baseWhere],listParams=[...baseParams];
  if(['1','true'].includes(text(request.query.unreadOnly)))listWhere.push('n.read_at IS NULL');
  const listSql=listWhere.join(' AND '),baseSql=baseWhere.join(' AND ');
  const from=`notifications n JOIN users recipient ON recipient.id=n.user_id JOIN agencies recipient_agency ON recipient_agency.id=recipient.agency_id`,groupKey=`COALESCE(NULLIF(SUBSTRING_INDEX(n.event_key,':user:',1),''),CONCAT('notification:',n.id))`;
  const[[total],[unread],items]=await Promise.all([
    query<RowDataPacket[]>(`SELECT COUNT(DISTINCT ${groupKey}) total FROM ${from} WHERE ${listSql}`,listParams),
    query<RowDataPacket[]>(`SELECT COUNT(DISTINCT CASE WHEN n.read_at IS NULL THEN ${groupKey} END) total FROM ${from} WHERE ${baseSql}`,baseParams),
    query<RowDataPacket[]>(`WITH visible AS (SELECT n.id,n.subject,n.message,n.delivery_status,n.event_type,n.priority,n.read_at,n.reference_type,n.reference_id,n.created_at,n.user_id,${groupKey} event_group,ROW_NUMBER() OVER(PARTITION BY ${groupKey} ORDER BY n.created_at DESC,n.id DESC) position_in_group,MIN(n.read_at IS NOT NULL) OVER(PARTITION BY ${groupKey}) all_read FROM ${from} WHERE ${listSql}) SELECT id,subject,message,delivery_status,event_type,priority,IF(all_read,read_at,NULL) read_at,reference_type,reference_id,created_at,user_id FROM visible WHERE position_in_group=1 ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,[...listParams,pageSize,(page-1)*pageSize]),
  ]);
  response.json({scope:visibility.scope,items:items.map(item=>({id:String(item.id),subject:item.subject??'Notification',message:item.message,deliveryStatus:item.delivery_status??'sent',eventType:item.event_type,priority:item.priority??'normal',readAt:item.read_at,referenceType:item.reference_type,referenceId:item.reference_id==null?null:String(item.reference_id),createdAt:item.created_at,isRead:item.read_at!=null,isOwn:String(item.user_id)===String(request.user!.sub)})),page,pageSize,total:Number(total?.total??0),unreadCount:Number(unread?.total??0)});
}));

notificationRouter.get('/notifications/unread-count',requirePermission('notifications.view'),asyncHandler(async(request,response)=>{const[row]=await query<RowDataPacket[]>(`SELECT COUNT(*) unreadCount FROM notifications WHERE user_id=? AND channel='notification' AND read_at IS NULL AND archived_at IS NULL AND deleted_at IS NULL`,[request.user!.sub]);response.json({unreadCount:Number(row?.unreadCount??0)})}));
notificationRouter.patch('/notifications/read-all',requirePermission('notifications.update'),asyncHandler(async(request,response)=>{const result=await execute(`UPDATE notifications SET read_at=NOW() WHERE user_id=? AND channel='notification' AND read_at IS NULL AND archived_at IS NULL AND deleted_at IS NULL`,[request.user!.sub]);response.json({success:true,updated:result.affectedRows})}));
notificationRouter.patch('/notifications/:id/read',requirePermission('notifications.update'),asyncHandler(async(request,response)=>{const result=await execute(`UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND user_id=? AND channel='notification' AND archived_at IS NULL AND deleted_at IS NULL`,[routeId(request.params.id),request.user!.sub]);if(!result.affectedRows)throw new HttpError(404,'Notification introuvable');response.json({success:true})}));
notificationRouter.patch('/notifications/:id/archive',requirePermission('notifications.archive'),asyncHandler(async(request,response)=>{
  const notificationId=routeId(request.params.id),userId=request.user!.sub;
  const archived=await transaction(async connection=>{
    const[rows]=await connection.execute<RowDataPacket[]>(`SELECT id,archived_at FROM notifications WHERE id=? AND user_id=? AND channel='notification' AND deleted_at IS NULL FOR UPDATE`,[notificationId,userId]);
    const current=rows[0];if(!current)throw new HttpError(404,'Notification introuvable');
    if(current.archived_at)return false;
    await connection.execute('UPDATE notifications SET archived_at=NOW(),archived_by=? WHERE id=?',[userId,notificationId]);
    await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,new_values,ip_address,user_agent) VALUES(?,'notifications','notification',?,'notification.archived',?,?,?)`,[userId,notificationId,JSON.stringify({archived:true}),request.ip??null,text(request.get('user-agent'),500)||null]);
    return true;
  });
  response.json({success:true,archived});
}));
notificationRouter.delete('/notifications/:id',requirePermission('notifications.delete'),asyncHandler(async(request,response)=>{
  const notificationId=routeId(request.params.id),userId=request.user!.sub;
  const deleted=await transaction(async connection=>{
    const[rows]=await connection.execute<RowDataPacket[]>(`SELECT id,deleted_at FROM notifications WHERE id=? AND user_id=? AND channel='notification' FOR UPDATE`,[notificationId,userId]);
    const current=rows[0];if(!current)throw new HttpError(404,'Notification introuvable');
    if(current.deleted_at)return false;
    await connection.execute('UPDATE notifications SET deleted_at=NOW(),deleted_by=? WHERE id=?',[userId,notificationId]);
    await connection.execute(`INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,new_values,ip_address,user_agent) VALUES(?,'notifications','notification',?,'notification.deleted',?,?,?)`,[userId,notificationId,JSON.stringify({deleted:true}),request.ip??null,text(request.get('user-agent'),500)||null]);
    return true;
  });
  response.json({success:true,deleted});
}));

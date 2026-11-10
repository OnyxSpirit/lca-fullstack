import{Router}from'express';
import type{NextFunction,Request,Response}from'express';
import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import{query}from'../../config/database.js';
import{asyncHandler}from'../../middleware/error-handler.js';
import{HttpError}from'../../shared/http-error.js';
import{assertAgencyBusinessPermission,assertAgencyBusinessPermissionInContext,authorizeAgencyResource,requireAgencyBusinessPermission,resolveRequestAgencyContext,withCurrentAgencyAuthorization,type AgencyBusinessScope,type AuthorizationRunner}from'../rbac/agency-authorization.js';
import type{AgencyRbacContext}from'../rbac/agency-rbac.service.js';
import{writeAudit}from'../activity/audit-writer.js';

export const notificationRouter=Router();
const routeId=(value:string|string[]|undefined)=>{const id=Array.isArray(value)?value[0]:value;if(!id||!/^[1-9]\d*$/.test(id))throw new HttpError(400,'Identifiant invalide');return id};
const requireNotificationId=(request:Request,_response:Response,next:NextFunction)=>{try{routeId(request.params.id);next()}catch(error){next(error)}};
const text=(value:unknown,max=100)=>typeof value==='string'?value.trim().slice(0,max):'';
type NotificationViewScope='mine'|'agency';
interface NotificationRow extends RowDataPacket{id:string;user_id:string;operation_agency_id:string|null;archived_at:string|null;deleted_at:string|null}

export async function notificationVisibility(request:Request,raw:unknown,providedContext?:AgencyRbacContext){
 const value=text(raw)||'mine';if(!['mine','agency','concession','global'].includes(value))throw new HttpError(400,'Portée Notifications invalide');
 const context=providedContext??await resolveRequestAgencyContext(request),scope:AgencyBusinessScope=providedContext?assertAgencyBusinessPermissionInContext(context,'notifications.view'):await assertAgencyBusinessPermission(request,'notifications.view');
 if(value==='concession'||value==='global')throw new HttpError(403,'Portée Notifications non autorisée');
 const requested=value as NotificationViewScope;
 if(requested==='agency'){if(scope!=='AGENCY')throw new HttpError(403,'Portée Notifications non autorisée');return{scope:requested,sql:'n.operation_agency_id=?',params:[context.activeAgencyId!]}}
 return{scope:requested,sql:'n.user_id=? AND (n.operation_agency_id IS NULL OR n.operation_agency_id=?)',params:[context.userId,context.activeAgencyId!]};
}

const notificationStrategy=(userId:string)=>({
 load:async(runner:AuthorizationRunner,id:string,lock:'none'|'share'|'update')=>{const suffix=lock==='share'?' FOR SHARE':lock==='update'?' FOR UPDATE':'';const[rows]=await runner.execute<NotificationRow[]>(`SELECT id,user_id,operation_agency_id,archived_at,deleted_at FROM notifications WHERE id=? AND user_id=? AND channel='notification'${suffix}`,[id,userId]);return rows[0]??null},
 agencyId:(row:NotificationRow)=>row.operation_agency_id==null?null:String(row.operation_agency_id),
 agencyIndependent:(row:NotificationRow)=>row.operation_agency_id==null,
 isOwner:({resource,userId:actorId}:{resource:NotificationRow;userId:string})=>String(resource.user_id)===actorId,
});

notificationRouter.get('/notifications',requireAgencyBusinessPermission('notifications.view'),asyncHandler(async(request,response)=>{
 const page=Math.max(1,Number(request.query.page)||1),pageSize=Math.min(100,Math.max(1,Number(request.query.pageSize)||25));
 const visibility=await notificationVisibility(request,request.query.scope),baseWhere=[visibility.sql,`n.channel='notification'`,`n.archived_at IS NULL`,`n.deleted_at IS NULL`],baseParams:unknown[]=[...visibility.params];
 for(const[key,column]of[['eventType','event_type'],['referenceType','reference_type'],['priority','priority']]as const)if(request.query[key]){baseWhere.push(`n.${column}=?`);baseParams.push(text(request.query[key]))}
 if(request.query.from){baseWhere.push('DATE(n.created_at)>=?');baseParams.push(text(request.query.from,10))}
 if(request.query.to){baseWhere.push('DATE(n.created_at)<=?');baseParams.push(text(request.query.to,10))}
 const listWhere=[...baseWhere],listParams=[...baseParams];if(['1','true'].includes(text(request.query.unreadOnly)))listWhere.push('n.read_at IS NULL');
 const listSql=listWhere.join(' AND '),baseSql=baseWhere.join(' AND '),from='notifications n',groupKey=`COALESCE(NULLIF(SUBSTRING_INDEX(n.event_key,':user:',1),''),CONCAT('notification:',n.id))`;
 const[[total],[unread],items]=await Promise.all([
  query<RowDataPacket[]>(`SELECT COUNT(DISTINCT ${groupKey}) total FROM ${from} WHERE ${listSql}`,listParams),
  query<RowDataPacket[]>(`SELECT COUNT(DISTINCT CASE WHEN n.read_at IS NULL THEN ${groupKey} END) total FROM ${from} WHERE ${baseSql}`,baseParams),
  query<RowDataPacket[]>(`WITH visible AS (SELECT n.id,n.subject,n.message,n.delivery_status,n.event_type,n.priority,n.read_at,n.reference_type,n.reference_id,n.created_at,n.user_id,n.actor_type,n.actor_user_id,n.actor_display_name_snapshot,n.operation_agency_id,n.operation_agency_name_snapshot,${groupKey} event_group,ROW_NUMBER() OVER(PARTITION BY ${groupKey} ORDER BY n.created_at DESC,n.id DESC) position_in_group,MIN(n.read_at IS NOT NULL) OVER(PARTITION BY ${groupKey}) all_read FROM ${from} WHERE ${listSql}) SELECT id,subject,message,delivery_status,event_type,priority,IF(all_read,read_at,NULL) read_at,reference_type,reference_id,created_at,user_id,actor_type,actor_user_id,actor_display_name_snapshot,operation_agency_id,operation_agency_name_snapshot FROM visible WHERE position_in_group=1 ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,[...listParams,pageSize,(page-1)*pageSize]),
 ]);
 response.json({scope:visibility.scope,items:items.map(item=>({id:String(item.id),subject:item.subject??'Notification',message:item.message,deliveryStatus:item.delivery_status??'sent',eventType:item.event_type,priority:item.priority??'normal',readAt:item.read_at,referenceType:item.reference_type,referenceId:item.reference_id==null?null:String(item.reference_id),createdAt:item.created_at,isRead:item.read_at!=null,isOwn:String(item.user_id)===String(request.user!.sub),actorType:String(item.actor_type??'UNKNOWN').toLowerCase(),actorUserId:item.actor_user_id==null?null:String(item.actor_user_id),actorDisplayNameSnapshot:item.actor_display_name_snapshot,operationAgencyId:item.operation_agency_id==null?null:String(item.operation_agency_id),operationAgencyNameSnapshot:item.operation_agency_name_snapshot})),page,pageSize,total:Number(total?.total??0),unreadCount:Number(unread?.total??0)});
}));

notificationRouter.get('/notifications/unread-count',requireAgencyBusinessPermission('notifications.view'),asyncHandler(async(request,response)=>{const context=await resolveRequestAgencyContext(request),[row]=await query<RowDataPacket[]>(`SELECT COUNT(*) unreadCount FROM notifications n WHERE n.user_id=? AND (n.operation_agency_id IS NULL OR n.operation_agency_id=?) AND n.channel='notification' AND n.read_at IS NULL AND n.archived_at IS NULL AND n.deleted_at IS NULL`,[context.userId,context.activeAgencyId]);response.json({unreadCount:Number(row?.unreadCount??0)})}));

notificationRouter.patch('/notifications/read-all',requireAgencyBusinessPermission('notifications.update'),asyncHandler(async(request,response)=>{const updated=await withCurrentAgencyAuthorization(request,async(connection,context)=>{assertAgencyBusinessPermissionInContext(context,'notifications.update');const[result]=await connection.execute(`UPDATE notifications SET read_at=NOW() WHERE user_id=? AND (operation_agency_id IS NULL OR operation_agency_id=?) AND channel='notification' AND read_at IS NULL AND archived_at IS NULL AND deleted_at IS NULL`,[context.userId,context.activeAgencyId]);return(result as any).affectedRows as number});response.json({success:true,updated})}));

async function mutateNotification(request:Request,permission:string,kind:'read'|'archive'|'delete'){
 const notificationId=routeId(request.params.id);
 return withCurrentAgencyAuthorization(request,async(connection,context)=>{
  assertAgencyBusinessPermissionInContext(context,permission);
  const{resource}=await authorizeAgencyResource(request,permission,notificationId,notificationStrategy(context.userId),{runner:connection as unknown as AuthorizationRunner,lock:'update',context});
  if(kind==='read'){if(resource.archived_at||resource.deleted_at)throw new HttpError(404,'Notification introuvable');const[result]=await connection.execute(`UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND user_id=? AND channel='notification' AND archived_at IS NULL AND deleted_at IS NULL`,[notificationId,context.userId]);if(!(result as any).affectedRows)throw new HttpError(404,'Notification introuvable');return true}
  const column=kind==='archive'?'archived_at':'deleted_at',actorColumn=kind==='archive'?'archived_by':'deleted_by';if(resource[column])return false;
  await connection.execute(`UPDATE notifications SET ${column}=NOW(),${actorColumn}=? WHERE id=?`,[context.userId,notificationId]);
  await writeAudit(connection as PoolConnection,request,{module:'notifications',entityType:'notification',entityId:notificationId,action:`notification.${kind==='archive'?'archived':'deleted'}`,newValues:{[kind==='archive'?'archived':'deleted']:true},context:resource.operation_agency_id?{mode:'EXPLICIT',agencyId:String(resource.operation_agency_id)}:{mode:'UNKNOWN',reason:'Notification personnelle indépendante d’une agence'}});
  return true;
 });
}

notificationRouter.patch('/notifications/:id/read',requireNotificationId,requireAgencyBusinessPermission('notifications.update'),asyncHandler(async(request,response)=>{await mutateNotification(request,'notifications.update','read');response.json({success:true})}));
notificationRouter.patch('/notifications/:id/archive',requireNotificationId,requireAgencyBusinessPermission('notifications.archive'),asyncHandler(async(request,response)=>{response.json({success:true,archived:await mutateNotification(request,'notifications.archive','archive')})}));
notificationRouter.delete('/notifications/:id',requireNotificationId,requireAgencyBusinessPermission('notifications.delete'),asyncHandler(async(request,response)=>{response.json({success:true,deleted:await mutateNotification(request,'notifications.delete','delete')})}));

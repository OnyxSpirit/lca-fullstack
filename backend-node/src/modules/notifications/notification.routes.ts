import {Router} from 'express';
import type {RowDataPacket} from 'mysql2/promise';
import {execute,query} from '../../config/database.js';
import {asyncHandler} from '../../middleware/error-handler.js';
import {HttpError} from '../../shared/http-error.js';

export const notificationRouter=Router();
const routeId=(value:string|string[]|undefined)=>{const id=Array.isArray(value)?value[0]:value;if(!id||!/^[1-9]\d*$/.test(id))throw new HttpError(400,'Identifiant invalide');return id};
const text=(value:unknown,max=100)=>typeof value==='string'?value.trim().slice(0,max):'';

notificationRouter.get('/notifications',asyncHandler(async(request,response)=>{
  const page=Math.max(1,Number(request.query.page)||1),pageSize=Math.min(100,Math.max(1,Number(request.query.pageSize)||25));
  const baseWhere=[`user_id=?`,`channel='notification'`],baseParams:unknown[]=[request.user!.sub];
  for(const[key,column]of[['eventType','event_type'],['referenceType','reference_type'],['priority','priority']]as const)if(request.query[key]){baseWhere.push(`${column}=?`);baseParams.push(text(request.query[key]))}
  if(request.query.from){baseWhere.push('DATE(created_at)>=?');baseParams.push(text(request.query.from,10))}
  if(request.query.to){baseWhere.push('DATE(created_at)<=?');baseParams.push(text(request.query.to,10))}
  const listWhere=[...baseWhere],listParams=[...baseParams];
  if(['1','true'].includes(text(request.query.unreadOnly)))listWhere.push('read_at IS NULL');
  const listSql=listWhere.join(' AND '),baseSql=baseWhere.join(' AND ');
  const[[total],[unread],items]=await Promise.all([
    query<RowDataPacket[]>(`SELECT COUNT(*) total FROM notifications WHERE ${listSql}`,listParams),
    query<RowDataPacket[]>(`SELECT COUNT(*) total FROM notifications WHERE ${baseSql} AND read_at IS NULL`,baseParams),
    query<RowDataPacket[]>(`SELECT id,subject,message,delivery_status,event_type,priority,read_at,reference_type,reference_id,created_at FROM notifications WHERE ${listSql} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,[...listParams,pageSize,(page-1)*pageSize]),
  ]);
  response.json({items:items.map(item=>({id:String(item.id),subject:item.subject??'Notification',message:item.message,deliveryStatus:item.delivery_status??'sent',eventType:item.event_type,priority:item.priority??'normal',readAt:item.read_at,referenceType:item.reference_type,referenceId:item.reference_id==null?null:String(item.reference_id),createdAt:item.created_at,isRead:item.read_at!=null})),page,pageSize,total:Number(total?.total??0),unreadCount:Number(unread?.total??0)});
}));

notificationRouter.get('/notifications/unread-count',asyncHandler(async(request,response)=>{const[row]=await query<RowDataPacket[]>(`SELECT COUNT(*) unreadCount FROM notifications WHERE user_id=? AND channel='notification' AND read_at IS NULL`,[request.user!.sub]);response.json({unreadCount:Number(row?.unreadCount??0)})}));
notificationRouter.patch('/notifications/read-all',asyncHandler(async(request,response)=>{const result=await execute(`UPDATE notifications SET read_at=NOW() WHERE user_id=? AND channel='notification' AND read_at IS NULL`,[request.user!.sub]);response.json({success:true,updated:result.affectedRows})}));
notificationRouter.patch('/notifications/:id/read',asyncHandler(async(request,response)=>{const result=await execute(`UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=? AND user_id=? AND channel='notification'`,[routeId(request.params.id),request.user!.sub]);if(!result.affectedRows)throw new HttpError(404,'Notification introuvable');response.json({success:true})}));
notificationRouter.delete('/notifications/:id',asyncHandler(async(request,response)=>{const result=await execute(`DELETE FROM notifications WHERE id=? AND user_id=? AND channel='notification'`,[routeId(request.params.id),request.user!.sub]);if(!result.affectedRows)throw new HttpError(404,'Notification introuvable');response.json({success:true})}));

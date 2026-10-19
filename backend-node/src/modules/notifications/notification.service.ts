import type { RowDataPacket } from 'mysql2/promise';
import { execute, query } from '../../config/database.js';
import { emitToUser } from '../../realtime/socket.js';
import { HttpError } from '../../shared/http-error.js';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationActorType = 'human' | 'system';
export interface CreateNotificationInput {
  userId: string; subject: string; message: string; eventType?: string | null;
  referenceType?: string | null; referenceId?: string | null; priority?: NotificationPriority;
  channel?: 'notification' | 'email' | 'sms'; eventKey?: string | null;
  actorType: NotificationActorType; actorUserId?: string | null; operationAgencyId?: string | null;
}
interface HistoricalContext {
  actorType: NotificationActorType; actorUserId: string | null; actorDisplayNameSnapshot: string | null;
  operationAgencyId: string | null; operationAgencyNameSnapshot: string | null;
}
async function resolveHistoricalContext(input: CreateNotificationInput): Promise<HistoricalContext> {
  if (input.actorType === 'human' && !input.actorUserId) throw new HttpError(500, 'Auteur humain de la notification non renseigné');
  if (input.actorType === 'system' && input.actorUserId) throw new HttpError(500, 'Une notification système ne peut pas avoir d’auteur utilisateur');
  let actorDisplayNameSnapshot: string | null = null;
  if (input.actorUserId) {
    const [actor] = await query<RowDataPacket[]>(`SELECT id,TRIM(CONCAT(first_name,' ',last_name)) display_name FROM users WHERE id=?`, [input.actorUserId]);
    if (!actor) throw new HttpError(500, 'Auteur de la notification introuvable');
    actorDisplayNameSnapshot = String(actor.display_name);
  }
  let operationAgencyNameSnapshot: string | null = null;
  if (input.operationAgencyId) {
    const [agency] = await query<RowDataPacket[]>('SELECT id,name FROM agencies WHERE id=?', [input.operationAgencyId]);
    if (!agency) throw new HttpError(500, 'Agence d’origine de la notification introuvable');
    operationAgencyNameSnapshot = String(agency.name);
  }
  return {actorType: input.actorType, actorUserId: input.actorUserId ?? null, actorDisplayNameSnapshot, operationAgencyId: input.operationAgencyId ?? null, operationAgencyNameSnapshot};
}
async function persistUserNotification(input: CreateNotificationInput, resolvedContext?: HistoricalContext) {
  const subject=input.subject.trim(),message=input.message.trim(),priority=input.priority??'normal';
  if(!subject||!message)throw new HttpError(400,'Titre et message de notification requis');
  if(subject.length>255||message.length>10000)throw new HttpError(400,'Contenu de notification trop long');
  if(!['low','normal','high','urgent'].includes(priority))throw new HttpError(400,'Priorité de notification invalide');
  const[active]=await query<RowDataPacket[]>(`SELECT u.id FROM users u WHERE u.id=? AND u.is_active=TRUE AND EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.is_active=TRUE JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE ur.user_id=u.id AND p.code='notifications.view')`,[input.userId]);
  if(!active)return null;
  const context=resolvedContext??await resolveHistoricalContext(input),channel=input.channel??'notification';
  const result=await execute(`INSERT IGNORE INTO notifications(user_id,channel,subject,message,status,delivery_status,sent_at,reference_type,reference_id,event_type,priority,event_key,actor_type,actor_user_id,actor_display_name_snapshot,operation_agency_id,operation_agency_name_snapshot) VALUES(?,?,?,?,?,'sent',NOW(),?,?,?,?,?,?,?,?,?,?)`,[input.userId,channel,subject,message,'sent',input.referenceType??null,input.referenceId??null,input.eventType??null,priority,input.eventKey??null,context.actorType.toUpperCase(),context.actorUserId,context.actorDisplayNameSnapshot,context.operationAgencyId,context.operationAgencyNameSnapshot]);
  if(!result.affectedRows)return null;
  const record={id:String(result.insertId),subject,message,eventType:input.eventType??null,referenceType:input.referenceType??null,referenceId:input.referenceId??null,priority,createdAt:new Date().toISOString(),readAt:null,isRead:false,...context};
  if(channel==='notification')emitToUser(input.userId,'notifications:created',{id:record.id});
  return record;
}
export async function createUserNotification(input:CreateNotificationInput){return persistUserNotification(input)}
export interface NotifyPermissionsInput extends Omit<CreateNotificationInput,'userId'|'operationAgencyId'>{agencyId:string;permissions:string[];excludeUserIds?:string[]}
export async function notifyPermissions(input:NotifyPermissionsInput){const excluded=new Set((input.excludeUserIds??[]).map(String)),marks=input.permissions.map(()=>'?').join(',');if(!marks)return 0;const users=await query<RowDataPacket[]>(`SELECT DISTINCT u.id FROM users u JOIN agencies ua ON ua.id=u.agency_id JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE u.is_active=TRUE AND r.is_active=TRUE AND p.is_active=TRUE AND p.code IN (${marks}) AND (rp.scope='GLOBAL' OR (rp.scope='CONCESSION' AND ua.concession_id=(SELECT concession_id FROM agencies WHERE id=?)) OR (rp.scope='AGENCY' AND ua.id=?))`,[...input.permissions,input.agencyId,input.agencyId]);const base={...input,userId:'0',operationAgencyId:input.agencyId},context=await resolveHistoricalContext(base);let created=0;for(const user of users){const userId=String(user.id);if(excluded.has(userId))continue;try{if(await persistUserNotification({...base,userId,eventKey:input.eventKey?`${input.eventKey}:user:${userId}`:null},context))created++}catch(error){console.error('Notification non créée',error)}}return created}

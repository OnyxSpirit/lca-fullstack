import type { RowDataPacket } from 'mysql2/promise';
import { execute, query } from '../../config/database.js';
import { emitToUser } from '../../realtime/socket.js';

interface RecipientRow extends RowDataPacket { id: string }

interface CrmNotificationInput {
  leadId: string;
  agencyId: string | null;
  assignedUserId?: string | null;
  actorUserId: string;
  subject: string;
  message: string;
}

export async function notifyCrm(input: CrmNotificationInput) {
  const recipients=new Set<string>();
  if(input.assignedUserId)recipients.add(String(input.assignedUserId));
  if(input.agencyId){
    const managers=await query<RecipientRow[]>(`SELECT DISTINCT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.is_active=TRUE AND u.agency_id=? AND r.code='SALES_MANAGER'`,[input.agencyId]);
    managers.forEach(row=>recipients.add(String(row.id)));
  }
  for(const userId of recipients){
    const result=await execute(`INSERT INTO notifications(user_id,channel,subject,message,status,sent_at,reference_type,reference_id) VALUES(?,'notification',?,?,'sent',NOW(),'lead',?)`,[userId,input.subject,input.message,input.leadId]);
    emitToUser(userId,'notifications:created',{id:String(result.insertId),userId,subject:input.subject,message:input.message,status:'sent',referenceType:'lead',referenceId:input.leadId,createdAt:new Date().toISOString()});
  }
  return recipients.size;
}

import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {HttpError} from '../../shared/http-error.js';

/** A system administrator can authorize work without becoming an operational assignee. */
export const operationalCandidateSql=(alias='u')=>`NOT EXISTS(SELECT 1 FROM user_roles system_assignment JOIN roles system_role ON system_role.id=system_assignment.role_id WHERE system_assignment.user_id=${alias}.id AND system_role.code='SUPER_ADMIN' AND system_role.is_system=TRUE)`;

export async function assertOperationalCandidate(connection:PoolConnection,userId:string){
  const[rows]=await connection.execute<RowDataPacket[]>(`SELECT u.id FROM users u WHERE u.id=? AND u.is_active=TRUE AND ${operationalCandidateSql('u')} LIMIT 1`,[userId]);
  if(!rows[0])throw new HttpError(400,'Un administrateur système ne peut pas être affecté à une opération métier.');
}

import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {HttpError} from '../../shared/http-error.js';

export async function requireCrmAppointmentForTestDrive(connection:PoolConnection,leadId:string|null|undefined){
  if(!leadId)return null;
  const[rows]=await connection.execute<RowDataPacket[]>(`
    SELECT o.id,o.stage,
      EXISTS(
        SELECT 1 FROM follow_ups f
        JOIN activities a ON a.id=f.activity_id
        WHERE f.lead_id=o.lead_id
          AND f.opportunity_id=o.id
          AND a.type='appointment'
          AND f.status IN('pending','completed')
      ) has_valid_appointment
    FROM opportunities o
    WHERE o.lead_id=?
    ORDER BY o.id DESC
    LIMIT 1 FOR UPDATE`,[leadId]);
  const opportunity=rows[0];
  if(!opportunity||opportunity.stage!=='appointment'||!Boolean(opportunity.has_valid_appointment)){
    throw new HttpError(409,'Un rendez-vous doit être enregistré avant de démarrer l’essai');
  }
  return String(opportunity.id);
}

export async function markCrmTestDriveStarted(connection:PoolConnection,opportunityId:string|null){
  if(!opportunityId)return;
  const[result]=await connection.execute("UPDATE opportunities SET stage='test_drive' WHERE id=? AND stage='appointment'",[opportunityId]);
  if(!('affectedRows'in result)||Number(result.affectedRows)!==1)throw new HttpError(409,'Le rendez-vous CRM n’est plus valide pour cet essai');
}

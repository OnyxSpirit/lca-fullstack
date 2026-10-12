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

export async function assertTestDriveStartAvailable(connection:PoolConnection,input:{vehicleId:string;advisorId:string;agencyId:string;visitId?:string;scheduledAt?:Date;durationMinutes?:number;excludeDriveId?:string}){
  if(input.visitId){
    const[visits]=await connection.execute<RowDataPacket[]>('SELECT id FROM showroom_visits WHERE id=? FOR UPDATE',[input.visitId]);
    if(!visits[0])throw new HttpError(404,'Visite showroom introuvable');
  }
  const[vehicles]=await connection.execute<RowDataPacket[]>('SELECT id,mileage,status,agency_id,is_commercial_stock,archived_at FROM vehicles WHERE id=? FOR UPDATE',[input.vehicleId]),vehicle=vehicles[0];
  if(!vehicle||String(vehicle.agency_id)!==input.agencyId||!Boolean(vehicle.is_commercial_stock)||vehicle.archived_at||vehicle.status!=='available')throw new HttpError(409,'Véhicule indisponible pour un essai');
  const[advisors]=await connection.execute<RowDataPacket[]>('SELECT id FROM users WHERE id=? FOR UPDATE',[input.advisorId]);
  if(!advisors[0])throw new HttpError(409,'Commercial indisponible pour un essai');
  const scheduledAt=input.scheduledAt??new Date(),durationMinutes=input.durationMinutes??30,end=new Date(scheduledAt.getTime()+durationMinutes*60000),exclude=input.excludeDriveId??'0';
  const overlap=`status IN ('planned','in_progress') AND id<>? AND ((scheduled_at IS NULL AND status='in_progress') OR (scheduled_at<? AND DATE_ADD(scheduled_at,INTERVAL duration_minutes MINUTE)>?))`;
  const[vehicleDrives]=await connection.execute<RowDataPacket[]>(`SELECT id FROM showroom_test_drives WHERE vehicle_id=? AND ${overlap} FOR UPDATE`,[input.vehicleId,exclude,end,scheduledAt]);
  if(vehicleDrives.length)throw new HttpError(409,'Ce véhicule est déjà réservé pour un essai en cours',{code:'TEST_DRIVE_VEHICLE_CONFLICT'});
  const[advisorDrives]=await connection.execute<RowDataPacket[]>(`SELECT id FROM showroom_test_drives WHERE advisor_id=? AND ${overlap} FOR UPDATE`,[input.advisorId,exclude,end,scheduledAt]);
  if(advisorDrives.length)throw new HttpError(409,'Ce commercial est déjà affecté à un essai en cours',{code:'TEST_DRIVE_ADVISOR_CONFLICT'});
  if(input.visitId){const[visitDrives]=await connection.execute<RowDataPacket[]>(`SELECT id FROM showroom_test_drives WHERE visit_id=? AND ${overlap} FOR UPDATE`,[input.visitId,exclude,end,scheduledAt]);if(visitDrives.length)throw new HttpError(409,'Cette visite possède déjà un essai incompatible',{code:'TEST_DRIVE_VISIT_CONFLICT'})}
  const[appointments]=await connection.execute<RowDataPacket[]>(`SELECT f.id FROM follow_ups f WHERE f.assigned_user_id=? AND f.status='pending' AND f.scheduled_at<? AND DATE_ADD(f.scheduled_at,INTERVAL COALESCE(f.duration_minutes,30) MINUTE)>? FOR UPDATE`,[input.advisorId,end,scheduledAt]);
  if(appointments.length)throw new HttpError(409,'Ce commercial possède un rendez-vous sur ce créneau',{code:'TEST_DRIVE_APPOINTMENT_CONFLICT'});
  return vehicle;
}

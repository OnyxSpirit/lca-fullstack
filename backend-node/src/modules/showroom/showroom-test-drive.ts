import type {PoolConnection,ResultSetHeader,RowDataPacket} from 'mysql2/promise';
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

export async function startPlannedTestDrive(connection:PoolConnection,id:string){
  const[rows]=await connection.execute<RowDataPacket[]>(`SELECT td.*,sv.visitor_name,o.id opportunity_id
    FROM showroom_test_drives td
    JOIN showroom_visits sv ON sv.id=td.visit_id
    LEFT JOIN opportunities o ON o.lead_id=td.lead_id
    WHERE td.id=? ORDER BY o.id DESC LIMIT 1 FOR UPDATE`,[id]);
  const drive=rows[0];
  if(!drive)throw new HttpError(404,'Essai introuvable');
  if(drive.status!=='planned')throw new HttpError(409,'Essai non planifié');
  await assertTestDriveStartAvailable(connection,{vehicleId:String(drive.vehicle_id),advisorId:String(drive.advisor_id),agencyId:String(drive.agency_id),visitId:String(drive.visit_id),excludeDriveId:id});
  await markCrmTestDriveStarted(connection,drive.opportunity_id==null?null:String(drive.opportunity_id));
  const[result]=await connection.execute<ResultSetHeader>("UPDATE showroom_test_drives SET status='in_progress',started_at=NOW() WHERE id=? AND status='planned'",[id]);
  if(result.affectedRows!==1)throw new HttpError(409,'Cet essai ne peut plus être démarré');
  return{agencyId:String(drive.agency_id),visitId:String(drive.visit_id),visitorName:String(drive.visitor_name),leadId:drive.lead_id==null?null:String(drive.lead_id),opportunityId:drive.opportunity_id==null?null:String(drive.opportunity_id)};
}

export function assertTestDriveReturnAllowed(drive:Record<string,unknown>,mileageIn:number){
  if(drive.status!=='in_progress')throw new HttpError(409,'Essai non actif ou retour déjà enregistré');
  if(!Number.isInteger(mileageIn)||mileageIn<Number(drive.mileage_out))throw new HttpError(400,'Kilométrage de retour invalide');
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
  const exclude=input.excludeDriveId??'0';
  const[vehicleDrives]=await connection.execute<RowDataPacket[]>(`SELECT id FROM showroom_test_drives WHERE vehicle_id=? AND status IN ('planned','in_progress') AND id<>? FOR UPDATE`,[input.vehicleId,exclude]);
  if(vehicleDrives.length)throw new HttpError(409,'Ce véhicule est déjà réservé pour un essai',{code:'TEST_DRIVE_VEHICLE_CONFLICT'});
  if(input.visitId){const[visitDrives]=await connection.execute<RowDataPacket[]>(`SELECT id FROM showroom_test_drives WHERE visit_id=? AND status IN ('planned','in_progress') AND id<>? FOR UPDATE`,[input.visitId,exclude]);if(visitDrives.length)throw new HttpError(409,'Cette visite possède déjà un essai actif',{code:'TEST_DRIVE_VISIT_CONFLICT'})}
  return vehicle;
}

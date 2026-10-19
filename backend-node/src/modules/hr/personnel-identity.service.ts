import type{PoolConnection,RowDataPacket}from'mysql2/promise';

const code=(employeeId:string)=>`EMP-${employeeId.padStart(10,'0')}`;

/** Maintient le snapshot d'identité commune dans la transaction RH appelante. */
export async function syncEmployeePersonnelIdentity(connection:PoolConnection,employeeId:string){
  const[rows]=await connection.execute<RowDataPacket[]>(`SELECT ep.id,ep.personnel_identity_id,ep.user_id,ep.concession_id,ep.first_name,ep.last_name,ep.email,ep.phone,ep.photo_path,ep.created_by,ep.updated_by,ep.created_at FROM employee_profiles ep WHERE ep.id=? FOR UPDATE`,[employeeId]),employee=rows[0];
  if(!employee)throw new Error(`EMPLOYEE_IDENTITY_SYNC_NOT_FOUND: ${employeeId}`);
  let identityId=employee.personnel_identity_id==null?null:String(employee.personnel_identity_id);
  if(!identityId){
    const[result]=await connection.execute<any>(`INSERT INTO personnel_identities(identity_code,identity_type,concession_id,user_id,first_name,last_name,email,phone,media_path,identity_status,created_by,updated_by,created_at) VALUES(?,'INDIVIDUAL',?,?,?,?,?,?,?,'ACTIVE',?,?,?)`,[code(employeeId),employee.concession_id,employee.user_id,employee.first_name,employee.last_name,employee.email,employee.phone,employee.photo_path,employee.created_by,employee.updated_by,employee.created_at]);
    identityId=String(result.insertId);
    await connection.execute('UPDATE employee_profiles SET personnel_identity_id=? WHERE id=?',[identityId,employeeId]);
  }else{
    await connection.execute(`UPDATE personnel_identities SET concession_id=?,user_id=?,first_name=?,last_name=?,company_name=NULL,email=?,phone=?,media_path=?,updated_by=? WHERE id=? AND identity_type='INDIVIDUAL'`,[employee.concession_id,employee.user_id,employee.first_name,employee.last_name,employee.email,employee.phone,employee.photo_path,employee.updated_by,identityId]);
  }
  return identityId;
}

import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import{query}from'../../config/database.js';
export type ContractEligibilityStatus='NO_CONTRACT'|'UNDETERMINED'|'NOT_COVERED'|'PENDING_ACTIVATION'|'EXPIRED_BY_DATE'|'MILEAGE_REQUIRED'|'EXPIRED_BY_MILEAGE'|'ELIGIBLE_CONTRACTUALLY';
type Db={execute<T extends RowDataPacket[]>(sql:string,params?:unknown[]):Promise<[T,unknown]>};
const select=async<T extends RowDataPacket[]>(db:Db|undefined,sql:string,params:unknown[])=>db?(await db.execute<T>(sql,params))[0]:query<T>(sql,params);
export async function evaluateVehicleWarranty(vehicleId:string,mileage?:number|null,connection?:PoolConnection){
 const rows=await select<RowDataPacket[]>(connection as Db|undefined,`SELECT vwc.*,COALESCE(vwc.provider_code_snapshot,wp.code) resolved_provider_code,COALESCE(vwc.provider_name_snapshot,wp.name) resolved_provider_name,CASE WHEN vwc.expiry_date IS NOT NULL AND vwc.expiry_date<NOW() THEN 1 ELSE 0 END expired_by_date FROM vehicle_warranty_contracts vwc LEFT JOIN warranty_providers wp ON wp.id=vwc.provider_id WHERE vwc.vehicle_id=? ORDER BY vwc.created_at DESC,vwc.id DESC LIMIT 1`,[vehicleId]),contract=rows[0];
 const currentMileage=mileage==null?null:Number(mileage),mileageSource=currentMileage==null?'RECEPTION_REQUIRED':'RECEPTION';
 if(!contract)return{status:'NO_CONTRACT' as const,contract:null,currentMileage,mileageSource};
 const base={contract:{id:String(contract.id),decision:contract.decision,status:contract.status,providerId:contract.provider_id==null?null:String(contract.provider_id),providerCode:contract.resolved_provider_code??null,providerName:contract.resolved_provider_name??null,durationMonths:contract.duration_months==null?null:Number(contract.duration_months),mileageLimit:contract.mileage_limit==null?null:Number(contract.mileage_limit),startDate:contract.start_date,expiryDate:contract.expiry_date,initialMileage:contract.initial_mileage==null?null:Number(contract.initial_mileage),activatedAt:contract.activated_at},currentMileage,mileageSource};
 if(contract.decision==='UNDETERMINED')return{...base,status:'UNDETERMINED' as const};
 if(contract.decision==='NOT_APPLICABLE')return{...base,status:'NOT_COVERED' as const};
 if(contract.status!=='ACTIVE')return{...base,status:'PENDING_ACTIVATION' as const};
 if(Number(contract.expired_by_date)===1)return{...base,status:'EXPIRED_BY_DATE' as const};
 if(contract.mileage_limit!=null&&currentMileage==null)return{...base,status:'MILEAGE_REQUIRED' as const};
 if(contract.mileage_limit!=null&&currentMileage!>Number(contract.mileage_limit))return{...base,status:'EXPIRED_BY_MILEAGE' as const};
 return{...base,status:'ELIGIBLE_CONTRACTUALLY' as const};
}

import type { EffectivePermissionScope } from '../../types';

export const VEHICLE_FINANCIAL_FIELDS=['purchasePrice','refurbishmentCost','transportCost','administrativeCost','additionalCosts','catalogPrice','salePrice','minimumPrice'] as const;

export function implicitVehicleAgencyFilter(scope:EffectivePermissionScope|null|undefined,currentAgencyId?:string){
  return scope==='AGENCY'||scope==='OWN'?currentAgencyId:undefined;
}

export function vehiclePayloadForAgency<T extends Record<string,unknown>>(payload:T,financialAllowed:boolean){
  if(financialAllowed)return payload;
  return Object.fromEntries(Object.entries(payload).filter(([key])=>!(VEHICLE_FINANCIAL_FIELDS as readonly string[]).includes(key)));
}

export function clearVehicleFinancialValues<T extends Record<string,unknown>>(form:T){
  return {...form,...Object.fromEntries(VEHICLE_FINANCIAL_FIELDS.map(field=>[field,'']))};
}

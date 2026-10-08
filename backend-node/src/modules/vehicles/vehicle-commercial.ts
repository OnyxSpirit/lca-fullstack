export const VEHICLE_COMMERCIAL_ORIGINS=['CONCESSION','EXTERNAL','UNKNOWN'] as const;
export type VehicleCommercialOrigin=(typeof VEHICLE_COMMERCIAL_ORIGINS)[number];

export const VEHICLE_ORIGIN_SOURCES=['LEGACY','SALE','MANUAL','WORKSHOP','IMPORT'] as const;
export type VehicleOriginSource=(typeof VEHICLE_ORIGIN_SOURCES)[number];

export const commercialStockPredicate=(alias='v')=>`${alias}.is_commercial_stock=TRUE`;

export function vehicleOriginSnapshot(value:unknown,source:unknown):{origin:VehicleCommercialOrigin;source:VehicleOriginSource}{
  const origin=String(value??'UNKNOWN') as VehicleCommercialOrigin;
  const originSource=String(source??'LEGACY') as VehicleOriginSource;
  if(!VEHICLE_COMMERCIAL_ORIGINS.includes(origin))return{origin:'UNKNOWN',source:'LEGACY'};
  if(!VEHICLE_ORIGIN_SOURCES.includes(originSource))return{origin:'UNKNOWN',source:'LEGACY'};
  return{origin,source:originSource};
}

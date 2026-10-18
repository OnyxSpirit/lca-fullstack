export type VehicleLocationType='PARC'|'SHOWROOM'|'GARAGE';

const labels:Record<VehicleLocationType,string>={
  PARC:'Parc automobile',
  SHOWROOM:'Showroom',
  GARAGE:'Garage',
};

export const vehicleLocationTypeLabel=(type:VehicleLocationType)=>labels[type];

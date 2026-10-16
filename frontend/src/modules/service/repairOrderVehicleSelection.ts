export type RepairOrderVehicleOrigin = 'CONCESSION' | 'EXTERNAL' | 'UNKNOWN';

export interface RepairOrderVehicleCandidate {
  id: string;
  commercialOrigin: RepairOrderVehicleOrigin;
}

export function vehiclesForRepairOrderMode(
  vehicles: RepairOrderVehicleCandidate[],
  mode: 'internal' | 'external',
): RepairOrderVehicleCandidate[] {
  const expectedOrigin = mode === 'internal' ? 'CONCESSION' : 'EXTERNAL';
  return vehicles.filter((vehicle) => vehicle.commercialOrigin === expectedOrigin);
}

export function selectCustomerVehicle(vehicleIds: string[], preferredVehicleId?: string): string {
  if (preferredVehicleId && vehicleIds.includes(preferredVehicleId)) return preferredVehicleId;
  return vehicleIds.length === 1 ? vehicleIds[0] : '';
}

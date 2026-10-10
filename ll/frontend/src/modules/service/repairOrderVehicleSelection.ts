export function selectCustomerVehicle(vehicleIds: string[], preferredVehicleId?: string): string {
  if (preferredVehicleId && vehicleIds.includes(preferredVehicleId)) return preferredVehicleId;
  return vehicleIds.length === 1 ? vehicleIds[0] : '';
}

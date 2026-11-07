import type {PoolConnection, RowDataPacket} from 'mysql2/promise';

export const TECHNICAL_PROFILE_FIELDS = [
  'vehicle_type','technical_category','configuration','technical_body_type','engine_power','displacement_cc',
  'cylinder_count','powertrain_type','combined_power_kw','maximum_torque_nm','power_ch',
  'acceleration_0_100_seconds','maximum_speed_kmh','electric_range_km','combined_range_km',
  'fuel_tank_capacity_l','fuel_consumption_l_100km','seat_count','interior_trim','tire_dimensions','drive_method',
  'gear_count','driving_configuration','length_mm','width_mm','height_mm','advanced_sensors',
  'battery_cooling_function','front_suspension','rear_suspension','front_brakes','rear_brakes',
  'ventilated_front_discs','ventilated_rear_discs','central_screen_dashboard','remote_app_control',
  'embedded_technologies','connectivity','multimedia_system','other_technologies','steering_system',
  'safety_features','warranty_text','warranty_duration_months','warranty_mileage_limit_km',
  'availability_text','delivery_lead_time','catalog_price',
  'currency_code','additional_specs','is_commercially_available',
] as const;

export type TechnicalValues=Partial<Record<(typeof TECHNICAL_PROFILE_FIELDS)[number],unknown>>;

export type SqlExecutor = Pick<PoolConnection, 'execute'>;

const parseJson = (value: unknown, fallback: unknown) => {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

export const mapTechnicalProfile = (row: RowDataPacket) => ({
  id: String(row.id),
  versionId: String(row.version_id),
  brand: row.brand,
  model: row.model,
  version: row.version,
  ...Object.fromEntries(TECHNICAL_PROFILE_FIELDS.map(field => [field, field === 'additional_specs' ? parseJson(row[field], {}) : row[field]])),
  catalogPrice: Number(row.catalog_price ?? 0),
  revision: Number(row.revision ?? 1),
  images: parseJson(row.images, []),
});

export function parseTechnicalValues(value:unknown):TechnicalValues{
  const parsed=parseJson(value,{});
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return{};
  return Object.fromEntries(Object.entries(parsed as Record<string,unknown>).filter(([key])=>TECHNICAL_PROFILE_FIELDS.includes(key as never)));
}

export function effectiveTechnicalValues(profile:Record<string,unknown>|null,overrides:unknown,snapshot:unknown){
  const frozen=parseJson(snapshot,null);
  if(frozen&&typeof frozen==='object'&&!Array.isArray(frozen))return{values:frozen,origins:Object.fromEntries(Object.keys(frozen).map(key=>[key,'snapshot']))};
  const base=profile??{},individual=parseTechnicalValues(overrides),values={...base,...individual};
  return{values,origins:Object.fromEntries(Object.keys(values).map(key=>[key,Object.hasOwn(individual,key)?'individual':'profile']))};
}

export async function technicalSnapshotForVehicle(executor:SqlExecutor,vehicleId:string){
  const[rows]=await executor.execute<RowDataPacket[]>('SELECT version_id,technical_overrides,technical_snapshot FROM vehicles WHERE id=?',[vehicleId]);
  const vehicle=rows[0];if(!vehicle)return null;if(vehicle.technical_snapshot)return parseJson(vehicle.technical_snapshot,{});
  const profile=vehicle.version_id==null?null:await resolveTechnicalProfileByVersion(executor,String(vehicle.version_id));
  return effectiveTechnicalValues(profile,vehicle.technical_overrides,null).values;
}

export async function freezeVehicleTechnicalSnapshot(executor:SqlExecutor,vehicleId:string){
  const snapshot=await technicalSnapshotForVehicle(executor,vehicleId);if(!snapshot)return;
  await executor.execute('UPDATE vehicles SET technical_snapshot=COALESCE(technical_snapshot,?),technical_frozen_at=COALESCE(technical_frozen_at,NOW()) WHERE id=?',[JSON.stringify(snapshot),vehicleId]);
}

export async function resolveTechnicalProfileByVersion(executor: SqlExecutor, versionId: string) {
  const [rows] = await executor.execute<RowDataPacket[]>(`
    SELECT cm.*, b.name brand, m.name model, v.name version,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'id', i.id, 'url', i.file_path, 'thumbnailUrl', i.thumbnail_path,
        'isPrimary', i.is_primary, 'sortOrder', i.sort_order
      )) FROM commercial_model_images i WHERE i.commercial_model_id=cm.id) images
    FROM commercial_models cm
    JOIN versions v ON v.id=cm.version_id
    JOIN models m ON m.id=v.model_id
    JOIN brands b ON b.id=m.brand_id
    WHERE cm.version_id=?
  `, [versionId]);
  return rows[0] ? mapTechnicalProfile(rows[0]) : null;
}

export async function resolveVehicleCommercialSnapshot(executor: SqlExecutor, vehicleId: string) {
  const [rows] = await executor.execute<RowDataPacket[]>(`
    SELECT v.*, ve.name version, m.name model, b.name brand, cm.id commercial_model_id,
      cm.availability_text, cm.warranty_text, cm.catalog_price profile_catalog_price,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', vf.id, 'name', vf.name))
       FROM vehicle_feature_assignments vfa JOIN vehicle_features vf ON vf.id=vfa.feature_id
       WHERE vfa.vehicle_id=v.id) unit_features,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', vi.id, 'url', vi.file_path, 'isPrimary', vi.is_primary, 'sortOrder', vi.sort_order))
       FROM vehicle_images vi WHERE vi.vehicle_id=v.id) unit_images,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cmi.id, 'url', cmi.file_path, 'isPrimary', cmi.is_primary, 'sortOrder', cmi.sort_order))
       FROM commercial_model_images cmi WHERE cmi.commercial_model_id=cm.id) profile_images
    FROM vehicles v
    JOIN versions ve ON ve.id=v.version_id
    JOIN models m ON m.id=ve.model_id
    JOIN brands b ON b.id=m.brand_id
    LEFT JOIN commercial_models cm ON cm.version_id=v.version_id
    WHERE v.id=? AND v.archived_at IS NULL
    FOR UPDATE
  `, [vehicleId]);
  const vehicle = rows[0];
  if (!vehicle) return null;
  const profile = await resolveTechnicalProfileByVersion(executor, String(vehicle.version_id));
  const unitImages = parseJson(vehicle.unit_images, []) as Array<{url: string}>;
  const profileImages = parseJson(vehicle.profile_images, []) as Array<{url: string}>;
  return {
    vehicle,
    profile,
    technical: {
      ...(profile ?? {}),
      brand: vehicle.brand, model: vehicle.model, version: vehicle.version, vin: vehicle.vin,
      fuelType: vehicle.fuel_type, engine: vehicle.engine, transmission: vehicle.transmission,
      realPower: vehicle.real_power, fiscalPower: vehicle.fiscal_power, bodyType: vehicle.body_type,
      color: vehicle.color, interiorColor: vehicle.interior_color, mileage: Number(vehicle.mileage ?? 0),
      equipment: parseJson(vehicle.unit_features, []),
    },
    images: [...unitImages, ...profileImages].map(image => image.url).filter(Boolean),
    availability: vehicle.availability_text ?? null,
    warranty: vehicle.warranty_text ?? null,
    price: Number(vehicle.sale_price ?? vehicle.catalog_price ?? vehicle.profile_catalog_price ?? 0),
    description: `${vehicle.brand} ${vehicle.model} ${vehicle.version}${vehicle.vin ? ` — VIN ${vehicle.vin}` : ''}`,
  };
}

import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

export const DEFAULT_WORKSHOP_LABOR_RATES = [
  { code: 'T1', label: 'Entretien rapide', hourlyRate: 35000, displayOrder: 10, settingKey: 'workshop.rate_t1' },
  { code: 'T2', label: 'Mécanique', hourlyRate: 45000, displayOrder: 20, settingKey: 'workshop.rate_t2' },
  { code: 'T3', label: 'Diagnostic et électronique', hourlyRate: 55000, displayOrder: 30, settingKey: 'workshop.rate_t3' },
  { code: 'T4', label: 'Carrosserie et peinture', hourlyRate: 45000, displayOrder: 40, settingKey: 'workshop.rate_t4' },
] as const;

function configuredRate(value: unknown, fallback: number) {
  const candidate = typeof value === 'string' ? Number(value) : value;
  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0 ? candidate : fallback;
}

export async function provisionDefaultWorkshopLaborRates(connection: PoolConnection, concessionId: string | number) {
  const [settings] = await connection.execute<RowDataPacket[]>(
    `SELECT setting_key,JSON_UNQUOTE(setting_value) setting_value
       FROM settings
      WHERE scope_type='concession' AND scope_id=?
        AND setting_key IN ('workshop.rate_t1','workshop.rate_t2','workshop.rate_t3','workshop.rate_t4')`,
    [concessionId],
  );
  const values = new Map(settings.map(row => [String(row.setting_key), row.setting_value]));
  for (const rate of DEFAULT_WORKSHOP_LABOR_RATES) {
    await connection.execute(
      `INSERT INTO workshop_labor_rates
         (concession_id,agency_id,parent_rate_id,code,label,hourly_rate,is_active,is_configured,display_order)
       VALUES(?,NULL,NULL,?,?,?,TRUE,TRUE,?)
       ON DUPLICATE KEY UPDATE id=id`,
      [concessionId, rate.code, rate.label, configuredRate(values.get(rate.settingKey), rate.hourlyRate), rate.displayOrder],
    );
  }
}

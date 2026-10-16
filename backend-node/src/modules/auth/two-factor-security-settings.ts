import type {Request} from 'express';
import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {query,transaction} from '../../config/database.js';
import {HttpError} from '../../shared/http-error.js';
import {writeAudit} from '../activity/audit-writer.js';

export const SECURITY_SETTING_KEYS={
  trustedEnabled:'security.2fa.trusted_devices.enabled',
  trustedDuration:'security.2fa.trusted_devices.duration_days',
  trustedMaxDuration:'security.2fa.trusted_devices.max_duration_days',
  strongAuthDuration:'security.2fa.strong_auth.duration_minutes',
}as const;
export const ABSOLUTE_TRUSTED_DEVICE_MAX_DAYS=30;
export const DEFAULT_SECURITY_SETTINGS={trustedDevicesEnabled:false,trustedDevicesDurationDays:7,trustedDevicesMaxDurationDays:30,strongAuthDurationMinutes:10}as const;
export type TwoFactorSecuritySettings={trustedDevicesEnabled:boolean;trustedDevicesDurationDays:number;trustedDevicesMaxDurationDays:number;strongAuthDurationMinutes:number};

const decoded=(value:unknown)=>{if(typeof value!=='string')return value;try{return JSON.parse(value)}catch{return undefined}};
const boundedInteger=(value:unknown,min:number,max:number,fallback:number)=>{const parsed=decoded(value);return Number.isInteger(parsed)&&Number(parsed)>=min&&Number(parsed)<=max?Number(parsed):fallback};
const bool=(value:unknown,fallback:boolean)=>{const parsed=decoded(value);return typeof parsed==='boolean'?parsed:fallback};
const mapRows=(rows:RowDataPacket[]):TwoFactorSecuritySettings=>{
  const values=new Map(rows.map(row=>[String(row.setting_key),row.setting_value]));
  const max=boundedInteger(values.get(SECURITY_SETTING_KEYS.trustedMaxDuration),1,ABSOLUTE_TRUSTED_DEVICE_MAX_DAYS,DEFAULT_SECURITY_SETTINGS.trustedDevicesMaxDurationDays);
  return{
    trustedDevicesEnabled:bool(values.get(SECURITY_SETTING_KEYS.trustedEnabled),DEFAULT_SECURITY_SETTINGS.trustedDevicesEnabled),
    trustedDevicesDurationDays:boundedInteger(values.get(SECURITY_SETTING_KEYS.trustedDuration),1,max,Math.min(DEFAULT_SECURITY_SETTINGS.trustedDevicesDurationDays,max)),
    trustedDevicesMaxDurationDays:max,
    strongAuthDurationMinutes:boundedInteger(values.get(SECURITY_SETTING_KEYS.strongAuthDuration),1,30,DEFAULT_SECURITY_SETTINGS.strongAuthDurationMinutes),
  };
};
export async function getTwoFactorSecuritySettings(){return mapRows(await query<RowDataPacket[]>('SELECT setting_key,setting_value FROM settings WHERE scope_type=\'global\' AND scope_id=0 AND setting_key IN(?,?,?,?)',Object.values(SECURITY_SETTING_KEYS)))}
export async function strongAuthDurationSeconds(){return(await getTwoFactorSecuritySettings()).strongAuthDurationMinutes*60}

function validate(body:unknown):TwoFactorSecuritySettings{
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError(400,'Paramètres de sécurité 2FA invalides.',{code:'INVALID_SECURITY_SETTINGS'});
  const value=body as Record<string,unknown>;
  if(typeof value.trustedDevicesEnabled!=='boolean')throw new HttpError(400,'Activation des appareils de confiance invalide.',{field:'trustedDevicesEnabled'});
  for(const field of ['trustedDevicesDurationDays','trustedDevicesMaxDurationDays','strongAuthDurationMinutes']as const)if(!Number.isInteger(value[field]))throw new HttpError(400,`Valeur entière requise : ${field}.`,{field});
  const max=Number(value.trustedDevicesMaxDurationDays),duration=Number(value.trustedDevicesDurationDays),strong=Number(value.strongAuthDurationMinutes);
  if(max<1||max>ABSOLUTE_TRUSTED_DEVICE_MAX_DAYS)throw new HttpError(400,'La durée maximale doit être comprise entre 1 et 30 jours.',{field:'trustedDevicesMaxDurationDays',min:1,max:30});
  if(duration<1||duration>max)throw new HttpError(400,'La durée de confiance doit être comprise entre 1 jour et le plafond configuré.',{field:'trustedDevicesDurationDays',min:1,max});
  if(strong<1||strong>30)throw new HttpError(400,'La durée du step-up doit être comprise entre 1 et 30 minutes.',{field:'strongAuthDurationMinutes',min:1,max:30});
  return{trustedDevicesEnabled:value.trustedDevicesEnabled,trustedDevicesDurationDays:duration,trustedDevicesMaxDurationDays:max,strongAuthDurationMinutes:strong};
}
export async function saveTwoFactorSecuritySettings(body:unknown,request:Request){
  const next=validate(body),before=await getTwoFactorSecuritySettings(),entries=[
    [SECURITY_SETTING_KEYS.trustedEnabled,next.trustedDevicesEnabled],
    [SECURITY_SETTING_KEYS.trustedDuration,next.trustedDevicesDurationDays],
    [SECURITY_SETTING_KEYS.trustedMaxDuration,next.trustedDevicesMaxDurationDays],
    [SECURITY_SETTING_KEYS.strongAuthDuration,next.strongAuthDurationMinutes],
  ]as const;
  await transaction(async(connection:PoolConnection)=>{for(const[key,value]of entries)await connection.execute("INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description,updated_by) VALUES('global',0,?,?,?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value),updated_by=VALUES(updated_by)",[key,JSON.stringify(value),key,request.user!.sub]);await writeAudit(connection,request,{module:'auth',entityType:'security_settings',entityId:'0',action:'auth.2fa.security_settings_updated',oldValues:before,newValues:next,context:{mode:'GLOBAL',note:'Gouvernance globale 2FA'}})});
  return next;
}

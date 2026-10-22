export const BUSINESS_TIME_ZONE='Africa/Brazzaville';

// Africa/Brazzaville uses UTC+01:00 throughout the ERP's operational date range
// and has no daylight-saving transitions. Keep the civil-time contract explicit
// instead of inheriting the browser timezone.
const BUSINESS_UTC_OFFSET_MINUTES=60;
const LOCAL_DATETIME=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const MYSQL_DATETIME=/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;

export function businessLocalDateTimeToDate(value:string):Date|null{
  const match=LOCAL_DATETIME.exec(value);
  if(!match)return null;
  const [,year,month,day,hour,minute,second='0']=match;
  const parts=[year,month,day,hour,minute,second].map(Number);
  const civilUtc=new Date(Date.UTC(parts[0]!,parts[1]!-1,parts[2]!,parts[3]!,parts[4]!,parts[5]!));
  if(civilUtc.getUTCFullYear()!==parts[0]||civilUtc.getUTCMonth()!==parts[1]!-1||civilUtc.getUTCDate()!==parts[2]||civilUtc.getUTCHours()!==parts[3]||civilUtc.getUTCMinutes()!==parts[4]||civilUtc.getUTCSeconds()!==parts[5])return null;
  return new Date(civilUtc.getTime()-BUSINESS_UTC_OFFSET_MINUTES*60_000);
}

export function businessLocalDateTimeToIso(value:string):string{
  const date=businessLocalDateTimeToDate(value);
  if(!date)throw new Error('La date et l’heure sont invalides.');
  return date.toISOString();
}

export function parseApiInstant(value:string|Date):Date|null{
  if(value instanceof Date)return Number.isNaN(value.getTime())?null:new Date(value.getTime());
  const normalized=MYSQL_DATETIME.test(value)?`${value.replace(' ','T')}Z`:value;
  const date=new Date(normalized);
  return Number.isNaN(date.getTime())?null:date;
}

export function businessDateTimeInputValue(value:string|Date):string{
  const date=parseApiInstant(value);
  if(!date)return '';
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:BUSINESS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(date);
  const get=(type:Intl.DateTimeFormatPartTypes)=>parts.find(part=>part.type===type)?.value??'';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function businessNowInput(addMinutes=0,now=new Date()):string{
  return businessDateTimeInputValue(new Date(now.getTime()+addMinutes*60_000));
}

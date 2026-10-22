import type { Lead } from '../../types';
import {businessDateTimeInputValue,businessLocalDateTimeToDate,businessLocalDateTimeToIso} from '../../lib/businessDateTime';

export function parseLocalAppointment(value:string):Date|null{
  return businessLocalDateTimeToDate(value);
}

export function appointmentDateError(value:string,now=new Date()):string|null{
  if(!value)return 'Renseignez la date et l’heure du rendez-vous.';
  const date=parseLocalAppointment(value);
  if(!date)return 'La date et l’heure sont invalides.';
  if(date.getTime()<=now.getTime())return 'Le rendez-vous doit être planifié dans le futur.';
  return null;
}

export function appointmentIso(value:string):string{
  const error=appointmentDateError(value);
  if(error)throw new Error(error);
  return businessLocalDateTimeToIso(value);
}

export function appointmentInputValue(value:string):string{
  return businessDateTimeInputValue(value);
}

export const canPlanCrmAppointment=(lead:Pick<Lead,'stage'|'activeAppointment'>)=>
  ['QUALIFIE','RDV'].includes(lead.stage)&&!lead.activeAppointment;

export const canManageCrmAppointment=(lead:Pick<Lead,'stage'|'activeAppointment'>)=>
  lead.stage==='RDV'&&Boolean(lead.activeAppointment);

const LOCAL_DATETIME=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseLocalAppointment(value:string):Date|null{
  const match=LOCAL_DATETIME.exec(value);
  if(!match)return null;
  const [,year,month,day,hour,minute,second='0']=match;
  const parts=[year,month,day,hour,minute,second].map(Number);
  const date=new Date(parts[0]!,parts[1]!-1,parts[2]!,parts[3]!,parts[4]!,parts[5]!);
  if(date.getFullYear()!==parts[0]||date.getMonth()!==parts[1]!-1||date.getDate()!==parts[2]||date.getHours()!==parts[3]||date.getMinutes()!==parts[4]||date.getSeconds()!==parts[5])return null;
  return date;
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
  return parseLocalAppointment(value)!.toISOString();
}

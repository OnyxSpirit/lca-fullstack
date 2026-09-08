export function appointmentDateError(value:string,now=new Date()):string|null{
  if(!value)return 'Renseignez la date et l’heure du rendez-vous.';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'La date et l’heure sont invalides.';
  if(date.getTime()<=now.getTime())return 'Le rendez-vous doit être planifié dans le futur.';
  return null;
}

export function appointmentIso(value:string):string{
  const error=appointmentDateError(value);
  if(error)throw new Error(error);
  return new Date(value).toISOString();
}

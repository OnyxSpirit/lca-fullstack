const sqlUtc=/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function activityInstant(value:string|Date){
 if(value instanceof Date)return value;
 return new Date(sqlUtc.test(value)?`${value.replace(' ','T')}Z`:value);
}

export function formatActivityDate(value:string|Date,timeZone:string){
 const date=activityInstant(value);
 if(Number.isNaN(date.getTime()))return String(value);
 return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'medium',timeZone}).format(date);
}

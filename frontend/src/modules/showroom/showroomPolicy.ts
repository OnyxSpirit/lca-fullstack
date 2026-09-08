type ShowroomUser={status:string;agencyId:string;roles?:string[];role:string};

export const eligibleShowroomSalesUsers=<T extends ShowroomUser>(users:T[],agencyId?:string)=>users.filter(user=>user.status==='active'&&Boolean(agencyId)&&user.agencyId===agencyId&&(user.roles?.length?user.roles:[user.role]).some(role=>['SALES_REP','SALES_MANAGER'].includes(role)));

export const showroomVisitorErrors=(visitorName:string,phone:string)=>{
  const errors:{visitorName?:string;phone?:string}={};
  if(!visitorName.trim())errors.visitorName='Le nom est obligatoire.';
  const digits=phone.replace(/\D/g,'');
  if(phone.trim()&&(!/^[+\d\s().-]+$/.test(phone)||digits.length<6||digits.length>15))errors.phone='Le numéro de téléphone est invalide.';
  return errors;
};

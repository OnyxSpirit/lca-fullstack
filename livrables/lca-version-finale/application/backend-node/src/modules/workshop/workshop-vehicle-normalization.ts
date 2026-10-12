import {HttpError} from '../../shared/http-error.js';

export const normalizeWorkshopVin=(value:unknown)=>{
  const vin=String(value??'').trim().toUpperCase().replace(/[\s-]/g,'');
  if(!vin)return null;
  if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))throw new HttpError(400,'Le VIN doit comporter exactement 17 caractères valides');
  return vin;
};

export const normalizeWorkshopRegistration=(value:unknown)=>{
  if(value==null||value==='')return{display:null,search:null};
  if(typeof value!=='string')throw new HttpError(400,'Valeur texte invalide');
  const display=value.trim().toUpperCase();
  if(display.length>50)throw new HttpError(400,'Valeur trop longue (50 caractères maximum)');
  return{display:display||null,search:display.replace(/[^A-Z0-9]/g,'')||null};
};

import { HttpError } from '../../shared/http-error.js';

const MAX_AMOUNT_CENTS=999999999999999999n;
const moneyCents=(value:unknown,label:string)=>{
  if(value==null||value==='')return 0n;
  const text=String(value).trim();
  if(!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text))throw new HttpError(400,`${label} doit être un montant positif avec deux décimales maximum`);
  const[whole,decimal='']=text.split('.'),cents=BigInt(whole!)*100n+BigInt(decimal.padEnd(2,'0'));
  if(cents>MAX_AMOUNT_CENTS)throw new HttpError(400,`${label} dépasse la capacité autorisée`);
  return cents;
};
const decimal=(cents:bigint)=>Number(cents)/100;
const text=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);

export interface VehicleReceptionPricingInput{
  hasReceptionDefect: unknown;
  receptionDefectDescription?: unknown;
  receptionInitialSalePrice: unknown;
  receptionDefectDiscount?: unknown;
  receptionDefectDiscountReason?: unknown;
  minimumPrice?: unknown;
}

export function vehicleReceptionPricing(input:VehicleReceptionPricingInput){
  if(typeof input.hasReceptionDefect!=='boolean')throw new HttpError(400,"L’état du véhicule à la réception doit être renseigné");
  const initial=moneyCents(input.receptionInitialSalePrice,'Le prix de vente initial'),minimum=moneyCents(input.minimumPrice,'Le prix minimum'),discount=moneyCents(input.receptionDefectDiscount,'La réduction liée au défaut');
  if(initial<=0n)throw new HttpError(400,'Le prix de vente initial doit être strictement positif');
  if(!input.hasReceptionDefect){
    if(discount>0n)throw new HttpError(400,'Une réduction liée au défaut exige un défaut déclaré');
    return{hasReceptionDefect:false,receptionDefectDescription:null,receptionInitialSalePrice:decimal(initial),receptionDefectDiscount:0,receptionDefectDiscountReason:null,finalSalePrice:decimal(initial)};
  }
  const description=text(input.receptionDefectDescription,2000),reason=text(input.receptionDefectDiscountReason,2000);
  if(!description)throw new HttpError(400,'La description du défaut constaté est obligatoire');
  if(discount>=initial)throw new HttpError(400,'La réduction liée au défaut doit être inférieure au prix de vente initial');
  if(discount>0n&&!reason)throw new HttpError(400,'Le motif de la réduction liée au défaut est obligatoire');
  const final=initial-discount;
  if(final<=0n)throw new HttpError(400,'Le prix de vente après réduction doit être strictement positif');
  if(minimum>0n&&final<minimum)throw new HttpError(409,'Le prix de vente après réduction ne peut pas être inférieur au prix minimum');
  return{hasReceptionDefect:true,receptionDefectDescription:description,receptionInitialSalePrice:decimal(initial),receptionDefectDiscount:decimal(discount),receptionDefectDiscountReason:discount>0n?reason:null,finalSalePrice:decimal(final)};
}

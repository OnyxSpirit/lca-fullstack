import {HttpError} from './http-error.js';

export type TaxMode='TAXABLE'|'TAX_EXEMPT';
export type PriceInputMode='HT'|'TTC';
export interface TaxInput{quantity:unknown;unitPrice:unknown;discount?:unknown;taxMode:TaxMode;priceInputMode:PriceInputMode;taxRate:unknown}
const rounded=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
const numeric=(value:unknown,label:string)=>{const result=Number(value);if(!Number.isFinite(result)||result<0)throw new HttpError(400,`${label} invalide`);return result};
export function validateTaxChoice(taxMode:unknown,priceInputMode:unknown,taxRate:unknown){
  if(!['TAXABLE','TAX_EXEMPT'].includes(String(taxMode)))throw new HttpError(400,'Régime fiscal invalide');
  if(!['HT','TTC'].includes(String(priceInputMode)))throw new HttpError(400,'Mode de saisie du prix invalide');
  const rate=numeric(taxRate,'Taux de TVA');if(rate>100)throw new HttpError(400,'Taux de TVA invalide');
  return{taxMode:taxMode as TaxMode,priceInputMode:priceInputMode as PriceInputMode,taxRate:taxMode==='TAX_EXEMPT'?0:rate};
}
export function calculateTaxLine(input:TaxInput){
  const quantity=numeric(input.quantity,'Quantité'),enteredUnitPrice=numeric(input.unitPrice,'Prix unitaire'),discount=numeric(input.discount??0,'Remise');
  if(quantity<=0)throw new HttpError(400,'Quantité invalide');
  const choice=validateTaxChoice(input.taxMode,input.priceInputMode,input.taxRate),enteredGross=rounded(quantity*enteredUnitPrice);
  if(discount>enteredGross)throw new HttpError(400,'La remise dépasse le montant de la ligne');
  const enteredNet=rounded(enteredGross-discount);
  if(choice.taxMode==='TAX_EXEMPT')return{quantity,enteredUnitPrice,unitPriceHt:enteredUnitPrice,discountHt:discount,subtotalHt:enteredGross,netHt:enteredNet,tax:0,totalTtc:enteredNet,...choice};
  if(choice.priceInputMode==='HT'){
    const tax=rounded(enteredNet*choice.taxRate/100);return{quantity,enteredUnitPrice,unitPriceHt:enteredUnitPrice,discountHt:discount,subtotalHt:enteredGross,netHt:enteredNet,tax,totalTtc:rounded(enteredNet+tax),...choice};
  }
  const divisor=1+choice.taxRate/100,netHt=rounded(enteredNet/divisor),subtotalHt=rounded(enteredGross/divisor),discountHt=rounded(subtotalHt-netHt),tax=rounded(enteredNet-netHt);
  return{quantity,enteredUnitPrice,unitPriceHt:rounded(enteredUnitPrice/divisor),discountHt,subtotalHt,netHt,tax,totalTtc:enteredNet,...choice};
}
export function aggregateTaxLines(lines:ReturnType<typeof calculateTaxLine>[]){return{subtotal:rounded(lines.reduce((s,x)=>s+x.subtotalHt,0)),discount:rounded(lines.reduce((s,x)=>s+x.discountHt,0)),tax:rounded(lines.reduce((s,x)=>s+x.tax,0)),total:rounded(lines.reduce((s,x)=>s+x.totalTtc,0))}}

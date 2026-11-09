import {HttpError} from '../../shared/http-error.js';

export type WorkshopTaxMode='TAXABLE'|'TAX_EXEMPT';

export function workshopTaxSnapshot(mode:unknown,snapshot:unknown,configuredRate:unknown){
  const taxMode=String(mode??'TAXABLE');
  if(!['TAXABLE','TAX_EXEMPT'].includes(String(taxMode)))throw new HttpError(400,'Régime fiscal invalide');
  const candidate=snapshot==null?Number(configuredRate):Number(snapshot);
  if(!Number.isFinite(candidate)||candidate<0||candidate>100)throw new HttpError(400,'Taux de TVA invalide');
  return{taxMode:taxMode as WorkshopTaxMode,taxRate:taxMode==='TAX_EXEMPT'?0:candidate};
}

export function flatLaborPricing(input:{description:unknown;unitPrice:unknown;quantity:unknown;discount?:unknown}){
  const description=String(input.description??'').trim(),unitPrice=Number(input.unitPrice),quantity=Number(input.quantity),discount=Number(input.discount??0);
  if(!description)throw new HttpError(400,'Libellé du forfait obligatoire');
  if(quantity!==1)throw new HttpError(400,'Un forfait doit avoir une quantité égale à 1');
  if(!Number.isFinite(unitPrice)||unitPrice<=0)throw new HttpError(400,'Le montant forfaitaire HT doit être positif');
  if(!Number.isFinite(discount)||discount<0||discount>unitPrice)throw new HttpError(400,'Remise forfaitaire invalide');
  return{description,quantity:1,unitPrice,discount,lineTotal:unitPrice-discount};
}

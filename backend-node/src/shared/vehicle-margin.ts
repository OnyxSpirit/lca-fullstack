import {HttpError} from './http-error.js';

/** The stock's acquisition components are recorded in XAF excluding sales VAT. */
export function vehicleCostHt(vehicle:Record<string,unknown>):number {
  const fields=['purchase_price','refurbishment_cost','transport_cost','administrative_cost','additional_costs'];
  const values=fields.map(field=>Number(vehicle[field]??0));
  if(values.some(value=>!Number.isFinite(value)||value<0))throw new HttpError(409,'Coût de revient du véhicule invalide');
  return Math.round(values.reduce((sum,value)=>sum+value,0)*100)/100;
}

export function assertVehicleMargin(vehicle:Record<string,unknown>,netSaleHt:number):void {
  if(!Number.isFinite(netSaleHt)||netSaleHt<0)throw new HttpError(400,'Prix de vente net HT invalide');
  if(Math.round(netSaleHt*100)<Math.round(vehicleCostHt(vehicle)*100))
    throw new HttpError(409,"Le prix de vente net HT ne peut pas être inférieur au coût de revient du véhicule.");
}

/** A zero minimum means that no additional commercial floor is configured. */
export function assertVehicleMinimumPrice(vehicle:Record<string,unknown>,netSalePrice:number):void {
  const minimum=Number(vehicle.minimum_price??0);
  if(!Number.isFinite(minimum)||minimum<0)throw new HttpError(409,'Prix minimum du véhicule invalide');
  if(minimum>0&&Math.round(netSalePrice*100)<Math.round(minimum*100))
    throw new HttpError(409,'Cette remise ferait passer le prix de vente sous le prix minimum autorisé.');
}

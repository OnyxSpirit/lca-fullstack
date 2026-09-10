import{createHash}from'node:crypto';
import{HttpError}from'../../shared/http-error.js';

export function assertHandoverMileage(current:unknown,value:unknown){const actual=Number(current),next=Number(value);if(!Number.isInteger(next)||next<0)throw new HttpError(400,'Kilométrage à la remise invalide');if(next<actual)throw new HttpError(409,`Le kilométrage à la remise ne peut pas être inférieur au kilométrage actuel du véhicule (${actual} km).`);return next}
export function deliverySignatureHash(input:{deliveryId:string;saleId:string;vehicleId:string;signer:string;mileage:number;signedAt:string;signature:string}){return createHash('sha256').update(`${input.deliveryId}|${input.saleId}|${input.vehicleId}|${input.signer}|${input.mileage}|${input.signedAt}|${input.signature}`).digest('hex')}

import{HttpError}from'../../shared/http-error.js';

const numericOnly=/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;
export const STOCK_UNIT_ERROR='Saisissez une unité de mesure, par exemple : pièce, rame ou carton.';

export function stockUnit(value:unknown){const unit=typeof value==='string'?value.trim():'';if(!unit)throw new HttpError(400,'Unité de mesure obligatoire.');if(unit.length>40)throw new HttpError(400,'Unité de mesure trop longue.');if(numericOnly.test(unit.replace(/\s/g,'')))throw new HttpError(400,STOCK_UNIT_ERROR);return unit}

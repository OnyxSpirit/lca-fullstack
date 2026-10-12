const numericOnly=/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/;
export const STOCK_UNIT_ERROR='Saisissez une unité de mesure, par exemple : pièce, rame ou carton.';

export function stockUnitError(value:unknown){const unit=typeof value==='string'?value.trim():'';return unit&&numericOnly.test(unit.replace(/\s/g,''))?STOCK_UNIT_ERROR:null}

export function stockItemCreationPayload(entries:Iterable<readonly[string,FormDataEntryValue]>){const body=Object.fromEntries(entries),error=stockUnitError(body.unit);if(error)throw new Error(error);if(body.minimumQuantity==='')delete body.minimumQuantity;return body}

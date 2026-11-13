export const VIN_PATTERN=/^[A-HJ-NPR-Z0-9]{17}$/;
/** Les séparateurs de présentation ne font jamais partie d'un VIN. */
export const normalizeVin=(value:string)=>value.toUpperCase().replace(/[\s-]+/g,'');
export const normalizeVinInput=(value:string)=>normalizeVin(value).slice(0,17);

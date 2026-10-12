export const VIN_PATTERN=/^[A-HJ-NPR-Z0-9]{17}$/;
export const normalizeVin=(value:string)=>value.trim().toUpperCase();
export const normalizeVinInput=(value:string)=>normalizeVin(value).slice(0,17);

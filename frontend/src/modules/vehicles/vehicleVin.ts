export const VIN_LENGTH=17;
export const VIN_PATTERN=/^[A-Z0-9]{17}$/;
export const VIN_STANDARD_EXCLUDED_LETTERS=/[IOQ]/;
export const VIN_CONFORMITY_WARNING='Attention : ce numéro contient une ou plusieurs lettres (I, O ou Q) habituellement exclues des VIN standards. Vérifiez le numéro sur le véhicule ou ses documents avant de poursuivre.';
/** Les séparateurs de présentation ne font jamais partie d'un VIN. */
export const normalizeVin=(value:string)=>value.toUpperCase().replace(/[\s-]+/g,'');
export const normalizeVinInput=(value:string)=>normalizeVin(value).slice(0,VIN_LENGTH);
export const hasVinStandardExcludedLetters=(value:string)=>VIN_STANDARD_EXCLUDED_LETTERS.test(normalizeVin(value));

export type PartsScope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';

export function partsScopeAllows(scope:PartsScope,actorAgencyId:string,targetAgencyId:string,sameConcession=false){
  if(scope==='GLOBAL')return true;
  if(scope==='CONCESSION')return sameConcession;
  if(scope==='AGENCY')return actorAgencyId===targetAgencyId;
  return false;
}

export function stockAfterDelta(currentStock:number,reservedStock:number,delta:number){
  if(![currentStock,reservedStock,delta].every(Number.isFinite))throw new Error('Valeur de stock invalide');
  if(currentStock<0||reservedStock<0||reservedStock>currentStock)throw new Error('État de stock incohérent');
  const next=currentStock+delta;
  if(next<reservedStock)throw new Error('Stock disponible insuffisant');
  return{currentStock:next,reservedStock,availableStock:next-reservedStock};
}

export function reserveStock(currentStock:number,reservedStock:number,quantity:number){
  if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Quantité invalide');
  if(currentStock-reservedStock<quantity)throw new Error('Stock disponible insuffisant');
  return{currentStock,reservedStock:reservedStock+quantity,availableStock:currentStock-reservedStock-quantity};
}

export function consumeReservation(currentStock:number,reservedStock:number,quantity:number){
  if(!Number.isFinite(quantity)||quantity<=0||reservedStock<quantity||currentStock<quantity)throw new Error('Cohérence du stock réservé invalide');
  return{currentStock:currentStock-quantity,reservedStock:reservedStock-quantity,availableStock:currentStock-reservedStock};
}

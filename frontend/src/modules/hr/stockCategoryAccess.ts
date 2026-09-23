export const canAdministerStockCategories=(scope:string|null|undefined,isSystemSuperAdmin=false)=>isSystemSuperAdmin||scope==='CONCESSION'||scope==='GLOBAL';
export const defaultStockConcessionId=(concessions:ReadonlyArray<{id:string}>)=>concessions.length===1?concessions[0]!.id:'';

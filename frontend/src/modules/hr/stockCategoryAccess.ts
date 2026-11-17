export const canAdministerStockCategories=(scope:string|null|undefined)=>scope==='AGENCY';
export const defaultStockConcessionId=(concessions:ReadonlyArray<{id:string}>)=>concessions.length===1?concessions[0]!.id:'';

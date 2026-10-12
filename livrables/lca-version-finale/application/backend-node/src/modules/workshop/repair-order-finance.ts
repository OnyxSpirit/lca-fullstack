export interface RepairFinancialRow {item_type:string;gross:unknown;discount:unknown;subtotal:unknown;tax:unknown}

const money=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;

export function repairOrderFinancialSummary(rows:RepairFinancialRow[],currencyCode:string){
  const totals=rows.reduce((sum,row)=>({
    gross:sum.gross+Number(row.gross),
    discount:sum.discount+Number(row.discount),
    subtotal:sum.subtotal+Number(row.subtotal),
    tax:sum.tax+Number(row.tax),
  }),{gross:0,discount:0,subtotal:0,tax:0});
  return {gross:money(totals.gross),discount:money(totals.discount),subtotal:money(totals.subtotal),tax:money(totals.tax),total:money(totals.subtotal+totals.tax),currencyCode,byType:Object.fromEntries(rows.map(row=>[row.item_type,{gross:money(Number(row.gross)),discount:money(Number(row.discount)),subtotal:money(Number(row.subtotal)),tax:money(Number(row.tax)),total:money(Number(row.subtotal)+Number(row.tax))}]))};
}

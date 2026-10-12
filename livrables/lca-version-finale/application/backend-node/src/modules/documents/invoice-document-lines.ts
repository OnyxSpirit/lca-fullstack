// Les lignes issues du workflow Atelier stockent line_total HT ; les autres
// lignes Billing stockent déjà le TTC. Ne modifier que la projection PDF.
export function invoiceDocumentLines<T extends Record<string,unknown>>(items:T[]):T[]{
  return items.map(item=>item.repair_order_item_id==null?item:{...item,line_total:Math.round((Number(item.line_total)+Number(item.tax_amount??0))*100)/100});
}

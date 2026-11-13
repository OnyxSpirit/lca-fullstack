import ExcelJS from 'exceljs';

export type WorkbookCell = string|number|boolean|Date|null|undefined;
export type FinancialWorkbookInput = {
  sheetName:string;
  rows:readonly (readonly WorkbookCell[])[];
  headerRow?:number;
  numericColumns?:readonly number[];
  dateColumns?:readonly number[];
  currencyColumns?:readonly number[];
};

export function financialWorkbook(input:FinancialWorkbookInput){
  const book=new ExcelJS.Workbook();
  book.creator='ERP LCA';book.company='La Congolaise de l’Automobile';book.created=new Date();
  const sheet=book.addWorksheet(input.sheetName.slice(0,31));
  input.rows.forEach(row=>sheet.addRow([...row]));
  const header=input.headerRow??1;
  if(sheet.rowCount>=header&&sheet.columnCount){
    const row=sheet.getRow(header);row.font={bold:true,color:{argb:'FFFFFFFF'}};row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF8F1722'}};row.alignment={vertical:'middle',wrapText:true};row.height=24;
    sheet.views=[{state:'frozen',ySplit:header}];
    sheet.autoFilter={from:{row:header,column:1},to:{row:header,column:sheet.columnCount}};
  }
  sheet.columns.forEach((column,index)=>{let width=12;column.eachCell?.({includeEmpty:false},cell=>{const value=cell.value instanceof Date?10:String(cell.value??'').length;width=Math.max(width,Math.min(42,value+2))});column.width=width;if(input.numericColumns?.includes(index+1))column.numFmt='#,##0.00';if(input.currencyColumns?.includes(index+1))column.numFmt='#,##0.00 "XAF"';if(input.dateColumns?.includes(index+1))column.numFmt='dd/mm/yyyy'});
  return{book,sheet};
}

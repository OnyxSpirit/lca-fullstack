import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { financialWorkbook } from '../src/modules/reports/financial-workbook.ts';

test('un classeur financier LCA se rouvre avec types, filtre, gel et formats',async()=>{
  const {book}=financialWorkbook({sheetName:'Écritures comptables',rows:[['Date','Pièce','Libellé','Débit','Crédit','Devise'],[new Date('2026-11-13T00:00:00Z'),'EC-001','Vente véhicule',1250000,0,'XAF'],[new Date('2026-11-13T00:00:00Z'),'EC-002','Encaissement',0,1250000,'XAF']],dateColumns:[1],numericColumns:[4,5],currencyColumns:[4,5]});
  const buffer=await book.xlsx.writeBuffer(),reopened=new ExcelJS.Workbook();await reopened.xlsx.load(buffer as any);
  assert.equal(reopened.worksheets.length,1);const sheet=reopened.worksheets[0]!;assert.equal(sheet.name,'Écritures comptables');assert.equal(sheet.rowCount,3);assert.equal(sheet.columnCount,6);assert.ok(sheet.getCell('A2').value instanceof Date);assert.equal(sheet.getCell('D2').value,1250000);assert.equal(sheet.getCell('D2').numFmt,'#,##0.00 "XAF"');assert.equal(sheet.views[0]?.state,'frozen');assert.ok(sheet.autoFilter);assert.equal(sheet.getCell('A1').font.bold,true);assert.ok((sheet.getColumn(3).width??0)>=12);
});

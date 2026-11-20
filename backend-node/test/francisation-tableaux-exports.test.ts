import test from 'node:test';
import assert from 'node:assert/strict';
import { financialCsv } from '../src/modules/reports/report.csv.js';
import { savJournalEventLabel } from '../src/modules/workshop/sav-operations.routes.js';
import { accountingAccountTypeLabel, financialDirectionLabel, financialEventLabel, financialReportColumnLabel, financialStatusLabel } from '../src/shared/business-labels.js';
import { financialWorkbook } from '../src/modules/reports/financial-workbook.js';

test('FR-EXP-001 le journal SAV exporte des types métier français',()=>{
  assert.equal(savJournalEventLabel('OR_IN_PROGRESS'),'Travaux en cours');
  assert.equal(savJournalEventLabel('TRANSFERT_CONFIRME'),'Transfert confirmé');
  assert.match(savJournalEventLabel('CODE_INCONNU'),/^Type d’opération SAV non reconnu/);
});

test('FR-EXP-002 le CSV français conserve accents, nombres et neutralisation des formules',()=>{
  const csv=financialCsv([['Type d’opération','Montant'],['Équilibré par une entrée',1250.5],['=CMD()',0]]);
  assert.equal(Buffer.from(csv).subarray(0,3).toString('hex'),'efbbbf');
  assert.match(csv,/"Type d’opération";"Montant"/);
  assert.match(csv,/"Équilibré par une entrée";"1250.5"/);
  assert.match(csv,/"'=CMD\(\)";"0"/);
});

test('FR-EXP-003 les codes financiers observés ont des libellés français exacts',()=>{
  assert.equal(financialStatusLabel('BALANCED_IN'),'Équilibré par une entrée');
  assert.equal(financialStatusLabel('BALANCED_OUT'),'Équilibré par une sortie');
  assert.equal(financialStatusLabel('PENDING'),'En attente');
  assert.equal(financialStatusLabel('APPROVED'),'Approuvé');
  assert.equal(financialDirectionLabel('IN'),'Entrée');
  assert.equal(financialEventLabel('PAYMENT_REFUND'),'Remboursement client');
  assert.equal(accountingAccountTypeLabel('BALANCE_SHEET'),'Compte de bilan');
  assert.equal(financialReportColumnLabel('openingBalance'),'Solde d’ouverture');
  assert.match(financialStatusLabel('UNMAPPED_STATUS'),/^Statut financier non reconnu/);
});

test('FR-EXP-004 le classeur conserve les cellules numériques et les formules',async()=>{
  const {book,sheet}=financialWorkbook({sheetName:'État français',rows:[['Libellé','Montant','Total'],['Écriture équilibrée',1250.5,{formula:'B2*2',result:2501} as any]],numericColumns:[2,3],currencyColumns:[2,3]});
  const bytes=await book.xlsx.writeBuffer();
  assert.ok(bytes.byteLength>0);
  assert.equal(sheet.getCell('B2').value,1250.5);
  assert.deepEqual(sheet.getCell('C2').value,{formula:'B2*2',result:2501});
  assert.equal(sheet.getCell('B2').numFmt,'#,##0.00 "XAF"');
});

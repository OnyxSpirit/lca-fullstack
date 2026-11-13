import{Router}from'express';import ExcelJS from'exceljs';
import{asyncHandler}from'../../middleware/error-handler.js';
import{requireAgencyPermission as permit}from'../rbac/agency-authorization.js';
import{financialCsv,type CsvValue}from'../reports/report.csv.js';
import*as s from'./accounting.service.js';
import*as advanced from'./accounting-advanced.service.js';
export const accountingRouter=Router();
accountingRouter.get('/accounting/accounts',permit('accounting.chart.view'),asyncHandler(async(r,res)=>res.json(await s.accounts(r))));
accountingRouter.get('/accounting/accounts/:id/history',permit('accounting.chart.view'),asyncHandler(async(r,res)=>res.json(await s.accountHistory(String(r.params.id)))));
accountingRouter.post('/accounting/accounts',permit('accounting.chart.manage'),asyncHandler(async(r,res)=>res.status(201).json(await s.createAccount(r,r.body))));
accountingRouter.patch('/accounting/accounts/:id',permit('accounting.chart.manage'),asyncHandler(async(r,res)=>res.json(await s.updateAccount(r,String(r.params.id),r.body))));
accountingRouter.post('/accounting/accounts/import',permit('accounting.chart.import'),asyncHandler(async(r,res)=>res.json(await s.importAccounts(r,r.body?.rows))));
accountingRouter.get('/accounting/accounts/export/:format',permit('accounting.chart.export'),asyncHandler(async(r,res)=>{const data=await s.accounts(Object.assign(r,{query:{...r.query,page:'1',pageSize:'100'}})),rows:CsvValue[][]=[['Numéro','Intitulé','Classe','Type','Compte de référence','Imputable','Actif'],...data.items.map((x:any)=>[x.number,x.label,x.accountClass,x.accountType,x.isReference?'Oui':'Non',x.isPostable?'Oui':'Non',x.isActive?'Oui':'Non'])];if(r.params.format==='csv'){res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="plan-comptable-syscohada.csv"');return res.end(financialCsv(rows))}if(r.params.format==='xlsx'){const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Plan comptable');for(const row of rows)sheet.addRow(row);sheet.columns.forEach(c=>c.width=24);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition','attachment; filename="plan-comptable-syscohada.xlsx"');await book.xlsx.write(res);return res.end()}res.status(400).json({message:'Format d’export invalide'})}));
accountingRouter.get('/accounting/fiscal-years',permit('accounting.fiscal.view'),asyncHandler(async(_r,res)=>res.json(await s.fiscalYears())));
accountingRouter.post('/accounting/fiscal-years',permit('accounting.fiscal.manage'),asyncHandler(async(r,res)=>res.status(201).json(await s.createFiscalYear(r,r.body))));
// Compatibilité historique : aucune transition directe. La fermeture exige une
// préparation préalable et la réouverture conserve le motif obligatoire.
accountingRouter.patch('/accounting/periods/:id/status',permit('accounting.closure.manage'),asyncHandler(async(r,res)=>{const period=String(r.params.id),status=String(r.body?.status??'');if(status==='CLOSED')return res.json(await advanced.closePeriod(r,period));if(status==='OPEN')return res.json(await advanced.reopenPeriod(r,period,r.body?.reason));res.status(400).json({message:'Statut de période invalide'})}));
accountingRouter.get('/accounting/journals',permit('accounting.journal.view'),asyncHandler(async(r,res)=>res.json(await s.journals(r))));
accountingRouter.post('/accounting/journals',permit('accounting.journal.manage'),asyncHandler(async(r,res)=>res.status(201).json(await s.saveJournal(r,null,r.body))));
accountingRouter.patch('/accounting/journals/:id',permit('accounting.journal.manage'),asyncHandler(async(r,res)=>res.json(await s.saveJournal(r,String(r.params.id),r.body))));
accountingRouter.get('/accounting/mappings',permit('accounting.mapping.view'),asyncHandler(async(_r,res)=>res.json(await s.mappings())));
accountingRouter.post('/accounting/mappings',permit('accounting.mapping.manage'),asyncHandler(async(r,res)=>res.status(201).json(await s.saveMapping(r,null,r.body))));
accountingRouter.patch('/accounting/mappings/:id',permit('accounting.mapping.manage'),asyncHandler(async(r,res)=>res.json(await s.saveMapping(r,String(r.params.id),r.body))));

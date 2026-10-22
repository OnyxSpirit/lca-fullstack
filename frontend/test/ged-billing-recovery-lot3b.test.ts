import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const hooks=read('../src/api/erpHooks.ts'),detail=read('../src/modules/billing/InvoiceDetailPage.tsx'),payments=read('../src/modules/billing/InvoicePaymentComponents.tsx');

test('LOT3B rend durablement visibles les états documentaires facture et reçus',()=>{
 assert.match(hooks,/archiveStatus:r\.archive_status/);assert.match(hooks,/receiptArchiveStatus:x\.receipt_archive_status/);
 assert.match(detail,/businessArchiveStatusLabel\(invoice\.archiveStatus\)/);assert.match(detail,/MISSING_RECORD.*HISTORICAL_ONLY/);
 assert.match(payments,/businessArchiveStatusLabel\(item\.receiptArchiveStatus\)/);assert.match(payments,/MISSING_RECORD.*HISTORICAL_ONLY/);
 assert.match(detail,/disabled=\{officialArchiveRequired&&!invoice\.archiveAvailable\}/);assert.match(payments,/disabled=\{!item\.receiptArchiveAvailable\}/);
});

test('LOT3B propose uniquement les reprises GED dédiées et conserve le RBAC UI',()=>{
 assert.match(detail,/`\/invoices\/\$\{id\}\/archive`/);assert.match(detail,/canIssue&&archiveRecoverable/);
 assert.match(payments,/`\/payments\/\$\{payment\.id\}\/receipt\/archive`/);assert.match(payments,/canRecoverReceipt&&recoverable/);
 assert.doesNotMatch(payments,/\/invoices\/\$\{invoice\.id\}\/payments.*Finaliser l.sarchivage/s);
});

test('LOT3B recharge facture et règlements même après une erreur GED post-commit',()=>{
 const paymentHook=hooks.slice(hooks.indexOf('export function useInvoicePayment()'),hooks.indexOf('export function useBillingAction'));
 const actionHook=hooks.slice(hooks.indexOf('export function useBillingAction'),hooks.indexOf('export function useNotificationAction'));
 assert.match(paymentHook,/onSettled/);assert.match(paymentHook,/erpKeys\.invoices/);assert.match(paymentHook,/erpKeys\.repairOrders/);
 assert.match(actionHook,/onSettled/);assert.match(actionHook,/erpKeys\.invoices/);
});

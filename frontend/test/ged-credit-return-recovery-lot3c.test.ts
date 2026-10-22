import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),hooks=read('../src/api/erpHooks.ts'),invoice=read('../src/modules/billing/InvoiceDetailPage.tsx'),returns=read('../src/modules/vehicle-returns/VehicleReturnPage.tsx');

test('LOT3C expose état, PDF et reprise exceptionnelle des avoirs standards',()=>{
 assert.match(hooks,/archiveStatus:x\.archive_status/);assert.match(invoice,/businessArchiveStatusLabel\(item\.archiveStatus\)/);
 assert.match(invoice,/`\/credit-notes\/\$\{credit\.id\}\/pdf`/);assert.match(invoice,/`\/credit-notes\/\$\{credit\.id\}\/archive`/);
 assert.match(invoice,/canCancel&&recoverable/);assert.match(invoice,/disabled=\{!item\.archiveAvailable\}/);
});

test('LOT3C expose le PV et les avoirs du retour sans rejouer le workflow',()=>{
 assert.match(returns,/businessArchiveStatusLabel\(row\.archive_status\)/);assert.match(returns,/disabled=\{!row\.archive_available\}/);assert.match(returns,/actions\.archive\.mutateAsync/);
 assert.match(returns,/credit_note_archive_status/);assert.match(returns,/archiveCreditNote\.mutateAsync/);assert.match(returns,/PDF de l’avoir/);
 assert.match(returns,/Archivage du PV finalisé'.*actions\.archive\.mutateAsync/);assert.match(returns,/Dossier clôturé'.*actions\.close\.mutateAsync/);
});

test('LOT3C refetch après succès comme après erreur post-commit',()=>{
 const vehicleActions=hooks.slice(hooks.indexOf('export const useVehicleReturnActions'),hooks.indexOf('export function useInvoiceRepairOrder'));
 assert.match(vehicleActions,/resolve:useMutation[\s\S]*onSettled:done/);assert.match(vehicleActions,/close:useMutation[\s\S]*onSettled:done/);
 assert.match(vehicleActions,/archive:useMutation/);assert.match(vehicleActions,/archiveCreditNote:useMutation/);
 assert.doesNotMatch(vehicleActions,/onSuccess:done/);
});

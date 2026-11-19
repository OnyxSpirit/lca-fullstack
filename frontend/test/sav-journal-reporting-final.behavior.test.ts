import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';

const source=readFileSync(new URL('../src/modules/service/SavBusinessSections.tsx',import.meta.url),'utf8');

test('SAV-FINAL-FE-01 journal expose filtres pagination standard tris et export permissionné',()=>{
 for(const token of['Journal du','Journal au',"Type d'opération",'pageSize','changeSort','ServerPagination','/sav/journal/export',"auth.can('service.reporting.export')"])assert.ok(source.includes(token),token);
});

test('SAV-FINAL-FE-02 reporting change agence via le contexte RBAC et exporte',()=>{
 for(const token of["auth.setCurrentAgency(next)",'Agence du reporting SAV','/sav/reporting/export','Actualiser','Aucun encaissement sur cette période'])assert.ok(source.includes(token),token);
});

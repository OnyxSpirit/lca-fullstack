import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const notifications=read('../src/modules/notifications/NotificationsPage.tsx');
const ged=read('../src/modules/documents/DocumentsGedPage.tsx');
const hr=read('../src/modules/hr/HrAdministrationPage.tsx');

test('NOTIF-PAGE-01..07 utilise cinq éléments avec navigation, total et reset préservés',()=>{
 assert.match(notifications,/const PAGE_SIZE=5/);
 assert.match(notifications,/pageSize:PAGE_SIZE/);
 assert.match(notifications,/Math\.ceil\(\(data\?\.total\?\?0\)\/PAGE_SIZE\)/);
 assert.match(notifications,/page\*PAGE_SIZE>=\(data\?\.total\?\?0\)/);
 assert.match(notifications,/setScope\(value\);setPage\(1\)/);
 assert.match(notifications,/setUnreadOnly\(true\);setPage\(1\)/);
 assert.match(notifications,/setReferenceType\(value\);setPage\(1\)/);
});

test('GED-PAGE-01..11 utilise dix documents et conserve pagination et resets',()=>{
 assert.match(ged,/const PAGE_SIZE=10/);
 assert.match(ged,/useDocumentsQuery\(\{page,pageSize:PAGE_SIZE/);
 assert.match(ged,/query\.data\?\.totalPages/);
 assert.match(ged,/useEffect\(\(\)=>setPage\(1\),\[debounced,categoryId,documentTypeId,entityType,attachment,archived,from,to\]\)/);
 assert.match(ged,/setPage\(x=>x-1\)/);
 assert.match(ged,/setPage\(x=>x\+1\)/);
});

test('HR-PAGE-01..08 conserve vingt et remet à un pour les trois filtres Personnel',()=>{
 assert.match(hr,/useEmployeesQuery\(\{search,status,agencyId,page,pageSize:20\}/);
 assert.match(hr,/setSearch=\{value=>\{setPage\(1\);setSearch\(value\)\}\}/);
 assert.match(hr,/setStatus=\{value=>\{setPage\(1\);setStatus\(value\)\}\}/);
 assert.match(hr,/setAgencyId=\{value=>\{setPage\(1\);setAgencyId\(value\)\}\}/);
 assert.match(hr,/page\*20>=\(employees\.data\?\.total\?\?0\)/);
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settings=source('src/modules/settings/SettingsPage.tsx');
const marks=source('src/modules/settings/DocumentMarksSettings.tsx');
const app=source('src/App.tsx');

test('B349-FE-01 les deux onglets existent dans le bon ordre avec leurs libellés français',()=>{
  assert.match(settings,/canViewDocuments\?\['documents' as const\].*canViewDocumentMarks\?\['marks' as const\]/s);
  assert.ok(settings.indexOf("documents:'Documents et GED'")<settings.indexOf("marks:'Signatures et cachets'"));
});

test('B349-FE-02 chaque composant est monté une seule fois dans son onglet',()=>{
  assert.match(settings,/tab === 'documents'.*<DocumentReferencesSettings canUpdate=\{canManageDocuments\}\/>/s);
  assert.match(settings,/tab === 'marks'.*<DocumentMarksSettings\/>/s);
  assert.equal((settings.match(/<DocumentReferencesSettings /g)??[]).length,1);
  assert.equal((settings.match(/<DocumentMarksSettings\/>/g)??[]).length,1);
  const documentsSection=settings.slice(settings.indexOf("tab === 'documents'"),settings.indexOf("tab === 'marks'"));
  assert.doesNotMatch(documentsSection,/DocumentMarksSettings/);
});

test('B349-FE-03 le nouvel onglet exige une permission de consultation existante',()=>{
  assert.match(settings,/canViewDocumentMarks=can\('stamp\.view'\)/);
  assert.match(settings,/canViewDocumentMarks\?\['marks' as const\]/);
  assert.match(settings,/tab === 'marks' && canViewDocumentMarks/);
});

test('B349-FE-04 les actions restent gouvernées dans le composant existant',()=>{
  for(const permission of ['signature.view.self','signature.manage.self','stamp.view','stamp.manage'])assert.match(marks,new RegExp(permission.replaceAll('.','\\.')));
  assert.match(marks,/canManageSig&&/);
  assert.match(marks,/canManageStamp&&/);
});

test('B349-FE-05 le guard Paramètres accepte les permissions de section',()=>{
  assert.match(app,/function SettingsGuard/);
  assert.match(app,/path="settings" element=\{<SettingsGuard>/);
});

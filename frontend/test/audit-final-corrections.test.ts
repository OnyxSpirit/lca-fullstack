import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('AUD-LCA-006 utilise le téléchargement isolé par session',()=>{
  const pdf=source('src/services/invoicePdf.ts');
  assert.match(pdf,/apiDownload/);
  assert.doesNotMatch(pdf,/localStorage|getItem|fetch\(/);
});

test('AUD-LCA-015 purge un état authentification illisible',()=>{
  const auth=source('src/stores/authStore.ts');
  assert.match(auth,/try\{const value=JSON\.parse/);
  assert.match(auth,/catch\{localStorage\.removeItem\(AUTH_STORAGE_KEY\)/);
  assert.match(auth,/localStorage\.removeItem\(ACCESS_TOKEN_KEY\)/);
});

test('AUD-LCA-017 utilise le client API central pour les commandes pièces',()=>{
  const parts=source('src/modules/parts/SparePartsPage.tsx');
  assert.match(parts,/apiRequest<any>\(`\/purchase-orders/);
  assert.doesNotMatch(parts,/const fetchDetail[\s\S]{0,300}localStorage/);
});

test('AUD-LCA-023 protège la route notifications',()=>{
  assert.match(source('src/App.tsx'),/path="notifications" element=\{<ModuleGuard module="notifications">/);
});

test('AUD-LCA-016 piège et restitue le focus de la recherche globale',()=>{
  const search=source('src/components/layout/GlobalSearchModal.tsx');
  assert.match(search,/previousFocus\.current=document\.activeElement/);
  assert.match(search,/event\.key!=='Tab'/);
  assert.match(search,/previousFocus\.current\?\.focus\(\)/);
  assert.match(search,/document\.body\.style\.overflow='hidden'/);
});

test('AUD-LCA-022 implémente le roving tabindex et les touches ARIA',()=>{
  const tabs=source('src/components/ui/Tabs.tsx');
  for(const key of ['ArrowRight','ArrowLeft','Home','End'])assert.match(tabs,new RegExp(key));
  assert.match(tabs,/tabIndex=\{isActive\?0:-1\}/);
});

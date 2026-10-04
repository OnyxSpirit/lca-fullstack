import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/modules/showroom/ShowroomPage.tsx');
const hooks=read('../src/api/erpHooks.ts');

test('FRONT-01/04 conserve la qualification manuelle du parcours Showroom',()=>{
  assert.match(page,/canComplete&&visit\.origin==='showroom'&&<Button[\s\S]*?>Clôturer<\/Button>/);
  assert.match(page,/title="Clôturer la visite"/);
  for(const outcome of['follow_up','lead_created','quotation','sale','no_interest'])assert.match(page,new RegExp(`value="${outcome}"`));
  assert.match(page,/canComplete&&!visit\.leadId&&<Button[\s\S]*?>Créer le prospect CRM<\/Button>/);
});

test('FRONT-02/03 origine CRM exposée et rafraîchissement retire la visite de En cours',()=>{
  assert.match(hooks,/origin: r\.origin === "crm" \? "crm" : "showroom"/);
  assert.match(hooks,/completeDrive:[\s\S]+invalidateQueries\(\{queryKey:erpKeys\.leads\}\)/);
  assert.match(hooks,/completeDrive:[\s\S]+void done\(\)/);
  assert.doesNotMatch(page,/canComplete&&<Button[^>]+>Clôturer<\/Button>/);
});

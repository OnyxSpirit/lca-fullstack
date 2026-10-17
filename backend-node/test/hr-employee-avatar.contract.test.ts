import assert from'node:assert/strict';
import{readContractFileSync as readFileSync}from'./helpers/source-contract.js';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const hr=read('../src/modules/hr/hr.routes.ts');
const modal=read('../../frontend/src/modules/hr/EmployeeRecordModal.tsx');
const hooks=read('../../frontend/src/api/hrHooks.ts');
const users=read('../../frontend/src/api/userHooks.ts');
const app=read('../src/app.ts');
const nginx=read('../../frontend/nginx/default.conf');

test('RH-01 la fiche emploie la photo du compte lié avec un repli non cassé',()=>{
 assert.match(hr,/LEFT JOIN users u ON u\.id=ep\.user_id/);
 assert.match(hr,/u\.avatar_path/);
 assert.match(hooks,/avatar_path:string\|null/);
 assert.match(modal,/assetUrl\(employee\.avatar_path\)/);
 assert.match(modal,/onError=\{\(\)=>setFailed\(true\)\}/);
 assert.match(modal,/UserRound/);
});

test('RH-02 les avatars sont servis par Express, relayés par Nginx et rafraîchissent RH',()=>{
 assert.match(app,/avatars/);
 assert.match(nginx,/location \^~ \/uploads\//);
 assert.match(users,/invalidateQueries\(\{queryKey:\['hr'\]\}\)/);
});

test('RH-03 le PDF conserve le chargement sécurisé de la photo existante',()=>{
 assert.match(hr,/avatar_path/);
 assert.match(hr,/readFile\(target\)/);
 assert.match(hr,/avatar,complete/);
});

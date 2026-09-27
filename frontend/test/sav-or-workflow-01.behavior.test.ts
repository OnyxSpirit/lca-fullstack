import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const page=readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');
test('WORKFLOW-FE-01 passage après acceptation annonce la préparation atelier, pas un faux démarrage',()=>{assert.match(page,/ATTENTE_VALIDATION:'Préparer l’atelier'/);assert.match(page,/>Démarrer<\/Button>/)});
test('WORKFLOW-FE-02 annulation disparaît uniquement après preuve serveur',()=>assert.match(page,/can\('service\.order\.cancel'\)&&!ro\.workStarted/));
test('WORKFLOW-FE-03 le frontend ne persiste ni ne recalcule workStarted',()=>{assert.doesNotMatch(page,/useState\([^\n]*workStarted|localStorage[^\n]*workStarted|sessionStorage[^\n]*workStarted/i);assert.match(page,/ro\.workStarted/)});

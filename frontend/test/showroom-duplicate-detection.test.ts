import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),page=read('../src/modules/showroom/ShowroomPage.tsx'),hooks=read('../src/api/erpHooks.ts'),routes=read('../../backend-node/src/modules/showroom/showroom.routes.ts');

test('DUP-UI-01 la détection transmet nom, téléphone et agence dans une clé isolée',()=>{assert.match(hooks,/queryKey: \["showroom-detect",agencyId,name,phone\]/);assert.match(hooks,/name=\$\{encodeURIComponent\(name\)\}.*phone=\$\{encodeURIComponent\(phone\)\}.*agencyId=\$\{encodeURIComponent\(agencyId!\)\}/)});
test('DUP-UI-02 distingue avertissement téléphone fort et nom potentiel',()=>{assert.match(page,/Un visiteur avec ce numéro est déjà enregistré aujourd’hui/);assert.match(page,/Un visiteur portant ce nom est déjà enregistré aujourd’hui/);assert.match(page,/match\.phoneMatch/)});
test('DUP-UI-03 expose heure, statut, conseiller et ouverture directe par identifiant',()=>{for(const token of ['match.visitorName','match.phone','match.arrivalAt','match.status','match.assignedUserName','setDuplicateVisitId(match.id)','useShowroomVisitQuery(duplicateVisitId'])assert.ok(page.includes(token),token);assert.match(hooks,/`\/showroom\/\$\{id\}`/)});
test('DUP-UI-04 rend le choix explicite et transmet uniquement le jeton canonique',()=>{assert.match(page,/Enregistrer quand même/);assert.match(page,/duplicateConfirmation:'CREATE_ANYWAY'/);assert.match(routes,/body\.duplicateConfirmation!==\'CREATE_ANYWAY\'/);assert.doesNotMatch(routes,/duplicateConfirmation\s*===?\s*true/)});
test('DUP-UI-05 une réponse concurrente 409 relance la détection avant confirmation',()=>{assert.match(page,/status'in error[\s\S]*status===409[\s\S]*await detection\.refetch\(\)/)});
test('DUP-UI-06 pagination six et affectation par agence restent intactes',()=>{assert.match(page,/pageSize=6/);assert.match(hooks,/page=1,pageSize=6/);assert.match(page,/useShowroomSalesCandidatesQuery\(visit\.agencyId,true\)/);assert.match(hooks,/agencyId: s\(r\.agencyId\)/)});
test('DUP-UI-07 aucune contrainte SQL ni migration ne porte la détection',()=>{assert.doesNotMatch(routes,/UNIQUE\s*\([^)]*(?:visitor_name|phone)/i);assert.match(routes,/arrival_at>=CURRENT_DATE/);assert.match(routes,/LIMIT 10/)});

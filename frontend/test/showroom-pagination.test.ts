import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),page=read('../src/modules/showroom/ShowroomPage.tsx'),hooks=read('../src/api/erpHooks.ts'),bootstrap=read('../src/components/AppBootstrap.tsx');

test('FRONT-PAG-01/02 le Board classe items et affiche les counts globaux',()=>{assert.match(page,/visits=board\.data\?\.items\?\?\[\]/);for(const count of['waiting','assigned','inProgress','completed'])assert.match(page,new RegExp(`counts\\?\\.${count}\\?\\?0`))});
test('FRONT-PAG-03 la page et pageSize distinguent le cache et la requête',()=>{assert.match(hooks,/\["showroom","board",filters,page,pageSize\]/);assert.match(hooks,/pageParams\(\{\.\.\.filters,page,pageSize\}\)/);assert.match(page,/useShowroomBoardQuery\(dateFilters,page,pageSize,canView\)/)});
test('PAG6-01/07/08 utilise six visites globales par défaut et affiche la plage 1–6',()=>{assert.match(hooks,/useShowroomBoardQuery = \(filters:[\s\S]*page=1,pageSize=6,/);assert.match(page,/pageSize=6/);assert.doesNotMatch(page,/pageSize=20/);assert.match(page,/\(board\.data\.page-1\)\*board\.data\.pageSize\+1/);assert.match(page,/Math\.min\(board\.data\.page\*board\.data\.pageSize,board\.data\.total\)/)});
test('FRONT-PAG-04 le changement de période remet la page à 1',()=>assert.match(page,/useEffect\(\(\)=>setPage\(1\),\[dateMode,dateFrom,dateTo\]\)/));
test('FRONT-PAG-05/06/07 expose une pagination globale bornée',()=>{assert.match(page,/>Précédent<\/Button>/);assert.match(page,/>Suivant<\/Button>/);assert.match(page,/Page \{board\.data\?\.page\?\?page\} sur/);assert.match(page,/Math\.min\(board\.data\.page\*board\.data\.pageSize,board\.data\.total\)/)});
test('FRONT-PAG-08 les événements temps réel invalident toujours le préfixe Showroom',()=>{assert.match(bootstrap,/'showroom:visitor-created': \['showroom'\]/);assert.match(bootstrap,/invalidateQueries\(\{ queryKey: key \}\)/)});
test('FRONT-PAG-09 une page hors plage est resynchronisée avec la page clampée du serveur',()=>assert.match(page,/if\(board\.data&&page!==board\.data\.page\)setPage\(board\.data\.page\)/));
test('FRONT-PAG-10 les actions et permissions Showroom restent présentes',()=>{for(const token of['canAssign','canTakeOver','canManageTestDrive','canReturnTestDrive','canComplete','canConvertShowroomVisitToLead'])assert.match(page,new RegExp(token))});
test('ASSIGN-09/10 conserve agencyId dans chaque visite et déduplique les candidats par agence',()=>{assert.match(hooks,/const mapShowroom = \(r: any\) => \(\{[\s\S]*agencyId: s\(r\.agencyId\)/);assert.match(hooks,/queryKey:\['showroom','sales-candidates',agencyId\]/);assert.match(hooks,/enabled: enabled\(\)&&requestEnabled&&Boolean\(agencyId\)/);assert.match(page,/useShowroomSalesCandidatesQuery\(visit\.agencyId,true\)/)});

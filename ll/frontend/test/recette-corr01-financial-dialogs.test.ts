import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('CORR-32 autorisation financière utilise la modale partagée sans dialogue natif',()=>{
 const source=read('src/modules/deliveries/DeliveryFinancialAuthorizationPanel.tsx');
 assert.match(source,/import\{Modal\}/);
 assert.match(source,/Solde concerné/);
 assert.match(source,/Cette dérogation ne constitue pas un paiement/);
 assert.match(source,/actions\.authorize\.isPending\|\|actions\.revoke\.isPending/);
 assert.doesNotMatch(source,/window\.(prompt|confirm|alert)/);
});

test('CORR-31 rémunérations utilise la modale partagée et protège les soumissions',()=>{
 const source=read('src/modules/hr/RemunerationsAdministration.tsx');
 assert.match(source,/isOpen=\{dialog!==null\}/);
 assert.match(source,/loading=\{mutate\.isPending\}/);
 assert.doesNotMatch(source,/window\.(prompt|confirm|alert)/);
});

test('CORR-30 transfert et contrepassation Treasury utilisent des formulaires accessibles',()=>{
 const source=read('src/modules/treasury/TreasuryPage.tsx');
 assert.match(source,/title="Transférer des fonds"/);
 assert.match(source,/title="Contrepasser le mouvement"/);
 assert.match(source,/Une écriture inverse sera ajoutée; l’historique restera intact/);
 assert.match(source,/actions\.transfer\.isPending/);
 assert.match(source,/actions\.reverse\.isPending/);
 assert.doesNotMatch(source,/window\.(prompt|confirm|alert)/);
});

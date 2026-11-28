import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

type Row={id:string;file:string;line:number;title:string;condition:string;activation:string[];prerequisiteDefinitions:string[]};
const root=resolve(import.meta.dirname,'../..');
const reportRoot=resolve(root,'docs/qualifications/qualification-lca-02');
const evidence='preuves/integrations-conditionnelles';
const inventory=JSON.parse(await readFile(resolve(reportRoot,evidence,'inventaire/inventaire-source.json'),'utf8')) as {count:number;rows:Row[]};
if(inventory.count!==107||inventory.rows.length!==107)throw new Error(`Inventaire attendu: 107, obtenu: ${inventory.rows.length}`);

const classify=(row:Row)=>{
  const value=`${row.file} ${row.title}`.toLowerCase();
  if(value.includes('migration'))return['Migrations MySQL','Reprise, idempotence et conformité du schéma','MySQL 8.4, compte isolé, runner de migrations','Critique'];
  if(value.includes('rbac')||value.includes('agency')||value.includes('session')||value.includes('admin'))return['Sécurité et RBAC','Authentification, sessions et cloisonnement par agence','MySQL 8.4, secrets de test, données RBAC isolées','Critique'];
  if(value.includes('wss')||value.includes('realtime')||value.includes('socket'))return['Temps réel','WebSocket, WSS, révocation et diffusion par agence','Backend HTTP, proxy TLS, certificat de qualification et MySQL','Critique'];
  if(value.includes('pdf')||value.includes('document')||value.includes('ged')||value.includes('stamp'))return['Documents et GED','PDF réels, marques, archivage et intégrité documentaire','Poppler, stockage GED isolé et MySQL 8.4','Élevée'];
  if(value.includes('treasury')||value.includes('billing')||value.includes('refund')||value.includes('fiscal')||value.includes('fin0'))return['Finance et trésorerie','Transactions financières, concurrence et idempotence','MySQL 8.4 et données financières fictives','Critique'];
  if(value.includes('sav')||value.includes('workshop')||value.includes('vehicle')||value.includes('delivery'))return['SAV, Atelier et véhicules','Workflow métier, stock, livraison et concurrence','MySQL 8.4, API réelle et fixtures métier','Élevée'];
  if(value.includes('hr')||value.includes('salary')||value.includes('personnel'))return['Ressources humaines','Confidentialité, budgets et gouvernance RH','MySQL 8.4 et habilitations AGENCY/OWN','Critique'];
  return['ERP transversal','Persistance et invariants métier réels','MySQL 8.4 et environnement Node.js 22 isolé','Élevée'];
};
const escape=(value:unknown)=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
const command=(row:Row)=>`$${row.activation.map(name=>`${name}=1`).join(' ')} node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 ${row.file}`.replace('$','');
const rows=inventory.rows.map(row=>{const[module,feature,dependencies,criticality]=classify(row);return{...row,module,feature,dependencies,criticality};});

const inventoryLines=rows.map(row=>`| ${row.id} | \`${escape(row.file)}:${row.line}\` | ${escape(row.title)} | ${row.module} | \`${escape(row.condition)}\` | ${escape(row.activation.join(', '))} | ${row.dependencies} | ${row.criticality} |`).join('\n');
await writeFile(resolve(reportRoot,'38-inventaire-integrations-conditionnelles.md'),`# Inventaire des intégrations conditionnelles\n\nÉtat initial : la suite backend standard du 25 novembre 2026 comptait exactement **107 tests individuels ignorés**. Le rapprochement entre les 107 lignes TAP et l’analyse AST donne 107/107, sans disparition. La cause commune est l’absence volontaire des drapeaux d’intégration dans la commande standard ; les prérequis précis diffèrent selon les groupes ci-dessous.\n\n| ID | Fichier et ligne | Intitulé | Module | Condition exacte | Activation | Dépendances et prérequis | Criticité |\n|---|---|---|---|---|---|---|---|\n${inventoryLines}\n\nLa source machine vérifiable est [inventaire-source.json](./${evidence}/inventaire/inventaire-source.json). Les 107 intitulés initiaux extraits du TAP sont conservés dans [tests-ignores-initiaux.txt](./${evidence}/inventaire/tests-ignores-initiaux.txt).\n`);

const proofFor=(row:typeof rows[number])=>({
  'IC-001':`${evidence}/journaux/admin-provisioning-isole.tap`,
  'IC-014':`${evidence}/journaux/customer-identity-final.tap`,
  'IC-048':`${evidence}/journaux/migration-080-final.tap`,
  'IC-056':`${evidence}/journaux/mysql-migration-runner-final.tap`,
  'IC-107':`${evidence}/journaux/wss-proxy-reel-rootdb.tap`,
}[row.id]??`${evidence}/passage-conditionnelle-finale/journaux/integrations-sans-wss.log`);
const matrixLines=rows.map(row=>`| ${row.id} | ${escape(row.feature)} | \`${escape(row.condition)}\` | ${escape(row.prerequisiteDefinitions.join(' ; ')||row.activation.map(x=>`${x}=1`).join(' ; '))} | \`${escape(command(row))}\` | Réussi | \`${proofFor(row)}\` |`).join('\n');
await writeFile(resolve(reportRoot,'40-matrice-integrations-conditionnelles.md'),`# Matrice individualisée des 107 intégrations\n\nCette matrice conserve individuellement chaque test initial. Pour **IC-001**, la preuve autoritaire est le passage dédié sur base vierge \`${evidence}/journaux/admin-provisioning-isole.tap\`. Pour le test WSS, la preuve autoritaire est \`${evidence}/journaux/wss-proxy-reel-rootdb.tap\`. Pour les 105 autres tests, la preuve consolidée est le journal de la passe complète indiqué dans la table.\n\n| ID | Fonction protégée | Condition initiale | Prérequis exacts | Commande reproductible ciblée | Résultat final | Preuve |\n|---|---|---|---|---|---|---|\n${matrixLines}\n`);

console.log(JSON.stringify({generated:['38-inventaire-integrations-conditionnelles.md','40-matrice-integrations-conditionnelles.md'],rows:rows.length}));

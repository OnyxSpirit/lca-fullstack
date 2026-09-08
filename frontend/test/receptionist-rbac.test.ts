import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {canChangeVehicleStatus,canNavigateToRoute,hasPermission,visibleNotificationTypes} from '../src/navigation/permissions.js';
import {eligibleShowroomSalesUsers,showroomVisitorErrors} from '../src/modules/showroom/showroomPolicy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const receptionist=['RECEPTIONIST'] as const;

test('REC-01 le réceptionniste lit le stock sans commandes de mutation',()=>{
  assert.equal(hasPermission([...receptionist],'vehicles.view'),true);
  assert.equal(hasPermission([...receptionist],'vehicles.update'),false);
  assert.equal(canChangeVehicleStatus([...receptionist]),false);
  const page=read('../src/modules/vehicles/VehicleDetailPage.tsx');
  assert.match(page,/canChangeStatus&&<select/);
  assert.match(page,/canEdit&&<div className="flex flex-wrap gap-2">/);
  assert.match(page,/canCreateSale&&<Button/);
  assert.match(page,/canCreateRepairOrder&&<Button/);
  assert.match(page,/tab\.key!=='documents'\|\|canViewDocuments/);
  assert.match(page,/Prix de Vente Concession/);
});

test('REC-02 le dashboard conditionne finance, ventes, rapports et expose l’accueil réel',()=>{
  const page=read('../src/modules/dashboard/DashboardPage.tsx');
  assert.match(page,/canViewBilling&&<div[\s\S]*Chiffre d'Affaires/);
  assert.match(page,/canViewSales&&<div[\s\S]*Ventes du Mois/);
  assert.match(page,/canViewReports&&<button[\s\S]*Exporter Rapport/);
  assert.match(page,/canViewShowroom&&<div[\s\S]*Visiteurs aujourd’hui/);
  assert.match(page,/overview\.showroom\.waiting/);
});

test('REC-03 Client 360 filtre compteurs, onglets, requête GED et action OR',()=>{
  const page=read('../src/modules/customers/CustomerDetailPage.tsx');
  for(const permission of ['canViewSales','canViewService','canViewBilling','canViewDocuments'])assert.match(page,new RegExp(permission));
  assert.match(page,/useEntityDocuments\('customer',id,canViewDocuments\)/);
  assert.match(page,/tabs\.some\(tab=>tab\.key===activeTab\)/);
  assert.match(page,/canCreateRepairOrder&&<Button size="xs"/);
});

test('REC-04 le commercial doit être actif, commercial et appartenir à la même agence',()=>{
  const users=[
    {id:'same',status:'active',agencyId:'1',roles:['SALES_REP'],role:'SALES_REP'},
    {id:'manager',status:'active',agencyId:'1',roles:['SALES_MANAGER'],role:'SALES_MANAGER'},
    {id:'other',status:'active',agencyId:'2',roles:['SALES_REP'],role:'SALES_REP'},
    {id:'inactive',status:'inactive',agencyId:'1',roles:['SALES_REP'],role:'SALES_REP'},
    {id:'reception',status:'active',agencyId:'1',roles:['RECEPTIONIST'],role:'RECEPTIONIST'},
  ];
  assert.deepEqual(eligibleShowroomSalesUsers(users,'1').map(user=>user.id),['same','manager']);
  assert.match(read('../src/modules/showroom/ShowroomPage.tsx'),/Aucun conseiller commercial actif dans cette agence/);
});

test('REC-06 la validation showroom est contrôlée et conserve le formulaire',()=>{
  assert.deepEqual(showroomVisitorErrors('',''),{visitorName:'Le nom est obligatoire.'});
  assert.deepEqual(showroomVisitorErrors('Client','ABC'),{phone:'Le numéro de téléphone est invalide.'});
  assert.deepEqual(showroomVisitorErrors('Client','+242 06 000 00 00'),{});
  assert.match(read('../src/modules/showroom/ShowroomPage.tsx'),/<form noValidate/);
});

test('REC-07 le portail retire les coûts internes pour les profils non financiers',()=>{
  const page=read('../src/modules/modules-portal/ModulesPortalPage.tsx');
  assert.match(page,/canViewVehicleFinancials\?'Gestion du parc/);
  assert.match(page,/Consultation du parc VN\/VO, disponibilités, caractéristiques, photos et prix public/);
});

test('REC-08 les filtres et destinations de notifications respectent le rôle',()=>{
  assert.deepEqual(visibleNotificationTypes([...receptionist]),['lead','showroom','vehicle']);
  assert.equal(canNavigateToRoute([...receptionist],'/vehicles/42'),true);
  assert.equal(canNavigateToRoute([...receptionist],'/sales/42'),false);
  assert.equal(canNavigateToRoute([...receptionist],'/service/repair-orders/42'),false);
});

test('REC-09 les logos publics utilisent une URL racine stable',()=>{
  for(const path of ['../src/components/layout/Sidebar.tsx','../src/modules/auth/LoginPage.tsx']){
    const source=read(path);assert.doesNotMatch(source,/src=['"]\.\/images\//);assert.match(source,/src=['"]\/images\/logo-lca/);
  }
});

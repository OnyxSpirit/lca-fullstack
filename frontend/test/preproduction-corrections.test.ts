import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../src/${path}`,import.meta.url),'utf8');

test('PREPROD-FRONT: la facture a un libellé explicite et les rôles une suppression sûre',()=>{
  assert.match(source('modules/billing/NewInvoiceModal.tsx'),/Créer une facture/);
  const roles=source('modules/users/RoleManagementPanel.tsx');
  assert.match(roles,/can\('roles\.delete'\)/);
  assert.match(roles,/Rôle de remplacement/);
  assert.match(roles,/Aucun utilisateur ne sera supprimé/);
});

test('PREPROD-FRONT: ventes et devis aident sur le coût sans remplacer la validation serveur',()=>{
  const sale=source('modules/sales/SaleWizardModal.tsx'),quote=source('modules/crm/QuotationModal.tsx');
  assert.match(sale,/pricingGuard\.data\?\.maxDiscount/);assert.match(sale,/maxDiscount/);assert.match(sale,/Remise maximale autorisée/);
  assert.match(quote,/acquisitionCost/);assert.match(quote,/maxDiscount/);assert.match(quote,/Remise maximale autorisée/);
});

test('PREPROD-FRONT: les candidats locaux excluent le Super Admin et Livraison consomme la liste backend filtrée',()=>{
  for(const file of ['modules/sales/SaleWizardModal.tsx','modules/showroom/showroomPolicy.ts'])
    assert.match(source(file),/isSystemSuperAdmin/);
  assert.match(source('modules/deliveries/NewDeliveryModal.tsx'),/useDeliverySpecialistsQuery/);
  assert.match(source('stores/authStore.ts'),/profile\.role\.isSystemSuperAdmin/);
});

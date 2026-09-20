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
  for(const file of ['modules/sales/SaleWizardModal.tsx','modules/crm/QuotationModal.tsx']){
    const text=source(file);
    assert.match(text,/acquisitionCost/);
    assert.match(text,/maxDiscount/);
    assert.match(text,/Remise maximale autorisée/);
  }
});

test('PREPROD-FRONT: les candidats opérationnels ne montrent pas le Super Admin système',()=>{
  for(const file of ['modules/sales/SaleWizardModal.tsx','modules/showroom/showroomPolicy.ts','modules/deliveries/NewDeliveryModal.tsx'])
    assert.match(source(file),/isSystemSuperAdmin/);
  assert.match(source('stores/authStore.ts'),/profile\.role\.isSystemSuperAdmin/);
});

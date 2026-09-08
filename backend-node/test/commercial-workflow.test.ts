import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {validateCreateSale} from '../src/modules/sales/sale.domain.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('la vente accepte et valide les identifiants opportunity et quotation',()=>{const value=validateCreateSale({customerId:'1',vehicleId:'2',opportunityId:'3',quotationId:'4',discount:0,depositAmount:0,idempotencyKey:'workflow-123'});assert.equal(value.opportunityId,'3');assert.equal(value.quotationId,'4')});
test('le module devis réutilise les tables existantes et protège agence, rôle, essai et doublon',()=>{const service=read('../src/modules/quotations/quotation.service.ts');for(const value of ['INSERT INTO quotations','INSERT INTO quotation_items',"stage='offer'",'Un essai réel doit être enregistré','Un devis actif existe déjà'])assert.match(service,new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))});
test('la transformation commerciale est transactionnelle et lie devis, opportunité, vente et véhicule',()=>{const service=read('../src/modules/sales/sale.service.ts');assert.match(service,/opportunity_id,quotation_id/);assert.match(service,/UPDATE opportunities SET stage='won'/);assert.match(service,/UPDATE quotations SET status='accepted'/);assert.match(service,/UPDATE vehicles SET status='reserved'/);assert.match(service,/Cette opportunité a déjà été transformée/);assert.match(service,/Ce devis a déjà été transformé/)});
test('le pipeline refuse les étapes structurantes libres et exige le motif perdu',()=>{const crm=read('../src/modules/crm/crm.routes.ts');assert.match(crm,/\['appointment','test_drive','offer','won'\]\.includes\(stage\)/);assert.match(crm,/Le motif de perte est obligatoire/);assert.match(crm,/Opportunité perdue/);assert.match(crm,/commercial, besoin, coordonnées et budget sont requis/)});
test('SALES_AGENT ne peut pas attribuer sa vente à autrui et seuls les rôles commerciaux sont éligibles',()=>{const sales=read('../src/modules/sales/sale.service.ts');assert.match(sales,/Un commercial ne peut pas attribuer sa vente à un autre utilisateur/);assert.match(sales,/r\.code IN\('SALES_AGENT','SALES_MANAGER'\)/);assert.doesNotMatch(sales,/r\.code IN\('SALES_AGENT','SALES_MANAGER','DIRECTOR'/)});

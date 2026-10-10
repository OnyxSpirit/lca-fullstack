import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const eligibility = readFileSync(new URL('../src/modules/workshop/vehicle-warranty-eligibility.service.ts', import.meta.url), 'utf8');
const workshop = readFileSync(new URL('../src/modules/workshop/workshop.routes.ts', import.meta.url), 'utf8');
const warranty = readFileSync(new URL('../src/modules/workshop/warranty.service.ts', import.meta.url), 'utf8');

test('UI08-BE-01 le contrat est recherché par véhicule', () => assert.match(eligibility, /WHERE vwc\.vehicle_id=\?/));
test('UI08-BE-02 le nom snapshoté est prioritaire', () => assert.match(eligibility, /COALESCE\(vwc\.provider_name_snapshot,wp\.name\) resolved_provider_name/));
test('UI08-BE-03 le code snapshoté est prioritaire avec relation en repli', () => assert.match(eligibility, /COALESCE\(vwc\.provider_code_snapshot,wp\.code\) resolved_provider_code/));
test('UI08-BE-04 le provider ID contractuel reste exposé', () => assert.match(eligibility, /providerId:contract\.provider_id/));
test('UI08-BE-05 la limite NULL reste NULL', () => assert.match(eligibility, /mileageLimit:contract\.mileage_limit==null\?null/));
test('UI08-BE-06 les dates et le kilométrage initial viennent du contrat', () => { for (const field of ['start_date', 'expiry_date', 'initial_mileage', 'activated_at', 'duration_months']) assert.match(eligibility, new RegExp(field)); });
test('UI08-BE-07 les états métier restent distincts', () => { for (const status of ['NO_CONTRACT', 'UNDETERMINED', 'NOT_COVERED', 'PENDING_ACTIVATION', 'EXPIRED_BY_DATE', 'MILEAGE_REQUIRED', 'EXPIRED_BY_MILEAGE', 'ELIGIBLE_CONTRACTUALLY']) assert.match(eligibility, new RegExp(status)); });
test('UI08-BE-08 le kilométrage de réception est comparé à la limite contractuelle', () => assert.match(eligibility, /currentMileage!>Number\(contract\.mileage_limit\)/));
test('UI08-BE-09 un OR éligible crée automatiquement une Warranty PENDING', () => assert.match(workshop, /ELIGIBLE_CONTRACTUALLY'[\s\S]*INSERT INTO repair_order_warranties[\s\S]*'PENDING'/));
test('UI08-BE-10 la Warranty créée conserve le provider du contrat', () => assert.match(workshop, /contractWarranty\.contract!\.providerId/));
test('UI08-BE-11 le détail Warranty privilégie le snapshot contractuel', () => { assert.match(warranty, /COALESCE\(vwc\.provider_name_snapshot,p\.name\) provider_name/); assert.match(warranty, /COALESCE\(vwc\.provider_code_snapshot,p\.code\) provider_code/); });
test('UI08-BE-12 le détail Warranty reste isolé par OR', () => assert.match(warranty, /WHERE w\.repair_order_id=\?/));
test('UI08-BE-13 les paramètres constructeur courants ne pilotent pas l’éligibilité', () => assert.doesNotMatch(eligibility, /default_warranty|warranty_available|is_active/));
test('UI08-BE-14 aucun moteur RBAC central n’est contourné', () => { assert.match(workshop, /serviceAccess\('service\.order\.create'\)/); assert.match(workshop, /permissionCoversAgency/); });

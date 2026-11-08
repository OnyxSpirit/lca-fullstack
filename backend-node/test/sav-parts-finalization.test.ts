import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=(path:string)=>readFile(new URL(path,root),'utf8');
const[m106,m107,m108,m109,m110,logistics,sales,purchases,workshop,partsUi,salesUi,purchasesUi,workshopUi]=await Promise.all([
 read('database/migrations/106_sav_parts_internal_logistics.sql'),read('database/migrations/107_parts_counter_sales.sql'),read('database/migrations/108_parts_direct_purchases.sql'),read('database/migrations/109_workshop_estimate_supplements.sql'),read('database/migrations/110_parts_returns_exchange_warranty.sql'),read('src/modules/parts/internal-logistics.routes.ts'),read('src/modules/parts/part-sales.routes.ts'),read('src/modules/parts/direct-purchases.routes.ts'),read('src/modules/workshop/workshop.routes.ts'),read('../frontend/src/modules/parts/PartsWorkQueuePage.tsx'),read('../frontend/src/modules/parts/PartSalesPanel.tsx'),read('../frontend/src/modules/parts/DirectPurchasesPanel.tsx'),read('../frontend/src/modules/service/RepairOrderDetailPage.tsx')]);

test('SAV-FINAL-01 la sortie physique interne précède la réception et la consommation',()=>{
 assert.match(logistics,/current_stock=current_stock-\?,reserved_stock=reserved_stock-\?/);
 assert.match(logistics,/sav_part_delivery_receipt_items/);
 assert.match(workshop,/quantity_received\)-Number\(requestItem\.quantity_consumed/);
 assert.match(partsUi,/Confirmer les quantités reçues/);
});

test('SAV-FINAL-01B une réservation non expédiée peut être libérée sans réception physique',()=>{
 assert.match(workshop,/status==='released'&&requestItem\?reservedRemaining/);
 assert.match(workshop,/requestItem&&status==='consumed'\?'La quantité consommée dépasse la quantité physiquement reçue/);
 assert.match(workshop,/item\.item_type==='part'&&item\.reservation_status==='released'/);
 assert.match(workshop,/pr\.status='released'/);
});

test('SAV-FINAL-02 seuls les retours contrôlés en bon état réintègrent le stock',()=>{
 assert.match(logistics,/decision==='RESTOCKED'&&x\.condition_code!=='GOOD'/);
 assert.match(logistics,/current_stock=current_stock\+\?/);
 assert.match(m106,/QUARANTINED/);
});

test('PART-SALE-01 facturer réserve mais la remise seule décrémente le physique',()=>{
 assert.match(sales,/reserved_stock=reserved_stock\+\?/);
 assert.match(sales,/current_stock=current_stock-\?,reserved_stock=reserved_stock-\?/);
 assert.match(sales,/parts\.sale\.release_unpaid/);
 assert.match(m107,/part_sale_returns/);
 assert.match(salesUi,/Ventes directes magasin/);
});

test('PART-SALE-02 retours, avoir central et décisions de stock sont explicites',()=>{
 assert.match(sales,/archiveCreditNote/);
 assert.match(sales,/QUARANTINED/);
 assert.match(sales,/financialDecision/);
 assert.match(salesUi,/Instruire/);
 assert.match(m110,/part_sale_return_history/);
 assert.match(sales,/exchangeSaleId/);
 assert.match(sales,/warrantyApplicable/);
});

test('PART-PURCHASE-01 les achats occasionnels ne requièrent pas de fournisseur',()=>{
 assert.match(m108,/supplier_id BIGINT UNSIGNED NULL/);
 assert.match(m108,/seller_name VARCHAR\(200\) NOT NULL/);
 assert.match(purchases,/OCCASIONAL/);
 assert.match(purchasesUi,/sans fiche fournisseur obligatoire/);
});

test('PART-PURCHASE-02 aucune dette ou avance ne fabrique un décaissement',()=>{
 assert.match(m108,/treasury_movement_id BIGINT UNSIGNED NOT NULL/);
 assert.match(purchases,/movement\.status!=='POSTED'/);
 assert.match(purchases,/movement\.direction!=='OUT'/);
 assert.doesNotMatch(purchases,/INSERT INTO treasury_movements/);
});

test('SAV-FINAL-03 le devis accepté reste immuable et les compléments ont leur décision propre',()=>{
 assert.match(m109,/repair_estimate_supplements/);
 assert.match(m109,/supplement_id BIGINT UNSIGNED NULL/);
 assert.match(workshop,/estimate-supplements\/:supplementId\/decision/);
 assert.match(workshop,/Complément de devis accepté/);
 assert.match(workshopUi,/Compléments de devis/);
});

test('SAV-FINAL-04 les dérogations de main-d’œuvre sont permissionnées et auditées',()=>{
 assert.match(workshop,/service\.labor\.override/);
 assert.match(workshop,/workshop\.labor_rate\.overridden/);
 assert.match(workshop,/overrideReason/);
 assert.match(workshopUi,/Tarif dérogatoire HT/);
});

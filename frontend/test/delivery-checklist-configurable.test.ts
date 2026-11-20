import assert from'node:assert/strict';import{readFileSync}from'node:fs';import test from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),settings=read('../src/modules/settings/SettingsPage.tsx'),config=read('../src/modules/deliveries/DeliveryChecklistTemplates.tsx'),detail=read('../src/modules/deliveries/DeliveryDetailPage.tsx'),hooks=read('../src/api/erpHooks.ts');
test('UI-CHK-01..10 Paramètres affiche la gestion permissionnée complète',()=>{assert.match(settings,/Checklist livraison/);assert.match(settings,/delivery\.checklist\.config\.view/);assert.match(settings,/delivery\.checklist\.config\.manage/);for(const token of['createCategory','updateCategory','categoryStatus','reorderCategories','createItem','updateItem','itemStatus','reorderItems'])assert.match(config+hooks,new RegExp(token));assert.match(config,/Obligatoire/);assert.match(config,/Facultatif/);assert.doesNotMatch(config,/roles\.includes|SUPER_ADMIN/)});
test('UI-CHK-REG-01..12 restaure catégories et types avec deux paginations indépendantes',()=>{
 assert.match(config,/Catégories de checklist/);assert.match(config,/Types de checklist/);
 assert.equal((config.match(/<ClientPagination/g)??[]).length,2);
 assert.match(config,/label="catégorie\(s\)"/);assert.match(config,/label="type\(s\)"/);
 assert.match(config,/Rechercher une catégorie/);assert.match(config,/Rechercher un type/);
 assert.match(config,/Toutes les catégories/);assert.match(config,/\.\.\.typeForm/);
 assert.match(config,/setEditingCategory/);assert.match(config,/setEditingType/);
 assert.match(config,/reorderCategories/);assert.match(config,/reorderTypes/);
 assert.doesNotMatch(settings,/Checklists de livraison/);
});
test('UI-CHK-11..24 démarrage, snapshot, stepper et garde obligatoire',()=>{assert.match(detail,/Étapes applicables à figer au démarrage/);assert.match(detail,/categoryIds:selectedCategories/);assert.match(detail,/checklist_categories/);assert.match(detail,/Checklist par étapes/);assert.match(detail,/mandatoryCompleted/);assert.match(detail,/mandatoryTotal/);assert.match(detail,/OBLIGATOIRE/);assert.match(detail,/FACULTATIF/);assert.match(detail,/completed_by_name/);assert.match(detail,/formatDate\(item\.completed_at\)/);assert.match(detail,/delivery\.status==='planned'/);assert.match(detail,/readOnly/);assert.match(detail,/Les éléments obligatoires de la checklist doivent être terminés/)});

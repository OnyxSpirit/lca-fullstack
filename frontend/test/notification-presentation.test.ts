import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{notificationCategory,notificationNavigationLabel,notificationPresentation,notificationPriorityPresentation,translateNotificationMessage,translateNotificationTitle}from'../src/modules/notifications/notificationPresentation';

const record=(overrides:Record<string,unknown>={})=>({subject:'Titre métier',message:'Description métier',eventType:'crm.lead_assigned',referenceType:'lead',priority:'normal' as const,...overrides});

test('P0 traduit les événements connus, dynamiques et fournit un fallback français',()=>{
 assert.equal(translateNotificationTitle('workshop.status_changed','workshop.status_changed'),'Activité de l’atelier');
 assert.equal(notificationPresentation(record({eventType:'employee_bonus.approved',referenceType:'employee_bonus'})).categoryLabel,'Ressources humaines');
 assert.equal(translateNotificationTitle('unknown.event','unknown.event'),'Nouvelle information');
});

test('P0 traduit uniquement les statuts contextualisés connus',()=>{
 assert.equal(translateNotificationMessage('Le prospect #42 est maintenant à l’étape appointment.','crm.lead_assigned'),'Le prospect #42 est maintenant à l’étape Rendez-vous.');
 assert.equal(translateNotificationMessage('Le prospect #42 est maintenant à l’étape test_drive.','crm.lead_assigned'),'Le prospect #42 est maintenant à l’étape Essai du véhicule.');
 assert.equal(translateNotificationMessage('La vente 17 est au statut ready_for_delivery.','sale.ready_for_delivery'),'La vente 17 est au statut Prête pour livraison.');
 assert.equal(translateNotificationMessage('OR-2026-17: ready','workshop.status_changed'),'OR-2026-17: Prêt');
 assert.equal(translateNotificationMessage('Le fichier ready.pdf du client appointment reste inchangé.','unknown.event'),'Le fichier ready.pdf du client appointment reste inchangé.');
});

test('P0 préserve références, VIN, noms et texte libre',()=>{
 const source='LIV-20261108-259542 · VIN WBA123TEST · Mme Appointment · ready.pdf';
 assert.equal(translateNotificationMessage(source,'delivery.status_changed'),source);
});

test('P1 catégorise les domaines et traduit les priorités',()=>{
 assert.equal(notificationCategory('quotation.created','lead'),'quotations');
 assert.equal(notificationCategory('parts.return.declared','repair_order'),'parts');
 assert.equal(notificationCategory('auth.2fa.enabled','user'),'security');
 assert.equal(notificationPriorityPresentation.low.label,'Discrète');
 assert.equal(notificationPriorityPresentation.normal.label,'Information');
 assert.equal(notificationPriorityPresentation.high.label,'Important');
 assert.equal(notificationPriorityPresentation.urgent.label,'Critique');
});

test('P1 limite la navigation aux détails réellement exploitables',()=>{
 assert.equal(notificationNavigationLabel('delivery'),'Consulter la livraison');
 assert.equal(notificationNavigationLabel('repair_order'),'Consulter l’ordre de réparation');
 assert.equal(notificationNavigationLabel('lead'),null);
 assert.equal(notificationNavigationLabel('user'),null);
});

test('P1 formate les dates en français et garde un fallback explicite',()=>{
 const hooks=readFileSync(new URL('../src/api/notificationHooks.ts',import.meta.url),'utf8');
 assert.match(hooks,/Number\.isNaN\(date\.getTime\(\)\).*Date indisponible/);
 assert.match(hooks,/toLocaleString\('fr-CG'/);
 assert.match(hooks,/Aujourd’hui|Hier/);
});

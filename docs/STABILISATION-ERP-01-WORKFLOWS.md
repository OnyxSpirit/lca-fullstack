# STABILISATION-ERP-01 — Workflows et interactions

Les transitions ci-dessous sont celles observées dans le code et les rapports récents. Chaque workflow reste **À EXÉCUTER** en recette générale.

| ID | Workflow réel | Acteur / permission pivot | Effets et interdictions |
|---|---|---|---|
| WF-01 | prospect créé → affecté → contacté → qualifié | CRM create/assign/pipeline | activités, notifications, scope owner; qualification sans commercial refusée |
| WF-02 | prospect CRM → client | CRM + customers.create | client et liens CRM; doublon contrôlé |
| WF-03 | rendez-vous pending → completed/cancelled | crm.appointment.create | conflit temporel avec essais; override séparé |
| WF-04 | visite waiting → assigned → in_progress → completed/cancelled | showroom.* | auteur, conseiller et outcome tracés |
| WF-05 | essai planned → in_progress → completed/cancelled | showroom.visitor.update / crm.test_drive.create | verrous véhicule/conseiller/visite; reprogrammation seulement planned |
| WF-06 | opportunité test_drive → devis draft | quotations.create | essai retourné et commercial requis; client assuré |
| WF-07 | devis draft → sent → converted ou cancelled/rejected | quotations.validate/convert/cancel | PDF immuable à émission; conversion unique |
| WF-08 | véhicule available → reserved → sold → delivered | ventes/livraison | historique statut et réservation; transitions concurrentes verrouillées |
| WF-09 | création vente → reserved | sales.create | vente, ligne, réservation, stock, audit atomiques |
| WF-10 | reserved → ordered → confirmed | sales.confirm | confirmation commerciale; archive bon de commande |
| WF-11 | confirmed → preparation → ready_for_delivery | sales.confirm | facture et garde financière requises |
| WF-12 | facture draft → issued → partially_paid/paid | billing.invoice.issue/payment.collect | paiement réel seulement; reçu et Treasury |
| WF-13 | facture → avoir → remboursement | billing/payment permissions | objets séparés; aucune compensation implicite |
| WF-14 | vente prête → livraison scheduled/preparation → delivered | delivery.* | checklist, documents, signature, PDF, stock |
| WF-15 | solde restant → autorisation → livraison → règlement ultérieur | delivery.financial_override.authorize | facture reste partiellement payée; snapshot solde; vente annulée interdite |
| WF-16 | vente annulable → cancelled | sales.cancel | motif; factures non payées/réservations annulées; stock libéré; paiement/livraison bloquent |
| WF-17 | livraison → retour opened/received/inspected/resolved/closed | vehicle.return.* | déductions, résolution financière, décision stock, PDF |
| WF-18 | rendez-vous SAV → réception → OR | service.order.receive/create | client/véhicule, inspection, conseiller |
| WF-19 | OR → diagnostic → estimation → accord/refus | service.order.diagnose/approve | lignes et historique; intervention liée possible |
| WF-20 | OR → planification baie/technicien | workshop.plan/assign_* | capacité et indisponibilités |
| WF-21 | intervention/session start → pause/resume/stop → complete | workshop.session.* | temps append-only/corrigé avec motif |
| WF-22 | pièce disponible → réservation → consommation/libération | parts.reservation.* | stock réservé puis physique; concurrence sous verrou |
| WF-23 | OR → contrôle qualité → ready → handover/closed | service.order.quality_control/ready/handover | restitution et documents |
| WF-24 | OR facturable → facture SAV → paiement | service.order.invoice + billing.* | montants SAV transmis, Treasury sur encaissement |
| WF-25 | commande fournisseur draft → sent → confirmed → partial/received | parts.purchase_order.* | réceptions idempotentes et mouvements de stock |
| WF-26 | employé → contrat → rémunération prepared/submitted/validated/engaged/paid | hr.* | historique, séparation validation/paiement, Treasury |
| WF-27 | prime/congé draft → pending → approved/rejected/cancelled | hr.bonus/leave.* | approbateur distinct et scopes RH |
| WF-28 | budget draft → submitted → approved → closed/reopened | hr.budget.* | historique d’approbation; enveloppe distincte du cash |
| WF-29 | dépense → soumise → approuvée → décaissée | hr.expense.* + treasury | engagement budget puis mouvement réel |
| WF-30 | relevé preview → validé → lignes rapprochées → annulation éventuelle | treasury.reconciliation.* | import CSV, ambiguïtés non auto-résolues, historique/export |
| WF-31 | document upload → versions → archive/restore | ged.* | stockage privé, rattachement, hash et permissions |
| WF-32 | signature/cachet actif → snapshot → PDF livraison archivé | signature/stamp/document.signature.apply | anciens PDF immuables |
| WF-33 | rôle → permissions/scopes → utilisateur → connexion | roles/users.* | délégation bornée; seul SUPER_ADMIN système spécial |
| WF-34 | opération métier → audit/notification → dashboard/reporting | permissions de lecture | visibilité selon scope; caches Socket.IO invalidés |

## Interactions critiques

CRM alimente Clients, Devis puis Ventes. Ventes consomme Stock et alimente Facturation/Livraison. Paiements, remboursements, fournisseurs, paie et dépenses alimentent Treasury sans être confondus avec validation ou engagement. SAV relie Clients/Véhicules, Atelier, Pièces, Garanties, Facturation et GED. Settings fournit identité, fiscalité, durées, référentiels, cachets et tarifs consommés par plusieurs modules.

## Workflow absent ou non démontré

- Aucun ordonnanceur automatique de démarrage des essais planifiés : démarrage manuel.
- Aucun système de signature électronique qualifiée/PKI : images et hash seulement.
- Aucun paiement bancaire automatique ni import comptable externe démontré.
- Aucune génération PDF RH officielle démontrée par le lot cachets.

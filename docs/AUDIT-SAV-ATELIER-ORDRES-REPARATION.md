# Audit SAV / Atelier / Ordres de réparation

## 1. Synthèse exécutive

L’ERP possède un workflow SAV substantiel et réellement contrôlé côté serveur. Un ordre de réparation (OR) est créé au statut `planned`, réceptionné après inspection, diagnostiqué, chiffré, soumis à une décision client, exécuté par interventions et sessions, contrôlé, facturé, remis puis clôturé. Le planning Atelier, les ponts, les techniciens, les indisponibilités, les pièces, la garantie constructeur et la facturation sont reliés à ce dossier.

Les points forts sont les transactions avec verrouillage pessimiste sur les opérations sensibles, la séparation entre chiffrage et réel facturable, les clés d’idempotence sur plusieurs créations, les permissions dynamiques et les historiques spécialisés. La facturation est protégée contre le doublon actif et la remise exige un contrôle qualité réussi ainsi qu’un solde client nul.

Les limites structurantes sont les suivantes : il n’existe pas de véritable objet « devis atelier » versionné ou documentaire ; le chiffrage est un ensemble unique de lignes dans l’OR, définitivement verrouillé dès la première décision client. La réception ne gère ni photographies ni liste structurée de dommages/accessoires. L’OR ne propose pas de modification générale du motif, du kilométrage d’entrée ou du diagnostic après saisie. La traçabilité est morcelée entre plusieurs historiques et plusieurs mutations métier importantes ne produisent pas d’événement d’audit général.

Le constat le plus important concerne l’éligibilité kilométrique de la garantie véhicule : le service compare le kilométrage courant à la limite contractuelle brute, sans ajouter le kilométrage initial du véhicule. Si la limite représente bien un nombre de kilomètres couverts — ce que suggèrent le modèle de contrat et l’activation avec `initial_mileage` — un véhicule livré à 20 000 km avec une garantie de 100 000 km serait déclaré expiré au-delà de 100 000 km au lieu de 120 000 km. Ce point est classé P1 et nécessite validation métier avant correction.

Aucun fichier applicatif, schéma, migration ou donnée n’a été modifié. L’analyse est statique ; les éléments dépendant de la base effectivement déployée sont indiqués comme à confirmer.

## 2. Périmètre et méthode

Sources principales :

- routes SAV et Atelier : `backend-node/src/modules/workshop/workshop.routes.ts` ;
- garanties SAV : `warranty.routes.ts`, `warranty.service.ts`, `vehicle-warranty-eligibility.service.ts` ;
- véhicules extérieurs : `workshop-vehicle.routes.ts` ;
- composants : `ServiceDashboardPage.tsx`, `NewRepairOrderModal.tsx`, `RepairOrderDetailPage.tsx`, `WorkshopPlanningPage.tsx`, `PartsWorkQueuePage.tsx` ;
- schéma consolidé : `backend-node/database/baseline/001_initial_schema.sql` ;
- migrations 035 à 040, 046 à 048, 070, 071 et migrations historiques 008, 009, 011, 030 à 032 ;
- hooks et modèles frontend dans `frontend/src/api/erpHooks.ts` et `frontend/src/types/index.ts` ;
- tests SAV existants, utilisés comme documentation complémentaire mais non exécutés.

Méthode : lecture statique, recherche des routes, permissions, requêtes SQL, contraintes et composants. Aucune application, base, migration, recette navigateur ou campagne de tests n’a été lancée. Les numéros de ligne cités correspondent à l’état du worktree audité et peuvent évoluer.

## 3. Cartographie des interfaces et chemins d’accès

| Chemin ERP | Intitulé réel | Composant | Fonctions principales | Accès visible |
|---|---|---|---|---|
| `/service` | « SAV & Ordres de Réparation (OR) » | `ServiceDashboardPage.tsx` | indicateurs, recherche, filtres, liste paginée, création d’OR, onglet clients extérieurs | module `service`; actions filtrées par `service.order.*` |
| `/service/repair-orders/:id` | « Ordre de réparation {numéro} » | `RepairOrderDetailPage.tsx` | toutes les étapes métier, garantie, pièces, planning, pointage, facture, paiement, remise, abandon, historique | `service.order.view`, puis permission par action |
| modale depuis `/service` | « Créer un Ordre de Réparation Atelier (OR) » | `NewRepairOrderModal.tsx` | parcours concession ou extérieur, client, véhicule, conseiller, motif, kilométrage, fin promise | `service.order.create`; permissions clients/véhicules extérieurs selon parcours |
| onglet `/service` | « Clients extérieurs » | `ExternalCustomersPanel.tsx` | liste, détail, véhicules reçus, historique des OR extérieurs, accès Client 360 | `service.order.view` + `customers.view` |
| `/workshop` | « Planning Atelier & Ponts » | `WorkshopPlanningPage.tsx` | vue jour/semaine, affectations, ressources, indisponibilités, statistiques, historique interventions | `workshop.view` et permissions spécialisées |
| `/parts/repair-orders` | file OR Pièces | `PartsWorkQueuePage.tsx` | demandes chiffrées et réservations par OR | module `parts`, `parts.reservation.view` |
| `/parts/repair-orders/:id` | détail file Pièces | même composant | réservation, consommation ou libération selon droits | permissions `parts.reservation.*` |
| Paramètres | barèmes Atelier | `WorkshopLaborRatesSettings.tsx` | barèmes concession et surcharges agence | permissions Paramètres correspondantes |

Le détail OR contient les blocs réels suivants : « Réception véhicule », diagnostic, « Chiffrage avant travaux », « Validation client », interventions, affectation Atelier, « Pièces et main-d’œuvre », « Réel facturable », « Contrôle qualité », « Récapitulatif final », « Facturation », « Situation financière », « Remise / clôture », « Historique du dossier », « Abandon client » et « Annulation sensible ». Les cartes « Garantie du véhicule » et prise en charge de l’OR sont distinctes.

## 4. Inventaire des fonctionnalités SAV

Implémenté et relié au backend :

- rendez-vous SAV simples et changement de leur statut ;
- OR concession et OR de véhicule extérieur ;
- création/réutilisation d’un client et d’un véhicule extérieur ;
- association client-véhicule historisée ;
- réception structurée avec carburant, propreté, dommages, objets, kilométrage, observations et signature ;
- diagnostic unique ;
- chiffrage main-d’œuvre/pièces avec TVA, remise et barème snapshoté ;
- décision client unique, acceptation ou refus ;
- interventions, techniciens, planning, ponts, collisions, indisponibilités ;
- sessions démarrer/pause/reprise/arrêt et temps réels ;
- réservation, consommation partielle ou totale et libération de pièces ;
- réel facturable distinct du chiffrage ;
- contrôle qualité répétable après retour en travaux ;
- garantie contractuelle véhicule et prise en charge propre à l’OR ;
- ventilation client/constructeur, créance constructeur et règlement ;
- facture client Atelier et encaissements ;
- remise signée et mise à jour non décroissante du kilométrage véhicule ;
- clôture, annulation pré-travaux et abandon pré-démarrage avec régularisation ;
- PDF OR, notifications temps réel et notifications applicatives ciblées.

Absent ou incomplet : photos de réception, documents/signatures autres que les champs LONGTEXT dédiés, devis multiples/versionnés, validation de travaux supplémentaires, reprise d’un OR clôturé, avoir directement orchestré par l’OR, véhicule de courtoisie dans l’interface, modification générale d’un OR, motif de suspension d’une session, sortie de clés structurée et notification client externe.

## 5. Architecture fonctionnelle des OR

L’OR (`repair_orders`) est l’agrégat principal. Il référence client, véhicule, agence, conseiller et éventuellement rendez-vous. Son origine véhicule est snapshotée (`CONCESSION`, `EXTERNAL`, `UNKNOWN`).

Quatre niveaux financiers sont séparés :

1. `repair_order_estimate_items` : autorisation/chiffrage avant travaux ;
2. `interventions`, `work_sessions`, `time_entries` : exécution et temps réellement pointé ;
3. `repair_order_items` : réel facturable ;
4. `invoices`/`invoice_items` et éventuellement `warranty_claims` : émission financière.

Une ligne estimative de main-d’œuvre peut produire une intervention et une ligne réelle. Une pièce estimative peut produire une réservation puis, lors de sa consommation, une ligne réelle. Les clés étrangères et unicités `estimate_item_id` empêchent plusieurs chaînes d’exécution pour une même ligne estimative.

Le planning (`schedules`) est une réservation de ressources indépendante du statut métier de l’intervention. Une intervention porte un technicien ; une session matérialise le démarrage effectif. La fin d’intervention clôt les plannings associés si aucune session active ne subsiste.

## 6. Workflow complet de création à clôture

### Création

Le POST `/repair-orders` exige un client, un véhicule, un conseiller valide, un kilométrage entier positif ou nul et un motif non vide. La date de fin promise est facultative. Le diagnostic sommaire initial est facultatif.

Le client doit être couvert par le scope `service.order.create`. Le véhicule doit être dans l’agence du client ou relié par `customer_vehicles`, et être relié au client par une association courante, une vente ou un ancien OR. Le frontend sépare « concession » et « extérieur » et envoie `expectedVehicleOrigin`; le backend rejette une origine différente.

Pour un véhicule extérieur, le parcours peut créer le client, créer un véhicule central non commercial puis l’association. Le VIN est prioritaire pour la détection ; les ambiguïtés d’immatriculation nécessitent confirmation. Les contraintes exactes sont dans `workshop-vehicle.routes.ts`.

La création génère `OR-${Date.now()}`, crée l’historique `planned`, évalue la garantie du véhicule et, si elle est contractuellement éligible, initialise une demande de prise en charge `PENDING`. Le rendez-vous lié passe à `completed`.

Il n’y a pas de photographie, document, état détaillé ou signature à la création : ces informations relèvent de l’inspection suivante. Il n’existe pas de verrou d’unicité empêchant deux OR actifs pour le même véhicule.

### Réception à clôture

1. Garantie OR éventuelle : décision exigée avant réception si une demande `PENDING` existe.
2. Inspection unique au statut `planned`.
3. Transition `planned → received`.
4. Transition `received → diagnosis`, puis diagnostic unique.
5. Chiffrage modifiable en `diagnosis` ou `waiting_approval`, tant qu’aucune décision client n’existe.
6. Transition vers `waiting_approval`, exigeant diagnostic et au moins une ligne chiffrée.
7. Décision client unique. Un refus annule immédiatement l’OR et libère les ressources.
8. Acceptation puis `waiting_approval → in_progress`.
9. Création des interventions depuis les lignes autorisées, réservation/consommation des pièces, sessions et réel facturable.
10. Passage en contrôle qualité lorsque toutes les interventions sont finies, aucune session active, tout le réel est confirmé et la ventilation garantie finale est prête.
11. Contrôle refusé : retour autorisé vers `in_progress`. Contrôle accepté : transition vers `ready`.
12. Facture : action dédiée `ready → invoiced`, pas transition générique.
13. Remise : action dédiée `invoiced → delivered`, facture soldée et contrôle qualité validé.
14. Clôture : `delivered → closed`.

## 7. Matrice des statuts et transitions

| Initial | Action | Final | Permission | Préconditions et effets |
|---|---|---|---|---|
| — | créer OR | `planned` (Planifié) | `service.order.create` | client/véhicule/conseiller valides ; historique ; garantie éventuelle |
| `planned` | réceptionner | `received` (Réceptionné) | `service.order.receive` | inspection existante et décision garantie non pendante ; `received_at` |
| `received` | passer au diagnostic | `diagnosis` | `service.order.diagnose` | transition simple |
| `diagnosis` | demander validation | `waiting_approval` | `service.order.diagnose` | diagnostic et chiffrage obligatoires |
| `waiting_approval` | accepter puis préparer atelier | `in_progress` | `service.order.approve` | dernière décision client acceptée ; garantie non pendante |
| `in_progress` | passer au contrôle | `quality_control` | `service.order.quality_control` | interventions terminées, aucune session active, réel facturable confirmé, garantie ventilée |
| `quality_control` | contrôle refusé + retour | `in_progress` | `service.order.advance` | dernier contrôle `failed` |
| `quality_control` | contrôle accepté puis prêt | `ready` | `service.order.ready` | contrôle `passed` et cinq contrôles obligatoires vrais |
| `ready` | générer facture | `invoiced` | `service.order.invoice` + `billing.invoice.create` + `billing.invoice.issue` | décision/ventilation garantie finalisées ; facture/créance créées |
| `invoiced` | remettre véhicule | `delivered` | `service.order.handover` | facture existante et soldée, QC réussi, garantie constituée, signature |
| `delivered` | clôturer | `closed` | `service.order.close` | renseigne `closed_at` |
| états avant `ready` | annuler | `cancelled` | `service.order.cancel` | motif obligatoire, aucun travail commencé ni activité réelle ; libère planning/réservations |
| `planned` à `invoiced` | demander abandon | `abandonment_pending` | `service.order.abandon` | travaux jamais démarrés ; motif/code obligatoires |
| `abandonment_pending` | finaliser | `abandoned` | même permission | sessions arrêtées, réservations/planning nettoyés, situation réelle et financière régularisée |
| `abandoned` | restitution abandon | reste `abandoned` | même permission | remise spécifique, signature, kilométrage ; historique à statut identique |

`cancelled`, `closed` et `abandoned` n’ont aucune transition sortante. Aucune réouverture n’est implémentée. `ready → in_progress` n’existe pas. Le tableau `flow` contient tous les statuts mais n’est pas, à lui seul, la règle ; `normalTransitions` et les actions dédiées font autorité (`workshop.routes.ts:41-65`, 541 et suivantes).

## 8. Réception atelier

La réception est intégrée à l’OR, pas un workflow autonome. `vehicle_reception_inspections` est en relation unique avec l’OR.

Obligatoires côté backend : niveau carburant et propreté. Le kilométrage est facultatif dans l’API, entier et positif ou nul. Dommages carrosserie, objets présents, observations et signature sont facultatifs. Le frontend rend carburant/propreté obligatoires et présente aussi le kilométrage.

L’inspection n’est possible qu’en `planned`, une seule fois. Malgré un SQL `ON DUPLICATE KEY UPDATE`, le code rejette explicitement toute inspection existante ; elle n’est donc pas modifiable. Les photographies, schémas de carrosserie, documents remis, accessoires structurés, heure d’arrivée distincte et signature du réceptionnaire sont absents. L’utilisateur et `inspected_at` sont conservés.

## 9. Diagnostic et interventions

Le diagnostic est unique, saisi en `received` ou `diagnosis`, avec diagnostic obligatoire, recommandations facultatives, estimation horaire et technicien facultatif. Il ne peut être corrigé via l’API actuelle.

Les interventions sont des objets distincts. Pour un dossier chiffré et accepté, une intervention de main-d’œuvre est créée depuis chaque ligne estimative ; l’unicité empêche le doublon. Le fallback historique autorise une intervention libre seulement si aucun chiffrage accepté n’existe. Une intervention peut être `planned`, `assigned`, `in_progress`, `completed`, `cancelled`. Le statut `in_progress` ne peut venir que du démarrage d’une session.

Les temps prévus sont sur l’intervention ; les sessions et `time_entries` portent le réel. L’arrêt d’une session crée/actualise les temps et `actual_hours`. Le réel facturable reste une décision séparée : l’utilisateur doit confirmer les heures à facturer, plafonnées par l’autorisation pour les lignes modernes.

Le contrôle qualité impose : travaux prévus réalisés, défaut corrigé, absence de fuite, niveaux contrôlés et propreté. L’essai routier est enregistré mais non obligatoire. Un contrôle est autorisé par passage en `quality_control`, ce qui permet un cycle refus → travaux → nouveau contrôle.

## 10. Techniciens et affectations

Un technicien opérationnel est un utilisateur actif possédant `workshop.session.track`. Une fiche `technicians` peut être créée à la volée et reste rattachée à une seule agence. La sélection ne repose pas sur un nom de rôle.

La planification exige cumulativement `workshop.plan` et `workshop.assign_technician`; `workshop.assign_bay` s’ajoute si un pont est choisi. L’OR doit être `in_progress`. Le backend vérifie collisions du technicien, capacité du pont, indisponibilités et scopes d’agence. Une session active interdit la réaffectation ou l’annulation du planning.

Une intervention ne porte qu’un technicien courant ; il n’existe pas d’affectation multiple simultanée au niveau intervention. Plusieurs interventions d’un même OR peuvent toutefois être confiées à des techniciens différents. Démarrage, pause, reprise et arrêt sont distincts et historisés. Il n’existe pas de statut « suspendu » d’OR ; seule la session est en pause.

Le scope OWN Atelier limite le pointage au technicien connecté et interdit la supervision des ressources collectives. Pour `service.order.advance`, OWN couvre l’OR si l’utilisateur est conseiller ou technicien d’une intervention ; pour les autres permissions SAV, OWN correspond au conseiller.

## 11. Pièces et magasin

États réels :

1. **Demandée/autorisée** : ligne `repair_order_estimate_items` de type `part`.
2. **Réservée** : `part_reservations.status='reserved'`; `part_stocks.reserved_stock` augmente, mouvement `reservation`.
3. **Sortie/consommée** : il n’existe pas deux étapes distinctes. L’action `consumed` diminue simultanément stock courant et réservé, crée un mouvement `repair_order` négatif et une ligne facturable.
4. **Retournée** : pas de workflow de retour après consommation. La suppression/correction d’une ligne réelle remet le stock par mouvement `adjustment`, sous `parts.stock.adjust`, pendant `in_progress`.
5. **Libérée** : une réservation non consommée diminue le réservé et crée un mouvement `release`.

Les réservations modernes sont liées une à une aux lignes estimatives. Une consommation partielle est permise pour celles-ci ; la réservation reste `reserved` jusqu’à quantité complète. Les quantités physiques sont forcées entières dans le middleware pour les créations/consommations concernées, alors que le schéma stocke un DECIMAL.

Les transactions verrouillent OR, réservation et stock local ; les clés `request_key` protègent plusieurs répétitions. Les réservations depuis chiffrage ont en plus une unicité `estimate_item_id`. L’annulation et l’abandon libèrent les restes réservés. Une pièce déjà consommée empêche l’annulation simple et nécessite le workflow de régularisation/abandon.

## 12. Devis atelier

Il n’existe pas de table de devis atelier ni de numéro/document de devis. Le « Chiffrage avant travaux » est une liste unique de `repair_order_estimate_items`.

- OR sans chiffrage : possible jusqu’à la transition vers `waiting_approval`.
- Plusieurs devis par OR : non.
- Lignes : pièces ou main-d’œuvre ; quantité, tarif snapshoté, remise, TVA et total.
- Prix pièce : catalogue actif dans l’agence ; prix main-d’œuvre : barème dynamique effectif.
- Transmission au client : non tracée.
- Acceptation/refus : `repair_approvals`, décision unique.
- Après toute décision : le chiffrage est verrouillé, y compris en cas d’acceptation.
- Refus : annulation automatique de l’OR.
- Travaux supplémentaires/devis complémentaire : absent.
- Signature client : facultative côté backend, bien que le nom du client soit obligatoire.

Le terme « devis » doit donc être employé avec prudence : le système implémente un chiffrage autorisable, pas un cycle documentaire de devis.

## 13. Garanties et prises en charge

Deux objets sont correctement distingués :

- `vehicle_warranty_contracts` : contrat du véhicule, snapshoté à la vente/activation ;
- `repair_order_warranties` : décision de prise en charge pour cet OR.

À la création, le SAV lit uniquement le dernier `vehicle_warranty_contracts`. Il n’utilise pas directement les nouvelles colonnes de snapshot stock de la migration 105. C’est cohérent si tout véhicule vendu possède un contrat de vente activé ; sinon une garantie attribuée en stock mais pas encore transformée en contrat de vente apparaît `NO_CONTRACT` au SAV.

Une garantie contractuellement éligible initialise automatiquement la demande OR. La décision OR exige constructeur, mode total/partiel et autorisation pour une approbation ; motif pour un refus. En garantie totale, chaque ligne réelle doit être couverte à 100 %. En partielle, chaque ligne doit tout de même être présente dans la ventilation, éventuellement à zéro. Toute modification du réel invalide une confirmation précédente.

La facturation divise chaque ligne entre client et constructeur. Une facture client à zéro reste émise avec une ligne récapitulative ; une créance constructeur séparée est créée. Les règlements constructeur alimentent la trésorerie avec une clé idempotente.

Limite majeure : `vehicle-warranty-eligibility.service.ts` compare `currentMileage` à `mileage_limit`, sans tenir compte de `initial_mileage`. À confirmer selon la définition métier de `mileage_limit`.

## 14. Facturation et encaissements

La facture n’est possible qu’en `ready` (ou idempotemment `invoiced`) et exige trois permissions : `service.order.invoice`, `billing.invoice.create`, `billing.invoice.issue`, avec couverture de l’agence. Une transaction verrouille l’OR et recherche une facture non annulée ; si elle existe, son identifiant est renvoyé. Il ne peut donc exister qu’une facture active créée par ce workflow, même si le schéma ne porte pas d’unicité explicite sur `repair_order_id`.

Seules les lignes réelles actives sont facturées. Les remises/TVA proviennent des snapshots. La garantie doit être décidée et, si approuvée, ventilée. La facture est immédiatement `issued`, archivée en GED métier et l’OR passe `invoiced`.

Les paiements client utilisent le module Billing ; leur formulaire est intégré au détail OR selon `billing.payment.collect`. La remise exige `balance_due <= 0`. Les avoirs sont pris en compte dans le calcul d’impact d’un abandon mais aucune action d’avoir n’est orchestrée depuis l’OR. Les factures partielles/multiples ne sont pas prévues.

Un OR ne peut pas suivre le parcours normal sans facture. L’abandon peut être finalisé sans facture uniquement si aucun réel facturable ne subsiste. Une facture peut seulement être créée après travaux, QC et statut prêt.

## 15. Restitution du véhicule

La restitution normale est une action dédiée, pas une simple transition générique. Elle exige : statut `invoiced`, identité client saisie, signature obligatoire, kilométrage de sortie facultatif côté API mais au moins égal à l’entrée, dernier contrôle qualité réussi, facture active et soldée, garantie confirmée et créance constituée le cas échéant.

Elle crée `repair_order_handovers`, passe l’OR à `delivered`, journalise le statut et met à jour le kilométrage du véhicule avec `max(kilométrage existant, kilométrage sortie)`. Cette mise à jour est auditée dans le journal général. La clôture est ensuite manuelle.

La remise après abandon est distincte (`handover_type='abandonment'`) et ne change pas le statut `abandoned`. Il n’existe pas d’enregistrement structuré des clés, accessoires restitués, document de restitution PDF ou notification client externe.

## 16. Cartographie MySQL

| Table | Fonction et relations/contraintes principales |
|---|---|
| `repair_orders` | PK `id`, numéro unique, FK rendez-vous/client/véhicule/agence/conseiller ; statut ENUM ; totaux, kilométrage, origine et abandon |
| `repair_order_status_history` | transitions, motif, utilisateur, date ; index OR/date |
| `vehicle_reception_inspections` | inspection unique par OR ; signature et réceptionnaire |
| `diagnostics` | diagnostics reliés à OR et technicien ; le code impose un seul enregistrement sans unicité SQL visible |
| `repair_order_estimate_items` | chiffrage ; FK pièce/barème/OR, snapshots barème ; unicités request et chaînes d’exécution |
| `repair_approvals` | décision client, montant, nom, signature ; unicité imposée par code seulement |
| `interventions` | travaux, technicien, ligne estimative unique, heures prévues/réelles, statut, clé idempotente |
| `technicians` | utilisateur unique, agence, capacité et état actif |
| `workshop_bays` | pont/poste, agence, capacité et statut |
| `schedules` | réservation technicien/pont/OR/intervention et créneau |
| `work_sessions` | exécution effective ; technicien/intervention/pont, pauses et durée |
| `time_entries` | temps calculé/ajusté, lié OR/intervention/technicien/session |
| historiques `workshop_*_history` | changements planning et sessions |
| `technician_unavailabilities` | périodes bloquantes d’un technicien |
| `part_reservations` | quantité autorisée/consommée, stock et emplacement, statut, clés uniques |
| `part_stocks` / `part_movements` | stock courant/réservé et journal des mouvements |
| `repair_order_items` | réel facturable actif/annulé ; pièce/stock/barème/estimation ; montants snapshotés |
| `repair_quality_controls` | checklist, résultat, motif, contrôleur/date |
| `repair_order_handovers` | remise normale/abandon, client, kilométrage, signature, utilisateur/date |
| `repair_order_warranties` | une garantie par OR, décision/version/allocation ; FK constructeur |
| `repair_order_warranty_allocations` | une allocation par ligne réelle, part constructeur HT |
| `warranty_claims/items/payments` | créance constructeur unique par garantie, snapshots et règlements idempotents |
| `invoices` / `invoice_items` / `payments` | facture Atelier, lignes reliées au réel, encaissements ; facture OR non unique au schéma |
| `service_appointments` | rendez-vous client/véhicule/agence/conseiller |
| `vehicles`, `customer_vehicles` | référentiel central et association courante client-véhicule |
| `documents` / archives métier | GED générique et archive de facture ; pas de FK document dédiée à la réception |
| journal d’activité | audit général utilisé notamment par garanties et kilométrage, pas par toutes les mutations OR |

Les contraintes décrites proviennent du baseline consolidé. Leur présence dans une base historique réelle est à confirmer par comparaison de schéma, sans migration expérimentale.

## 17. Inventaire des API

### OR et réception

| Méthode/route | Permission | Fonction/effets |
|---|---|---|
| GET `/repair-orders`, `/stats`, `/:id` | `service.order.view` | liste, indicateurs, détail sous scope |
| POST `/repair-orders` | `service.order.create` | création transactionnelle, historique, garantie, rendez-vous |
| PATCH `/:id/status` | permission de transition | transitions, verrous et effets décrits section 7 |
| POST `/:id/inspection` | `service.order.receive` | inspection unique |
| POST `/:id/diagnostics` | `service.order.diagnose` | diagnostic unique |
| POST/DELETE `/:id/estimate-items` | `service.order.update` (+ Pièces si nécessaire) | chiffrage avant décision |
| POST `/:id/approval` | `service.order.approve` | décision client, annulation en cas de refus |
| PATCH `/:id/advisor` | `service.order.assign_advisor` | réaffectation conseiller et historique statut |
| GET/POST/PATCH `/service-appointments` | view/create | rendez-vous et statut |

### Exécution, planning et qualité

| Routes | Permissions principales |
|---|---|
| `/:id/interventions`, ligne estimative → intervention, statut | `service.order.advance` |
| `/:id/assign` | `service.order.assign_technician` + `workshop.plan` + assignations ressources |
| sessions start/pause/resume/stop | `workshop.session.track` ou manage à l’arrêt |
| `/workshop/planning`, schedules, indisponibilités | `workshop.schedule.view`, `workshop.plan` et assignations |
| `/workshop/technicians`, `/bays` | permissions view/manage correspondantes |
| `/workshop/interventions/history`, `/stats` | intervention/productivity view |
| `/:id/quality-control` | `service.order.quality_control` |

### Pièces, finance, garantie, documents

| Routes | Permissions principales |
|---|---|
| available parts/stocks, `/parts-work-queue` | `parts.reservation.view/create` |
| réservations et changement consumed/released | `parts.reservation.create/consume/release` |
| lignes réelles pièce directes/corrections | `service.order.update` + `parts.stock.adjust` |
| POST `/:id/invoice` | service invoice + Billing create/issue |
| POST `/:id/handover` | `service.order.handover` |
| abandon impact/request/finalize/handover | `service.order.abandon` |
| GET `/warranty-providers` | `service.order.view` |
| garantie OR, décision, allocations, confirmation | `service.warranty.manage/approve` |
| paiement créance constructeur | `billing.payment.collect` |
| GET `/:id/pdf` | `service.documents.view` |

Toutes les mutations sensibles principales utilisent une transaction. Les erreurs dominantes sont 400 (format/ressource métier invalide), 403 (permission/scope), 404 (objet absent dans le périmètre) et 409 (statut, concurrence, décision ou stock incompatible).

## 18. Matrice RBAC

| Action | Frontend | Backend/scope |
|---|---|---|
| voir OR | garde module + page | `service.order.view`; OWN=conseiller, AGENCY, CONCESSION, GLOBAL |
| créer OR | bouton conditionnel | `service.order.create`; scope client et agence |
| réception/diagnostic/validation | boutons/blocs conditionnels | permissions `receive`, `diagnose`, `approve` et scope OR |
| transitions | filtrées par permission | permission recalculée depuis statut courant avant action |
| conseiller | interface selon droit | `service.order.assign_advisor`; OWN interdit pour autrui |
| intervention | actions selon `advance` | OWN conseiller ou technicien affecté |
| planning | boutons cumulant les droits | plan + assign technician, assign bay si pont |
| pointage | boutons session | OWN limité à son propre technicien |
| pièces | cartes spécialisées | permissions distinctes view/create/consume/release, OWN refusé pour file collective |
| correction stock directe | bloc service update | backend ajoute `parts.stock.adjust` |
| garantie | `WarrantyCard` filtre les actions | manage/approve, scope agence/conseiller |
| facturer | trois droits vérifiés | trois droits et scopes agence côté backend |
| encaisser | composant Billing | `billing.payment.collect` |
| remettre/clôturer/annuler/abandonner | blocs conditionnels | permissions dédiées et règles métier |
| PDF | bouton conditionnel | `service.documents.view` |

La séparation la plus nette est celle entre conseiller SAV, planificateur Atelier, technicien, magasinier, approbateur garantie et facturation. Aucun rôle n’est codé en dur ; seules les permissions comptent.

## 19. Interactions intermodules

- **CRM/Client 360** : clients candidats, création/réutilisation, historique extérieur, lien vers fiche client.
- **Stock véhicules** : véhicule central, origine commerciale, kilométrage ; les véhicules extérieurs sont exclus du stock commercial.
- **Vente** : relation historique client-véhicule et contrat de garantie activé à la livraison.
- **Livraison** : fournit le contrat de garantie ; pas de dépendance directe au workflow livraison dans l’OR.
- **Pièces/Magasin** : stocks locaux d’entrepôt, réservations et mouvements transactionnels.
- **Billing/Trésorerie** : facture Atelier, paiements client, créance/règlement constructeur et mouvement automatique.
- **GED** : PDF OR consultable et facture archivée ; couverture documentaire de réception limitée.
- **Notifications** : événements Socket agence/utilisateur et notifications permissionnées sur les étapes principales.
- **Reporting** : statistiques SAV et service `workshop-report.service.ts` ; dépendance aux statuts et origines.
- **Paramètres** : TVA, devise, barèmes Atelier, constructeurs.
- **Habilitations** : candidats conseiller/technicien déterminés par capacités RBAC actives.

Une refonte des statuts, des lignes réelles ou du moment d’acceptation impacterait au minimum facturation, garantie, magasin, planning, reporting, tests de documents et notifications.

## 20. Audit de la traçabilité

Bien tracé : transitions OR, planning, sessions, contrôles qualité, remise, mouvements de pièces, factures/paiements, garanties via audit général, kilométrage véhicule et utilisateur/date sur la plupart des objets.

Partiellement tracé : diagnostic et inspection conservent auteur/date mais pas d’historique de versions ; affectation conseiller est enregistrée comme transition à statut identique, sans ancienne/nouvelle valeur structurée ; interventions ne disposent pas d’un historique dédié de statut ; lignes de chiffrage/réel n’ont pas de journal métier complet ; création d’OR n’écrit pas explicitement dans l’audit général mais dans l’historique de statut.

Non démontré : transmission du chiffrage, consultation/signature d’un document client, notification externe, remise de clés, ajout/suppression de documents de réception.

## 21. Audit ergonomique

Points positifs : page unique de dossier, étapes contextualisées par statut, erreurs métier remontées, distinctions autorisé/pointé/consommé/facturable, avertissement garantie, actions Pièces disponibles même sans droit général de modification, affichage du solde et historique.

Incohérences ou complexités probables :

- la page est très longue et concentre toutes les fonctions dans un composant d’environ cent lignes fortement compactées ;
- le libellé du bouton de transition est dérivé du statut courant (`labels[ro.status]`), ce qui fonctionne aujourd’hui mais rend les cycles moins lisibles ;
- « Préparer l’atelier » provoque en réalité la transition vers travaux en cours après acceptation ;
- le chiffrage est appelé implicitement devis alors qu’il n’a ni numéro ni document ;
- l’utilisateur doit créer une intervention, planifier, démarrer une session puis confirmer séparément le facturable ; cette séparation est saine comptablement mais exige un guidage fort ;
- certains blocs restent visibles en consultation après étape terminée, d’autres disparaissent selon permission, ce qui peut donner des dossiers différents à deux utilisateurs ;
- aucune modification du motif initial ou correction de réception n’est disponible en cas d’erreur de saisie.

## 22. Anomalies et incohérences

### SAV-01 — P1 — calcul kilométrique potentiellement erroné

`vehicle-warranty-eligibility.service.ts` déclare l’expiration lorsque `currentMileage > mileage_limit` et ignore `initial_mileage`. Conséquence : refus prématuré possible d’une couverture, mauvaise répartition client/constructeur. Recommandation : confirmer si la limite est absolue ou additive, puis centraliser la règle contractuelle. Décision métier requise.

### SAV-02 — P1 — absence de devis complémentaires

Après la première décision client, toute modification des lignes estimatives est bloquée (`workshop.routes.ts`, routes estimate-items). Aucun avenant ni nouvelle décision n’existe. Conséquence : découverte en cours de réparation impossible à autoriser proprement dans l’outil. Recommandation : définir le cycle de versions/compléments avant développement.

### SAV-03 — P1 — garantie stock non directement comprise par le SAV

Le SAV ne lit que `vehicle_warranty_contracts`, tandis que l’entrée en stock récente conserve aussi un snapshot sur `vehicles`. Un véhicule non encore doté d’un contrat de vente actif est `NO_CONTRACT`. Conséquence : divergence possible entre affichage Stock et décision SAV. Recommandation : décider quelle source fait foi selon le parcours du véhicule.

### SAV-04 — P2 — numérotation OR fondée sur l’horloge

`OR-${Date.now()}` est soumis à l’unicité SQL. Deux créations dans la même milliseconde produisent une erreur technique, sans séquence métier ni retry. Conséquence : échec concurrent rare et numérotation peu gouvernable. Recommandation : utiliser le service central de séquence documentaire après décision métier.

### SAV-05 — P2 — pas d’unicité SQL sur décisions uniques

Diagnostic et approbation uniques sont garantis par `SELECT ... FOR UPDATE` sur l’OR puis recherche applicative, mais les tables ne montrent pas de contrainte unique `repair_order_id`. Les routes actuelles sont protégées ; un autre import/service pourrait créer des doublons. Recommandation : confirmer tous les producteurs avant éventuelle contrainte.

### SAV-06 — P2 — réception non corrigeable

L’API contient un upsert mais rejette préalablement une réception existante. Une faute de kilométrage, carburant ou dommages ne peut être corrigée. Conséquence : information historique erronée jusqu’à intervention hors workflow. Décision métier nécessaire sur correction, motif et audit.

### SAV-07 — P2 — couverture documentaire insuffisante

Pas de photos, pièces jointes ou document signé de réception/restitution rattaché par le workflow. Conséquence : preuve limitée en cas de litige. Recommandation : définir les documents obligatoires et leur archivage GED.

### SAV-08 — P2 — traçabilité métier fragmentaire

Les lignes, diagnostics et interventions ne produisent pas systématiquement un événement d’audit général ou un historique avant/après. Conséquence : reconstruction incomplète des corrections financières ou techniques. Recommandation : définir les événements auditables avant refonte.

### SAV-09 — P2 — aucun blocage des OR actifs multiples

Aucune recherche ni unicité n’interdit plusieurs OR non terminaux pour le même véhicule. Conséquence : doubles réservations, planning concurrent et ambiguïté de réception possibles, même si chaque OR reste transactionnel. Décision métier requise (autorisé pour campagnes multiples ou non).

### SAV-10 — P2 — retour de pièce consommée assimilé à une correction

Il n’existe pas de workflow métier « retour » ; supprimer/corriger une ligne réelle remet le stock via `adjustment`. Conséquence : motif et nature du retour moins explicites, garantie et facturation à surveiller. Recommandation : décider si retour physique et correction administrative doivent être séparés.

### SAV-11 — P2 — rendez-vous moins robuste que l’OR

La création de rendez-vous utilise une validation client/véhicule plus ancienne et plus restrictive que le parcours OR extérieur, et le changement de statut est un UPDATE simple sans matrice de transitions ni historique dédié visible. Conséquence : incohérences possibles entre accueil planifié et création directe.

### SAV-12 — P3 — statut « ready » sans retour normal en travaux

Après `ready`, aucune correction n’est possible sans facturation/contournement ; seul `quality_control` peut retourner en travaux. Cela peut être voulu, mais doit être explicite. Décision métier requise.

## 23. Risques de régression

- changer les statuts casse filtres, rapports, événements, badges, abandon et facturation ;
- fusionner estimation et réel compromet l’autorisation client et la ventilation garantie ;
- déplacer la consommation de pièces nécessite de préserver les verrous `part_stocks` et les clés idempotentes ;
- assouplir une modification post-acceptation exige versionnement, nouvelle décision et invalidation de garantie ;
- modifier les affectations doit conserver les contrôles de collision, capacité, absence et sessions actives ;
- modifier la remise affecte kilométrage véhicule, facture, garantie et historique ;
- modifier l’origine des véhicules affecte Stock, rapports et parcours clients extérieurs ;
- toute nouvelle source garantie doit préserver les snapshots historiques et les dossiers déjà facturés.

## 24. Recommandations classées par priorité

1. P1 : trancher et tester la règle kilométrique contractuelle.
2. P1 : concevoir un vrai cycle d’avenant/devis complémentaire avant tout changement d’exécution.
3. P1 : définir la source de vérité garantie pour stock, vente et SAV.
4. P2 : définir l’unicité métier d’un OR actif par véhicule.
5. P2 : décider d’un workflow de correction audité pour réception/diagnostic.
6. P2 : définir réception et restitution documentaires (photos, signatures, GED).
7. P2 : formaliser retour pièce, avoir et abandon après activité réelle.
8. P2 : étendre l’audit aux lignes, interventions et corrections sensibles.
9. P3 : clarifier libellés et navigation par étapes sans modifier les règles avant validation.

Ces recommandations ne constituent pas des décisions approuvées.

## 25. Questions métier nécessitant une décision

1. La limite kilométrique est-elle un plafond absolu ou une distance ajoutée au kilométrage initial ?
2. Un véhicule peut-il avoir plusieurs OR actifs ?
3. Comment autoriser un travail supplémentaire après acceptation ?
4. Faut-il plusieurs devis, versions ou avenants, et quelles signatures ?
5. Une réception erronée peut-elle être corrigée, par qui et avec quel motif ?
6. Quelles photos/documents sont obligatoires à l’entrée et à la sortie ?
7. La garantie de stock suffit-elle avant vente, ou seul le contrat activé fait-il foi ?
8. Qui peut réouvrir un OR prêt, facturé, livré ou clôturé ?
9. Une remise est-elle toujours interdite avec solde, y compris compte client/prise en charge exceptionnelle ?
10. Comment distinguer retour physique, déconsommation et correction de stock ?
11. Faut-il une facture partielle ou des acomptes liés à l’OR ?
12. Quels événements doivent être notifiés au client et par quel canal ?

## 26. Points à confirmer pendant la recette

- présence effective de toutes les contraintes du baseline dans la base déployée ;
- rendu et contenu exact du PDF OR ;
- comportement réel des permissions composées avec plusieurs scopes attribués ;
- ergonomie mobile et longueur de la page détail ;
- messages affichés lors de collisions planning et stock ;
- visibilité du solde selon permissions Billing ;
- gestion d’un paiement, avoir ou annulation de facture pendant un abandon ;
- parcours complet véhicule extérieur avec VIN absent ou immatriculation ambiguë ;
- événements temps réel et rafraîchissement simultané de plusieurs postes ;
- cas de garantie totale, partielle, expirée par date et kilométrage ;
- conformité des snapshots de garantie après les évolutions Stock récentes.

## 27. Conclusion générale

Le module SAV/Atelier n’est pas un simple prototype : les principaux contrôles opérationnels, financiers, de stock et d’habilitation sont implémentés côté backend. Sa faiblesse principale est moins l’absence de workflow que sa rigidité : une seule autorisation client, aucune version complémentaire, des saisies non corrigeables et une traçabilité dispersée.

La refonte doit préserver la séparation actuelle entre autorisation, exécution, réel facturable et facturation, ainsi que les transactions de stock et les scopes dynamiques. Les premières décisions devraient porter sur la garantie kilométrique, les devis complémentaires, les OR actifs multiples et les corrections auditées. Toute évolution peut ensuite être traitée décision par décision, sans supposer un workflow théorique différent de celui décrit ici.

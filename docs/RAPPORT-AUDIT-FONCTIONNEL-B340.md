# Rapport d'audit fonctionnel et technique — Lot B.3.4.0

Date de l'audit : 18 octobre 2026  
Projet : ERP / CRM — La Congolaise de l'Automobile  
Nature : audit statique et préparation des corrections, sans implémentation

## 1. Résumé exécutif

L'audit des neuf sous-lots est complet sur le code, les migrations et les tests présents dans le dépôt. Il ne constitue ni une recette d'exécution ni une validation des futures fonctionnalités.

Constats principaux :

- B.3.4.1 : le maintien visuel du bouton de rendez-vous n'est pas reproduit par la logique nominale actuelle, mais l'API autorise bien plusieurs rendez-vous actifs pour un même couple prospect/opportunité. Il manque aussi un parcours explicite de consultation, report et annulation.
- B.3.4.2 : aucun modèle RH de prestataire n'existe. Le référentiel fournisseur est réutilisable comme identité de tiers seulement après découplage de son RBAC Pièces ; les paiements doivent rester dans les circuits Budget/Trésorerie existants.
- B.3.4.3 : le référentiel d'emplacements véhicules est déjà distinct de celui des pièces et de l'atelier. Seul le type `GARAGE` et ses adaptations manquent.
- B.3.4.4 : les prix, leur historique et les contrôles commerciaux existent, mais aucun registre structuré multi-défauts avec photos, correction et réduction proposée n'existe.
- B.3.4.5 : la pagination serveur et frontend des principales collections Client 360 existe déjà. Les lacunes portent sur la taille de page fixe, l'absence de recherche/tri/filtres locaux et les documents non paginés.
- B.3.4.6 : le « score » affiché est la probabilité persistée de l'opportunité ; il ne représente pas la progression commerciale. L'option la moins risquée est de conserver ce score et d'ajouter une progression dérivée de l'étape.
- B.3.4.7 : l'interface est majoritairement francisée, mais il subsiste des termes anglais, des statuts techniques rendus bruts et des abréviations ambiguës. Une correction ciblée est suffisante.
- B.3.4.8 : les notifications transportent l'action, la date et le contexte fonctionnel dans le texte, mais ne stockent ni auteur réel ni agence de l'opération. Le scope actuel dépend de l'agence du destinataire, pas d'un instantané de l'opération.
- B.3.4.9 : les composants GED/références et signatures/cachets existent déjà et sont séparables sans duplication. Ils sont actuellement assemblés dans un seul onglet Paramètres.

Verdict : **AUDIT COMPLET AVEC POINTS À CLARIFIER**. Les décisions métier listées en section 21 sont requises avant les lots RH, Défauts/Prix, Progression CRM et Notifications.

## 2. Périmètre

Ont été inspectés : architecture React/Express, routes et services concernés, migrations SQL, permissions dynamiques et scopes, hooks TanStack Query, événements Socket.IO, composants d'interface et suites de tests existantes. Les bases métier, Docker, le VPS et les services en cours n'ont pas été sollicités.

Les résultats historiques (876 tests frontend, 1 845 tests backend, 36 tests PDF et 12 tests documentaires MySQL) sont uniquement des références fournies par la mission. Ils ne sont pas revendiqués comme exécutés ici.

## 3. Méthodologie

- Recherche statique des routes, tables, permissions, événements, appels API et composants.
- Lecture croisée frontend/backend/SQL/tests afin d'éviter de déclarer absente une fonction existante.
- Classification de chaque constat : **CONFIRMÉ**, **PARTIELLEMENT CONFIRMÉ**, **NON CONFIRMÉ** ou **NON VÉRIFIABLE**.
- Proposition du changement minimal ; aucune correction applicative réalisée.
- Les numéros de ligne sont ceux de l'état du dépôt audité et pourront évoluer.

## 4. Audit B.3.4.1 — Rendez-vous CRM

### État reconstitué

- Le bouton est rendu seulement si la permission `crm.appointment.create` est détenue et si l'étape vaut `QUALIFIE` (`frontend/src/modules/crm/CrmPage.tsx`, composant de détail, vers la ligne 517).
- Après création, le hook invalide les prospects (`frontend/src/api/erpHooks.ts`, mutation de rendez-vous vers la ligne 481) ; la route fait évoluer l'opportunité vers `appointment` (`backend-node/src/modules/crm/crm.routes.ts`, route `POST /leads/:id/appointments`, lignes 118-126).
- Le formulaire désactive sa soumission pendant la mutation (`CrmPage.tsx`, vers la ligne 537), ce qui réduit le double-clic depuis cette instance du navigateur.
- Le backend accepte néanmoins un prospect à l'étape `qualified` **ou** `appointment`. Son contrôle de conflit porte sur l'agenda du commercial, pas sur l'unicité d'un rendez-vous actif du couple `lead_id/opportunity_id`.
- `leadSelect` expose seulement `has_valid_appointment` et considère `pending` comme `completed` (`crm.routes.ts:40`) ; il ne fournit ni l'identifiant ni les données du rendez-vous actif.
- La migration `077_crm_appointment_reliability.sql` ajoute durée, justification de conflit, index et permission `crm.appointment.override_conflict`, sans contrainte d'unicité active par contexte commercial.
- Aucune route métier dédiée au report ou à l'annulation d'un rendez-vous CRM n'a été identifiée.

### Conclusion

- **NON CONFIRMÉ** : le bouton reste actif après un succès nominal et un rafraîchissement abouti.
- **CONFIRMÉ** : deux requêtes séquentielles ou concurrentes peuvent créer plusieurs `follow_ups` actifs pour le même dossier si les horaires ne se chevauchent pas.
- **CONFIRMÉ** : le parcours « Voir / Reporter / Annuler » est absent.
- **PARTIELLEMENT CONFIRMÉ** : la protection double-clic existe côté UI, mais ne constitue pas un invariant serveur.

### Correction minimale future

Dans une transaction, verrouiller l'opportunité, rechercher un rendez-vous `pending` du même contexte, puis retourner un conflit métier contenant l'identifiant existant. Exposer le rendez-vous actif dans le contrat prospect et ajouter des routes dédiées de consultation/report/annulation avec les permissions actuelles ou des permissions explicitement approuvées. Une contrainte SQL conditionnelle est délicate sous MySQL ; un verrou transactionnel est indispensable, éventuellement renforcé par une clé active nullable unique documentée. Les rendez-vous `completed` ou `cancelled` doivent rester historiques et permettre une nouvelle planification.

## 5. Audit B.3.4.2 — Prestataires RH

### État reconstitué

- Les rémunérations sont centrées sur `employee_profiles`, `employee_contracts` et `salary_history` (`backend-node/src/modules/hr/hr-remuneration.routes.ts`, préparation et paiements vers les lignes 9-23).
- La séparation demandeur/approbateur est contrôlée par `assertRemunerationDecisionSeparation`; les décaissements réutilisent dépenses budgétaires, réservations et trésorerie.
- Le référentiel `suppliers` possède déjà identité, coordonnées et identifiants fiscaux, mais ses routes et permissions sont rattachées aux pièces : `parts.suppliers.view/manage` (`backend-node/src/modules/parts/part.routes.ts`, routes vers les lignes 98-103).
- `backend-node/database/migrations/051_supplier_business_qualifications.sql` qualifie seulement les fournisseurs de pièces ou véhicules ; il ne crée ni prestataire RH, ni contrat de service, ni échéancier, ni solde contractuel.
- La GED sait rattacher des documents à des entités, mais aucun type métier prestataire/contrat n'est actuellement orchestré par le module RH.

### Conclusion

- **CONFIRMÉ** : les prestataires RH ne doivent pas entrer dans l'historique salarial employé.
- **PARTIELLEMENT CONFIRMÉ** : `suppliers` peut servir de socle d'identité de tiers, mais son contrat RBAC actuel interdit une réutilisation directe propre.
- **CONFIRMÉ** : une modélisation additive est requise pour profil, contrat, échéances/obligations, statut et rattachement territorial.
- **CONFIRMÉ** : le circuit financier existant doit être réutilisé ; un second système de paiement créerait un risque de double comptabilisation.

### Correction minimale future

Créer un agrégat prestataire RH (personne physique/morale), contrats versionnés et obligations contractuelles, relié au tiers commun ou à une identité dédiée selon décision métier. Une obligation approuvée doit produire une seule dépense/réservation/décaissement dans les services financiers existants, avec clé d'idempotence, journalisation, transaction, contrôle territorial et séparation demandeur/approbateur. Ajouter des permissions dynamiques `hr.contractor.*`, sans rôle fixe. Migration nécessaire.

## 6. Audit B.3.4.3 — Garages

### État reconstitué

- `vehicle_locations` est une table dédiée aux véhicules ; le lien vers `locations` n'est qu'un lien de reprise historique (`backend-node/database/migrations/050_vehicle_locations_and_sale_cost_snapshots.sql:1-44`).
- Le type SQL est limité à `PARC` et `SHOWROOM` (`050...sql:5`). Les permissions sont `vehicles.assignments.view/manage` (`050...sql:54-60`).
- Le CRUD, l'activation et la validation agence/emplacement existent dans `backend-node/src/modules/vehicles/vehicle.routes.ts` (environ lignes 40-64 et 106).
- Les transferts verrouillent le véhicule, valident l'agence cible, écrivent `vehicle_movements` et publient `vehicles:transferred` aux agences source et destination (`vehicle.routes.ts:221`).
- Le formulaire Paramètres utilise la même union limitée (`frontend/src/modules/settings/VehicleLocationsSettings.tsx`, lignes 11-14).
- La remise manuelle à l'état disponible exige actuellement un emplacement actif Parc ou Showroom (`vehicle.routes.ts:219`).

### Conclusion

- **NON CONFIRMÉ** : les emplacements véhicules seraient encore structurellement confondus avec ceux des pièces/atelier.
- **CONFIRMÉ** : le type Garage manque dans SQL, API, types frontend, libellés et validations.
- **CONFIRMÉ** : historique, agence, permissions et temps réel sont déjà réutilisables.

### Correction minimale future

Migration additive de l'énumération vers `GARAGE`, puis extension des validations et listes frontend. Ne pas changer automatiquement le statut commercial lors d'un transfert. La règle autorisant ou non `available` dans un garage doit être décidée explicitement ; par défaut, l'emplacement seul ne doit pas rendre le véhicule indisponible.

## 7. Audit B.3.4.4 — Défauts des véhicules et prix

### État reconstitué

- L'entrée en stock enregistre déjà prix d'achat, remise en état, coûts annexes, prix catalogue, vente et minimum (`backend-node/src/modules/vehicles/vehicle.routes.ts:181`).
- Les modifications financières exigent un scope territorial et les changements de prix vente/minimum écrivent `vehicle_price_history` (`vehicle.routes.ts:197-210`). La permission utilisée pour cet acte est actuellement `vehicles.financials.view`, point à réexaminer sans élargir les droits.
- Les ventes/devis contrôlent les remises et marges via les permissions commerciales et le service partagé de marge (`backend-node/src/modules/sales/sale.service.ts`, `backend-node/src/modules/vehicles/vehicle-margin.ts`).
- Les photos véhicule et la GED existent ; l'inspection de réception atelier possède `bodywork_damage`, mais elle est liée à un ordre de réparation et ne constitue pas un registre de défauts du stock (`backend-node/src/modules/workshop/workshop.routes.ts`, autour des lignes 607-635).
- Aucun modèle dédié multi-défauts avec état, auteur, estimation, proposition de réduction et historique de correction n'a été trouvé.

### Conclusion

- **CONFIRMÉ** : registre structuré de défauts absent.
- **CONFIRMÉ** : prix et historique existent et doivent rester indépendants d'un défaut.
- **PARTIELLEMENT CONFIRMÉ** : photos et constat atelier sont réutilisables techniquement, mais leurs contextes métier ne doivent pas être confondus.

### Correction minimale future

Créer `vehicle_defects` et son historique d'état, avec références GED/photos. Conserver séparément coût estimé, réduction proposée et réduction autorisée. Aucune modification automatique de `sale_price`. Une réduction autorisée doit être consommée une seule fois par le circuit devis/vente existant et par ses permissions, avec prévention explicite de la double remise. Migration nécessaire.

## 8. Audit B.3.4.5 — Pagination Clients 360

### État reconstitué

- `GET /customers/:id/360` pagine opportunités, véhicules, ventes, devis, OR, factures et timeline, avec `page`, `pageSize`, `total`, limite et offset (`backend-node/src/modules/customers/customer.routes.ts`, helper vers la ligne 36 et route vers les lignes 124-149).
- Le frontend maintient une page indépendante par collection (`frontend/src/modules/customers/CustomerDetailPage.tsx:35-38`) et rend plusieurs `CustomerPager` (vers les lignes 200-339).
- `useCustomer360Query` envoie les pages et une taille fixe de 7 (`frontend/src/api/erpHooks.ts:607-611`).
- Contacts et documents restent des listes non paginées ; les documents viennent d'une requête GED séparée (`CustomerDetailPage.tsx:46-49, 208`).
- Aucune sélection de taille, recherche, filtre ou tri par sous-table n'est exposée. Le pager affiche la page locale plutôt que la page normalisée du serveur, ce qui peut laisser une page visuelle obsolète si le total diminue.

### Conclusion

- **NON CONFIRMÉ** : la pagination des principaux tableaux serait absente.
- **PARTIELLEMENT CONFIRMÉ** : le contrat existe et fonctionne statiquement, mais reste incomplet pour taille/recherche/filtres/tri et gestion d'une page devenue hors limite.
- **NON VÉRIFIABLE** sans données volumineuses : seuil réel à partir duquel contacts et documents doivent être paginés.

### Correction minimale future

Préserver le contrat actuel, ajouter seulement les paramètres réellement requis, synchroniser la page locale avec la page serveur et paginer documents/contacts uniquement si volumétrie et besoin métier le justifient. Aucune migration.

## 9. Audit B.3.4.6 — Progression CRM

### État reconstitué

- Les cartes affichent « Score » et « Score opportunité » (`frontend/src/modules/crm/CrmPage.tsx`, vers les lignes 282 et 461).
- Ce score est directement mappé depuis `opportunities.probability` (`frontend/src/api/erpHooks.ts:191`; `backend-node/src/modules/crm/crm.routes.ts:40-41`).
- La probabilité peut être fournie à la création puis modifiée (`crm.routes.ts:76-77, 83-85`).
- Les changements d'étape, rendez-vous, essai et devis modifient le statut réel, sans recalculer `probability`.

### Conclusion

- **CONFIRMÉ** : le score existant est une probabilité/qualification persistée, pas une progression.
- **CONFIRMÉ** : il ne suit pas automatiquement les étapes.
- **NON VÉRIFIABLE** sans décision métier : sens d'un retour en arrière, réouverture après perte et valeur à afficher pour une vente perdue.

### Recommandation

Retenir **l'option B** : préserver `probability` et ajouter un champ dérivé `commercialProgress` calculé par le backend depuis l'étape canonique : 0/10/25/40/55/70/85/100. Afficher séparément « Score de qualification » et « Progression commerciale ». Ne pas persister une donnée redondante ; les invalidations TanStack Query et événements CRM assureront l'actualisation. Une vente perdue doit afficher un état terminal « Perdue », jamais 100 %, selon une règle à décider.

## 10. Audit B.3.4.7 — Harmonisation linguistique

### État reconstitué

L'interface est largement en français et plusieurs statuts disposent déjà d'une traduction centralisée (`frontend/src/services/mysqlStatusMap.ts:11-15`). Aucune infrastructure complète d'internationalisation n'est nécessaire pour ce besoin ciblé.

Liste priorisée des corrections réellement utiles :

1. **Priorité haute — statuts techniques bruts** : activités CRM et devis affichent parfois `activity.type`, `activity.status` ou `quotation.status` directement (`frontend/src/modules/crm/CrmPage.tsx`, autour des lignes 503 et 513). Le détail Showroom rend aussi certains états d'essai non traduits (`frontend/src/modules/showroom/ShowroomPage.tsx:49`).
2. **Priorité moyenne — vocabulaire de navigation** : « Dashboard Général » doit devenir « Tableau de bord général » (`frontend/src/components/layout/Sidebar.tsx:70`).
3. **Priorité moyenne — terme métier ambigu** : distinguer « Score de qualification » de « Progression commerciale » dans CRM (`CrmPage.tsx:282,461`).
4. **Priorité basse — cohérence typographique** : harmoniser `fr-FR`/`fr-CG`, libellés « e-mail », capitalisation et formulations des pages ; ne pas toucher aux codes techniques.
5. **À conserver** : CRM, SAV, RH, TVA, TTC, PDF et VIN. GED peut être conservé avec son développement visible à la première occurrence.

### Conclusion

- **PARTIELLEMENT CONFIRMÉ** : des libellés anglais/bruts subsistent, mais il n'existe pas de défaut de francisation généralisé.
- **CONFIRMÉ** : les traductions existantes peuvent être réutilisées ; une traduction systématique du code serait inutile et risquée.
- **NON VÉRIFIABLE** par inspection seule : exhaustivité visuelle responsive et textes conditionnels rarement atteints ; une recette navigateur multi-rôles sera requise.

## 11. Audit B.3.4.8 — Notifications enrichies

### État reconstitué

- `CreateNotificationInput` ne contient ni auteur ni agence. L'insertion écrit destinataire, sujet, message, type/référence, priorité et clé d'événement (`backend-node/src/modules/notifications/notification.service.ts:6-7`).
- `notifyPermissions` reçoit `agencyId` uniquement pour sélectionner les destinataires selon leur scope ; cette agence n'est pas persistée dans la notification (`notification.service.ts:8-9`).
- `GET /notifications` joint l'utilisateur destinataire et son agence pour appliquer `mine/agency/concession/global`; il ne joint aucun auteur ni agence d'opération (`backend-node/src/modules/notifications/notification.routes.ts:13-31`).
- La réponse et les types frontend n'exposent donc pas auteur/agence. `NotificationsPage` affiche sujet, message, type/priorité et date (`frontend/src/modules/notifications/NotificationsPage.tsx:27`).
- Le temps réel émet le même enregistrement minimal à l'utilisateur (`notification.service.ts:7`; `frontend/src/components/AppBootstrap.tsx:65-72`).
- La migration `041_notifications_traceability_rbac.sql` trace seulement l'auteur de l'archivage/suppression (`archived_by`, `deleted_by`), pas l'auteur de l'action source.
- Certains producteurs connaissent l'acteur, par exemple CRM reçoit `actorUserId` mais ne le transmet pas au service générique (`backend-node/src/modules/crm/crm.notifications.ts:2-3`). D'autres appels automatiques n'ont pas de notion d'acteur.

### Conclusion

- **CONFIRMÉ** : auteur réel, agence de l'opération et leurs instantanés sont absents du modèle générique.
- **PARTIELLEMENT CONFIRMÉ** : l'action et l'objet sont généralement compréhensibles via sujet/message/référence, et la date est disponible.
- **CONFIRMÉ** : l'agence utilisée pour la diffusion ne permet pas de reconstituer durablement l'agence de l'opération.
- **NON VÉRIFIABLE** sans inventaire d'exécution : proportion exacte des producteurs automatiques et humains.

### Correction minimale future

Ajouter des champs structurés `actor_user_id`, `actor_name_snapshot`, `operation_agency_id`, `operation_agency_name_snapshot` et un indicateur/source système. Les valeurs doivent être résolues côté serveur depuis le JWT et l'objet métier, jamais acceptées comme identité libre du frontend. Conserver les snapshots après renommage/désactivation. Pour l'historique existant, afficher « Auteur non enregistré » / « Agence non enregistrée » sans inférence trompeuse. Adapter le scope avec prudence : la visibilité reste déterminée par le destinataire et les permissions ; l'enrichissement ne doit pas révéler un périmètre interdit. Migration requise.

## 12. Audit B.3.4.9 — Séparation des paramètres

### État reconstitué

- `SettingsPage` définit un seul onglet `documents`, libellé « Documents / GED » (`frontend/src/modules/settings/SettingsPage.tsx:22,61`).
- Cet onglet monte successivement `DocumentMarksSettings` puis `DocumentReferencesSettings` (`SettingsPage.tsx:81`).
- `DocumentMarksSettings` est déjà un composant autonome et protège séparément signature et cachets avec `signature.view.self`, `signature.manage.self`, `stamp.view`, `stamp.manage` (`frontend/src/modules/settings/DocumentMarksSettings.tsx:6`).
- Les routes backend imposent leurs propres permissions et scopes (`backend-node/src/modules/document-marks/document-mark.routes.ts`, `document-mark-policy.service.ts`) ; la séparation visuelle ne nécessite aucune modification backend.
- L'entrée latérale « Documents & GED » (`frontend/src/components/layout/Sidebar.tsx:168-172`) conduit au module GED, distinct de la page Paramètres ; elle ne doit pas être dupliquée.
- La page Paramètres elle-même exige actuellement `settings.view` pour ses requêtes générales, alors que le composant marques sait fonctionner avec ses permissions spécifiques. L'accès direct à une future section doit conserver le guard de route existant ou être conçu explicitement, sans dépendance implicite à `ged.view`.

### Conclusion

- **CONFIRMÉ** : le mélange visuel existe.
- **CONFIRMÉ** : les composants et protections backend permettent un déplacement sans duplication de logique.
- **PARTIELLEMENT CONFIRMÉ** : les permissions internes sont séparées, mais la porte d'entrée Paramètres peut rester plus restrictive que nécessaire ; toute ouverture demanderait une décision RBAC hors de la simple réorganisation.

### Correction minimale future

Ajouter un onglet frontend `marks` immédiatement après `documents`, y déplacer l'unique instance de `DocumentMarksSettings` et conserver les références/configurations GED dans `documents`. Ne modifier ni API, ni hooks, ni migrations, ni politiques. Tester chaque combinaison de permissions et empêcher le chargement des queries non autorisées.

## 13. Analyse transversale

- B.3.4.1 et B.3.4.6 partagent l'étape CRM, les invalidations et les événements ; stabiliser d'abord l'invariant de rendez-vous, puis la présentation de progression.
- B.3.4.2 et B.3.4.4 sont les sujets les plus sensibles : paiements, remises, historiques, transactions et idempotence.
- B.3.4.3 doit rester orthogonal au statut commercial et à l'état technique.
- B.3.4.8 touche de nombreux producteurs ; un contrat commun est préférable à des textes construits différemment dans chaque module.
- B.3.4.7 doit être réalisé après les nouveaux écrans pour éviter de reprendre deux fois les libellés, tout en corrigeant immédiatement les statuts bruts à fort impact.
- B.3.4.9 est une réorganisation de composition ; dupliquer le composant créerait des caches/query mutations concurrents et doit être évité.

## 14. Matrice d'impact

| Sous-lot | État / écart | FE | BE | Tables | Migration | Permissions | Tests existants pertinents | Tests futurs | Risque / complexité | Dépendances |
|---|---|---|---|---|---|---|---|---|---|---|
| B.3.4.1 CRM RDV | UI nominale correcte ; invariant actif absent | CRM, hooks | routes CRM | `activities`, `follow_ups`, `leads`, `opportunities` | Peut être évitée avec verrou ; souhaitable si clé active | `crm.appointment.create`, override, view/update à préciser | `crm-appointment-endpoint`, `crm-appointment-reliability`, `crm-appointment.behavior`, intégration VALID-ERP-02 | concurrence, double-clic, report, annulation, historique | **ÉLEVÉ / moyen** : doublon et concurrence | B.3.4.6 |
| B.3.4.2 Prestataires | Modèle absent ; fournisseur partiellement réutilisable | RH, GED | RH, budget, trésorerie, tiers | nouvelles tables + dépenses/réservations existantes | Oui | nouvelles `hr.contractor.*`, permissions finance existantes | `fin04-remunerations*`, `remuneration-separation`, `fin05-supplier-invoices*` | contrats, échéances, séparation, idempotence, territorialité | **ÉLEVÉ / élevé** : double paiement | Finance, GED |
| B.3.4.3 Garages | Référentiel dédié existe ; type manquant | Paramètres, Stock | routes véhicules | `vehicle_locations`, `vehicle_movements` | Oui, enum | `vehicles.assignments.*`, `vehicles.assign_agency` | tests scope/localisation/retours véhicules | CRUD garage, transferts, historique, Socket.IO, statut inchangé | **MOYEN / faible** : validations de disponibilité | Stock |
| B.3.4.4 Défauts/prix | Prix/historique présents ; défauts structurés absents | Stock, GED | véhicules, devis/ventes | nouvelles tables, `vehicle_price_history` | Oui | images, finances, remise/approbation | tests marge/discount, véhicules, atelier | multi-défauts, photos, correction, double remise, concurrence | **ÉLEVÉ / élevé** : prix et remise | Ventes, GED, Atelier |
| B.3.4.5 Client 360 | Pagination principale présente, fonctions avancées manquent | fiche 360, hook | route 360 | aucune nouvelle | Non | permissions de chaque collection | `customers360-endpoint`, `customer-360-timeline-scope`, `erp-pagination-lot-03` | limites, total, page hors plage, taille, filtres/tri | **FAIBLE / faible-moyen** | GED pour documents |
| B.3.4.6 Progression | Score = probabilité ; progression absente | cartes CRM | contrat CRM dérivé | `opportunities` inchangée | Non | lecture CRM existante | `crm-stage-transition-matrix`, tests CRM fonctionnels | chaque étape, recul, perte, réouverture, temps réel | **MOYEN / faible-moyen** : confusion sémantique | B.3.4.1 |
| B.3.4.7 Langue | Majoritairement FR ; résidus bruts | transversal | messages éventuellement | aucune | Non | aucune modification | tests composants/pages existants | inventaire UI multi-rôles, responsive, snapshots ciblés | **FAIBLE / moyen** : vaste surface | Après écrans métier |
| B.3.4.8 Notifications | auteur/agence structurés absents | centre/header/types | service, routes, producteurs | `notifications` | Oui | `notifications.*` et permissions sources | `notifications-dynamic-reliability`, `scope-endpoint`, `traceability-rbac` | acteur humain/système, snapshots, scopes, multi-agence, temps réel | **ÉLEVÉ / élevé** : fuite territoriale | Tous producteurs |
| B.3.4.9 Paramètres | composants séparables, onglet unique | Settings | inchangé | inchangées | Non | `settings.view`, signature/stamp/GED | document-marks B.32/B.33/B.331, settings tests | navigation, direct, permissions, persistance, aperçu PDF | **FAIBLE / faible** : élargissement accidentel | GED/Marques |

## 15. Risques

1. **Élevé — double création CRM** : contrôle uniquement ergonomique, sans invariant transactionnel par dossier.
2. **Élevé — double paiement prestataire** : création d'un circuit parallèle ou absence d'idempotence.
3. **Élevé — double remise** : réduction défaut ajoutée au prix puis réappliquée au devis.
4. **Élevé — fuite de contexte notification** : exposition d'un auteur/agence hors scope.
5. **Moyen — historique altéré** : jointures sur les noms courants au lieu de snapshots.
6. **Moyen — désynchronisation CRM** : progression frontend calculée différemment du backend.
7. **Moyen — statut véhicule** : assimilation erronée du Garage à l'indisponibilité commerciale.
8. **Faible — duplication UI** : deux instances du composant marques dans Paramètres.
9. **Faible — pagination trompeuse** : page locale devenue supérieure à la page serveur.

## 16. Dépendances

- CRM : `leads` → `opportunities` → `activities/follow_ups`; rendez-vous avant progression.
- RH : identité tiers → contrat → obligation → dépense approuvée → réservation de liquidité → décaissement.
- Stock : `vehicle_locations` et mouvements indépendants de `vehicles.status`; défaut → proposition, jamais prix direct.
- Client 360 : chaque collection conserve sa permission et son total indépendants.
- Notifications : contexte authentifié + contexte de l'objet → snapshot → diffusion RBAC → Socket.IO.
- Paramètres : composition frontend seulement ; services marques/GED et protections backend inchangés.

## 17. Plan d'implémentation recommandé

1. **B.3.4.9** — déplacer le composant marques dans un onglet adjacent ; aucun contrat métier ni migration.
2. **B.3.4.5** — consolider pages, totaux et états limites ; convenir d'abord des collections à paginer.
3. **B.3.4.7, phase ciblée** — traduire statuts bruts et libellés prioritaires, sans infrastructure i18n.
4. **B.3.4.3** — ajouter Garage et qualifier l'indépendance statut/emplacement sur MySQL isolé.
5. **B.3.4.1** — poser l'invariant transactionnel et le parcours Voir/Reporter/Annuler.
6. **B.3.4.6** — ajouter la progression dérivée après stabilisation des transitions CRM.
7. **B.3.4.8** — migrer le modèle, centraliser les snapshots, puis adapter progressivement tous les producteurs.
8. **B.3.4.4** — introduire défauts et proposition de réduction après arbitrage commercial.
9. **B.3.4.2** — terminer par le modèle prestataire et son intégration financière, sujet le plus large et sensible.

Pour chaque lot : branche inchangée jusqu'à autorisation, inventaire du diff préalable, tests unitaires ciblés, intégration MySQL 8.4 isolée si migration, tests RBAC/scopes, frontend, lint/build et `git diff --check`, puis recette navigateur. Aucun déploiement automatique.

## 18. Critères d'acceptation

- **B.3.4.1** : un seul rendez-vous actif par contexte même sous concurrence ; historiques conservés ; report/annulation autorisés et tracés ; nouveau rendez-vous après clôture.
- **B.3.4.2** : employé et prestataire séparés ; personne physique/morale ; contrats/échéances traçables ; une obligation produit au plus un paiement ; approbateur indépendant et scopes respectés.
- **B.3.4.3** : Garage CRUD, agence, transfert aller/retour, mouvement et temps réel ; aucun changement automatique du statut commercial.
- **B.3.4.4** : plusieurs défauts, photos, états/auteur/dates ; quatre notions de prix distinctes ; aucune remise sans autorisation ni double application ; historique immuable.
- **B.3.4.5** : totaux exacts, navigation première/précédente/suivante/dernière, page bornée, critères conservés dans la query key, états vide/chargement/erreur corrects.
- **B.3.4.6** : score préservé, progression conforme à l'étape après rechargement et temps réel, perte jamais à 100 %, concurrence cohérente.
- **B.3.4.7** : aucun statut technique brut dans les parcours audités ; terminologie métier française et abréviations autorisées conservées ; responsive inchangé.
- **B.3.4.8** : auteur fiable, agence d'opération et date visibles ; snapshots survivant aux changements ; système explicite ; historique inconnu non inventé ; scopes et temps réel inchangés.
- **B.3.4.9** : deux onglets adjacents, aucune logique dupliquée, accès et queries conformes à chaque permission, enregistrement/reconnexion/aperçu/PDF inchangés.

## 19. Tests inspectés

Sans exécution, les suites suivantes ont été identifiées comme bases de non-régression :

- CRM : `backend-node/test/crm-appointment-endpoint.test.ts`, `crm-appointment-reliability.test.ts`, `crm-stage-transition-matrix.test.ts`, `crm-functional-reliability.test.ts`, `crm-realtime-security.test.ts`, `valid-erp-02-crm-contracts.test.ts`, ainsi que les tests frontend de comportement rendez-vous.
- Client 360/pagination : `customers360-endpoint.test.ts`, `customer-360-timeline-scope.test.ts`, `erp-pagination-lot-03.test.ts`, `pagination.test.ts`.
- RH/Finance : `fin04-remunerations*.test.ts`, `remuneration-compatible-budgets.test.ts`, `remuneration-separation.test.ts`, `fin05-supplier-invoices*.test.ts`.
- Notifications : `notifications-dynamic-reliability.test.ts`, `notifications-scope-endpoint.test.ts`, `notifications-traceability-rbac.test.ts`, `notifications-view-scope.test.ts`, `notifications-migration-041.test.ts`.
- Paramètres/documents : `settings-concession-dynamic.test.ts`, `settings-users-notifications-compliance.test.ts`, `document-marks-b32-pdf.test.ts`, `document-marks-b321-mysql.integration.test.ts`, `document-marks-b33-pdf.test.ts`, `document-marks-b331-pdf.test.ts`.

Ces tests ne couvrent pas encore les nouveaux invariants et modèles proposés ; ils devront être adaptés ou complétés, jamais supprimés ou masqués.

## 20. Tests exécutés

**Aucun test applicatif, MySQL, HTTP, navigateur, lint ou build n'a été exécuté pendant ce lot.** Cette décision respecte la nature d'audit sans implémentation et évite d'assimiler les résultats historiques à cette campagne.

Seules des inspections statiques et des commandes de lecture du dépôt ont été utilisées. Aucun service, conteneur, volume, base ou dépendance n'a été modifié.

## 21. Questions métier ouvertes

1. Rendez-vous : l'unicité porte-t-elle exactement sur prospect + opportunité, et quels statuts sont « actifs » ? Le report conserve-t-il la ligne ou crée-t-il une version liée ?
2. Prestataires : une entreprise déjà fournisseur Pièces doit-elle partager une identité juridique unique avec sa fiche RH ? Quels traitements fiscaux/retenues et quelles règles multi-agences ?
3. Garages : un véhicule disponible peut-il rester commercialement disponible au Garage ?
4. Défauts : qui propose et qui autorise une réduction ? Les réductions se cumulent-elles ? Un défaut corrigé doit-il être relié obligatoirement à un OR ?
5. Client 360 : quelles sous-listes exigent recherche, tri et taille réglable ? Quel seuil pour contacts/documents ?
6. Progression : quelle valeur/présentation pour `lost`, et existe-t-il un processus autorisé de réouverture ?
7. Notifications : faut-il exposer l'agence de l'opération, celle de l'auteur, ou les deux lorsque différentes ? Quelle durée de conservation des snapshots ?
8. Paramètres : l'accès « Signatures et cachets » doit-il rester derrière la route Paramètres (`settings.view`) ou devenir accessible avec les seules permissions marque ? Ce changement RBAC n'est pas requis pour la simple séparation.

## 22. Recommandations

- Valider les huit arbitrages ci-dessus avant toute migration.
- Introduire les invariants au backend et en transaction ; ne jamais compter sur un bouton désactivé comme protection métier.
- Réutiliser les circuits financiers, GED, RBAC et temps réel existants au lieu de créer des variantes parallèles.
- Préserver les snapshots historiques et représenter explicitement une donnée ancienne inconnue.
- Pour chaque migration future, qualifier quatre états : base vierge, base au niveau précédent, reprise partielle et divergence réelle.
- Mesurer la couverture des producteurs de notifications avant de déclarer B.3.4.8 terminé.
- Garder les corrections linguistiques ciblées sur les textes visibles ; ne pas renommer contrats, routes, tables, permissions ou événements.

## 23. Verdict

**AUDIT COMPLET AVEC POINTS À CLARIFIER.**

Les neuf sujets ont été reconstitués avec leurs couches concernées, écarts, risques, dépendances, stratégie de correction et critères d'acceptation. Aucun sous-lot n'a été implémenté. Les points métier de la section 21 doivent être tranchés avant les changements sensibles ; la validation du présent rapport est attendue avant toute correction.

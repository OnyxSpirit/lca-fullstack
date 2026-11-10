# Phase 2C-1 — Matrice des modules

## Lecture

Catégories : A métier local (`OWN`/`AGENCY`), B administration centrale explicite, C workflow inter-agences, D reporting transversal, E traitement technique. « ID sensible » signifie qu'une route recevant un identifiant doit joindre ou verrouiller la ressource et vérifier son agence, pas seulement la permission.

| Module / fichiers principaux | Permissions et routes | Ressource, OWN, SQL sensible | Classe / risque et cible |
|---|---|---|---|
| Auth / `auth.routes.ts`, `two-factor-admin.*`, `trusted-device.service.ts` | 11 permissions ; soi, utilisateurs, appareils, politiques | OWN=user/appareil propriétaire ; listes par utilisateur/agence/concession/global | A+B ; politiques et réglages généraux via contrôle central, appareils via agence active |
| Utilisateurs / rôles / `user.routes.ts`, `user.service.ts`, `user-agency.service.ts` | `users.*`, `roles.*` | `users.agency_id`, `user_roles`, `user_agencies`, `user_agency_roles`; cibles par ID | B pour catalogue RBAC/agences, A pour administration d'utilisateurs d'agence ; risque critique de rôle transversal |
| Dashboard / `dashboard.routes.ts` | `dashboard.view` | agrégats clients, ventes, stock, SAV | A ou D ; OWN doit avoir des agrégats définis, transversal exige permission D |
| Activity / `activity.routes.ts` | `activity.view` | journal utilisateur/agence | A ; auteur pour OWN, agence active pour AGENCY |
| Notifications / `notification.routes.ts` | view/update/archive/delete | destinataire et `operation_agency_id`; clés événement | A+E ; OWN=destinataire, action système sans faux utilisateur ; émission Socket bornée agence/utilisateur |
| CRM / `crm.routes.ts`, `crm-assignment.ts` | 12 `crm.*` | prospect owner/assigned user, agence ; RDV/essais ; IDs directs | A, C pour réaffectation inter-agences ; verrouiller source et destination |
| Clients 360 / `customer.routes.ts`, `customer.service.ts` | `customers.*`, dépendances showroom/GED | customer.agency_id, historique, véhicules, documents | A, C pour transfert ; OWN doit être défini par commercial/activité, jamais par simple utilisateur courant implicite |
| Showroom / `showroom.routes.ts` | 5 permissions | visite, commercial affecté, agence ; ID direct | A ; `showroom.assign` devient A, C seulement si agence change |
| Véhicules/stock / `vehicle.routes.ts`, `commercial-catalog.routes.ts` | 18 permissions incluant retours | vehicle.agency_id, mouvements `from_agency_id/to_agency_id`, emplacements | A+C ; transfert exige source+destination, catalogue commun éventuellement B |
| Retours véhicule / `vehicle-return.routes.ts` | 6 `vehicle.return.*` | fonction locale `scope()` avec 1=1 GLOBAL, concession, agence, demandeur | A+C ; supprimer les branches historiques après migration, verrou transactionnel et agence |
| Devis / `quotation.*` | 7 permissions | devis agence, créateur/commercial, remises, conversion | A ; OWN=créateur/commercial explicite ; conversion contrôle vente/véhicule même agence |
| Proformas / `proforma.*` | 5 permissions | proforma, client, véhicule, agence, PDF | A ; protéger ID et export avec le même scope que la lecture |
| Ventes / `sale.routes.ts` | 8 permissions | sale.agency_id, commercial, véhicule, devis | A ; OWN=commercial ; confirmation/annulation sous transaction avec ressource revalidée |
| Livraison / `delivery*.routes.ts` | 15 permissions | livraison, vente, services, checklist, signatures, autorisation financière | A+B ; configuration checklist commune en B ou override agence ; documents/complétion en A |
| Facturation / `billing.routes.ts` | 10 permissions | facture/paiement agence, vente/OR, export | A ; remboursements/annulations sensibles ; revalider agence dans transaction |
| Trésorerie / `treasury.routes.ts`, `treasury-flow.service.ts` | 16 + 6 rapprochement | comptes agence/concession, mouvements, réservations, budgets, transferts | A+C+D ; transfert contrôle compte source et destination ; consolidation explicite |
| Fournisseurs finance / `supplier-finance.routes.ts` | 11 permissions | facture fournisseur, dette, paiement, budget, agence | A ; séparation demande/validation/paiement ; IDOR et réutilisation budget hors agence à tester |
| RH / `hr*.routes.ts` | 60 permissions | employé/user/agence, salaires, congés, primes, budgets, dépenses | A+B+C ; référentiels de types en B ou override agence ; fonds/approbations multi-acteurs sensibles |
| Prestataires / `hr-provider*.routes.ts` | sous-ensemble RH | prestataire et rattachements multi-agences, contrats, rémunération | A+C ; un prestataire peut avoir plusieurs rattachements, scope par assignment actif et étape financière |
| Pièces/magasin / `part*.routes.ts`, `internal-logistics.routes.ts` | 35 permissions | stock par part/agence/emplacement, commandes, ventes, retours | A+C ; transfert physique exige droits source/destination et idempotence |
| SAV / atelier / `workshop.routes.ts`, `warranty.routes.ts`, `sav-operations.routes.ts` | 37 service + 26 workshop | OR/agence, technicien, planning, baie, pièces, facture, garantie | A+C ; sous-requêtes et IDs imbriqués doivent tous dériver de l'OR borné |
| GED / `document.routes.ts`, `document-access.ts` | `ged.*` | entity_type/entity_id, agence du parent, auteur, archives | A ; scope dérivé de la ressource métier, jamais du `agencyId` client seul |
| Marques documentaires / `document-mark*.routes.ts` | signature/stamp | cachet concession/agence, autorisations de rôle, signature personnelle | A+B ; signature personnelle OWN, catalogue cachet B/override agence, usage selon document cible |
| Reporting / `report.routes.ts` | `reporting.view/export` | agrégats dynamiques OWN refusé, AGENCY, CONCESSION, GLOBAL | D ; remplacer l'interprétation par permission transversale explicite + ensemble d'agences autorisé |
| Paramètres / `setting.*` | 14 permissions | concession, agence, fiscalité, documents, taux atelier | A+B ; paramètres communs en B, overrides en A ; ne pas assimiler GLOBAL à central automatiquement |
| Realtime / `realtime/socket.ts` | contexte JWT/session et rooms | rooms utilisateur/agence, version de contexte | E ; `assertAgencyContextCurrent`, retrait de l'ancienne room lors du changement, aucune room concession implicite |
| Bootstrap/provisioning / `database-bootstrap.ts`, `admin-provisioning.ts` | SUPER_ADMIN toutes permissions GLOBAL | création/complétion du rôle système | E+B ; conserver capacité centrale mais dissocier du scope de données à terme |

## Risques SQL transversaux

1. Plusieurs fonctions historiques traduisent `GLOBAL` en `1=1`. Tant qu'elles subsistent, une permission mal attribuée ouvre toutes les concessions.
2. `CONCESSION` résout souvent la concession via `users.agency_id`; après changement d'agence active, ce contexte peut être faux.
3. De nombreuses routes chargent une ressource par `id=?` puis vérifient ailleurs, ou utilisent des helpers locaux différents. En 2C-2, chaque lecture/écriture doit utiliser `assertAgencyResource` ou une clause d'agence équivalente.
4. Les paramètres `agencyId`, `sourceAgencyId`, `destinationAgencyId` et filtres frontend ne sont jamais une preuve d'autorisation.
5. Les transactions longues doivent appeler `withCurrentAgencyAuthorization` et revalider la version de contexte avant mutation/commit.
6. Les exports, totaux et pagination doivent appliquer le scope dans la requête source, avant `COUNT`, agrégation et génération de fichier.
7. Les sous-ressources (documents, pièces, paiements, planning) doivent dériver l'agence du parent verrouillé.

## Frontend lu en consultation seule

Le store d'authentification et les types exposent encore quatre scopes. `notificationFilters.ts` les classe par rang. `WorkshopLaborRatesSettings.tsx`, `documentLogoAccess.ts` et `stockCategoryAccess.ts` testent explicitement `CONCESSION || GLOBAL`. Plusieurs écrans transmettent librement `agencyId`, notamment paramètres, pièces, achats directs, factures fournisseur et transferts. Le frontend devra consommer l'agence active de session, afficher seulement OWN/AGENCY pour les rôles métier et présenter les fonctions centrales comme capacités distinctes. Aucun contrôle de visibilité frontend ne doit remplacer le contrôle HTTP.

## Couverture et limite

Les 25 modules de permissions, 47 fichiers de routes et 727 déclarations HTTP ont été inventoriés. La matrice est exhaustive au niveau des familles et risques ; elle n'est pas une preuve dynamique route-par-route. Les tests navigateur/E2E sont expressément hors périmètre et n'ont pas été lancés.

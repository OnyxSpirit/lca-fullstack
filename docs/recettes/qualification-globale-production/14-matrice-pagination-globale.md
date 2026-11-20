# Matrice de normalisation des paginations

Convention qualifiée : pagination placée sous la liste, plage visible `début–fin sur total`, tailles 10/20/50/100 (10 par défaut), accès première/précédente/pages/suivante/dernière. Le comptage serveur intervient après les contraintes RBAC et agence.

| Domaine | Surface | Mode | Filtres / tri | État vérifié |
|---|---|---|---|---|
| Pièces | Achats directs | Serveur | recherche, statut, nature, financement, tri | Conforme |
| Pièces | Ventes directes magasin | Serveur | recherche, statut, ordre stable décroissant | Conforme |
| Pièces | Catalogue / stocks | Serveur | recherche et filtres métier | Conforme |
| SAV | Facturation | Serveur (factures centrales) | recherche, statut | Conforme |
| SAV | Transit – opérations | Serveur | périmètre agence ; soldes globaux séparés | Conforme |
| SAV | Journal | Serveur | recherche, dates, type, tri | Conforme |
| Fiscalité RH | Obligations | Serveur | recherche, dates, taxe, statut, tri ; agrégats globaux séparés | Conforme |
| Comptabilité | Plan comptable | Serveur | recherche, classe | Conforme |
| Comptabilité | Écritures | Serveur | recherche, statut | Conforme |
| Comptabilité | Journaux | Serveur | recherche | Conforme |
| Comptabilité | Exercices | Client borné | hiérarchie exercice/périodes conservée | Conforme |
| Trésorerie | Journal des mouvements | Serveur | filtres métier | Conforme |
| Trésorerie | Rapprochements et écarts | Serveur | période et périmètre | Conforme |
| Paramètres | Fournisseurs | Client borné | recherche | Conforme |
| Paramètres | Ponts / postes atelier | Client borné | recherche, statut, liste/grille | Conforme |
| Paramètres | Agences | Client borné | référentiel borné | Conforme |

Les agrégats, sélecteurs de formulaire, détails d’un objet et petites listes contractuellement bornées ne sont pas traités comme des historiques paginables. Les autres référentiels signalés par l’audit global restent suivis dans la matrice d’anomalies tant que leur contrat serveur et leur recette de frontière ne sont pas tous deux qualifiés.

## Complément de reprise du 19 novembre 2026

La matrice exhaustive des 141 surfaces et leurs chemins historiques reste la source d’inventaire : [`../../audits/audit-pagination-frontend-global/07-matrice-couverture.md`](../../audits/audit-pagination-frontend-global/07-matrice-couverture.md). Les lignes ci-dessous consignent les surfaces corrigées ou requalifiées pendant la reprise, avec les preuves réellement obtenues. Une absence de recette authentifiée n’est pas convertie en succès navigateur.

| ID / module | Chemin UI exact | Composant frontend | Endpoint backend | Mode | Recherche / filtres / tri | RBAC / agence | Tests | Navigateur | Résultat |
|---|---|---|---|---|---|---|---|---|---|
| Paramètres · Documents | Paramètres de concession → Documents et GED | `DocumentReferencesSettings.tsx` | `/document-categories`, `/document-types` | Client indépendant, 10/20/50/100 | Recherche séparée catégories/types, ordre API conservé | Permissions Paramètres/GED existantes | `qgp-server-pagination`, `operational-settings-compliance` | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Signatures | Paramètres de concession → Signatures & Cachets → Signatures | `DocumentMarksSettings.tsx` | API versions de signatures | Client indépendant, 10/20/50/100 | Recherche dédiée, versions historiques conservées | `stamp.view/manage`, ressource utilisateur | Tests marques documentaires + compilation | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Cachets | Paramètres de concession → Signatures & Cachets → Cachets | `DocumentMarksSettings.tsx` | API catégories/cachets | Deux pages clientes indépendantes | Recherche catégories et cachets, statut conservé | `stamp.view/manage`, scope existant | Tests LOT13/B3.2 + compilation | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Constructeurs | Paramètres de concession → Constructeurs | `ManufacturersSettings.tsx` | API constructeurs/marques | Client, 10/20/50/100 | Recherche + statut, associations véhicules préservées | Permissions constructeurs | `qgp-server-pagination`, Warranty Manufacturer | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Livraison | Paramètres de concession → Services de livraison | `DeliveryServicesSettings.tsx` | API services livraison | Client, 10/20/50/100 | Recherche + statut | Permissions services livraison | `delivery-services`, `qgp-server-pagination` | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Checklist | Paramètres de concession → Checklist livraison · catégories | `DeliveryChecklistTemplates.tsx` | API catalogue checklist | Client, 10/20/50/100 | Recherche + statut ; index global conservé pour réordonnancement | Permissions checklist dédiées | `delivery-checklist-configurable`, `qgp-server-pagination` | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Checklist | Paramètres de concession → Checklist livraison · types | `DeliveryChecklistTemplates.tsx` | API catalogue checklist | Client, 10/20/50/100 | Recherche + catégorie + statut ; ordre interne conservé | Permissions checklist dédiées | `delivery-checklist-configurable`, `delivery-checklist-security` | Bloqué après écran 2FA réel | Conforme code/tests |
| Paramètres · Emplacements | Paramètres de concession → Parcs, Showrooms & Garages | `VehicleLocationsSettings.tsx` | API emplacements véhicules | Client, 10/20/50/100 | Recherche, agence, type, statut | `vehicles.assignments.view`, scope agence | `vehicle-garages`, `qgp-server-pagination` | Bloqué après écran 2FA réel | Conforme code/tests |
| PAG-071 · Fiscalité RH | RH → Fiscalité | `FiscalAdministration.tsx` | `/hr/fiscal-obligations` | Serveur, 10/20/50/100 | Recherche, dates, taxe, statut, tri | Permissions et scope avant comptage | `qgp-server-pagination`, `fiscal-enterprise` | Non rejoué authentifié | Conforme code/tests |
| PAG-075 · Achats directs | Pièces → Achats directs | `DirectPurchasesPanel.tsx` | API achats directs | Serveur, 10/20/50/100 | Recherche, statut, nature, financement, tri | Scope agence avant total | `qgp-server-pagination` | Non rejoué authentifié | Conforme code/tests |
| PAG-077 · Ventes comptoir | Pièces → Ventes directes | panneau ventes directes | API ventes directes | Serveur, 10/20/50/100 | Recherche, statut, tri stable | Scope agence avant total | `qgp-server-pagination` | Non rejoué authentifié | Conforme code/tests |
| PAG-079 · File atelier | Pièces → Demandes internes SAV | `PartsWorkQueuePage.tsx` | `/parts-internal-requests` | Client, 10/20/50/100 | Recherche demande/OR/agence + statut | Permission demandes/réservations, API déjà bornée à l’agence | Compilation + suite frontend 225/225 | Non rejoué authentifié | Conforme code/tests ; serveur à migrer si volumétrie forte |
| PAG-115/121 · Analyses | Comptabilité → Grand livre & balances | `AccountingAnalysisPanel.tsx` | API analyses comptables | Grand livre serveur ; autres vues client indépendantes | Filtres comptables existants ; exports non tronqués | Permissions comptables existantes | `qgp-server-pagination`, suites LOT2–5 | Bloqué après écran 2FA réel | Conforme code/tests |
| PAG-118 · Historique compte | Comptabilité → Plan comptable | `AccountingReferenceManagement.tsx` | API plan/historique | Serveur pour comptes/journaux, client pour historiques/mappings | Recherche et filtres existants | Permissions comptables | Tests comptabilité + compilation | Bloqué après écran 2FA réel | Conforme code/tests |
| PAG-120 · Intégrations | Comptabilité → Intégrations | `AccountingAutomationPanels.tsx` | `/accounting/integration-events` | Serveur, 10/20/50/100 | Recherche + statut, tri stable | Scope agence appliqué avant total | `qgp-server-pagination` frontend/backend | Bloqué après écran 2FA réel | Conforme code/tests |
| PAG-122 · Contrôles/clôtures | Comptabilité → Contrôles & clôtures | `AccountingAdvancedPanels.tsx` | API contrôles/clôtures | Pages clientes indépendantes, 10/20/50/100 | Ordres métier conservés | Permissions de contrôle/clôture | Suite backend LOT5 + compilation | Bloqué après écran 2FA réel | Conforme code/tests ; serveur à privilégier pour journaux longs |
| Schémas comptables | Comptabilité → Schémas | `AccountingAutomationPanels.tsx` | `/accounting/schemes` | Serveur, 10/20/50/100 | Recherche + statut | Visibilité agence/globale avant total | `qgp-server-pagination` frontend/backend | Bloqué après écran 2FA réel | Conforme code/tests |
| Exercices | Comptabilité → Exercices | `AccountingPage.tsx` | API exercices | Client, 10/20/50/100 | Hiérarchie périodes préservée | Permissions comptables | Compilation et suites comptables | Bloqué après écran 2FA réel | Conforme code/tests |
| PAG-127..129 · Rapprochement | Comptabilité & Trésorerie → Rapprochement bancaire | `BankReconciliationPanel.tsx` | API rapprochements | Serveur pour écarts/non rapprochés/groupes ; client relevés/lignes/historique | Période, compte et statuts existants | Permissions Treasury et scope agence | `pagination-server-finalization`, FIN07 | Bloqué après écran 2FA réel | Conforme code/tests |
| PAG-133 · Rôles | Utilisateurs & Habilitations → Rôles | `RoleManagementPanel.tsx` | API rôles | Client, 10 fixe | Recherche + statut | Gestion des rôles, protection système | Suite RBAC + compilation | Non rejoué authentifié | Conforme code/tests |

### Preuves globales de cette reprise

- Backend isolé, hors restriction de sockets : **2 177 tests, 2 073 réussis, 0 échec, 104 conditionnels ignorés**.
- Frontend final : **225/225 réussis, 0 échec**.
- TypeScript frontend et backend : réussi.
- Build Vite : réussi, 2 552 modules transformés.
- `git diff --check` : réussi.
- Chromium réel : rendu de la connexion et du challenge 2FA vérifié sur les instances locale et qualification ; les écrans authentifiés restent **non qualifiés dans le navigateur**, faute de second facteur E2E autorisé.

## Frontières couvertes

- total 0 : page 1, plage 0–0 ;
- total 1, 10, 11, 20, 21 et 101 ;
- demande de page au-delà de la dernière : correction vers la dernière page valide ;
- tailles non normalisées : retour à 10, sauf dépassement supérieur à 100 limité à 100 ;
- changement de filtre ou de taille : retour à la page 1 ;
- ordre stable complété par l’identifiant pour éviter doublons et omissions.


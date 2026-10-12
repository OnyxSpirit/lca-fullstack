# Analyse ciblée des corrections finales LCA

Date d'analyse : 12 octobre 2026  
Nature : audit statique en lecture seule, sans modification applicative, SQL, Docker ou paquet de livraison.

## 1. Résumé exécutif

Le dépôt contient déjà des fondations solides pour les sept domaines examinés. Le référentiel dynamique des types de contrats est implémenté avec historique figé, permissions et tests. Le circuit financier confirmé est conforme à la règle métier : la vente ou la facture ne crée pas une entrée de trésorerie ; seul un paiement confirmé appelle le service de mouvement automatique, et les remboursements produisent une sortie liée au paiement d'origine.

Trois écarts sont confirmés statiquement : aucune fiche employé A4 officielle n'est générée ; les activités ne disposent d'aucun endpoint/export d'impression, ni unitaire ni exhaustif ; la page facture ne propose qu'un téléchargement du PDF, sans impression directe. La gestion des signatures/cachets existe, est versionnée et protégée, mais elle est limitée à l'import d'une signature raster et au contexte `DELIVERY_REPORT` : dessin, catégories dynamiques, associations aux rôles et politique multi-document restent des évolutions.

L'écart RH/RBAC est une différence de sémantique démontrée, susceptible d'être perçue comme un bug : « Délier » met seulement `employee_profiles.user_id` à `NULL`, tandis que l'indicateur RBAC `isEmployee` reste vrai si une fiche associée au compte existe et n'est pas `departed`. Après dissociation, le compte n'est plus associé à cette fiche, donc l'indicateur devrait devenir faux ; l'historique RH, les rôles et le compte sont bien conservés. Une recette dynamique doit cependant confirmer le symptôme observé dans l'interface avant de classer l'incident d'exécution.

La cause de l'erreur 500 signalée dans les activités n'est pas confirmée par la lecture seule. Le SQL emploie toutefois un alias d'ORDER BY ambigu (`name`) dans `/activity/filters`, et l'ajout des colonnes de contexte dépend de la migration 068. Ces deux hypothèses doivent être testées sur la base recette avant correction.

## 2. Périmètre et méthode

Analyse limitée aux sept domaines demandés : contrats RH, fiche employé, activités, liaison RH/RBAC, ventes/trésorerie, signatures/cachets, facturation/impression. Lecture des routes, composants, hooks, services documentaires, migrations et tests concernés. Aucun test dynamique ni requête en base n'a été lancé dans cette mission ; toute conclusion nécessitant l'état réel de MySQL est marquée comme telle.

## 3. Fichiers analysés

- RH : `backend-node/src/modules/hr/hr.routes.ts`, `hr-contract.routes.ts`, `frontend/src/modules/hr/ContractTypesManager.tsx`, `EmployeeContractsSection.tsx`, `EmployeeRecordModal.tsx`, `HrAdministrationPage.tsx`, `frontend/src/api/hrHooks.ts`.
- Utilisateurs/RBAC : `backend-node/src/modules/users/user.service.ts`, `user.routes.ts`, `frontend/src/modules/users/UsersManagementPage.tsx`, `backend-node/src/modules/rbac/rbac.service.ts`.
- Activités : `backend-node/src/modules/activity/activity.routes.ts`, `audit-writer.ts`, `frontend/src/modules/activity/ActivityPage.tsx`, `frontend/src/api/activityHooks.ts`.
- Finance : `backend-node/src/modules/billing/billing.routes.ts`, `payment.domain.ts`, `invoice-cancellation.service.ts`, `backend-node/src/modules/treasury/treasury-flow.service.ts`, `treasury.service.ts`, `frontend/src/modules/billing/InvoiceDetailPage.tsx`.
- Documents : `backend-node/src/modules/documents/commercial-document.ts`, `business-document.service.ts`, `document-layout.ts`, `backend-node/src/modules/document-marks/document-mark.routes.ts`, `frontend/src/modules/settings/DocumentMarksSettings.tsx`, `frontend/src/api/documentMarkHooks.ts`.
- Migrations principales : 054 à 058, 064, 065, 068 et 069 dans `backend-node/database/migrations/`.
- Tests ciblés : `hr-contract-lot11a*`, `hr-employee-lot10*`, `activity-lot12a*`, `treasury-flow-*`, `document-marks-lot13*`, `erp17-pdf.test.ts`, `billing-dynamic-rbac.test.ts`, `delivery-document-security.test.ts`.

## 4. Tables, migrations et permissions existantes

| Domaine | Tables principales | Migration | Permissions |
|---|---|---|---|
| Contrats | `employee_contract_types`, `employee_contracts`, `employee_profiles` | 065 | `hr.contract.view`, `hr.contract.manage`, `hr.contract.type.manage` |
| Employés | `employee_profiles`, `salary_history`, `users`, `user_roles` | 064 + baseline | `hr.employees.view/manage`, `hr.salary.view/manage`, `hr.employee.account.manage` |
| Activités | `audit_logs` | 068 | `activity.view` |
| Trésorerie | `payments`, `payment_refunds`, `treasury_movements`, `treasury_accounts`, `treasury_account_mappings`, `treasury_flow_configurations` | 054–058 | `billing.payment.*`, `treasury.*` |
| Marques documentaires | `user_signature_versions`, `service_stamps`, `service_stamp_versions`, `document_mark_snapshots`, `delivery_signatures` | 069 | `signature.view.self`, `signature.manage.self`, `stamp.view/manage/use`, `document.signature.apply` |

## 5. Domaine 1 — Types de contrats RH

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Référentiel | CRUD concession-scopé, code et nom uniques (`065`, `hr-contract.routes.ts:32-34`) | Aucun écart structurel | Conserver l'existant |
| Activation | Création/édition/renouvellement refusent un type inactif (`hr-contract.routes.ts:38-43`) | Conforme | Ajouter seulement une recette de non-régression |
| Historique | Snapshots `type_code_snapshot` et `type_name_snapshot`; FK restrictive | Conforme | Conserver les snapshots |
| RBAC | Permissions dynamiques et scopes contrôlés | La liste exige un scope concession/global même pour la simple consultation | Confirmer si un lecteur agence doit voir le catalogue actif ; sinon conforme |
| Tests | Tests frontend, backend et MySQL dédiés | Couverture à relire lors d'une évolution | Ajouter cas renommage d'un type déjà utilisé |

**STATUT : EXISTANT ET CONFORME**, sous réserve de la décision métier sur la consultation par scope AGENCY.

## 6. Domaine 2 — Fiche employé imprimable

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Données RH | Identité, matricule, fonction, dates, statut, agence/concession, compte, contrats et salaires existent | Aucun agrégat documentaire dédié | Créer un endpoint de données/PDF réutilisant les contrôles `employee()` |
| Présentation | `EmployeeRecordModal.tsx` affiche une fiche modale | Pas de document A4 officiel, en-tête/pied institutionnel ni impression | Ajouter un générateur PDF backend fondé sur `document-layout.ts` |
| Photo | Le compte possède un avatar, mais le dossier RH autonome n'a pas de champ photo dédié dans la migration 064 | Ambiguïté quand aucun compte n'est lié | Décider si l'avatar utilisateur est acceptable ; sinon migration minimale d'un asset RH versionné |
| Salaire | API protégée par `hr.salary.view` et scope RH | Aucun mode standard/complet de fiche | Mode standard par défaut sans salaire ; mode complet seulement après contrôle explicite `hr.salary.view` côté backend |
| Identité LCA | Infrastructure `getBusinessIdentity`/layout utilisée par les PDF commerciaux | Non utilisée par RH | Réutiliser logo, agence, coordonnées et pied de page existants |

Ne pas exposer le salaire dans un payload standard puis le masquer côté frontend. Prévoir deux politiques de rendu serveur ou un paramètre `includeSalary=true` autorisé explicitement.

**STATUT : ÉVOLUTION NÉCESSAIRE.** Impacts : frontend, backend, PDF, RBAC et tests ; SQL uniquement si une photo RH indépendante est retenue.

## 7. Domaine 3 — Activités utilisateur

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Filtres | utilisateur, agence, module, catégorie, dates, recherche, pagination (`activity.routes.ts:44-55`) | Libellés modules/actions bruts partiellement techniques | Ajouter un dictionnaire de libellés français stable |
| RBAC | OWN/AGENCY/CONCESSION/GLOBAL via `activityScope` | Conforme sur le principe | Réutiliser exactement ce prédicat pour les exports |
| Détail | Modal unitaire, masquage d'entités sensibles | Pas d'impression unitaire | Générer un document serveur ou une vue d'impression contrôlée |
| Rapport complet | Pagination bornée à 100 | Aucun export exhaustif ; imprimer l'écran ne couvrirait que la page courante | Endpoint d'export reprenant les filtres, sans `LIMIT` de page, avec plafond raisonnable et pagination serveur interne |
| Erreur 500 | Non reproduite dans cette mission | Cause non confirmée | Tester chaque combinaison contre MySQL recette ; vérifier migration 068 et l'alias `ORDER BY name` des requêtes `modules/agencies` (`activity.routes.ts:38-39`) |

Le backend valide les identifiants et dates et devrait renvoyer 400 pour les entrées invalides. Une absence de migration 068 provoquerait en revanche une erreur SQL sur `agency_id`/`concession_id`. L'alias non qualifié `name` peut également être ambigu selon le SELECT. Ce sont des hypothèses statiques, pas des anomalies confirmées.

**STATUT : EXISTANT MAIS INCOMPLET ; erreur 500 À CONFIRMER PAR TEST DYNAMIQUE.** Impacts : frontend, backend, PDF/export, RBAC et tests ; pas de SQL attendu si la migration 068 est appliquée.

## 8. Domaine 4 — Liaison RH/RBAC

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Champ RH | `employee_profiles.user_id` nullable + `employment_status` | La dissociation ne change volontairement pas le statut RH | Conserver cette séparation conceptuelle |
| Indicateur utilisateur | `isEmployee = employee_profile_id != null && employee_status != 'departed'` dans `user.service.ts` | Dépend de la jointure au profil, pas d'un booléen utilisateur | Afficher « Oui » uniquement si la liaison active existe, avec libellé précis « Fiche RH liée » |
| Lier | Transaction, verrou, contrôle concession, unicité (`hr.routes.ts:78`) | Conforme | Conserver |
| Délier | `user_id=NULL` dans une transaction, audit, compte/rôles intacts (`hr.routes.ts:80`) | Le terme peut être interprété comme sortie administrative | Renommer l'action « Dissocier le compte ERP » et rafraîchir la liste utilisateurs après succès |
| Historique/KPI | La fiche reste intacte ; KPI compte les statuts RH actifs (`hr.routes.ts:129`) | Une fiche active non liée reste légitimement dans l'effectif | Documenter que dissociation ≠ départ ; utiliser l'action de statut pour une sortie |

La création d'un employé crée une fiche indépendante avec `user_id=NULL` (`hr.routes.ts:72`). Lier/délier ne touche ni `users.is_active`, ni `user_roles`, ni `employment_status`. C'est cohérent avec la migration 064 et préserve l'historique. Si l'UI continue d'afficher « Employé : Oui » après rafraîchissement complet, rechercher un cache TanStack non invalidé ; aucune écriture backend ne maintient un second booléen.

**STATUT : EXISTANT MAIS INCOMPLET (sémantique/rafraîchissement à confirmer), pas de correction SQL recommandée.** Impacts possibles : frontend et tests seulement ; backend seulement si le contrat API doit expliciter `hasLinkedEmployeeProfile`.

## 9. Domaine 5 — Ventes et trésorerie

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Vente/facture | Tables `sales`, `invoices`, lignes et statuts | Aucun mouvement à la seule vente, conformément à la règle | Conserver |
| Encaissement | POST paiement crée `payments` confirmé puis appelle `postAutomaticMovement` dans la même transaction (`billing.routes.ts:94`) | Dépend d'une configuration de flux prête | Vérifier en recette les mappings agence/moyen de paiement |
| Paiement partiel | `applyPayment` actualise payé, solde et statut ; vente véhicule synchronisée | Conforme | Conserver |
| Idempotence | `payments.idempotency_key` et unicité globale des événements trésorerie (migration 056) | Conforme | Tester répétition et concurrence |
| Remboursement | Sortie via `postPaymentRefundMovement`, liée au compte du paiement original (`billing.routes.ts:97`) | Conforme statiquement | Tester remboursement partiel/total et solde insuffisant |
| Atelier/garantie | Les paiements de factures atelier suivent la même route ; règlements constructeur ont leur source dédiée | Multiples sources exigent surveillance | Contrôler les tests `treasury-flow-*` et garanties |

Le service automatique refuse une configuration non activée, un mapping absent, un compte inactif ou une devise incompatible. La contrainte d'unicité sur `(source_type, source_id, event_type)` empêche la double comptabilisation. Les annulations de facture encaissée sont bloquées et exigent avoir/remboursement (`invoice-cancellation.service.ts:9-12`).

**STATUT : EXISTANT ET CONFORME STATIQUEMENT ; À CONFIRMER PAR TEST DYNAMIQUE pour les données/mappings de chaque concession.** Aucun second registre financier à créer.

## 10. Domaine 6 — Signatures et cachets

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Signature personnelle | Import PNG/JPEG, une version active, historique, self-service et audit (`document-mark.routes.ts:7-10`) | Pas de mode dessin | Ajouter canvas frontend converti en PNG, envoyé au même endpoint ; modes exclusifs côté UI |
| Cachets | Cachet versionné par concession/agence/service, actif/inactif | Pas de catégories dynamiques ; contexte ENUM limité à `DELIVERY_REPORT` | Étendre le modèle, sans dupliquer le stockage/versionnement |
| Associations rôles | Permissions dynamiques `stamp.use` | Pas de table cachet↔rôle ni document↔politique | Ajouter associations par `role_id` et politique documentaire ; jamais par nom de rôle |
| Application | PV de livraison référence les versions de signature/cachet et le rendu relit ces versions | Pas de moteur automatique générique multi-document | Extraire un service de résolution lors de l'émission officielle |
| Immutabilité | Versions et snapshots, FK restrictives, PDF métier archivé | `document_mark_snapshots` n'est pas encore généralisé aux documents commerciaux | Lier le snapshot à l'archive PDF lors de l'émission |
| Sécurité | Upload raster validé (MIME, extension, structure, dimensions, taille), lecture authentifiée | Politique d'absence de signature non configurable | Définir par type : bloquer, émettre sans marque ou demander approbation |

L'administrateur ne possède aucune route permettant de modifier la signature d'autrui ; les routes `/signature/me` emploient toujours l'identité JWT. C'est conforme à l'exigence de non-substitution silencieuse.

**STATUT : EXISTANT MAIS INCOMPLET / ÉVOLUTION NÉCESSAIRE.** Impacts : frontend, backend, SQL, RBAC, PDF et tests.

## 11. Domaine 7 — Facturation et impression

| Élément | Existant | Écart | Action recommandée |
|---|---|---|---|
| Page | `frontend/src/modules/billing/InvoiceDetailPage.tsx` | Bouton « PDF » avec téléchargement seulement | Ajouter un bouton « Imprimer » |
| Source PDF | GET `/invoices/:id/pdf`, permission `billing.invoice.view` (`billing.routes.ts:99`) | Aucun écart serveur | Réutiliser strictement cet endpoint |
| Authentification | `apiDownload` transporte la session ; route derrière `authenticate` et RBAC | Un `window.open(url)` nu perdrait l'en-tête d'authentification | Télécharger le blob authentifié, ouvrir une URL objet, attendre le chargement puis `print()` |
| Identité du document | Brouillon rendu à la volée ; émis relu depuis l'archive historique | Conforme | Ne jamais créer un second rendu pour l'impression |

**STATUT : ÉVOLUTION NÉCESSAIRE, modification minimale frontend + tests.** Aucun backend, SQL ou nouveau PDF requis.

## 12. Inventaire documentaire observé

| Module / document | Route ou générateur | État / archivage | Marques actuelles | Impression UI | Politique proposée |
|---|---|---|---|---|---|
| Facture | `/invoices/:id/pdf`, `renderInvoiceDocument` | Brouillon dynamique, émise archivée | Pas de marque générique observée | Non | C ou D selon validation comptable |
| Reçu paiement | `/payments/:id/receipt`, `renderPaymentReceiptData` | Paiement confirmé archivé | Aucune | Non explicite | B ou C |
| Devis | `renderQuotationDocument` / archive métier | Selon workflow | Aucune générique | PDF existant dans parcours commercial | B |
| Bon de commande vente | `renderSaleOrderDocument` / archive à confirmation | Confirmé figé | Aucune générique | PDF existant | B ou D |
| PV livraison | route PDF livraison, `renderDeliveryDocument` | Livré archivé | Signature/cachet versionnés déjà intégrés | Consultation PDF | C/D, conserver |
| Planning livraison | `renderDeliveryPlanningDocumentData` | Rapport opérationnel | Aucune | PDF | A |
| Ordre de réparation | route PDF atelier, `renderRepairOrderDocument` | Document opérationnel | Aucune générique | PDF | B ou C selon clôture |
| Fiche véhicule | `/documents/business/vehicle/:id/pdf` | État courant, non officiel historique | Aucune | Bouton imprimer | A |
| PV retour véhicule | `/vehicle-returns/:id/pdf` | Clôturé archivé | Aucune générique | Téléchargement | C/D |
| Fiche employé | Inexistante | — | — | Non | B/C selon politique RH |
| Rapport activité | Inexistant | — | — | Non | A (avec identité de l'émetteur) |

Les politiques B–E sont des recommandations à valider métier ; seules les marques du PV de livraison sont aujourd'hui confirmées dans le code.

## 13. Fonctionnalités existantes, partielles et anomalies

### Existantes et réutilisables

- Référentiels actifs/inactifs, snapshots et audit RH.
- Service PDF institutionnel et identité agence/concession.
- Archivage immuable des documents métier officiels.
- Contrôle RBAC dynamique et scopes.
- Versionnement sécurisé des signatures et cachets.
- Flux transactionnel, idempotent et sourcé des encaissements/remboursements vers la trésorerie.

### Partielles

- Marques documentaires limitées au PV de livraison.
- Activités consultables mais non imprimables/exportables intégralement.
- Fiche RH riche à l'écran mais non documentaire.
- Liaison RH/compte correcte côté données, terminologie UI perfectible.

### Anomalies confirmées statiquement

1. Absence de fiche employé A4 : aucune route/générateur RH PDF ni action d'impression.
2. Absence d'impression activité unitaire ou complète : `activity.routes.ts` ne fournit que JSON paginé et `ActivityPage.tsx` aucune action d'impression.
3. Absence d'impression directe facture : `InvoiceDetailPage.tsx:28,37` force un téléchargement par ancre.

### Anomalies non reproduites

- Erreur 500 sur certains filtres d'activité : test dynamique requis. Vérifier migration 068, alias `name` et combinaisons dates/catégorie/agence.
- Indicateur utilisateur encore à « Oui » après « Délier » : le calcul serveur devrait devenir faux après dissociation ; vérifier invalidation/cache et réponse réseau.
- Vente non visible en trésorerie : conforme si aucun paiement n'a été encaissé ; vérifier seulement les paiements confirmés et la configuration des mappings.

## 14. Risques de régression et tests recommandés

| Priorité | Tests minimaux |
|---|---|
| P1 | Matrice complète filtres activités avec base migrée/non migrée, scopes, utilisateur inactif, dates limites et 350 lignes ; vérifier absence de 500 |
| P1 | Lier/délier puis relire `/users` et `/hr/employees`; vérifier compte/rôles/historique/KPI, caches et événements temps réel |
| P1 | Encaissement partiel, double requête/concurrence, mapping absent, remboursement partiel/total, annulation, agence/concession et devise |
| P1 | Tentatives de lecture/usage d'une signature ou d'un cachet hors périmètre ; immutabilité d'un PDF déjà émis |
| P2 | Contrat avec type actif/inactif, renommage, historique snapshot, renouvellement et chevauchement |
| P2 | Fiche RH standard sans salaire pour tous les profils ; fiche sensible refusée sans `hr.salary.view`; photo absente |
| P2 | Rapport activité exhaustif respectant tous les filtres et limite ; détail sensible masqué aussi dans le PDF |
| P2 | Impression facture et téléchargement produisent le même hash de blob/PDF et respectent `billing.invoice.view` |
| P2 | Dessin/import exclusifs, versionnement, révocation, absence de marque et politique par document |

Risques majeurs : fuite salariale ou de détails d'audit, signature d'un document par le mauvais acteur, modification rétroactive d'un document officiel, mouvement financier dupliqué, rupture des scopes concession/agence et confusion entre dissociation de compte et départ administratif.

## 15. Modifications SQL éventuellement nécessaires

- Aucune pour l'impression de facture, l'export activités ou la clarification RH/RBAC.
- Photo RH : seulement si l'avatar utilisateur ne peut pas constituer la photo officielle ; préférer une référence d'asset versionnée et non un blob.
- Marques : extension requise pour catégories dynamiques, associations cachet↔rôle, politiques par type de document et élargissement du contexte actuellement limité par ENUM à `DELIVERY_REPORT`.
- Ne pas modifier `treasury_movements` : le registre existant répond au besoin.

## 16. Priorisation et ordre recommandé

1. **P1 — validation ciblée** : reproduire l'erreur activités, la persistance apparente de `isEmployee` et les paiements absents de trésorerie avec les états de base réels.
2. **P1 — sécurité documentaire** : formaliser la politique d'autorisation avant d'élargir signatures/cachets.
3. **P2 — corrections sans SQL** : impression facture, export/print activités, clarification « Dissocier le compte ERP ».
4. **P2 — fiche employé PDF** : réutiliser le layout institutionnel, standard d'abord, sensible ensuite.
5. **P2 — extension marques** : catégories, rôles, politiques et moteur d'application automatique.
6. **P3 — ergonomie** : libellés français, aide utilisateur, présentations secondaires.

Complexité qualitative : faible pour l'impression facture et les libellés ; moyenne pour le rapport activités et la fiche RH ; moyenne pour la clarification RH/RBAC après reproduction ; élevée pour la généralisation sécurisée des marques documentaires ; faible à moyenne pour la recette financière, sans nouveau développement attendu si les mappings sont corrects.

## 17. Décisions métier restant à confirmer

1. Un scope AGENCY peut-il consulter la liste active des types de contrats ?
2. La photo officielle RH peut-elle réutiliser l'avatar du compte, sachant qu'un employé peut ne pas avoir de compte ?
3. Qui peut demander la fiche RH « complète » et quelles données, outre le salaire, sont sensibles ?
4. « Délier » signifie-t-il uniquement dissocier le compte (comportement actuel) ou aussi effectuer une sortie administrative ? Ces actions devraient rester distinctes.
5. Limite maximale et format du rapport complet d'activités.
6. Politique par document : signature requise, cachet requis, approbateur réel, et comportement si aucune signature n'est disponible.
7. Catégories de cachets globales à une concession ou propres à chaque concession.

## 18. Verdict global

Le socle est réutilisable et aucune refonte générale n'est justifiée. Les contrats et le flux financier ne doivent pas être recréés. La correction minimale consiste à compléter les interfaces et documents manquants, confirmer dynamiquement les deux symptômes signalés, puis étendre le système de marques existant par politique et associations RBAC. Toute implémentation doit rester hors du paquet qualifié `livrables/LCA-ERP-LIVRAISON-FINALE.zip` jusqu'à une nouvelle campagne de qualification.

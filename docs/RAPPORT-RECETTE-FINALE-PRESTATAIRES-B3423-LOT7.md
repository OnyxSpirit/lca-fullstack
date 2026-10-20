# Rapport de recette finale Prestataires — B.3.4.2.3 LOT 7

Date : 19 octobre 2026  
Verdict : **NON VALIDÉ pour une mise en service**

## 1. Synthèse générale

Le socle prestataires des LOTS 1 à 6 est présent et compile. Deux réserves du LOT 6 ont été corrigées : la chaîne de migration neuve ne bloque plus sur 094 et les identifiants financiers saisis manuellement ont été remplacés par des sélecteurs métier filtrés.

La migration complète baseline 071 → 101 a réellement réussi sur MySQL 8.4 isolé. En revanche, la recette HTTP authentifiée, navigateur et le parcours financier complet avec acteurs distincts n'ont pas été exécutés. Les suites globales comportent aussi des échecs préexistants hors Prestataires. Ces éléments interdisent un verdict `VALIDÉ` ou une déclaration de préparation à la production.

## 2. État du dépôt et périmètre réellement testé

Le dépôt contenait les modifications non commitées des LOTS 6 et 7. Elles ont été préservées. Aucun commit, push, changement de branche, déploiement ou accès VPS n'a été effectué.

Testé réellement : compilation backend/frontend, tests ciblés Prestataires, tests du runner 094/101, installation complète 071→101 sur MySQL 8.4 temporaire, postconditions SQL, contrôles statiques des sélecteurs, et lancement des suites globales.

Non exécuté : backend et frontend HTTP isolés avec jeux de rôles complets, recette navigateur, scénarios multi-connexion de bout en bout et paiements fictifs complets.

## 3. Environnement de recette

- MySQL 8.4 dans `lca-lot7-mysql-84`, stockage `tmpfs`, port local 33317.
- Base fictive `lca_lot7` créée par le bootstrap officiel.
- Aucun volume métier monté.
- Aucun conteneur métier utilisé ou modifié.
- Le conteneur temporaire a été supprimé à la fin de la campagne.

## 4. Migrations 096 à 101 et correction 094

Cause exacte de l'anomalie 094 : la baseline déclarée au niveau 071 contenait déjà les cinq colonnes, deux index et deux clés étrangères de `094_notification_historical_context.sql`. Le runner lançait néanmoins le `ALTER TABLE`, qui échouait sur les objets dupliqués et enregistrait un faux `FAILED_PARTIAL`.

Correction : le runner vérifie désormais la postcondition d'un DDL neuf avant son exécution. Il l'adopte uniquement si tous les objets et définitions de colonnes attendus sont conformes, en inscrivant l'étape `APPLIED`. Un état partiel n'est jamais adopté ; le DDL est exécuté et MySQL reste l'autorité, avec traçabilité `FAILED_PARTIAL` en cas d'échec.

Résultat réel du rejeu neuf : versions 71 à 101 présentes, 31 migrations journalisées, 281 étapes `APPLIED`, aucune étape en échec, étape 094 `APPLIED`. Les migrations 096, 097, 098, 099, 100 et 101 ont toutes été appliquées par le runner officiel.

Les tests MySQL 094 couvrent aussi : schéma absent, schéma déjà conforme, conservation d'une notification historique et détection d'une divergence réelle. Le test 101 couvre contraintes, permissions, unicité et conservation d'un moyen chiffré.

## 5. Sélecteurs financiers

Les champs techniques ont été remplacés par des listes métier :

| Référence | Filtrage interface |
|---|---|
| Budget | actif, autorisé pour création de dépense, devise, concession/agence, solde suffisant |
| Moyen prestataire | prestataire courant, actif, scope du décaisseur, référence masquée |
| Compte de trésorerie | actif, devise, concession/agence, solde disponible affiché |
| Catégorie | active, sortie ou bidirectionnelle, concession |
| Moyen central | catalogue actif du module Trésorerie |

Les catalogues existants sont réutilisés. Les contrôles backend de scope, budget, compte, solde, catégorie, justificatifs et permissions restent autoritaires.

## 6. Matrice de recette

| Domaine | Contrôle réellement exécuté | Résultat |
|---|---|---|
| Chaîne 071→101 | Bootstrap officiel MySQL 8.4 neuf | PASS |
| Migration 094 absente/conforme/divergente | Tests MySQL dédiés | PASS |
| Migration 101 | Test MySQL dédié | PASS |
| LOT 5 rémunérations | 5 tests ciblés | PASS |
| LOT 6 finance | 5 tests ciblés | PASS |
| Sélecteurs LOT 7 | 3 contrôles ciblés | PASS |
| Frontend finance LOT 6 | test ciblé | PASS |
| Lint backend/frontend | TypeScript sans émission | PASS |
| Build backend/frontend | TypeScript et Vite | PASS |
| Suite frontend globale | lancée réellement | FAIL, `fin04-remunerations.test.ts` attend l'ancien libellé `Rémunérations` |
| Suite backend globale | lancée, puis interrompue après blocage prolongé | FAIL/incomplète ; plusieurs tests d'intégration hors Prestataires ont échoué |
| HTTP authentifié Prestataires | non exécuté | NON TESTÉ |
| Navigateur Prestataires | non exécuté | NON TESTÉ |
| Concurrence E2E | non exécutée | NON TESTÉ |

## 7. Résultats fonctionnels, RBAC, finance et GED

Les tests ciblés démontrent statiquement et au niveau SQL : identité commune sans modification salariale, contrats et GED spécialisés, trois modalités de rémunération, séparation préparation/soumission/validation, dépense centrale en brouillon, séparation approbation financière, paiements partiels bornés, idempotence centrale, facture obligatoire pour une société, exceptions demandées/approuvées/refusées, chiffrement AES-256-GCM et snapshot transactionnel.

Les permissions restent distinctes et `OWN` est refusé. La demande financière croise désormais le scope Prestataires et `hr.expense.create`. La lecture masquée des moyens lors du décaissement utilise le scope `hr.provider.remuneration.disburse`; le déchiffrement conserve une permission supplémentaire.

Ces constats ne remplacent pas une validation HTTP avec sept profils réels. Les scénarios inter-agence, inter-concession, GED interdit, auto-approbation et double décaissement doivent encore être exercés via les API.

## 8. Résultats des suites globales

La suite frontend a été exécutée hors sandbox après un premier refus IPC environnemental. Un échec certain est relevé : `fin04-remunerations.test.ts`, assertion historique sur le libellé d'onglet. La fonctionnalité utilise désormais `Salaires & rémunérations`; l'assertion n'a pas été modifiée pour obtenir artificiellement un vert.

La suite backend a révélé plusieurs échecs hors périmètre Prestataires, notamment `app.test.ts`, `auth-rate-limit.test.ts`, `commercial-residuals.test.ts`, `commercial-transversal-routes.test.ts`, plusieurs tests CRM/Customers et documents. Elle a ensuite cessé de progresser et a été interrompue. Aucun de ces échecs n'a été masqué ni corrigé sans démonstration de lien avec les LOTS 1 à 6.

## 9. Anomalies

### PREST-L7-001 — Critique — Migration 094 sur installation neuve

- Attendu : reprise sans réexécuter un DDL déjà conforme.
- Obtenu initial : `MIGRATION_FAILED_PARTIAL` sur objets déjà inclus dans la baseline.
- Cause : absence de contrôle de postcondition avant un DDL neuf.
- Correction : adoption stricte `ALREADY SATISFIED` dans le runner.
- Test : installation 071→101 et deux scénarios MySQL 094.
- Statut : CORRIGÉ.

### PREST-L7-002 — Majeure — Saisie d'identifiants financiers

- Attendu : catalogues lisibles et filtrés.
- Obtenu initial : champs texte d'identifiants.
- Correction : cinq sélecteurs métier réutilisant les API existantes.
- Test : trois tests frontend ciblés, lint et build.
- Statut : CORRIGÉ techniquement, recette navigateur restante.

### PREST-L7-003 — Critique — Recette E2E non démontrée

- Attendu : parcours complet 1 500 000 / 50 000 / 1 450 000 XAF puis 500 000 + 950 000 XAF, avec acteurs et scopes distincts.
- Obtenu : non exécuté en HTTP/navigateur.
- Statut : OUVERT, bloquant mise en service.

### PREST-L7-004 — Majeure — Suites globales non vertes

- Attendu : non-régression complète.
- Obtenu : un échec frontend historique certain et plusieurs échecs backend hors Prestataires ; backend incomplet après blocage.
- Statut : OUVERT.

## 10. Sécurité des moyens de règlement

La clé doit rester injectée hors dépôt, sauvegardée dans un gestionnaire de secrets avec contrôle d'accès et journalisation. Une sauvegarde de base sans la clé ne permet pas la restauration fonctionnelle des coordonnées. La rotation doit conserver les anciennes versions pendant le rechiffrement transactionnel et vérifié. La perte définitive de toutes les versions rend les payloads irrécupérables ; aucun fallback en clair ne doit être ajouté.

L'absence de clé provoque un refus 503 des opérations sensibles. Une clé Base64 ne représentant pas exactement 32 octets bloque la configuration. Aucune clé réelle n'apparaît dans le diff ou ce rapport.

## 11. Prérequis de mise en service

1. Exécuter une recette HTTP authentifiée complète avec utilisateurs GLOBAL, CONCESSION, AGENCY, OWN et sans permission.
2. Exécuter le scénario financier chiffré complet avec deux paiements et tentative de dépassement.
3. Tester réellement concurrence et idempotence avec connexions simultanées.
4. Réaliser la recette navigateur des identités, contrats, GED, rémunérations et nouveaux sélecteurs.
5. Qualifier les échecs globaux et obtenir des suites non-régression acceptées.
6. Définir et tester la sauvegarde/restauration de la clé de paiement.
7. Revoir les modifications non commitées avant toute procédure de livraison.

## 12. Verdict final

**NON VALIDÉ.** Les deux réserves techniques majeures identifiées au LOT 6 ont été corrigées et la chaîne SQL 071→101 est désormais démontrée. Néanmoins, l'absence de recette HTTP/navigateur et de concurrence réelle, ainsi que les suites globales non vertes, constituent des blocages explicites. Aucune mise en service ne doit être engagée sur la base de cette campagne.

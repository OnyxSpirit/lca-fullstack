# Rapport d'audit et corrections ciblées — Activités et flux LCA

Date : 14 octobre 2026  
Branche / HEAD initial : `main` / `ea70020`  
Environnement : code local ; MySQL métier contrôlé uniquement en lecture

## 1. Résumé exécutif

Deux lots ont été traités sans reconstruction Docker ni mutation de la base principale. Le module Activité distingue désormais les cinq contextes réels, propose un filtre d'action exacte séparé de la catégorie d'opération, rejette les périodes inversées et convertit les journées depuis le fuseau de la concession vers un intervalle UTC semi-ouvert. La recherche suit les changements d'URL et les sélections territoriales dépendantes sont bornées.

La configuration Treasury réutilise exclusivement `treasury_account_mappings`, `treasury_flow_configurations` et le moteur existant. Un tableau dynamique expose les règles, avec modification du compte, activation, désactivation et suppression. La suppression est transactionnelle et refusée dès qu'un mouvement automatique correspondant existe.

## 2. État initial du module Activité utilisateurs

La pagination SQL en deux temps, le tri stable, la présentation métier, la divulgation par permission, le PDF filtré et le scope `activity.view` étaient opérationnels. L'audit préalable est conservé dans `docs/AUDIT-FILTRES-ACTIVITE-UTILISATEURS-LCA.md`.

## 3. Inventaire des filtres

Recherche textuelle, utilisateur, module, catégorie d'opération, agence, concession, contexte, dates début/fin et pagination existaient. `entityType` était accepté par l'API sans commande visible. Le présent lot ajoute à l'interface le filtre **Action exacte**, déjà fondé sur `audit_logs.action`, sans supprimer la catégorie métier.

## 4. Anomalies identifiées

| ID | Gravité | Constat confirmé |
|---|---|---|
| ACT-FLT-001 | majeure | cinq modes stockés réduits à trois agrégats |
| ACT-FLT-002 | majeure | bornes de journée construites en UTC plutôt que dans le fuseau métier |
| ACT-FLT-003 | majeure | période inversée retournant silencieusement zéro ligne |
| ACT-FLT-004 | majeure | historique URL susceptible d'être réécrit par l'ancien état de recherche |
| ACT-FLT-005 | mineure | catégories toujours statiques, même absentes du périmètre |
| ACT-FLT-006 | mineure | agence et concession non synchronisées |
| ACT-FLT-007 | mineure | contexte agence seule présenté comme non enregistré |

## 5. Causes techniques

Les valeurs `CONTEXTUALIZED` et `UNKNOWN` agrégeaient plusieurs états, `isoDate` ajoutait directement `Z`, aucune comparaison `from/to` n'était faite, le debounce ne synchronisait que l'état vers l'URL, et les options territoriales n'exposaient pas leur relation. Le rendu territorial ne possédait qu'une branche concession seule.

## 6. Corrections réalisées

- cinq contextes réels exposés, avec compatibilité serveur pour les anciens agrégats `CONTEXTUALIZED` et `UNRECORDED` ;
- action exacte `al.action=?`, options dérivées du journal visible ;
- catégories dérivées des données visibles avec le même `CASE` que la liste ;
- conversion de minuit local vers UTC et borne supérieure exclusive au lendemain ;
- HTTP 400 pour une période inversée ;
- fuseau retourné dans les contrats liste/options ;
- état de recherche resynchronisé lors d'un changement d'URL ;
- concession incompatible retirée après changement d'agence ;
- rendu explicite du cas agence seule à l'écran et dans le PDF ;
- contrat de masquage sensible relié explicitement à l'écran.

## 7. Tests des filtres

Le nouveau test `activity-filters-targeted.test.ts` vérifie la conversion `2026-10-14 Africa/Brazzaville` vers `[2026-10-13 23:00:00, 2026-10-14 23:00:00)` UTC, le rejet des dates invalides, les cinq modes, l'action exacte, les agrégats compatibles, le rejet d'une période inversée et le partage du prédicat liste/COUNT/PDF.

## 8. Tests RBAC

Le scope obligatoire reste ajouté en première condition et tous les filtres restent conjoints par `AND`. Les options dynamiques sont issues du même scope. Aucun bypass de rôle n'a été ajouté. Les opérations Treasury continuent d'exiger `treasury.account.manage` et `targetAgency` contrôle AGENCY/CONCESSION/GLOBAL.

## 9. Tests des exports PDF

Le PDF appelle le même constructeur de filtre, sans pagination écran. Il hérite donc des nouvelles dates, actions et classifications. Les détails restent soumis à `disclosure`. Le rendu agence seule a été corrigé.

## 10. État initial des flux automatiques

MySQL contenait une configuration prête, un mapping actif et un mouvement. Le moteur automatique utilisait déjà :

- readiness par concession ;
- mapping unique agence + moyen de paiement ;
- compte Treasury et devise validés ;
- verrouillage `FOR UPDATE` ;
- unicité/idempotence des mouvements ;
- journalisation centrale.

L'écran permettait seulement l'enregistrement d'un mapping et l'activation globale ; aucun tableau d'administration n'était rendu.

## 11. Architecture existante réutilisée

Une règle de flux est une ligne `treasury_account_mappings`. L'intégration globale est `treasury_flow_configurations`. Un mouvement produit est une ligne immuable de `treasury_movements`. Le compte associé est `treasury_accounts`. Aucun second moteur ni aucune nouvelle table n'a été créé.

## 12. Tableau des configurations

Le composant `TreasuryFlowMappingsTable` affiche moyen de paiement/type de flux, agence/concession, compte, statut, présence d'historique, date de modification et actions. Il gère chargement, erreur, état vide, actualisation et débordement horizontal.

## 13. Action de modification

La modale préremplit le compte actuel. Agence et moyen de paiement restent immuables. Le backend recharge et verrouille la règle, revalide le scope, l'activité du compte et la cohérence agence/concession avant mise à jour. La mutation est protégée contre la double soumission.

## 14. Activation et désactivation

Le changement de statut utilise la route existante. L'activation revalide désormais l'activité et le périmètre du compte. La désactivation ne touche aucun mouvement. La réactivation ne rejoue aucun historique.

## 15. Règles de suppression

Nouvelle route `DELETE /treasury/flow-mappings/:id`. Dans une transaction : verrouillage du mapping, contrôle du scope, recherche verrouillée d'un mouvement automatique correspondant, refus HTTP 409 si historique, sinon suppression et audit. Le message métier recommandé est retourné. Le contrôle backend s'applique même si le bouton reste visible.

## 16. Protections financières

Aucun mouvement, solde, paiement ou facture n'est mis à jour par les actions de configuration. Les producteurs existants continuent à verrouiller readiness et mapping. Une suppression en concurrence détient le verrou du mapping ; un producteur ultérieur ne peut plus le sélectionner. Les contraintes d'unicité des mouvements et la logique de remboursement sur compte original sont intactes.

## 17. Traçabilité

Création, modification, activation, désactivation et suppression appellent `writeAudit`. Les nouvelles opérations fournissent un contexte `EXPLICIT` agence/concession ; la readiness fournit la concession. Aucun secret n'est ajouté aux snapshots.

## 18. Migrations éventuelles

La dernière migration du dépôt et de la base est la 082. Aucune évolution de schéma n'est nécessaire : toutes les fonctionnalités s'appuient sur les tables et colonnes existantes. Aucune migration n'a été créée ou exécutée.

## 19. Tests exécutés

- build TypeScript backend : réussi ;
- build Vite frontend : réussi ;
- six suites backend ciblées : 6/6 réussies ;
- suites frontend ciblées : 6/6 après restauration du contrat `detailsRestricted` ;
- contrôle MySQL 8.4 en lecture seule : version de migration 82, 1 mapping actif, 1 configuration prête, 1 mouvement ;
- `git diff --check` ;
- SHA-256 de l'archive officielle.

## 20. Résultats

Les builds sont verts. Les tests ciblés nouveaux et historiques passent. Aucun test n'a utilisé la base métier en écriture. La suppression autorisée/refusée est couverte contractuellement ; sa preuve MySQL mutante est réservée à une base jetable.

## 21. Fichiers modifiés

- `backend-node/src/modules/activity/activity.routes.ts`
- `backend-node/src/modules/activity/activity-document.ts`
- `backend-node/src/modules/treasury/treasury-flow.service.ts`
- `backend-node/src/modules/treasury/treasury.routes.ts`
- `backend-node/test/activity-filters-targeted.test.ts`
- `backend-node/test/treasury-flow-administration.test.ts`
- `frontend/src/api/activityHooks.ts`
- `frontend/src/api/treasuryHooks.ts`
- `frontend/src/modules/activity/ActivityPage.tsx`
- `frontend/src/modules/treasury/TreasuryPage.tsx`
- `frontend/src/modules/treasury/TreasuryFlowMappingsTable.tsx`
- présent rapport.

Le rapport d'audit précédent, déjà non suivi au début de mission, a été préservé.

## 22. Limites éventuelles

- L'affichage de l'heure dans la table React reste soumis au fuseau du navigateur ; les bornes serveur et le PDF utilisent le fuseau métier. Une harmonisation d'affichage dédiée peut être réalisée séparément.
- L'identification d'utilisation d'un mapping est conservatrice, car les mouvements historiques ne stockent pas `mapping_id` : elle rapproche compte + moyen de paiement + type automatique. Elle privilégie la préservation financière et peut refuser une suppression ambiguë.
- Aucun parcours navigateur authentifié ni mutation MySQL principale n'a été exécuté.

## 23. Verdict final

**CONFORME POUR INTÉGRATION LOCALE, AVEC RECETTE NAVIGATEUR ET MYSQL ISOLÉE RECOMMANDÉE AVANT DÉPLOIEMENT.**

Les anomalies confirmées ont reçu des corrections minimales. Les mécanismes RBAC, pagination, PDF, idempotence et historique financier sont conservés. Aucun conteneur n'a été reconstruit ou redémarré, aucune donnée métier n'a été modifiée, aucun commit ou push n'a été effectué.

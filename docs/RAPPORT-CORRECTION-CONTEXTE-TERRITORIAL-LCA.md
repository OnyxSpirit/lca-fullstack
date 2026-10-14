# Rapport de correction — contexte territorial des activités LCA

Date : 14 octobre 2026  
Périmètre : journalisation transactionnelle, affichage Activité utilisateurs, filtres et PDF.

## 1. Résumé exécutif

La journalisation territoriale a été centralisée autour du service `writeAudit`. Les nouvelles activités distinguent désormais les stratégies `GLOBAL`, `RESOURCE`, `EXPLICIT` et `UNKNOWN`. Une valeur `LEGACY` réservée aux lignes antérieures permet de préserver intégralement les 105 événements existants sans les déclarer artificiellement globaux.

Tous les producteurs applicatifs qui contenaient encore un `INSERT INTO audit_logs` direct ont été migrés vers le service central. Il ne subsiste qu'une instruction d'insertion, dans `activity/audit-writer.ts`.

L'interface et les PDF distinguent maintenant : agence et concession, concession seule, administration globale et contexte non enregistré. Les prédicats RBAC existants sont conservés.

## 2. Causes corrigées

- insertions directes contournant la résolution territoriale ;
- liste de résolveurs trop limitée ;
- absence de classification persistante ;
- confusion entre opération globale et contexte manquant ;
- absence de validation d'un couple agence/concession explicite ;
- producteurs anciens et modernes utilisant des contrats différents.

## 3. Architecture retenue

Le service central reçoit toujours l'auteur, le module, la ressource, l'action et les snapshots. Il reçoit en plus une stratégie de contexte facultative :

- sans stratégie, une ressource disposant d'un résolveur utilise `RESOURCE` ;
- sans résolveur, l'événement devient `UNKNOWN` avec un motif technique ;
- `GLOBAL` et `EXPLICIT` doivent être demandés volontairement par le producteur.

La résolution est exécutée sur la connexion transactionnelle fournie. Aucune transaction indépendante n'est ouverte lorsqu'une transaction métier existe déjà. La sanitation récursive des secrets reste appliquée avant insertion.

## 4. Modes de contexte

| Mode | Fonctionnement |
|---|---|
| `RESOURCE` | Charge l'agence et/ou la concession depuis la ressource canonique dans la transaction courante |
| `EXPLICIT` | Valide le contexte fourni ; l'agence est contrôlée et sa concession canonique est imposée |
| `GLOBAL` | Réservé aux opérations sans territoire par nature ; les deux identifiants restent nuls |
| `UNKNOWN` | Résolution impossible ; les identifiants restent nuls et `context_note` contient un motif exploitable |
| `LEGACY` | Valeur réservée aux événements antérieurs à la migration ; affichage prudent, sans reclassification |

Une ressource de concession peut légitimement produire `agency_id=NULL` avec une concession réelle. Un contexte explicite vide ou contradictoire est refusé avec une erreur métier 409.

L'agence de l'auteur et son rôle ne sont jamais utilisés comme valeur de remplacement.

## 5. Producteurs modifiés

- ventes automobiles ;
- devis ;
- factures, paiements, avoirs, remboursements et annulations de facture ;
- livraisons, autorisations financières, services et checklists ;
- documents GED, aperçus, archivage, restauration et versions ;
- signatures personnelles et cachets de service ;
- employés, contrats, congés, primes et rémunérations ;
- utilisateurs et rôles ;
- agences, concessions, barèmes atelier et référentiel constructeur ;
- véhicules et kilométrage atelier ;
- garanties Atelier/SAV ;
- notifications ;
- retours de véhicules ;
- fournisseurs/pièces déjà centralisés ;
- trésorerie et rapprochement bancaire déjà centralisés.

La vente conserve le type `sale` et est résolue depuis `sales.agency_id`. Le résultat est indépendant du rôle de l'auteur. Les signatures sont résolues via leur utilisateur. Les cachets conservent leur agence facultative et leur concession obligatoire.

## 6. Producteurs non modifiés et justification

- CRM : aucun producteur direct `audit_logs` actif n'existe dans les sources actuelles ; aucune écriture artificielle n'a été ajoutée.
- Modules sans événement métier existant : aucun nouveau journal n'a été inventé.

Les appels existants à `writeAudit` dont le type ne dispose pas encore d'un résolveur spécifique restent fonctionnels, mais produiront explicitement `UNKNOWN` avec un motif, jamais `GLOBAL` silencieusement.

## 7. Évolution du schéma

La migration additive `081_activity_territorial_context.sql` ajoute :

- `context_mode ENUM('LEGACY','GLOBAL','RESOURCE','EXPLICIT','UNKNOWN') NOT NULL DEFAULT 'LEGACY'` ;
- `context_note VARCHAR(255) NULL` ;
- l'index `(context_mode, created_at, id)`.

Elle ne contient aucun `UPDATE`, `DELETE` ou backfill. Elle a été validée sur une base MySQL 8.4 temporaire puis supprimée. La migration 081 est également appliquée sur l'instance locale courante ; les 105 lignes antérieures portent toutes `LEGACY`.

## 8. Activités globales et contextes inconnus

Les rôles et le référentiel constructeur/garant utilisent explicitement `GLOBAL`. Leur affichage est **Administration globale**.

Un type non résolu, une ressource inexistante ou une ressource sans rattachement devient `UNKNOWN`. Le service conserve un motif technique dans `context_note`, mais ce motif n'est pas exposé dans l'API métier. L'affichage utilisateur est **Contexte territorial non enregistré**.

Les lignes `LEGACY` utilisent le même libellé prudent ; aucune ancienne ligne n'est reclassifiée globale sur la seule base de valeurs nulles.

## 9. Affichage et PDF

Les quatre rendus communs sont :

- agence + concession : noms réels des deux niveaux ;
- concession seule : nom de la concession et « aucune agence spécifique » ;
- global : « Administration globale » ;
- inconnu ou historique : « Contexte territorial non enregistré ».

Le PDF utilise la même fonction d'interprétation que le backend. La présentation métier existante est conservée : aucune référence technique, aucun snapshot JSON brut et aucune donnée sensible n'ont été réintroduits.

## 10. Filtres

Les filtres utilisateur, module, action, agence, concession, période et recherche sont inchangés. Un filtre supplémentaire permet :

- avec contexte territorial (`RESOURCE` ou `EXPLICIT`) ;
- administration globale (`GLOBAL`) ;
- sans contexte territorial (`UNKNOWN` ou `LEGACY`).

Le choix vide est désormais libellé **Tout mon périmètre**. Les filtres supplémentaires s'ajoutent toujours au prédicat RBAC. Une valeur nulle ne donne aucun droit territorial.

## 11. Vérification RBAC

Les règles restent :

- `GLOBAL` : toutes les activités autorisées, y compris globales ou inconnues ;
- `OWN` : uniquement les activités de l'auteur courant ;
- `AGENCY` : uniquement `audit_logs.agency_id` égal à l'agence autorisée ;
- `CONCESSION` : uniquement la concession autorisée ;
- absence de permission : refus.

Un paramètre agence ou concession falsifié est toujours combiné au scope et ne l'élargit pas. Les règles de divulgation des détails et de sanitation restent inchangées.

## 12. Tests exécutés

### Service central

Validés : ressource agence/concession, concession seule, explicite valide, explicite contradictoire, global, inconnu, ressource inexistante, ressource sans rattachement et indépendance vis-à-vis de l'agence de l'auteur.

### Producteurs et non-régression

Un test contractuel vérifie que tous les producteurs actifs ciblés appellent `writeAudit` et ne contiennent plus d'insertion directe. Les suites de présentation, filtres, pagination, scopes, secrets et PDF ont été rejouées.

Résultat : **5 suites réussies, 0 échec**.

### Builds

- backend TypeScript : réussi ;
- frontend Vite : réussi, 2 490 modules transformés ;
- `git diff --check` : réussi.

### MySQL 8.4

- migration 081 appliquée avec succès sur une base temporaire isolée ;
- colonnes et index vérifiés ;
- base temporaire supprimée après la recette ;
- aucun jeu de données fictif ajouté à la base ERP.

## 13. Vérification PDF

Les tests vérifient directement la fonction partagée pour les quatre contextes. Les PDF filtrés et individuels consomment tous deux cette fonction. Les contrôles existants de pagination, de détails autorisés et de suppression des références techniques continuent de réussir.

Aucune reconstruction Docker n'a été effectuée dans cette mission ; la recette navigateur du nouveau bundle relève donc de la prochaine mise à jour contrôlée.

## 14. Intégrité historique

Une empreinte déterministe a été calculée sur chaque colonne historique des 105 événements, ordonnée par identifiant, avant et après l'intervention :

`b360bc37385c86ecb0c55187f34cb2e02cdfb1cf60d8bcb965aabeb5890ff209`

Résultats après migration :

- nombre : 105 ;
- empreinte : identique ;
- `agency_id` nuls : 102, inchangé ;
- `concession_id` nuls : 102, inchangé ;
- classification : 105 `LEGACY` ;
- aucun auteur, date, action, snapshot ou rattachement historique modifié.

## 15. Fichiers modifiés

Principaux fichiers :

- `backend-node/database/migrations/081_activity_territorial_context.sql`
- `backend-node/src/modules/activity/audit-writer.ts`
- `backend-node/src/modules/activity/activity.routes.ts`
- `backend-node/src/modules/activity/activity-document.ts`
- producteurs des modules billing, deliveries, documents, HR, notifications, quotations, settings, users, vehicles et workshop
- `frontend/src/api/activityHooks.ts`
- `frontend/src/modules/activity/ActivityPage.tsx`
- `backend-node/test/activity-territorial-context.test.ts`
- `backend-node/test/activity-lot12a.test.ts`

## 16. Anomalies restantes

- Les 105 événements historiques restent volontairement non reclassifiés. Une procédure séparée avec preuve événement par événement serait nécessaire pour les distinguer.
- Les futurs types métier non enregistrés dans le résolveur produiront `UNKNOWN`. C'est volontaire et observable, mais ils devront être ajoutés au registre lorsqu'un rattachement fiable existe.
- Le nouveau bundle n'a pas été déployé/reconstruit dans Docker pendant cette mission.

## 17. Verdict final

**CORRECTION SOURCE ET SCHÉMA CONFORME, HISTORIQUE PRÉSERVÉ.**

La journalisation des nouvelles activités est centralisée, typée et validée. Les opérations globales, territoriales et inconnues ne sont plus confondues. Tous les producteurs directs actifs ont été harmonisés, les filtres et PDF partagent la même interprétation, et les règles RBAC restent intactes. La mise en service du nouveau bundle reste à effectuer dans une opération Docker contrôlée distincte.

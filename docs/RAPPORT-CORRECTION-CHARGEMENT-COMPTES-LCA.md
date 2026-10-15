# Rapport de correction du chargement des comptes de trésorerie

## 1. Cause exacte

Le chargement échouait à cause d’une régression applicative dans le calcul `attachment_mutable`. La requête de `listAccounts` référençait `treasury_flow_mappings`, table inexistante. Le schéma officiel, la migration 055, la baseline et le service de configuration des flux utilisent tous `treasury_account_mappings`.

La preuve provient des logs du conteneur backend :

```text
method: GET
route: /api/treasury/accounts
code: ER_NO_SUCH_TABLE
errno: 1146
sqlState: 42S02
message: Table 'concession_erp.treasury_flow_mappings' doesn't exist
```

L’erreur n’était donc ni un refus RBAC, ni un scope invalide, ni une colonne `attachment_type` absente.

## 2. Endpoint et comportement HTTP

Le frontend appelle `GET /api/treasury/accounts` via `useTreasuryAccounts`. La route exige `treasury.view`, puis appelle `listAccounts`. L’erreur SQL non métier est convertie en erreur serveur ; le composant affiche volontairement le message générique « Chargement des comptes impossible. ».

## 3. État réel du schéma observé

Les contrôles strictement en lecture seule sur `lca-mysql-1` ont établi :

- MySQL `8.4.11` ;
- `treasury_account_mappings` existe ;
- `treasury_flow_mappings` n’existe pas ;
- quatre comptes de trésorerie existent ;
- `attachment_type` existe ;
- `schema_migrations` contient déjà la version 85 ;
- deux comptes sont `AGENCY`, deux restent `NULL` avec agence absente.

Cet état contredit le contexte selon lequel 085 n’aurait pas été appliquée. La présente mission n’a exécuté aucune migration : la version 85 était déjà enregistrée avant le diagnostic.

## 4. Correction

Deux occurrences erronées ont été remplacées dans `treasury.service.ts` :

- sous-requête de `listAccounts` ;
- contrôle transactionnel autorisant ou bloquant une modification de rattachement.

Le nom utilisé est désormais `treasury_account_mappings`, conforme au schéma officiel.

Aucune autre logique de lecture, de solde, de réservation ou de RBAC n’a été modifiée.

## 5. Compatibilité pré/post migration 085

La requête de consultation utilise `SELECT ta.*` et ne référence pas explicitement `ta.attachment_type`. Elle fonctionne donc avec un schéma pré-085 comme avec un schéma post-085, sous réserve que les tables historiques 054 à 076 attendues existent.

Avant migration, `attachment_type` est simplement absent du résultat JSON ; le frontend le traite comme rattachement historique non qualifié. Après migration, il affiche `AGENCY`, `CONCESSION` ou l’état historique non qualifié.

La consultation ne masque aucun compte. Les protections séparées continuent d’interdire réservation, transfert et mouvement sur un compte dont le rattachement explicite est indéterminé. `agency_id = NULL` n’est jamais interprété automatiquement comme `CONCESSION`.

## 6. Vérifications réalisées

- logs backend : cause SQL confirmée ;
- inventaire du schéma et de la version 085 : lecture seule ;
- exécution en lecture seule de la requête corrigée : quatre comptes retournés ;
- calcul de solde et sous-requêtes d’historique acceptés par MySQL 8.4 ;
- lint/TypeScript backend : réussi ;
- build backend : réussi ;
- tests ciblés backend : 2 fichiers sur 2 réussis ;
- lint/TypeScript frontend : réussi ;
- build frontend : réussi lors du contrôle final ;
- tests ciblés frontend : consignés lors du contrôle final ;
- `git diff --check` : consigné lors du contrôle final.

## 7. Permissions et territoires

Le prédicat existant reste inchangé :

- `GLOBAL` : tous les comptes ;
- `CONCESSION` : concession de l’agence de l’utilisateur ;
- `AGENCY` : agence exacte ;
- `OWN` : refusé pour cette ressource collective.

La correction n’élargit aucun périmètre.

## 8. Fichiers modifiés

- `backend-node/src/modules/treasury/treasury.service.ts`
- `backend-node/test/treasury-realtime-attachment.test.ts`
- `docs/RAPPORT-CORRECTION-CHARGEMENT-COMPTES-LCA.md`

Les modifications non commitées antérieures ont été préservées.

## 9. Limitations et risques résiduels

- le code corrigé n’a pas été reconstruit ni déployé dans Docker, conformément aux interdictions ; le conteneur actif continuera donc à servir son ancienne image jusqu’à une autorisation distincte ;
- aucun appel navigateur authentifié sur le nouveau code n’a été possible sans reconstruction ;
- l’application automatique apparente de la migration 085 doit être expliquée opérationnellement avant toute autre intervention ;
- les deux comptes historiques `NULL` restent consultables mais volontairement bloqués pour les nouvelles opérations financières jusqu’à qualification métier.

## 10. Verdict

**Cause identifiée et correction source validée.** Le chargement est rétabli au niveau SQL par le remplacement du nom de table erroné. La mise à disposition dans l’application active nécessite une reconstruction/redéploiement local explicitement autorisé, non réalisé dans cette mission.

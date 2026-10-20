# REC-02.1 — Reprise authentifiée de la recette technique intégrée

Date : 20 octobre 2026  
Environnement : Docker local `lca` uniquement  
Verdict : **VALIDÉ PARTIELLEMENT — scénario financier principal validé, qualification REC-02 exhaustive restant incomplète**

Ce rapport complète `RAPPORT-REC02-RECETTE-TECHNIQUE-INTEGREE.md`. Il ne constitue ni une autorisation de déploiement ni une validation de REC-03. Aucun mot de passe, code TOTP, cookie ou jeton n'est reproduit.

## 1. Accès navigateur et authentification

- frontend Docker utilisé : `http://127.0.0.1` sur le port hôte 80 ;
- backend : service Docker interne sur le port 3001, joint par le proxy frontend ;
- l'utilisateur a réalisé personnellement l'authentification Super Administrateur et le contrôle TOTP ;
- le tableau de bord Super Administrateur a été constaté dans le navigateur intégré ;
- les neuf comptes fictifs de recette ont ensuite été authentifiés individuellement par le parcours officiel ;
- aucun JWT n'a été fabriqué et aucune table d'authentification n'a été modifiée directement.

Contrôle HTTP final : `GET /api/health` retourne HTTP 200 avec l'état `ok`.

## 2. Rôles et utilisateurs de recette

Neuf rôles dédiés ont été créés par les mécanismes d'administration de l'ERP, chacun avec un utilisateur fictif distinct :

| Rôle | Objet | Utilisateurs | Permissions attribuées |
|---|---|---:|---:|
| `REC02_REQUESTER` | préparateur/demandeur | 1 | 6 |
| `REC02_APPROVER` | approbateur indépendant | 1 | 7 |
| `REC02_PROVIDER` | gestion Prestataires, contrats, GED et moyen de règlement | 1 | 17 |
| `REC02_FINANCE` | demande et soumission financières | 1 | 8 |
| `REC02_TREASURER` | décaissement et trésorerie | 1 | 7 |
| `REC02_SCOPE_AGENCY` | périmètre agence | 1 | 2 |
| `REC02_SCOPE_CONCESSION` | périmètre concession | 1 | 2 |
| `REC02_SCOPE_GLOBAL` | périmètre global | 1 | 2 |
| `REC02_NOPERM` | contrôle négatif sans permission | 1 | 0 |

Les permissions ont été limitées aux besoins des scénarios. Le rôle système Super Administrateur n'a pas été dupliqué. La 2FA n'a pas été imposée aux identités fictives.

## 3. Matrice RBAC et scopes

### Contrôles réellement exécutés

- authentification officielle réussie pour les neuf identités fictives ;
- séparation effective des identités demandeur, approbateur, gestionnaire Prestataires, financier et trésorier ;
- accès du trésorier au module RH nécessaire au décaissement ;
- refus visuel de `/users` pour le trésorier : écran « Permission insuffisante » et confirmation qu'aucun appel métier n'a été lancé ;
- rôles territoriaux `AGENCY`, `CONCESSION` et `GLOBAL` créés et authentifiables.

### Réserves

- l'isolation négative inter-agence et inter-concession n'a pas été démontrée sur deux jeux territoriaux complets ;
- `OWN` n'a pas été exercé par un compte dédié sur le parcours Prestataires ;
- les tentatives IDOR directes multi-profils n'ont pas toutes été rejouées en HTTP réel.

La présence et l'authentification des rôles territoriaux ne sont donc pas présentées comme une preuve exhaustive de tous les scopes.

## 4. Prestataire, contrat et correction rencontrée

Le parcours officiel a créé un prestataire personne physique fictif, son rattachement à l'agence de Brazzaville et le contrat forfaitaire `REC02-CTR-077918` de 1 500 000 XAF.

La première création du contrat a révélé une anomalie SQL réelle :

```text
Unknown column 'a.agency_id' in 'where clause'
```

La route de création utilisait le prédicat territorial générique avec l'alias `a` de la table `agencies`, alors que cette table expose `id` et non `agency_id`. La correction ciblée qualifiée dans `backend-node/src/modules/hr/hr-provider-contract.routes.ts` applique désormais :

- `paa.agency_id = ?` pour le scope `AGENCY` ;
- `a.concession_id = (SELECT concession_id FROM agencies WHERE id = ?)` pour le scope `CONCESSION` ;
- `1 = 1` pour le scope `GLOBAL`.

Le test de non-régression est dans `backend-node/test/provider-contracts-b3423-lot4.test.ts`. Après reconstruction ciblée du seul backend, la création a réussi. MySQL et ses volumes n'ont été ni reconstruits ni réinitialisés.

## 5. Scénario financier principal

### Parcours exécuté

1. constatation : 1 500 000 XAF brut ;
2. retenue : 50 000 XAF ;
3. net : 1 450 000 XAF ;
4. soumission par le demandeur ;
5. validation par l'approbateur distinct ;
6. création de la demande financière par le responsable financier ;
7. dépense `PREM-1` de 1 450 000 XAF soumise par le responsable financier ;
8. approbation par l'approbateur distinct ;
9. création du moyen de règlement fictif `Caisse REC-02` de type `CASH` ;
10. décaissement de 500 000 XAF ;
11. décaissement de 950 000 XAF ;
12. tentative supplémentaire de 1 XAF, refusée par l'interface avec « Montant supérieur au solde net dû. ».

### Preuves MySQL en lecture seule

| Contrôle | Résultat |
|---|---|
| statut rémunération | `VALIDATED` |
| brut / retenue / net | 1 500 000 / 50 000 / 1 450 000 XAF |
| dépense budgétaire | ID 5, `approved`, 1 450 000 XAF |
| décaissements | exactement 2 |
| montants | 500 000 et 950 000 XAF |
| somme décaissée | 1 450 000 XAF |
| solde restant | 0 XAF |
| mouvements de trésorerie | 2 mouvements `OUT`, `POSTED` |
| snapshots de paiement | 2, instrument `CASH`, références concordantes |
| troisième décaissement | absent |

Les historiques démontrent que le préparateur/soumetteur de la rémunération, l'approbateur, le responsable financier et le trésorier sont des identités distinctes conformément à leur étape. La dépense a été créée et soumise par le financier puis approuvée par l'approbateur.

## 6. Idempotence et concurrence

- les deux décaissements possèdent chacun une clé `client_request_id` persistée et distincte ;
- la contrainte `uq_budget_expense_disbursement_request (created_by, client_request_id)` est présente dans le schéma ;
- le service relit la clé sous verrou avant insertion et les tests ciblés d'intégration couvrent le rejeu, le surpaiement et la concurrence ;
- le surpaiement réel après solde nul a été refusé sans créer de mouvement supplémentaire.

Réserve : le même `client_request_id` n'a pas été rejoué manuellement sur la session navigateur, et une course simultanée de deux requêtes HTTP n'a pas été déclenchée sur la donnée REC-02. Ces deux points restent une preuve automatisée/codée, pas une preuve HTTP E2E de cette campagne.

## 7. GED

Le contrat de recette a été créé sans exigence documentaire de paiement. Le parcours GED n'a donc pas bloqué le scénario financier, mais aucun téléversement, archivage, facture obligatoire de personne morale ou exception documentaire n'a été requalifié pendant REC-02.1. Ces scénarios restent à exécuter pour une validation exhaustive de REC-02.

## 8. Tests exécutés

### Tests backend ciblés

Commande :

```text
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 \
  test/provider-contracts-b3423-lot4.test.ts \
  test/provider-remunerations-b3423-lot5.test.ts \
  test/provider-remuneration-finance-b3423-lot6.test.ts \
  test/budget-treasury-integration.test.ts
```

Résultat : **4 PASS, 0 FAIL, 0 SKIP**, durée 2,97 s.

| Contrôle | Résultat |
|---|---|
| `npm run lint` backend | PASS |
| `npm run build` backend | PASS |
| `git diff --check` avant création du présent rapport | PASS |
| santé backend Docker | healthy |
| santé frontend Docker | healthy |
| santé MySQL Docker | healthy |
| API `/api/health` | HTTP 200 |

La campagne complète REC-01/REC-02 antérieure (959 tests frontend et 1 923 tests backend) n'a pas été rejouée après la correction ciblée ; elle demeure une référence antérieure et non une preuve nouvelle REC-02.1.

## 9. Fichiers concernés

- `backend-node/src/modules/hr/hr-provider-contract.routes.ts` — correction du prédicat territorial de création de contrat ;
- `backend-node/test/provider-contracts-b3423-lot4.test.ts` — non-régression des alias territoriaux ;
- `docs/RAPPORT-REC02-1-REPRISE-AUTHENTIFIEE.md` — présent rapport.

## 10. Anomalies et risques résiduels

- correction SQL territoriale nécessaire et désormais vérifiée ;
- pas de preuve E2E exhaustive des scopes `OWN/AGENCY/CONCESSION/GLOBAL` sur plusieurs territoires ;
- GED, personne morale et exceptions documentaires non rejoués ;
- absence de course HTTP concurrente réelle sur le scénario REC-02 ;
- absence de rejeu manuel de la même clé idempotente ;
- les données fictives de recette et les neuf rôles/utilisateurs restent présents dans la base locale ;
- le mot de passe administrateur a été communiqué dans la conversation : une rotation par la procédure officielle est recommandée après la recette.

## 11. Verdict

**REC-02.1 est validé pour le déblocage de l'authentification, la préparation multi-profils et le scénario financier principal.**

Le montant net de 1 450 000 XAF a été réglé en deux décaissements réels de recette, le solde final est nul, aucun troisième mouvement n'a été créé, et les approbations indépendantes sont démontrées en base.

**REC-02 dans son intégralité reste VALIDÉ PARTIELLEMENT**, car les preuves HTTP exhaustives de tous les scopes, de la GED et de la concurrence simultanée n'ont pas été produites pendant cette reprise. Aucun commit, push, déploiement, accès VPS, changement de branche, reset, restore, stash, clean, migration structurelle ou démarrage de REC-03 n'a été effectué.

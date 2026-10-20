# REC-02.2 — Qualification complémentaire de la recette technique intégrée

Date : 20 octobre 2026  
Environnement : Docker local `lca` uniquement  
Verdict : **NON VALIDÉ — preuves territoriales et GED acquises, preuves HTTP d'idempotence et de concurrence manquantes**

Ce rapport complète REC-02 et REC-02.1. Il distingue strictement les observations navigateur/MySQL des tests statiques. Aucun secret, cookie, jeton ou code TOTP n'est reproduit.

## 1. Préparation et état de l'environnement

- `lca-backend-1`, `lca-frontend-1` et `lca-mysql-1` : `running` et `healthy` ;
- frontend réellement utilisé : `http://127.0.0.1` sur le port hôte 80 ;
- backend : port 3001 interne, non publié directement ;
- MySQL : 8.4, volume existant conservé ;
- dernière migration appliquée : `101_provider_remuneration_finance.sql` ;
- 12 comptes fictifs `REC02` présents, associés aux neuf rôles dédiés ;
- correction territoriale REC-02.1 présente dans `hr-provider-contract.routes.ts` et couverte par le test ciblé ;
- aucun conteneur, volume, schéma ou historique REC-02.1 n'a été supprimé ou réinitialisé.

## 2. Jeu territorial créé

Le jeu contient deux concessions et trois agences utiles :

| Concession | Agence | Code agence |
|---|---|---|
| LCA Concession | Agence Brazzaville | historique |
| LCA Concession | Agence REC02-2 Pointe-Noire | `REC022-PNR` |
| Concession REC02-2 Dolisie | Agence REC02-2 Dolisie | `REC022-DOL-A1` |

Trois prestataires fictifs ont été vérifiés en MySQL :

| ID | Type | Territoire |
|---:|---|---|
| 1 | personne physique | Brazzaville, concession 1 |
| 2 | personne physique | Pointe-Noire, concession 1 |
| 3 | personne morale | Dolisie, concession 3 |

La concession et l'agence de Dolisie ont été créées transactionnellement comme données métier fictives, car l'interface locale ne propose pas la création d'une concession. Les tables d'authentification n'ont pas été modifiées directement.

## 3. RBAC territorial réellement observé

Trois identités supplémentaires ont été créées par l'interface officielle et authentifiées normalement. Elles utilisent exclusivement `hr.view` et `hr.providers.view` avec les scopes indiqués.

| Profil | Scope Prestataires | Résultat de liste réel |
|---|---|---|
| REC02-2 Agence | `AGENCY` | 1 prestataire, Brazzaville uniquement |
| REC02-2 Concession | `CONCESSION` | 2 prestataires, Brazzaville et Pointe-Noire ; Dolisie absent |
| REC02-2 Global | `GLOBAL` | 3 prestataires à travers les deux concessions |

Contrôles complémentaires :

- le profil AGENCY ouvre le dossier du prestataire Brazzaville autorisé ;
- le profil AGENCY n'obtient aucune fuite des prestataires Pointe-Noire ou Dolisie dans la liste ;
- `/users` est refusé au profil GLOBAL de recette avec l'écran « Permission insuffisante » et sans appel métier ; il ne peut donc pas s'attribuer de rôle ou permission ;
- `/documents` est refusé au profil AGENCY sans `ged.view` avec le même garde préalable ;
- le code serveur refuse explicitement `OWN` pour les prestataires, contrats et rémunérations collectifs ; les tests ciblés correspondants passent.

Réserve : l'automatisation navigateur n'expose pas le jeton de session et l'API backend n'est pas publiée directement. Une tentative IDOR `GET/PATCH` par identifiant hors périmètre n'a donc pas été exécutée comme requête HTTP brute avec ce compte. L'absence en liste et les gardes UI ne sont pas requalifiés en preuve IDOR HTTP.

## 4. GED Prestataires

Un contrat personne morale a été créé :

- référence : `REC02-2-COMPANY-CTR-001` ;
- statut : `ACTIVE` ;
- modalité : `FIXED` ;
- montant : 600 000 XAF ;
- territoire : agence 4, concession 3 ;
- exigence : document `CUSTOMER_INVOICE` obligatoire à l'étape `PAYMENT`.

Le PDF fictif `REC02-2-FACTURE-FICTIVE.pdf` a été généré, rendu puis contrôlé visuellement avant dépôt. Le dépôt réel par l'interface GED est confirmé après actualisation :

- document ID 19 ;
- titre `Facture fictive REC-02.2` ;
- référence `REC02-2-FACTURE-001` ;
- type `CUSTOMER_INVOICE` / « Facture client » ;
- rattachement `provider_contract`, contrat ID 2 ;
- agence 4, concession 3 ;
- actif, non archivé ;
- taille persistée : 1 997 octets.

La conservation, les métadonnées et le rattachement sont démontrés par navigateur et MySQL. L'accès GED sans permission est refusé avant chargement du module.

Réserves : la transition de paiement n'a pas été tentée avant le dépôt, donc le blocage « justificatif manquant », puis son déblocage, ne constituent pas une preuve E2E de cette campagne. Le workflow d'exception documentaire n'a pas été exercé. Le téléchargement autorisé n'a pas été rejoué après la perte volontaire de la session administrateur lors du changement de profil.

## 5. Idempotence et concurrence HTTP

Les exigences REC-02.2 imposaient :

1. un premier décaissement HTTP avec une clé déterminée ;
2. le rejeu exact de la même requête et de la même clé ;
3. deux requêtes simultanées distinctes de 400 000 XAF sur un solde de 600 000 XAF ;
4. une preuve MySQL après chaque course.

Ces deux scénarios n'ont pas été exécutés en HTTP réel. Le formulaire génère `clientRequestId` via `crypto.randomUUID()` et masque cette valeur. Un double clic ou deux ouvertures de modale auraient produit des clés différentes et n'auraient pas démontré le rejeu demandé. Extraire ou publier les jetons de session du navigateur aurait contredit les règles de confidentialité de la mission. Aucun JWT n'a été fabriqué et aucune session n'a été injectée artificiellement.

La suite ciblée confirme les verrous, clés uniques, transactions, refus de surpaiement et snapshots, mais cette couverture n'est pas présentée comme une recette HTTP/MySQL E2E.

L'état financier REC-02.1 reste intact : exactement deux décaissements, total 1 450 000 XAF. Aucun mouvement supplémentaire n'a été créé pendant REC-02.2.

## 6. Tests et contrôles exécutés

| Contrôle | Résultat |
|---|---|
| tests frontend complets | **959 PASS**, 0 FAIL, 0 SKIP, 162 077,68 ms |
| tests backend complets ordinaires | **1 924 PASS**, 0 FAIL, 91 SKIP conditionnels, 255 269,12 ms |
| tests backend ciblés Prestataires/GED/finance/RBAC | **34 PASS**, 0 FAIL, 0 SKIP, 10 941,56 ms |
| lint frontend | PASS |
| lint backend | PASS |
| build backend | PASS |
| build frontend | PASS, 2 516 modules transformés |
| santé Docker | PASS, trois services healthy |
| preuves MySQL migrations/territoires/GED | PASS |
| `git diff --check` | PASS |
| archive officielle | intacte, SHA-256 `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc` |

La première tentative de suite frontend dans le bac à sable a échoué avant les tests car `tsx` ne pouvait pas créer son socket IPC temporaire (`EPERM`). Elle a été rejouée hors bac à sable et a produit les 959 PASS ci-dessus. La première tentative backend a subi le même contexte de sockets et a été interrompue ; seule la campagne hors bac à sable est prise en compte.

La campagne backend compte un test réussi de plus que la référence REC-01/REC-02 (1 924 contre 1 923), sans échec. Les 91 skips restent les scénarios opt-in MySQL/WSS conditionnels ; ils ne sont pas requalifiés en exécutions REC-02.2.

## 7. Anomalies et réserves

### REC02-2-001 — Instrumentation HTTP authentifiée insuffisante

- module : authentification / recette technique ;
- impact : impossibilité de rejouer une clé d'idempotence exacte et de déclencher une course contrôlée sans exposer un jeton ;
- sévérité : bloquante pour le verdict REC-02.2 ;
- correction applicative : aucune, le comportement de sécurité est attendu ;
- besoin : un compte HTTP de recette authentifiable hors navigateur ou un harnais officiel recevant les identifiants de test sans journaliser les secrets.

### REC02-2-002 — IDOR HTTP direct non démontré

- module : Prestataires / RBAC territorial ;
- résultat acquis : filtrage AGENCY/CONCESSION/GLOBAL réel et refus de module ;
- résultat manquant : codes HTTP `GET/PATCH` directs sur une ressource hors périmètre ;
- sévérité : moyenne, bloquante pour la qualification exhaustive mais sans fuite observée.

### REC02-2-003 — Workflow documentaire partiellement exercé

- dépôt, persistance, métadonnées, rattachement et refus GED sans permission : démontrés ;
- blocage avant justificatif, déblocage après dépôt et exception indépendante : non exécutés ;
- sévérité : moyenne.

## 8. Risques résiduels

- aucune preuve E2E du rejeu HTTP idempotent sur une rémunération REC-02.2 ;
- aucune preuve E2E de deux décaissements HTTP réellement simultanés ;
- aucun code HTTP d'IDOR direct multi-territorial capturé ;
- aucun scénario d'exception documentaire refusée puis approuvée ;
- les données, comptes, rôles, territoires et documents fictifs restent présents dans la base locale comme preuves de recette ;
- le secret administrateur communiqué antérieurement dans la conversation devrait être renouvelé par la procédure officielle après la campagne.

## 9. Verdict

**REC-02.2 est NON VALIDÉ.**

La recette apporte des preuves réelles nouvelles : trois scopes territoriaux sur deux concessions, absence de fuite en liste, refus d'accès aux modules non autorisés, prestataire personne morale, contrat avec exigence de paiement et dépôt GED persistant correctement rattaché. La non-régression frontend et les tests ciblés sont verts.

Le verdict ne peut toutefois pas être positif tant que les deux critères prioritaires explicitement obligatoires — rejeu HTTP réel de la même clé et course HTTP réellement simultanée — ne sont pas démontrés. Aucun contournement, affaiblissement RBAC, écriture SQL corrective, fabrication de JWT, migration, suppression de volume, réinitialisation, accès VPS, déploiement, commit, push ou changement de branche n'a été effectué. REC-03 n'a pas été démarré.

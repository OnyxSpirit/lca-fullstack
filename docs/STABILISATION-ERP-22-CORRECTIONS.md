# STABILISATION-ERP-22 Phase 1B — Corrections

Date : 12 octobre 2026  
Source de vérité : projet principal `lca-fullstack`, référence initiale `63fa2f9`  
Périmètre : correction ciblée des blocages de la Phase 1

## 1. Vulnérabilités initiales

Les audits connectés `npm audit --omit=dev` ont reproduit exactement les résultats de Phase 1 : backend, 1 critique et 3 élevées ; frontend, 1 élevée.

| Package initial | Chemin | Avis | Gravité | Exposition analysée | Correction |
|---|---|---|---|---|---|
| `proxy-addr 2.0.7` | `express 5.2.1` → `proxy-addr` | GHSA-jqcg-44mw-7w3h, usurpation IP par IPv4 mappée IPv6 | critique, CVSS 9.1 | Express utilise ce package pour `trust proxy`. La qualification utilise zéro proxy, mais les déploiements derrière proxy et les décisions fondées sur l'IP rendent la frontière réellement pertinente. | `2.0.8` |
| `engine.io 6.6.9` | `socket.io 4.8.3` → `engine.io` | GHSA-2gc4-cqfq-p2gv, DoS par désaccord de révision protocolaire | élevée, CVSS 7.5 | Le serveur expose Socket.IO. L'authentification du namespace ne supprime pas l'exposition du handshake Engine.IO à des clients réseau. | `6.6.11` |
| `express-rate-limit 8.2.1` | dépendance directe backend | GHSA-46wh-pxpv-q5gq, contournement par IPv4 mappée IPv6 | élevée, CVSS 7.5 | Utilisé directement pour les endpoints login et refresh. Le contournement affecte la protection anti-bruteforce, surtout derrière une chaîne proxy. | `8.7.1` |
| `ip-address 10.0.1` | `express-rate-limit` → `ip-address` | avis de parsing, SSRF/frontière de confiance et DoS ; le rapport agrège au niveau élevé | élevée agrégée | Les méthodes HTML/XSS ne sont pas appelées par l'ERP ; en revanche, les règles de parsing d'adresse sont dans le chemin du limiteur et ne peuvent pas être écartées sans risque. | `10.7.4`, au-delà des plages affectées signalées |
| `source-map-js 1.2.1` | Tailwind/PostCSS et chaîne jsdom | GHSA-68fv-2mgg-jv7q, blocage de boucle sur source map indexée | élevée, CVSS 7.5 | Le frontend livré est statique et ne traite pas de source map non fiable en production. L'exposition principale est la construction/CI ; la dépendance restait néanmoins dans l'arbre de production audité. | `1.2.2` |

## 2. Corrections de dépendances

Corrections compatibles et ciblées :

- `express-rate-limit` passe de `^8.2.1` à `^8.7.1` dans `backend-node/package.json` ;
- le lock backend fixe `proxy-addr 2.0.8`, `engine.io 6.6.11` et `ip-address 10.7.4` ;
- le lock frontend fixe `source-map-js 1.2.2` ;
- aucune mise à jour majeure généralisée et aucun `npm audit fix --force` ;
- les deux lockfiles restent au format npm et `npm ci` réussit depuis le nouvel export.

Preuve après correction : backend **0** vulnérabilité signalée, frontend **0** vulnérabilité signalée, dont **0 critique** et **0 élevée**. Cela prouve l'absence d'avis connu dans la base npm au moment du contrôle, pas l'absence absolue de risque logiciel.

## 3. Analyse des suites backend

Les 18 assertions initialement en échec ont été classées avant correction.

| Suite | Échecs | Classement | Cause démontrée | Correction |
|---|---:|---|---|---|
| `commercial-final-workflow.test.ts` | 1 | B — assertion obsolète | le test cherchait un ancien message d'agence ; le service protège maintenant à la fois le devis et le véhicule | assertions alignées sur `Devis hors agence` et `Véhicule rattaché à une autre agence` |
| `customers360-endpoint.test.ts` | 7 | C — fixture incorrecte | le fixture RBAC central interceptait les requêtes avant le mock local ; le rôle historique utilisé ne portait plus `customers.view` | permissions et scopes `AGENCY` explicitement fournis au fixture, sous un rôle de test sans sémantique métier |
| `ged-final-security.test.ts` | 9 | B — assertions obsolètes | les assertions décrivaient l'ancien alias et les anciens appels ; l'implémentation actuelle intersecte les scopes sur les colonnes documentaires persistées et passe par les gardes mutables | assertions adaptées aux scopes OWN/AGENCY/CONCESSION/GLOBAL et aux gardes actuels, sans supprimer aucun contrôle négatif |
| `recette-critique-02.test.ts` | 1 | B — assertion obsolète | la requête véhicule contient désormais des états et coûts supplémentaires avant `minimum_price` | assertion rendue tolérante aux colonnes additionnelles tout en exigeant verrou `FOR UPDATE`, état commercial et prix minimum |

Résultat après correction : **34/34 assertions réussies**.

La non-régression élargie a révélé une fixture supplémentaire dans `app.test.ts` : le test de priorité CRM omettait le prénom obligatoire et s'arrêtait donc avant le contrôle de priorité. Classement C, fixture incorrecte. L'ajout d'un prénom permet au test de vérifier de nouveau la règle annoncée. Aucun code métier n'a été modifié.

## 4. Préservation du RBAC et de la sécurité

- Aucun rôle métier n'a été ajouté au code applicatif.
- Aucun droit n'est attribué automatiquement par nom de rôle.
- Les tests GED continuent de vérifier les quatre scopes et le refus d'un faux Super Admin.
- Les contrôles agence, propriétaire, concession, garde mutable et dernier Super Admin restent actifs.
- Les tests du limiteur couvrent les adresses directes, X-Forwarded-For, un et deux proxies, IPv4 et IPv6.

## 5. Modifications du projet principal

Fichiers applicatifs/qualité modifiés :

- `backend-node/package.json` ;
- `backend-node/package-lock.json` ;
- `frontend/package-lock.json` ;
- cinq suites initialement concernées, plus `backend-node/test/app.test.ts` pour sa fixture CRM.

Diff applicatif avant rapports : 8 fichiers, 40 insertions et 32 suppressions. Aucune migration, route, service métier, configuration Docker historique ou donnée n'a été modifié.

## 6. Non-régression du projet principal

- backend lint/TypeScript : réussi ;
- backend build : réussi ;
- frontend lint/TypeScript : réussi ;
- frontend build : réussi, 2 488 modules ;
- quatre suites bloquantes : 34/34 ;
- sélection backend transversale : 239/239 après correction de la fixture CRM ;
- sélection frontend ciblée : 12/12 fichiers ;
- audit production backend/frontend : 0 vulnérabilité signalée.

Aucun commit, tag, push, reset, restore, stash, clean ou déploiement n'a été exécuté.


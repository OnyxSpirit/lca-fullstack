# CORR-ERP-01 — Tests et recette

## Tests ciblés Dashboard

Backend :

`node --experimental-test-module-mocks --import tsx --test test/dashboard.domain.test.ts test/dashboard-kpi-corrections.test.ts test/dashboard-crm-scope.test.ts test/dashboard-search-transversal.test.ts`

Résultat : **4 fichiers réussis, 38 cas couverts**. Sont couverts : variation, quatre semaines vide/pleine, statuts facture/vente, date d'avoir, bornes, séries calendaires, filtres métier, permissions et scopes de recherche.

Frontend :

`node --import tsx --test test/dashboard-navigation-search-transversal.test.ts test/dashboard-corrections.test.ts`

Résultat : **2 fichiers réussis, 19 cas couverts**. Sont couverts : filtres serveur, couleurs, erreur/retry, liens clavier, libellé, responsive de contrat et permissions partielles.

## Suites liées

- Billing/Reporting/Atelier/Livraison backend : 16 fichiers réussis sur 21. Les cinq échecs reproduits sont hors changement : quatre attentes historiques/baseline et un groupe Supertest empêché d'ouvrir un port dans le sandbox.
- Suites liées frontend : 14 fichiers réussis sur 16 lors du lancement parallèle. Rejoué seul, `delivery-candidate.behavior.test.ts` réussit; `billing-stabilization.test.ts` échoue sur une regex historique sans lien avec le Dashboard.

## Lint et builds

| Contrôle | Résultat |
|---|---|
| Backend `npm run lint` | réussi |
| Frontend `npm run lint` | réussi |
| Backend `npm run build` | réussi |
| Frontend `npm run build` | réussi |

## Suites globales

| Suite | Réussis | Échecs | Référence historique | Régression |
|---|---:|---:|---:|---|
| Backend | 166/207 | 41 | 45 | aucune hausse |
| Frontend | 127/150 | 23 | 38 | aucune hausse |

La commande frontend standard via le binaire `tsx` a d'abord rencontré `EPERM` sur son socket IPC sandbox. Le même ensemble a été exécuté avec `node --import tsx --test`, sans changer les tests.

## Recette navigateur

Un navigateur réel a été utilisé sur `http://127.0.0.1:3001/dashboard`.

Le contrôle a démontré que le port 3001 sert encore l'ancien bundle : ancien libellé « Dossiers non annulés… », OR clôturés/annulés et livraison signée toujours visibles. Le bundle corrigé contient bien les nouveaux éléments et son build réussit, mais le lancement demandé sur 3001 a répondu « Port 3001 is in use » puis a tenté 3002. Cette instance secondaire a été immédiatement arrêtée afin de respecter l'exigence du port 3001.

En conséquence, **aucun résultat visuel post-correction n'est inventé** : la validation 1440/1024/768/375 du nouveau bundle reste à rejouer lorsque le service 3001 aura été redémarré sur ce workspace. La recette pré-correction de l'audit reste la référence, et A12 demeure en attente de confirmation visuelle.

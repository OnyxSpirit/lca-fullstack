# 13 — Registre des anomalies

| ID | Gravité | Module | Reproduction | Impact | Correction proposée, non appliquée |
|---|---|---|---|---|---|
| AGAT-001 | Majeure | Paramètres | Ouvrir `/settings` avec viewport 375×812 ; largeur utile 360, scroll 453 | Défilement horizontal et ergonomie mobile dégradée | Identifier le conteneur à largeur minimale, appliquer `min-w-0`, wrapping/overflow local et revalider les dix onglets. |
| AGAT-002 | Mineure | Activité | Ouvrir le premier événement GED générique « Opération enregistrée » | Le détail n'ajoute aucune information métier au-delà de la ligne | Enrichir la présentation/fallback avec entité, identifiant, action brute et champs non sensibles disponibles. |
| AGAT-003 | Donnée historique | Activité | Requête lecture seule sur `audit_logs` | 22/46 événements sans contexte territorial ; filtrage territorial moins probant | Conserver le marquage legacy et prévoir un plan documenté de qualification seulement si une source fiable existe. |
| AGAT-004 | Couverture | Transverse | Lancer les tests MySQL avec le nom réel | Garde-fou rejette la base `e2e`, donc preuve E2E absente | Provisionner une base jetable dont le nom respecte le garde-fou, sans affaiblir celui-ci. |

Aucun correctif n'a été appliqué.


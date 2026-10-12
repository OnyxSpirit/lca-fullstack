# ERP-18 — Matrice d'exécution

| ID scénario | Profil | Utilisateur | Agence | Concession | Permissions/scope | Module | Action | Attendu | Obtenu | Preuve | Type | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RBAC-01 | Super Admin | recette.admin | principale | LCA | GLOBAL | CRM | afficher Toute l'équipe | filtre et données | 11 prospects | navigateur 4176 | navigateur | VALIDÉ |
| RBAC-02 | 12 profils métier | comptes recette actifs | A1–A4 | LCA | dynamiques | Auth | login + `/auth/me` | 200 | 12 × 200 | audit API sans secret | API | VALIDÉ |
| RBAC-03 | sans session | — | — | — | aucune | Pièces | accès direct | 401 | 401 | `GET /parts` | API | VALIDÉ |
| RBAC-04 | profils non-Pièces | Direction à Technicien | A1–A4 | LCA | hors Pièces | Pièces | listes et mutations invalides | 403 | 403 | matrice API | API | VALIDÉ |
| PARTS-01 | Magasinier | recette.magasinier | Support | LCA | Pièces AGENCY | Pièces | quatre listes | 200 | 4 × 200 | matrice API | API | VALIDÉ |
| PARTS-02 | Responsable pièces | recette.responsable_pieces | principale | LCA | Pièces CONCESSION | Pièces | quatre listes | 200 | 4 × 200 | matrice API | API | VALIDÉ |
| PARTS-03 | Magasinier | recette.magasinier | Support | LCA | réservation AGENCY sans service.update | Atelier | réserver/consommer | opérateur métier fonctionnel | 403 | routes et permissions persistées | API + audit | ÉCHEC |
| PARTS-04 | Technicien | recette.technicien | Sud | LCA | OWN, sans Pièces | Atelier | réserver/consommer | refus | 403 | matrice API | API | VALIDÉ |
| PARTS-05 | profils opposés | sessions secondaires | A1–A4 | LCA | réels | Pièces | boutons/routes | conforme aux droits | sessions absentes | procédure R2 | navigateur | NON EXÉCUTÉ |
| HIST-CRM | Super Admin | recette.admin | principale | LCA | GLOBAL | CRM | Toute l'équipe | liste complète | filtre actif, 11 | navigateur | navigateur | VALIDÉ |
| HIST-STOCK | Super Admin | recette.admin | principale | LCA | GLOBAL | Stock | filtres/actifs | filtres, vendus exclus | 6 actifs, filtres présents | navigateur | navigateur | VALIDÉ |
| HIST-VIN | — | — | — | — | — | Stock | validation 17 caractères | rejet sinon | 37 tests frontend ciblés verts | automatisé | VALIDÉ |
| HIST-SALE | — | — | — | — | — | Vente | terminalité annulation | transitions aval refusées | code, tests et ventes 4/7 | audit + automatisé | VALIDÉ |
| HIST-SHOW | — | — | — | — | — | Showroom | compteurs/colonnes | cohérents | 12 tests backend verts | automatisé | VALIDÉ |
| HIST-GED-V | Super Admin | recette.admin | principale | LCA | GED GLOBAL | Véhicule | associer document | action présente | composant et tests verts | audit + automatisé | VALIDÉ |
| GED-01 | — | — | — | — | — | GED | reprise idempotente | zéro doublon | test isolé vert | automatisé | VALIDÉ |
| GED-02 | — | — | — | — | — | GED | suite sécurité historique | verte | 28/38, 10 échecs | automatisé | PARTIEL |
| MC-01 | — | — | — | unique | — | transversal | isolation inter-concessions | 2 concessions | une seule | audit DB | BLOQUÉ |

Les contrôles API de mutation ont ciblé des identifiants inexistants. Aucun scénario n'est compté à la fois comme navigateur et API.

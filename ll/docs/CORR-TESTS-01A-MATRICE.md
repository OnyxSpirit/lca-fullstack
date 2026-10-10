# CORR-TESTS-01A — Matrice de recette

| ID | Préconditions / étapes | Attendu | Obtenu / preuve | Verdict |
|---|---|---|---|---|
| CTA-01 | Lire middleware `authenticate` | Chemin JWT réel identifié | `sid`, `refresh_tokens`, utilisateur actif, RBAC relu | RÉUSSI |
| CTA-02 | Lire service auth et schéma | Session persistée identifiée | id, user_id, hash, expiration, révocation | RÉUSSI |
| CTA-03 | Inventorier signatures JWT | Fixtures concernées connues | 9 familles migrées | RÉUSSI |
| CTA-04 | Créer helper commun | Session active déterministe | Helper ajouté | RÉUSSI |
| CTA-05 | JWT-01 | Session active acceptée | Vert | RÉUSSI |
| CTA-06 | JWT-02 | Sans session refusé | 401, vert | RÉUSSI |
| CTA-07 | JWT-04 | Session expirée refusée | 401, vert | RÉUSSI |
| CTA-08 | JWT-03 | Session révoquée refusée | 401, vert | RÉUSSI |
| CTA-09 | JWT-05 | JWT expiré refusé | 401, vert | RÉUSSI |
| CTA-10 | JWT-06 | Signature invalide refusée | 401, vert | RÉUSSI |
| CTA-11 | JWT-07 | Session autre utilisateur refusée | 401, vert | RÉUSSI |
| CTA-12 | JWT-08 | Permission absente = 403 | Vert | RÉUSSI |
| CTA-13 | JWT-09 | Scope non promu | AGENCY conservé, vert | RÉUSSI |
| CTA-14 | JWT-10 | Révocation immédiate | 401 après révocation, vert | RÉUSSI |
| CTA-15 | Sessions UUID distinctes | Pas d’état partagé implicite | UUID par émission | RÉUSSI |
| CTA-16 | Rejouer fixtures historiques | Plus de 401 de fixture | Aucun `401 !==` dans les échecs détaillés | RÉUSSI |
| CTA-17 | Atteindre RBAC | 403/contrôleur plutôt que 401 | Nouvelles assertions métier observées | RÉUSSI |
| CTA-18 | Isoler `mock.module` | Cause exacte | Drapeau expérimental Node manquant | RÉUSSI |
| CTA-19 | Adapter commande | Couverture conservée | Script Node + `--experimental-test-module-mocks` | RÉUSSI |
| CTA-20 | Test isolé révocation | Tous scénarios verts | 6/6 | RÉUSSI |
| CTA-21 | Tests backend ciblés | Mesure réelle | 184 tests, 103 réussis, 81 révélés lors première passe | RÉUSSI AVEC RÉSERVES |
| CTA-22 | Tests frontend ciblés | Pas de modification frontend | Non requis; globale exécutée | NON APPLICABLE |
| CTA-23 | Globale backend | Remesure | 1703/1525/105/73 | RÉUSSI AVEC RÉSERVES |
| CTA-24 | Globale frontend | Pas de régression | 775/736/39; +1 intermittent | ÉCHOUÉ |
| CTA-25 | Finance | Aucun calcul modifié | Globale rejouée; MySQL ciblé non activé | BLOQUÉ |
| CTA-26 | Typage backend | Vert | `npm run lint` vert | RÉUSSI |
| CTA-27 | Build backend | Vert | `npm run build` vert | RÉUSSI |
| CTA-28 | Lint backend | Vert | TypeScript sans erreur | RÉUSSI |
| CTA-29 | Typage frontend | Vert | `npm run lint` vert | RÉUSSI |
| CTA-30 | Build frontend | Vert | Vite vert, 31,13 s | RÉUSSI |
| CTA-31 | Lint frontend | Vert | TypeScript sans erreur | RÉUSSI |
| CTA-32 | Comparer signatures | 401 distingués des nouveaux écarts | 182 → 105; aucun ancien 401 détaillé | RÉUSSI |
| CTA-33 | Lister nouveaux écarts | Pas de masquage | 403/400/structure documentés pour 01B | RÉUSSI |
| CTA-34 | Vérifier permissions | Aucun élargissement | Permissions bornées; aucun bypass Super Admin | RÉUSSI |
| CTA-35 | État Git final | Seulement périmètre + préexistant | `git status`/`diff --check` contrôlés | RÉUSSI |


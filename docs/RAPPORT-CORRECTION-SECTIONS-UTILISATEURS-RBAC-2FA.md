# Rapport de correction — Sections Utilisateurs, RBAC et Centre 2FA

Date : 16 octobre 2026  
Périmètre : frontend ERP LCA uniquement

## 1. Structure historique identifiée

Le module historique utilisait un seul bouton `Utilisateurs & RBAC` dans la sidebar. Ce bouton ouvrait `UsersManagementPage` sur `/users`. La page présentait deux sections internes sous forme d'onglets : `Collaborateurs` et `Matrice RBAC`.

La précédente correction avait transformé ce bouton en groupe déroulant comprenant trois liens. Cette interprétation modifiait l'architecture fonctionnelle et le comportement historique attendus.

## 2. Correction de la sidebar

La sidebar contient de nouveau un seul élément `Utilisateurs & RBAC` pointant vers `/users`. Aucun sous-menu, bouton d'expansion ou lien enfant n'est rendu.

Le bouton reste visuellement actif sur `/users` et `/security/2fa`. Il est visible lorsqu'au moins une section interne est autorisée :

- `users.view` pour les collaborateurs ;
- `roles.view` pour la matrice RBAC ;
- une permission effective du Centre 2FA pour la section de sécurité.

Un utilisateur sans aucune de ces permissions ne voit pas l'entrée.

## 3. Troisième section interne

La page historique `UsersManagementPage` conserve ses deux onglets et reçoit un troisième onglet `Centre de sécurité 2FA`. Le composant `TwoFactorSecurityCenterPage` existant est réutilisé en mode intégré ; aucune logique métier 2FA n'a été dupliquée.

Chaque onglet est affiché uniquement avec sa permission propre. Les requêtes collaborateurs et agences sont explicitement désactivées lorsque `users.view` est absent, afin qu'un utilisateur possédant uniquement une permission 2FA ne déclenche aucun appel non autorisé vers ces ressources.

Le design historique des onglets est conservé. L'ajout de `overflow-x-auto` maintient leur accessibilité sur petit écran.

## 4. Routes et compatibilité

- `/users` ouvre la page principale et sélectionne la première section autorisée.
- `/users?tab=users` ouvre les collaborateurs si autorisés.
- `/users?tab=matrix` ouvre la matrice RBAC si autorisée.
- `/security/2fa` rend la même page principale avec la section Centre 2FA sélectionnée.
- `/security/2fa?section=mine` conserve le paramètre et ouvre `Mes appareils`.
- Les anciennes routes `/security/devices` et `/security/devices/me` conservent leurs redirections vers les sections du centre.

La navigation depuis la route 2FA vers les deux sections historiques revient explicitement sur `/users`, ce qui évite toute boucle ou ambiguïté de sélection.

## 5. Correction « Mes appareils »

La cause confirmée était l'inférence du mode depuis `useLocation().pathname.endsWith('/me')`. Avec `/security/2fa?section=mine`, cette condition était fausse et activait le mode administratif.

`TrustedDevicesPage` reçoit maintenant une propriété explicite `mode="personal"` ou `mode="administrative"`. L'espace `Mes appareils` l'appelle en mode personnel.

En mode personnel :

- la lecture utilise `/auth/2fa/devices/me` ;
- la révocation d'un appareil utilise `/auth/2fa/devices/me/:id` ;
- la révocation du navigateur courant conserve `/auth/2fa/devices/me/current` ;
- les permissions personnelles reposent sur `auth.2fa.view` ;
- les filtres agence et concession ainsi que les identités administratives ne sont pas affichés.

En mode administratif, les endpoints, filtres, pagination, scopes, permissions de révocation et mécanisme de step-up existants restent inchangés.

## 6. Fichiers modifiés

- `frontend/src/App.tsx`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/api/userHooks.ts`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/modules/users/UsersManagementPage.tsx`
- `frontend/src/modules/auth/TwoFactorSecurityCenterPage.tsx`
- `frontend/src/modules/auth/TrustedDevicesPage.tsx`
- `frontend/src/modules/auth/TrustedDevicesPanel.tsx`
- `frontend/test/two-factor-security-navigation.test.ts`
- `frontend/test/two-factor-security-center.test.ts`
- `frontend/test/trusted-device-management.test.ts`
- `docs/RAPPORT-CORRECTION-SECTIONS-UTILISATEURS-RBAC-2FA.md`

Aucun backend, endpoint, rôle, permission, scope, fichier Docker, migration ou donnée n'a été modifié.

## 7. Tests exécutés

| Contrôle | Résultat |
|---|---|
| Lint TypeScript (`npm run lint`) | PASS |
| Build Vite (`npm run build`) | PASS — 2 505 modules transformés |
| Navigation, centre 2FA, gouvernance, appareils et RBAC ciblés | PASS — 6/6 fichiers |
| `git diff --check` | PASS |
| Test transversal `dynamic-permissions.test.ts` | 7/8 assertions réussies ; échec hors périmètre sur une assertion RH dans `HrAdministrationPage.tsx` |

Les tests ciblés vérifient notamment l'unicité du bouton de sidebar, l'absence de sous-menu, les trois sections internes, le garde combiné, l'absence d'appels utilisateurs pour un profil 2FA seul, le mode personnel explicite, l'absence de détection par pathname et la séparation des endpoints personnels/administratifs.

## 8. Recette navigateur et réserves

Aucune recette navigateur authentifiée n'a été déclarée PASS : les identités de recette couvrant les profils `users.view`, `roles.view`, permission 2FA seule et sans permission n'étaient pas disponibles, et aucune reconstruction Docker n'était autorisée dans cette mission. Le build et les tests ciblés valident le code livré, mais la vérification visuelle réelle reste à exécuter dans un environnement intégrant ces sources.

## Conclusion

- **La page historique est conservée.**
- **Collaborateurs, Matrice RBAC et Centre de sécurité 2FA sont trois sections internes à cette page.**
- **La sidebar contient un seul bouton `Utilisateurs & RBAC`.**
- **L'onglet `Mes appareils` utilise maintenant explicitement le mode personnel.**
- **Les permissions et scopes RBAC existants sont préservés sans élargissement.**

Aucun commit, push ou déploiement n'a été effectué.

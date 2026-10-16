# Rapport d'implémentation — Centre de sécurité 2FA unifié

## 1. Composants réutilisés

Le lot 5 réunit les fonctions existantes sans créer un second système 2FA :

- `TwoFactorSecuritySettingsPage` pour les paramètres globaux ;
- `TwoFactorRolePolicies` pour les politiques des rôles dynamiques ;
- `TwoFactorUserAdministration` pour les actions individuelles ;
- `TrustedDevicesPanel` et `TrustedDevicesPage` pour les appareils administratifs et personnels ;
- `StrongAuthenticationModal` pour le step-up ;
- `useTwoFactorActions` et les clés TanStack Query `auth/2fa` pour les mutations et invalidations.

## 2. Nouveaux composants

- `TwoFactorSecurityCenterPage.tsx` : page centrale, navigation par onglets et vue d'ensemble ;
- `TwoFactorUsersPanel.tsx` : liste 2FA individuelle paginée et territorialisée, indépendante de `users.view` ;
- nouveaux hooks `useTwoFactorOverview` et `useTwoFactorManagedUsers`.

## 3. Routes concernées

Frontend :

- `/security/2fa` devient l'unique centre de sécurité ;
- `/security/devices` redirige vers `?section=devices` ;
- `/security/devices/me` redirige vers `?section=mine`.

Backend :

- `GET /api/auth/2fa/security-center/overview` ;
- `GET /api/auth/2fa/security-center/users`.

Toutes les routes métier existantes des lots 1 à 4 restent utilisées et inchangées dans leur rôle.

## 4. Permissions et scopes

L'entrée du centre est autorisée dès qu'au moins une permission 2FA effective est détenue. Chaque onglet et chaque action restent contrôlés séparément :

| Espace | Permission | Scope |
|---|---|---|
| Paramètres | `auth.2fa.settings.view/manage` | GLOBAL |
| Politiques de rôle | `auth.2fa.policy.manage` | GLOBAL |
| Politiques individuelles | `auth.2fa.users.view/enforce/reset` | AGENCY, CONCESSION, GLOBAL |
| Appareils administratifs | `auth.2fa.devices.view/revoke` | AGENCY, CONCESSION, GLOBAL ; OWN masqué pour la vue administrative |
| Mes appareils | `auth.2fa.view`, actions selon droits existants | OWN |

Les agrégats et les listes appliquent le scope dans la requête SQL avant `COUNT`, pagination ou agrégation. Aucun jeu global n'est transmis au frontend pour y être filtré.

## 5. Structure du centre

La page contient six espaces : vue d'ensemble, paramètres généraux, politiques par rôle, politiques individuelles, appareils de confiance et mes appareils. Les onglets non autorisés sont absents. Les listes comportent recherche, pagination 10/20/50, chargement, erreur et état vide.

La vue d'ensemble n'affiche que les indicateurs effectivement autorisés : utilisateurs actifs/obligés, appareils actifs/expirés/révoqués, durée du step-up et état de la confiance appareil. Les données indisponibles ne sont ni simulées ni remplacées par des valeurs fictives.

## 6. Navigation

Les trois anciennes entrées du menu ont été remplacées par « Centre de sécurité 2FA ». Les anciennes URLs restent fonctionnelles par redirection vers le bon onglet. Le parcours personnel d'activation/désactivation du facteur dans le menu utilisateur est conservé.

## 7. Contrôles backend

- refus du centre en l'absence de toute permission 2FA ;
- permission dédiée `auth.2fa.users.view` pour la liste individuelle, sans dépendance à `users.view` ;
- prédicats SQL AGENCY/CONCESSION/GLOBAL pour les utilisateurs ;
- prédicats OWN/AGENCY/CONCESSION/GLOBAL pour les appareils ;
- paramètres retournés uniquement avec `settings.view GLOBAL` ;
- aucune donnée secrète, empreinte, cookie, jeton ou code de récupération dans les réponses.

## 8. Step-up

Les composants existants conservent `assertRecentStrongAuthentication` pour les paramètres, politiques, actions individuelles et révocations tierces. La modal existante est réutilisée. Une mutation sensible n'est jamais rejouée automatiquement après confirmation : l'utilisateur doit relancer explicitement l'action.

## 9. Cache et synchronisation

Les mutations 2FA invalident la racine `auth/2fa`. Les révocations invalident en plus la vue d'ensemble afin d'actualiser les compteurs. Les requêtes d'un onglet non autorisé ou non affiché ne sont pas déclenchées. Les politiques de rôle utilisent leur route dynamique, qui relit les rôles actifs ; un nouvel accès ou une actualisation réintègre donc les rôles nouvellement créés.

## 10. Tests exécutés et résultats

- Backend lint TypeScript : réussi.
- Backend build : réussi.
- Frontend lint TypeScript : réussi.
- Frontend build Vite : réussi.
- Tests ciblés backend lots 1 à 5 : 6 fichiers réussis sur 6.
- Tests ciblés frontend : centre, authentification, gouvernance et appareils réussis.
- Tests spécifiques du centre : permissions indépendantes, routes, scopes, compteurs, pagination, navigation, réutilisation et cache.
- `git diff --check` : vérifié en fin de mission.

## 11. Anomalies résiduelles

- Aucun test MySQL réel ni recette navigateur n'a été exécuté : les migrations 088, 089 et 090 ne devaient pas être appliquées et Docker ne devait pas être redémarré.
- La suite globale conserve les anomalies historiques de mocks RBAC déjà documentées lors du lot 4 ; aucun module RH n'a été modifié pour les contourner.
- La vue d'ensemble ne fournit volontairement aucun indicateur lorsqu'aucune source autorisée n'est disponible.

## 12. Prérequis du lot 6

Avant une recette réelle :

1. appliquer les migrations 088, 089 et 090 uniquement sur une base isolée ou de recette après autorisation ;
2. reconstruire l'environnement local uniquement après autorisation ;
3. tester les matrices de permissions avec des comptes GLOBAL, CONCESSION, AGENCY et OWN ;
4. vérifier les compteurs sur des données réelles et la protection du Super Administrateur ;
5. effectuer une recette clavier, responsive et navigateur des six onglets.

## Verdict

Le centre unifié est implémenté et compile. Il réutilise les lots 1 à 4, supprime les entrées de navigation redondantes et applique les permissions effectives à chaque espace sans réserver l'interface au rôle Super Administrateur. Aucune migration, donnée métier, configuration Docker ou infrastructure distante n'a été modifiée.

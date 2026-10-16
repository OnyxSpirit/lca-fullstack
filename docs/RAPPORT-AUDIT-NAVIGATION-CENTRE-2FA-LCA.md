# Rapport d'audit — Navigation du Centre de sécurité 2FA

Date : 16 octobre 2026  
Périmètre : frontend ERP LCA, navigation et RBAC dynamique uniquement

## 1. État initial

La route `/security/2fa` existait déjà dans `frontend/src/App.tsx`. Elle était protégée par un garde autorisant l'accès lorsqu'au moins une permission `auth.2fa.*` utile au centre était effective. Les anciennes routes d'appareils redirigeaient déjà vers les sections correspondantes du centre.

Le Centre de sécurité était également accessible depuis le menu du profil utilisateur. En revanche, la sidebar ne contenait qu'un lien plat `Utilisateurs & RBAC` vers `/users`, affiché exclusivement avec `users.view`. Elle ne déclarait ni groupe parent ni sous-menu vers le Centre de sécurité. Par conséquent, un utilisateur possédant uniquement une permission 2FA pouvait ouvrir directement le centre, mais ne disposait d'aucune entrée correspondante dans la navigation principale.

Le composant du centre conservait bien six espaces internes via le paramètre `section` : vue d'ensemble, paramètres généraux, politiques par rôle, politiques individuelles, appareils de confiance et mes appareils. Aucun de ces espaces n'était dupliqué dans la sidebar.

## 2. Cause exacte des anomalies

- La sidebar ne gérait que des liens plats filtrés par `canNavigateWithPermissions`.
- La route `/security/2fa` n'appartient volontairement à aucun module principal et ne pouvait donc pas être rendue par ce filtrage modulaire.
- Le parent `Utilisateurs & RBAC` dépendait directement de `users.view`, ce qui masquait toute l'arborescence aux profils ayant uniquement des permissions 2FA.
- L'écran `/users` utilisait un état local pour ses onglets ; un lien direct vers la matrice RBAC ne pouvait pas sélectionner cet onglet.
- Le Centre de sécurité utilisait un titre local sans breadcrumb alors que le projet fournit déjà `PageHeader`.

## 3. Décision et correction

L'intégration initiale était incomplète. Une correction ciblée a été appliquée sans créer de nouvelle route métier ni de nouveau module principal :

- transformation de l'unique entrée `Utilisateurs & RBAC` en groupe repliable ;
- sous-entrées conservant les libellés existants : `Collaborateurs`, `Matrice RBAC`, `Centre de sécurité 2FA` ;
- affichage du parent si au moins une sous-entrée est autorisée et suppression automatique des groupes vides ;
- développement automatique du parent sur `/users` et `/security/2fa`, y compris après saisie directe de l'URL ;
- état actif distinct selon le chemin et le paramètre `tab` ;
- fermeture du drawer mobile après sélection d'une sous-entrée ;
- sélection adressable des onglets utilisateurs avec `?tab=users` et `?tab=matrix` ;
- breadcrumb `Utilisateurs & RBAC > Centre de sécurité 2FA` via le composant existant `PageHeader` ;
- centralisation de la liste des permissions ouvrant le Centre de sécurité, réutilisée par le garde, le menu de profil et la sidebar.

## 4. Vérification RBAC

Le rattachement visuel ne modifie aucune permission backend et n'accorde aucun accès supplémentaire.

- Une permission `auth.2fa.settings.view` suffit à afficher le parent et le centre, sans `users.view`.
- Une permission `auth.2fa.devices.view` suffit également ; les limitations de scope restent appliquées dans la page.
- `users.view` sans permission 2FA affiche les collaborateurs mais masque le centre.
- La matrice RBAC n'est affichée que si `users.view` et `roles.view` sont présents.
- Sans permission sur aucune sous-section, le groupe n'est pas affiché.
- Aucun contrôle n'est fondé sur le nom d'un rôle.

La route `/security/2fa` conserve son garde indépendant. Les contrôles internes des six espaces restent inchangés.

## 5. Fichiers concernés par cette correction

- `frontend/src/navigation/permissions.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/modules/users/UsersManagementPage.tsx`
- `frontend/src/modules/auth/TwoFactorSecurityCenterPage.tsx`
- `frontend/test/two-factor-security-navigation.test.ts`
- `docs/RAPPORT-AUDIT-NAVIGATION-CENTRE-2FA-LCA.md`

Les autres modifications locales présentes dans le dépôt ont été préservées. Aucun fichier backend, migration, Compose, secret ou archive de livraison n'a été modifié dans cette mission.

## 6. Tests exécutés

| Contrôle | Résultat |
|---|---|
| `npm run lint` | Réussi |
| `npm run build` | Réussi, 2 505 modules transformés |
| Tests ciblés navigation/centre/gouvernance/appareils (5 fichiers) | 5/5 réussis |
| Nouveau test RBAC/navigation | Réussi pour toutes les permissions listées et pour les cas sans permission 2FA |
| Suite frontend complète avec `node --import tsx --test test/**/*.test.ts` | 139/172 réussis ; 33 échecs hors périmètre dans des fichiers non modifiés par cette correction |
| `git diff --check` | Réussi |

Le script `npm test` n'a pas pu initialiser le serveur IPC de `tsx` dans le bac à sable (`EPERM` sur `/tmp/tsx-1000/19.pipe`). La même suite a donc été lancée directement avec le chargeur Node `--import tsx`. Les échecs restants concernent notamment des assertions historiques dans les domaines trésorerie, GED, RH et garantie ; l'exécution isolée de `navigation.test.ts` confirme par exemple une assertion préexistante sur `NewRepairOrderModal.tsx`, sans rapport avec cette intégration.

## 7. Recette navigateur et réserves

La recette navigateur authentifiée n'a pas été déclarée réussie : aucun compte de recette couvrant les profils RBAC A à D n'a été fourni, et le code corrigé n'a pas été reconstruit dans Docker, conformément aux interdictions de la mission. Les comportements de navigation, d'URL directe, d'état actif, de breadcrumb et de filtrage RBAC sont couverts par le build et les tests ciblés, mais restent à confirmer visuellement dans un environnement intégrant ce code.

Les six espaces internes n'ont pas été modifiés. La réserve fonctionnelle déjà présente dans le travail local concernant le rendu de « Mes appareils » ne relève pas de cette correction de navigation.

## Conclusion

**INTÉGRATION CORRIGÉE**

Le Centre de sécurité 2FA est désormais rattaché visuellement et fonctionnellement à `Utilisateurs & RBAC`, tout en conservant `/security/2fa`, ses permissions dynamiques propres, ses scopes et ses six espaces internes.

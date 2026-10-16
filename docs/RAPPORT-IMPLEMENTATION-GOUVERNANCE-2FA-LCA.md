# Rapport d’implémentation — Gouvernance et paramètres 2FA

Date : 16 octobre 2026  
Périmètre : lot 2, gouvernance globale 2FA et durée dynamique du step-up.  
Statut : implémenté sans application des migrations ni modification de la base métier.

## 1. Fichiers modifiés

- `backend-node/database/migrations/089_two_factor_security_governance.sql` ;
- `backend-node/src/modules/rbac/permission-scope-policy.ts` ;
- `backend-node/src/modules/auth/two-factor-security-settings.ts` ;
- `backend-node/src/modules/auth/two-factor.service.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.service.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.routes.ts` ;
- `backend-node/test/two-factor-governance.test.ts` ;
- `backend-node/test/strong-authentication.test.ts` ;
- `frontend/src/api/twoFactorHooks.ts` ;
- `frontend/src/modules/auth/TwoFactorSecuritySettingsPage.tsx` ;
- `frontend/src/App.tsx` ;
- `frontend/src/components/layout/Header.tsx` ;
- `frontend/test/two-factor-governance.test.ts`.

Les fichiers locaux du lot 1 ont été conservés. Aucun commit, reset, stash, clean ou changement de branche n’a été effectué.

## 2. Permissions ajoutées

| Permission | Usage |
|---|---|
| `auth.2fa.settings.view` | Consultation de la gouvernance globale 2FA |
| `auth.2fa.settings.manage` | Modification de la gouvernance globale 2FA |
| `auth.2fa.devices.view` | Préparation de la consultation des appareils du lot 3/4 |
| `auth.2fa.devices.revoke` | Préparation de la révocation des appareils du lot 3/4 |

Aucune permission générique sensible n’a été créée. Le code applicatif ne déduit aucun droit du nom d’un rôle. Seul l’amorçage migratoire cible le véritable rôle système par la double condition `code='SUPER_ADMIN' AND is_system=TRUE`.

## 3. Scopes autorisés

- `auth.2fa.settings.view` : `GLOBAL` uniquement ;
- `auth.2fa.settings.manage` : `GLOBAL` uniquement ;
- `auth.2fa.devices.view` : `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL` ;
- `auth.2fa.devices.revoke` : `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.

Ces règles sont déclarées dans le référentiel central `permission-scope-policy.ts`. Le catalogue des permissions réutilise ce référentiel pour afficher les scopes attribuables et `assertDelegablePermissions()` refuse les scopes incompatibles lors de la création ou modification d’un rôle dynamique.

## 4. Migration 089

La migration additive :

- insère ou actualise les métadonnées des quatre permissions ;
- attribue uniquement ces permissions, avec scope `GLOBAL`, au rôle système initial ;
- insère les quatre paramètres globaux avec leurs valeurs par défaut uniquement lorsqu’ils sont absents ;
- préserve toute valeur de paramètre déjà présente ;
- ne supprime ni permission, rôle, attribution ou donnée.

La migration 088 n’a pas été modifiée. Les migrations 088 et 089 n’ont pas été appliquées à la base métier.

## 5. Paramètres disponibles

| Clé persistée | Type | Défaut | Validation effective |
|---|---:|---:|---|
| `security.2fa.trusted_devices.enabled` | booléen | `false` | strictement booléen |
| `security.2fa.trusted_devices.duration_days` | entier | `7` | 1 à la durée maximale configurée |
| `security.2fa.trusted_devices.max_duration_days` | entier | `30` | 1 à 30 |
| `security.2fa.strong_auth.duration_minutes` | entier | `10` | 1 à 30 |

Le plafond absolu de 30 jours est codé comme invariant. Une valeur corrompue ou modifiée directement en base est ramenée au fallback sûr ; la durée de confiance effective ne peut jamais dépasser le plafond validé. Les valeurs manquantes, non typées ou hors limites utilisent les défauts sûrs à la lecture.

L’activation des appareils est uniquement un paramètre préparatoire. Aucun code de connexion ne le consulte : il ne permet donc aucun contournement TOTP avant le lot 3.

## 6. Contrôles backend et API

Endpoints :

- `GET /api/auth/2fa/security-settings` : permission `auth.2fa.settings.view` et scope exact `GLOBAL` ;
- `PUT /api/auth/2fa/security-settings` : permission `auth.2fa.settings.manage`, scope exact `GLOBAL` et step-up récent.

La lecture ne demande jamais la permission de modification. Les entrées du PUT sont contrôlées par type, caractère entier, minimum, maximum et relation durée/plafond. Les erreurs de validation et de scope sont structurées. La sauvegarde globale est transactionnelle et auditée sans matériel secret.

Aucune clé de chiffrement, clé JWT, valeur TOTP, code de récupération ou jeton de session n’est exposé.

## 7. Frontend

Une route minimale dédiée `/security/2fa` a été ajoutée. Elle est gardée exclusivement par `auth.2fa.settings.view`, sans dépendance à `roles.view` ou `settings.view`. Un lien apparaît dans le menu utilisateur pour les détenteurs de cette permission.

La page gère :

- chargement et erreur de lecture ;
- consultation seule pour un utilisateur sans `settings.manage` ;
- bornes HTML et validation locale ;
- confirmation explicite de sauvegarde ;
- erreur backend ;
- déclenchement de la modal de step-up ;
- absence de rejeu automatique après le step-up : l’utilisateur relance explicitement la sauvegarde.

## 8. Intégration du step-up

Le contrôle du lot 1 charge désormais `security.2fa.strong_auth.duration_minutes` depuis la source globale fiable. Le fallback est 10 minutes et les bornes de lecture restent 1 à 30 minutes, y compris si la base contient une valeur non conforme.

La comparaison reste exécutée en UTC dans MySQL. Le refresh JWT ne modifie toujours pas `strong_auth_at`. Aucun paramètre ou futur appareil de confiance n’est assimilé à une authentification renforcée.

## 9. Tests exécutés

| Validation | Résultat |
|---|---|
| Backend TypeScript/lint | Réussi |
| Backend build | Réussi |
| Tests gouvernance, step-up, 2FA et RBAC central | 4 fichiers réussis |
| Frontend TypeScript/lint | Réussi |
| Frontend build | Réussi |
| Tests frontend gouvernance et 2FA | Réussis |
| `git diff --check` | Réussi |

Les tests vérifient la migration additive, les quatre permissions, les scopes centraux, la séparation lecture/écriture, le scope GLOBAL obligatoire, le step-up sur PUT, les bornes et fallbacks, l’audit, la durée dynamique, l’absence de renouvellement au refresh, la page dédiée, le mode lecture seule et l’absence de rejeu automatique.

Réserve préexistante : `frontend/test/dynamic-permissions.test.ts` réussit 7 scénarios sur 8 mais échoue sur une expression textuelle attendue dans `HrAdministrationPage.tsx` (`budgetManagementScope=permissionScope(...)`). Cette régression de contrat statique RH est hors périmètre et aucun fichier RH n’a été modifié par ce lot.

## 10. Limites restantes

- Aucune migration n’a été exécutée sur MySQL ; une validation MySQL 8.4 isolée reste requise.
- Aucun appareil, cookie ou jeton de confiance n’existe encore.
- Les permissions appareils sont visibles et attribuables, mais aucune route appareil ne les consomme avant les lots 3 et 4.
- Une recette navigateur réelle devra suivre l’application contrôlée des migrations 088 puis 089.

## 11. Prérequis du lot 3

1. Valider et appliquer 088 puis 089 dans l’ordre via le gestionnaire normal sur un environnement isolé.
2. Concevoir la table additive des appareils avec jeton opaque haché, expiration absolue et révocation.
3. Utiliser un cookie `HttpOnly`, `Secure` en production et `SameSite` approprié, sans stocker le jeton brut.
4. Faire respecter `trustedDevicesEnabled`, la durée demandée et le plafond absolu de 30 jours côté serveur.
5. Ne jamais remplacer le mot de passe par un appareil de confiance et ne jamais considérer cet appareil comme un step-up.
6. Tester rotation, rejeu, révocation, changement de mot de passe, reset 2FA et scopes OWN/AGENCY/CONCESSION/GLOBAL.

## 12. Verdict

La gouvernance dynamique du lot 2 est prête dans le code. Les paramètres sont typés, bornés, persistants et auditables ; les permissions et scopes restent entièrement dynamiques ; la durée du step-up est configurable sans affaiblir son comportement. Aucun mécanisme de confiance n’est activé avant le lot 3 et aucune base ou infrastructure n’a été modifiée.

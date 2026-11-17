# 03 — Traçabilité frontend / API / MySQL

| Domaine | Frontend | API principale | Persistance |
|---|---|---|---|
| Notifications | `NotificationsPage.tsx`, hooks et présentation | `GET /notifications`, compteur, read-all, read, archive, delete | `notifications`, contexte agence et destinataire |
| Activité | `ActivityPage.tsx`, hooks, dates | listes/options, détail, PDF global/unitaire | `audit_logs` avec acteur, ressource, action, avant/après et contexte |
| Utilisateurs | `UsersManagementPage.tsx`, affectations, rôles, 2FA | `/users`, `/roles`, affectations agences/rôles, `/auth/2fa/*` | `users`, `user_agencies`, `user_agency_roles`, `roles`, `role_permissions`, tables 2FA/session |
| Paramètres | `SettingsPage.tsx` et sections spécialisées | `/settings`, `/settings/agencies` et référentiels spécialisés | `settings`, `concessions`, `agencies` et référentiels métier |

La chaîne de contrôle d'accès passe par le contexte d'agence actif et les permissions persistées. Le journal conserve l'adresse IP et le user-agent en base, mais la présentation métier n'expose pas ces données techniques par défaut.


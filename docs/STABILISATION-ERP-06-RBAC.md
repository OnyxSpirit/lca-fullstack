# ERP-06 — RBAC

| Profil | Résultat liste Livraison |
|---|---|
| `RESPONSABLE_LIVRAISON`, agence 2 | 200, gestion complète des dossiers de l'agence |
| `RESPONSABLE_LIVRAISON`, agence 3 | 200, zéro dossier de l'agence 2 |
| `COMMERCIAL` | 403 |
| `COMPTABLE` | 403 |
| `DIRECTION` | 403 |
| `SUPER_ADMIN` | 200, visibilité globale |
| Anonyme | 401 |

Les scopes AGENCY et GLOBAL sont démontrés. La sélection de responsable exclut les utilisateurs non opérationnels et les utilisateurs d'une autre agence. Aucun fallback fondé sur le nom d'un rôle n'a été observé.

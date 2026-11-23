# RBAC et autorisations

## Permissions et scopes

- `stamp.view` : voir les cachets affectés à l'agence active ;
- `stamp.manage` : créer et administrer les cachets propriétaires de l'agence active ;
- `stamp.use` : utiliser un cachet affecté, actif et compatible ;
- `stamp.assign_agencies` : ajouter ou retirer des agences d'utilisation ;
- scope collectif requis : `AGENCY` ; `OWN` ne gouverne pas un cachet collectif.

La permission nouvelle est enregistrée par migration et seed, puis accordée au vrai `SUPER_ADMIN` système en `AGENCY`. Elle reste attribuable dynamiquement à un rôle ordinaire.

## Ressources centrales

`assertCentralAgencyPermissionInContext` exige désormais une agence active, la permission et le scope `AGENCY`; il ne réserve plus une opération métier au Super Admin. `assertSystemSuperAdminPermissionInContext` matérialise le chemin réservé aux opérations réellement système.

Les protections du dernier Super Admin, des rôles système, des cibles Super Admin, du changement de concession et de l'élévation de privilèges restent indépendantes et actives.

## Multi-agences

Le contexte est recalculé depuis la session et l'agence active. L'affectation d'un cachet est limitée aux agences actives de la même concession. Une agence étrangère ou inactive est rejetée. Le propriétaire ne peut pas être retiré. La lecture partagée n'accorde aucun droit de modification.

## Modules centraux alignés

Identité/logo et paramètres via helper central, barèmes de main-d'œuvre, catalogue et checklist de livraison, paramètres 2FA et affectation d'agences utilisateur. Les contrôles système spécifiques restent en place.

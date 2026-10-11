# STABILISATION-ERP-02 — RBAC dynamique

État réel : 252 permissions actives, 16 rôles au total, dont un seul système (`SUPER_ADMIN`), 15 rôles métier, 16 utilisateurs au total et 402 couples permission/scope sur les rôles métier.

| Scope | Rôles de référence |
|---|---|
| OWN | COMMERCIAL, CONSEILLER_SAV, TECHNICIEN |
| AGENCY | RECEPTIONNISTE, RESPONSABLE_LIVRAISON, CHEF_ATELIER, MAGASINIER, GESTIONNAIRE_RH |
| CONCESSION | DIRECTION, RESPONSABLE_COMMERCIAL, COMPTABLE, RESPONSABLE_FINANCIER, RESPONSABLE_SAV, RESPONSABLE_PIECES, RESPONSABLE_RH |
| GLOBAL | SUPER_ADMIN uniquement |

Les quinze profils proposés par STABILISATION-ERP-01 ont été créés dynamiquement via l'API officielle, à partir des codes réellement présents dans le catalogue. Un compte fictif actif par profil a été créé par l'API officielle et associé à une agence.

Tous les comptes se connectent (200), `/auth/me` restitue le bon rôle et chacun reçoit 403 sur `/roles`. Le nombre de permissions effectives va de 9 (TECHNICIEN) à 55 (RESPONSABLE_FINANCIER). Un renommage temporaire de DIRECTION en « Super Administrateur Recette » n'a donné aucun privilège : `/roles` reste 403. La modification du rôle système est refusée (403) et la désactivation du dernier Super Admin est refusée (409).

La désactivation du TECHNICIEN invalide immédiatement nouvelle connexion et session existante (401), puis sa réactivation réussit. L'interface masque les menus non autorisés ; l'accès direct à `/users` par RECEPTIONNISTE affiche « Permission insuffisante » et l'API correspondante répond 403.

Limite : la campagne a validé les enveloppes réelles de permissions et les protections administratives. Les opérations CRUD métier et l'isolation ressource par ressource seront exécutées dans les campagnes CRM/Vente/Livraison/SAV, avec des données métier dédiées.


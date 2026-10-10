# AUDIT-ERP-02 — Plan de correction proposé

Ce plan ne constitue pas une application de corrections.

## Lot 1 — Intégrité du workflow (P1)

Cause racine : absence de matrice exhaustive de transitions.

- Fichiers : `backend-node/src/modules/crm/crm.routes.ts`, tests CRM pipeline, éventuellement frontend `CrmPage.tsx`.
- Correction minimale : centraliser les couples source/cible permis ; interdire par défaut ; réserver la réouverture des terminaux à une permission/règle explicite ; conserver l'activité et les notifications actuelles.
- Non-régression : matrice 9×9, appels directs API, perte/gain, devis/vente existants, scopes.
- Décision : retours arrière admis et autorité de réouverture.

## Lot 2 — Étanchéité Client 360° (P1)

Cause racine : vérification booléenne de permission utilisée à la place d'un prédicat de portée.

- Fichier : `backend-node/src/modules/customers/customer.routes.ts`.
- Correction minimale : construire les scopes Livraison, Showroom et GED avec leurs alias et paramètres ; les appliquer dans les trois unions de timeline.
- Non-régression : données croisées OWN/AGENCY/CONCESSION/GLOBAL, réponse vide sans fuite d'identifiant, pagination timeline.
- Vigilance : ordre des paramètres SQL dans l'union.

## Lot 3 — Identité prospect/client (P2)

Cause racine : déduplication disponible pour clients, non partagée avec les leads.

- Fichiers : `crm.routes.ts`, service d'identité client/prospect, `NewLeadModal.tsx` après décision métier.
- Correction minimale : endpoint de recherche normalisée et réponse de confirmation ; ne pas fusionner automatiquement sans règle.
- Non-régression : téléphone formaté, e-mail normalisé, homonymes, agences différentes, création concurrente, conversion devis.
- Décisions : périmètre du doublon, blocage/alerte/fusion ; alignement des champs obligatoires API/UI.

## Lot 4 — Volumétrie et recherche (P2)

Cause racine : vue Kanban fondée sur une liste bornée considérée comme exhaustive.

- Fichiers : `crm.routes.ts`, `erpHooks.ts`, `CrmPage.tsx`; éventuellement liste clients.
- Correction minimale : endpoint d'agrégats par étape + pagination par colonne, ou pagination globale explicite ; ajouter recherche par identifiant.
- Non-régression : 201+ prospects, filtres croisés, somme budgets, « Toute l'équipe », OWN/AGENCY.
- Décision : ergonomie de chargement des colonnes et limite opérationnelle.

## Lot 5 — Agenda et traçabilité (P2)

Cause racine : rendez-vous représenté comme activité simple et auteur confondu avec affectataire.

- Fichiers : routes CRM, schéma/migration seulement dans une future mission autorisée, affichage timeline.
- Correction minimale : règle de collision transactionnelle ; champ auteur immuable ou journal d'audit distinct ; préserver les activités existantes.
- Non-régression : chevauchements, fuseau, annulation, réaffectation, auteur manager/commercial.
- Décisions : durée, tolérance aux conflits, modèle auteur/responsable.

## Lot 6 — Accessibilité et responsive (P2)

Cause racine : interactions attachées à des conteneurs non interactifs et absence de recette du bundle courant.

- Fichiers : `CrmPage.tsx`, `CustomersListPage.tsx`, `CustomerDetailPage.tsx`.
- Correction minimale : vrais liens/boutons dans cellules/cartes, focus visible, libellés ; conserver le comportement souris.
- Tests : clavier et axe, 1440/1024/768/375, états chargement/vide/erreur, longues valeurs et débordements.

## Ordre recommandé

1. RBAC-01 et CRM-01.
2. CRM-02 et contrat API/UI.
3. CRM-03/CRM-06.
4. CRM-04/CRM-05.
5. UX-01 et recette responsive.

Chaque lot doit être isolé, accompagné de tests négatifs, puis soumis aux suites globales. Les tests textuels obsolètes identifiés pendant l'audit doivent être réévalués séparément, sans les assouplir pour masquer une régression.

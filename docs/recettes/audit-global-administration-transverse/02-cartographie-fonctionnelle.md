# 02 — Cartographie fonctionnelle

## Notifications

Route `/notifications` : portée personnelle/agence selon habilitation, statut toutes/non lues, catégories métier, pagination 10/20, compteur, lecture unitaire/globale, archivage, suppression logique et navigation vers la ressource lorsqu'elle est exploitable. État vide et erreurs/retry sont prévus.

## Activité

Route `/activity` : recherche temporisée, filtres utilisateur/module/action/catégorie/contexte/agence/concession/dates, pagination, impression PDF filtrée, détail modal et impression unitaire. Les libellés métier et le contexte territorial sont présentés séparément.

## Utilisateurs & habilitations

Route `/users` : onglets Collaborateurs, Rôles et permissions, Sécurité du compte. Liste filtrable et paginée ; création/modification/statut/avatar/mot de passe ; affectations multi-agences ; rôles dynamiques et portées ; catalogue de permissions ; cachets ; politiques 2FA ; centre de sécurité et appareils de confiance.

## Paramètres concession

Route `/settings` : identité/fiscalité, documents GED, signatures/cachets, constructeurs, services et checklist livraison, atelier/ponts, fournisseurs, emplacements véhicules, agences. L'onglet interne `integrations` existe dans le type et le rendu mais n'est pas ajouté à la navigation ; son contenu annonce une fonctionnalité à venir, donc classé hors périmètre fonctionnel disponible.


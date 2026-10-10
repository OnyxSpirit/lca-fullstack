# STABILISATION-FINALE-ERP — recette

## Environnement

- MySQL `8.4.11` Community Server dans `tmpfs`, projet Compose isolé `lca-stabilisation-finale`.
- Backend jetable exposé sur `127.0.0.1:13082`, port interne 3001.
- Recette UI réelle sur `http://127.0.0.1:3001` conformément à la consigne.
- La pile Compose jetable a été arrêtée et supprimée en fin de recette ; aucun volume persistant n'était déclaré.

## Contrôles API réels

1. Bootstrap des migrations jusqu'à 076 et provisionnement Super Admin.
2. Catalogue de 251 permissions unique et identique au profil authentifié.
3. Rôle dynamique avec scopes OWN puis AGENCY : autorisations, refus et isolation inter-agences validés.
4. Retrait de toutes les permissions et désactivation du rôle immédiatement effectifs.
5. Protection du rôle système SUPER_ADMIN et refus d'un faux rôle réservé.
6. Login, `/me`, rotation refresh, rejet du refresh consommé, logout et révocation de l'access token validés.

## Contrôles navigateur en lecture

- Dashboard chargé avec session Super Admin.
- Stock véhicules : 3 véhicules, filtres et affectations visibles.
- Atelier : 2 OR, onglet clients extérieurs et statuts visibles.
- Billing : 3 factures ; 78 399 010 FCFA facturés et 33 399 010 FCFA encaissés affichés.
- Reporting : facturation nette, ventes, stock, Atelier par origine (Concession/Extérieur/Inconnue), garanties et reporting financier chargés.

## Limite

Cette recette UI confirme le chargement et la cohérence de lecture des écrans ciblés. Elle ne couvre pas toutes les mutations destructives ou financières ; le verdict reste donc **NON VALIDÉ / NON APTE** tant que les suites globales ne sont pas vertes.

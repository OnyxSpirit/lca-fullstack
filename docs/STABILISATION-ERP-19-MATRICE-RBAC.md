# ERP-19 — Matrice RBAC Atelier/Pièces

## Profils persistés

| Rôle | Agence | Scope | Service/Atelier utile | Pièces utile | Effet actuel |
|---|---|---|---|---|---|
| Technicien | Sud | OWN | `service.order.view`, interventions/sessions personnelles | aucun | voit ses travaux ; aucune opération Pièces |
| Chef d'atelier | Nord | AGENCY | vue OR, avancement, affectations et supervision Atelier | `parts.reservation.view` | consulte les besoins/réservations de son agence ; ne crée, consomme ni libère |
| Magasinier | Support | AGENCY | aucun droit Service | toutes les permissions Pièces, dont les quatre réservations | gère catalogue/stock/commandes ; routes OR refusées par la première garde |
| Responsable pièces | principale, plus compte A2 | CONCESSION | aucun droit Service | toutes les permissions Pièces | même blocage, malgré couverture de toutes les agences de la concession |
| Conseiller SAV | Support | OWN | cycle Service complet, dont `service.order.update` | aucun droit Pièces | gère ses OR mais ne peut ni ajouter une pièce estimative ni réserver |
| Responsable SAV | principale | CONCESSION | cycle Service complet | aucun droit Pièces | gère les OR de la concession mais ne peut ni demander ni traiter une pièce |

## Intersection nécessaire aujourd'hui

| Opération | Service requis | Pièces requise | Rôle métier satisfaisant |
|---|---|---|---|
| Voir stocks disponibles d'un OR | `service.order.view` | `reservation.view/create` | Chef atelier pour la liste seulement ; aucun pour le choix de stock |
| Ajouter une pièce estimative | `service.order.update` | `reservation.view` ou `create` | aucun |
| Réserver | `service.order.update` | `reservation.create` | aucun |
| Consommer | `service.order.update` | `reservation.consume` | aucun |
| Libérer | `service.order.update` | `reservation.release` | aucun |
| Consommation directe | `service.order.update` | `stock.adjust` | aucun |

Le Super Administrateur est volontairement exclu de la colonne « rôle métier ». Il satisfait techniquement toutes les intersections, mais ne constitue pas un workflow de production acceptable.

## Scopes

- `OWN` Service est lié au conseiller/acteur de l'OR ; il ne donne pas de propriété d'un stock collectif.
- `AGENCY` est adapté au magasinier local et interdit une autre agence.
- `CONCESSION` permet au Responsable pièces de traiter les magasins des agences de sa concession.
- `GLOBAL` n'est nécessaire pour aucun des six profils et ne doit pas être attribué.

## Cohérence frontend/backend

Le frontend reproduit le cumul backend : carte globale sous `service.order.update`, puis boutons sous permissions Pièces. Le masquage est cohérent avec les refus API mais rend les droits spécialisés inopérants. Les hooks ciblent correctement les routes spécialisées ; le défaut réside dans le modèle d'accès à la surface OR et non dans le nom des rôles.

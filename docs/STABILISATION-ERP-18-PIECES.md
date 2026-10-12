# ERP-18 — Pièces et habilitations

## Résultats établis

- `MAGASINIER` (AGENCY) et `RESPONSABLE_PIECES` (CONCESSION) ont les 21 permissions Pièces, dont `parts.reservation.create` et `parts.reservation.consume` ;
- un profil opposé tel que `TECHNICIEN` ne possède aucune permission Pièces ;
- API de lecture : 200 pour les deux profils autorisés, 403 pour les profils opposés ;
- frontend : les requêtes et boutons Catalogue, Stock, Mouvements, Fournisseurs, Commandes, Transferts, Inventaires et Ajustements sont conditionnés par les permissions dédiées ;
- 10/10 tests frontend Pièces ciblés et la suite backend RBAC dynamique sont verts.

## Anomalie ERP18-PARTS-01 — P1

Les routes Atelier de réservation et consommation exigent cumulativement `service.order.update` et la permission Pièces dédiée. Or :

- Magasinier et Responsable pièces ont les droits de réservation/consommation mais pas `service.order.update` ;
- Conseiller SAV et Responsable SAV ont `service.order.update` mais aucun droit de réservation/consommation ;
- seul Super Administrateur cumule actuellement les deux familles.

La preuve API est un 403 pour Magasinier et Responsable pièces sur les routes OR, avant même la résolution d'un identifiant inexistant. Ainsi, les boutons corrigés ERP-17 sont correctement masqués selon les permissions, mais aucun profil métier standard ne peut exécuter le workflow Atelier/Pièces de bout en bout.

## Décision

**ÉCHEC fonctionnel ciblé / blocage P1 de livraison.** Aucune correction n'est appliquée : choisir le rôle opérateur légitime et son niveau de scope est une décision métier et de séparation des tâches, pas une régression technique à corriger arbitrairement.

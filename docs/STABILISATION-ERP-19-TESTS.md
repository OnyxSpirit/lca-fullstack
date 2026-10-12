# ERP-19 — Tests de la correction

Date : 2026-10-11.

## Résultats réussis

- lint TypeScript backend : réussi ;
- lint TypeScript frontend : réussi ;
- build backend : réussi ;
- build frontend Vite : réussi ;
- tests backend ciblés ERP-19, Parts, SAV et RBAC : **94/94 réussis** ;
- tests frontend ERP-19 : **3/3 réussis** ;
- test frontend Parts mis à jour pour la libération : réussi individuellement dans le lot après correction de l'attente historique.

Les tests couvrent les gardes spécialisées, la séparation create/consume/release, les scopes OWN/AGENCY/CONCESSION/GLOBAL, l'absence de dépendance à `service.order.update`, les chemins historiques, les verrous, l'idempotence et les marqueurs de mouvements de stock.

## Recette runtime Phase 3

- API/MySQL : **20/20 contrôles réussis** sur fixtures isolées ;
- scopes : AGENCY positif et inter-agence négatif, CONCESSION positif, GLOBAL positif, OWN/refus sans permission négatif ;
- refus create/consume : HTTP 403 et snapshots stock/réservations/mouvements/lignes strictement inchangés ;
- consommation : physique `4 → 3`, réservé `1 → 0`, une ligne réelle créée ;
- rejeu consommation et libération : HTTP 404 sans double effet ;
- insuffisance : HTTP 409 sans mutation ;
- idempotence : même réservation retournée, sans double écriture ;
- concurrence après correctif : `[201, 409]`, sans HTTP 500 ni sur-réservation ;
- navigateur : connexion officielle du magasinier, file Pièces visible, actions Réserver/Consommer/Libérer réussies, erreur d'insuffisance explicite, accès SAV refusé, console sans erreur.

Après la correction complémentaire de concurrence : test backend ERP-19 réussi, lint et build backend réussis ; tests frontend ERP-19/Parts **14/14**, lint et build frontend réussis. Le healthcheck des six conteneurs est vert.

Le lot frontend de non-régression avait révélé trois assertions historiques déjà incompatibles avec le code antérieur à ERP-19 : présence attendue de `parts.stock.adjust` directement dans la page SAV et deux textes UX SAV absents. L'analyse source confirme qu'elles sont désynchronisées, sans régression fonctionnelle ERP-19 ; elles n'ont pas été masquées ni affaiblies. L'assertion Parts concernant la libération a été actualisée conformément au comportement désormais couvert et réussit.

## Preuves de stock

Le stock de recette `part_stocks.id=1` termine à `current_stock=2`, `reserved_stock=0`. La baisse physique correspond uniquement aux deux consommations explicites des fixtures ERP19 (API puis navigateur). Toutes les réservations restantes sont libérées ; le stock agence 2 utilisé pour les contrôles de scope est inchangé à `2/0`.

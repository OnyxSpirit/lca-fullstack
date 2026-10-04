# Parc & Stock véhicules

## Affectations physiques

Les affectations véhicules utilisent exclusivement `vehicle_locations`. Une
ligne appartient à une agence, porte le type structurel `PARC` ou `SHOWROOM` et
peut être désactivée sans perdre l'historique. L'absence d'affectation est un
`vehicle_location_id` nul et s'affiche « Non affecté » ; aucune ligne fictive
n'est créée.

La migration 050 reprend uniquement les anciens emplacements génériques
`showroom` et `yard` réellement utilisés. `warehouse`, `workshop`, `delivery`,
`other` et toute valeur ambiguë restent non affectés. Les anciens identifiants
sont conservés dans `legacy_location_id` pour rendre la reprise déterministe.

`vehicles.assignments.view` autorise la consultation du référentiel et
`vehicles.assignments.manage` sa création, son renommage et son
activation/désactivation. Le transfert réutilise `vehicles.assign_agency`.
`OWN` est refusé pour ces ressources collectives ; `AGENCY`, `CONCESSION` et
`GLOBAL` sont appliqués par les politiques RBAC existantes.

Tout changement d'agence ou d'affectation passe par l'action Transférer, sous
transaction et verrou `FOR UPDATE`. Le motif est obligatoire et une ligne
`vehicle_movements` conserve anciennes/nouvelles agence et affectation,
l'auteur et l'horodatage. L'édition générique du véhicule refuse `locationId`.

## Liste et statuts

La liste applique scope, filtres et recherche avant le `COUNT`, trie une
projection étroite d'identifiants avec un identifiant comme départage, puis
charge la page détaillée. Les compteurs Tous/Parc/Showroom/Non affectés sont
calculés côté serveur avant pagination. Les changements de filtre ramènent à la
première page.

Les statuts `reserved`, `sold` et `delivered` ne peuvent être produits que par
les workflows Réservation/Vente/Livraison. Une libération administrative
`reserved` vers `available` exige un motif et est refusée tant qu'une vente ou
réservation active existe. Une vente ne peut être créée que pour un véhicule
`available`.

## Finance et historique

Les cinq composantes du coût de revient HT restent séparées : achat, remise en
état, transport, administratif et autres frais. Les entrées sont bornées à
`DECIMAL(18,2)`, ainsi que leur total. L'interface affiche la devise configurée
de la concession avec le fallback contractuel XAF et ne suppose aucun taux de
TVA fixe.

`purchase_price`, `refurbishment_cost`, `transport_cost`,
`administrative_cost`, `additional_costs`, `catalog_price`, `sale_price` et
`minimum_price` sont tous stockés canoniquement en HT. Lorsqu'un devis ou une
vente est saisi en TTC, le prix HT du véhicule est converti avec le taux fiscal
effectif de l'agence pour présenter l'entrée TTC ; le calcul fiscal reconvertit
ensuite l'entrée et la remise vers les snapshots HT, TVA et TTC déterministes.
Toute comparaison au prix minimum et au coût de revient utilise exclusivement
le net HT arrondi à deux décimales.

Le prix minimum reste confidentiel hors `vehicles.financials.view`. Le guard de
vente expose seulement la remise maximale opérationnelle. Devis et ventes
refusent côté backend un net sous le plancher. Un devis conserve son prix
snapshoté lors des modifications de notes ou de remise.

Les cinq coûts sont snapshotés sur `sale_items` et actualisés au moment de la
confirmation commerciale. Dashboard et reporting utilisent ce snapshot. Pour
les ventes historiques antérieures à la migration 050, un snapshot nul entraîne
un fallback explicite vers les coûts courants du véhicule : cette marge legacy
est donc indicative et aucune donnée historique n'est fabriquée.

## Installation

La baseline consolidée `baseline_001_050` contient directement la structure
finale. Une base historique exécute `049`, puis
`050_vehicle_locations_and_sale_cost_snapshots.sql`. Le seed canonique attribue
toutes les permissions actives au seul rôle système initial `SUPER_ADMIN` en
scope `GLOBAL`.

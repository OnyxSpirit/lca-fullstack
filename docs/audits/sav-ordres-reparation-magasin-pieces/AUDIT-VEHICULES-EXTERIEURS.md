# Audit des véhicules extérieurs

## Conformité à la décision métier

La fonctionnalité est intégrée au formulaire de création d'OR ; aucun nouveau module autonome n'est requis. Le frontend sépare les parcours `CONCESSION` et `EXTERNAL`, exclut `UNKNOWN`, permet recherche, création, association et réutilisation.

Le backend impose des valeurs commerciales empêchant l'entrée automatique au stock VN/VO et conserve les relations client–véhicule historisées. VIN et immatriculation sont normalisés avec gestion de conflits.

## Réserves

- Le code expose aussi un onglet « clients extérieurs » interne au SAV ; il ne constitue pas un module séparé, mais doit rester une vue de consultation.
- Champs pris en charge à la création dédiée : client, agence, marque, modèle/version, VIN, immatriculation et type de relation. Année et motorisation ne sont pas saisies dans ce formulaire spécialisé.
- Aucun véhicule `EXTERNAL` n'existe dans la recette ; scénario A non exécuté de bout en bout.

Verdict : **CONFORME AVEC RÉSERVES**.


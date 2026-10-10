# STABILISATION-FINALE-ERP — anomalies restantes

## Backend — 45 échecs

Les groupes résiduels sont principalement :

- tests commerciaux/devis dont les mocks ne fournissent plus les paramètres concession, identité documentaire et configuration introduits par les workflows actuels ;
- tests GED/notifications/delivery avec anciennes signatures de scopes ou assertions de code source ;
- tests de convergence baseline cherchant des marqueurs historiques (`baseline_001_064`, 058/060/061/063/071) alors que la baseline consolidée annonce le niveau 069 et le bootstrap réel applique 072–076 ;
- assertions documentaires recherchant `historicalBusinessPdf` alors que le runtime utilise désormais `requiredHistoricalBusinessPdf` ;
- quelques assertions de libellés ou expressions SQL historiques.

Ces échecs ne sont pas déclarés bénins : chaque groupe doit être rejoué isolément, son invariant actuel documenté, puis son mock ou le produit corrigé selon la cause démontrée.

## Frontend — 38 échecs

Les groupes résiduels concernent CRM/recherche, formulaires numériques, permissions Pièces/Devis, UI Atelier/garantie, Paramètres et Trésorerie. La majorité sont des tests statiques dépendant de chaînes ou de formes de composants antérieures ; au moins le test de recherche CRM montre aussi une sensibilité temporelle en suite globale.

## Condition de levée

- zéro échec sur les deux commandes globales ;
- nouvelle pile MySQL 8.4 fraîche ;
- nouvelle recette navigateur comprenant mutations autorisées et refus RBAC ;
- aucune régression lint/build.

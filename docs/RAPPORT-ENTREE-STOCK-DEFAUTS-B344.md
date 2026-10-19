# Rapport LOT B.3.4.4 — Défauts constatés à l'entrée en stock

## Objet et périmètre

Le lot améliore uniquement la modale existante d'entrée en stock et la fiche véhicule. Il ne crée ni module, ni workflow de réparation, ni statut de défaut, ni gestion documentaire ou photographique supplémentaire.

## Reconnaissance de l'existant

- L'entrée en stock est déclenchée depuis la liste Stock Véhicules et utilise `NewVehicleModal.tsx`.
- La création et l'édition passent par les routes `/vehicles` de `vehicle.routes.ts`, avec contrôle RBAC, scope agence et transaction existants.
- `vehicles.sale_price` est le prix de vente courant canonique. Le stock l'affiche, les devis le recopient comme prix proposé et les ventes le recopient comme sous-total effectif. Aucun de ces consommateurs n'applique une seconde réduction.
- `vehicles.minimum_price` reste la borne inférieure existante.
- Les véhicules vendus ou livrés restent verrouillés par la règle existante.
- Les champs financiers demeurent protégés par `vehicles.financials.view` et son scope territorial.

## Modèle de données

La migration additive `095_vehicle_reception_defect.sql` ajoute à `vehicles` :

- `reception_defect_present`, booléen non nul, valeur historique par défaut `FALSE` ;
- `reception_defect_description`, texte nullable ;
- `reception_initial_sale_price`, montant nullable afin de ne pas inventer le prix initial des lignes historiques ;
- `reception_defect_discount`, montant non nul, valeur par défaut zéro ;
- `reception_defect_discount_reason`, texte nullable.

Deux contraintes SQL interdisent une réduction négative et une combinaison incohérente défaut/description/réduction/motif. Aucun `UPDATE`, backfill, remplacement de table ou effacement de donnée n'est inclus. Les véhicules historiques restent donc « sans défaut constaté » avec un prix initial spécifique non renseigné.

La migration n'a pas été appliquée à une base métier dans cette mission.

## Règles implémentées

- « Aucun défaut constaté » est sélectionné par défaut et conserve le prix saisi.
- Un défaut impose une description.
- La réduction est facultative et peut valoir zéro.
- Une réduction strictement positive impose un motif.
- Les montants négatifs, non décimaux, excessifs ou une réduction supérieure ou égale au prix initial sont rejetés côté serveur.
- Le calcul utilise des centimes entiers pour éviter les erreurs d'arrondi : `prix courant = prix initial - réduction liée au défaut`.
- Le prix courant doit rester strictement positif et ne peut pas descendre sous le prix minimum lorsqu'il est renseigné.
- Le prix final est enregistré directement dans `vehicles.sale_price`. Le prix initial, la réduction et son motif sont conservés séparément ; la réduction n'est jamais rejouée par les devis ou les ventes.
- La création reste atomique avec le véhicule, son mouvement initial, son historique de statut, ses équipements, ses images et sa trace d'audit.
- Une édition des informations de réception, ou du prix d'un véhicule déjà défectueux, recalcule la cohérence au lieu d'accepter un prix final indépendant.
- Les appels historiques qui ne transmettent aucune donnée de tarification de réception restent compatibles.

## Interface

La modale d'entrée en stock contient une section « État du véhicule à la réception » dans son formulaire financier existant : choix explicite, champs conditionnels, devise de la concession, résumé avant/réduction/après et erreurs bloquantes.

La modale d'édition reprend les mêmes règles. La fiche véhicule affiche le constat, sa description, le prix initial, la réduction, le motif éventuel et le prix courant. Les informations financières détaillées restent masquées sans la permission financière existante.

## Fichiers modifiés

- `backend-node/database/migrations/095_vehicle_reception_defect.sql`
- `backend-node/src/modules/vehicles/vehicle-reception-defect.ts`
- `backend-node/src/modules/vehicles/vehicle.routes.ts`
- `backend-node/test/vehicle-create-insert-shape.test.ts`
- `backend-node/test/vehicle-reception-defect-b344.test.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/vehicles/EditVehicleModal.tsx`
- `frontend/src/modules/vehicles/NewVehicleModal.tsx`
- `frontend/src/modules/vehicles/VehicleDetailPage.tsx`
- `frontend/src/modules/vehicles/vehicleReceptionPricing.ts`
- `frontend/src/modules/vehicles/vehicleScopePolicy.ts`
- `frontend/src/types/index.ts`
- `frontend/test/vehicle-reception-defect-b344.test.ts`

## Qualification exécutée

Résultats acquis :

- tests ciblés backend B.3.4.4 et forme de l'INSERT : PASS ;
- tests backend ciblés véhicules/RBAC dynamique : 3 fichiers PASS, 0 FAIL ;
- tests frontend complets : 919 PASS, 0 FAIL, 0 SKIP ;
- lint TypeScript backend : PASS ;
- build backend : PASS ;
- lint TypeScript frontend : PASS ;
- build Vite de production frontend : PASS ;
- `git diff --check` : PASS.

Les tests ciblés couvrent : absence de défaut, défaut sans réduction, calcul 25 000 000 − 2 000 000 = 23 000 000, réduction invalide, description ou motif absent, prix minimum, absence de backfill, prix canonique unique dans devis/ventes, affichage conditionnel et restauration du prix après retrait du défaut.

La suite backend globale a également été lancée. Elle n'est pas verte dans l'état courant du dépôt : des scénarios HTTP préexistants (notamment CRM et matrice véhicules) échouent parce que leurs fixtures ne fournissent pas l'auteur requis par le service de notifications historiques (`Auteur de la notification introuvable`) ; un contrôle statique antérieur attend encore uniquement `PARC`/`SHOWROOM` alors que le lot B.3.4.3 a déjà ajouté `GARAGE`. Ces échecs sont reproductibles hors du code B.3.4.4 et ne proviennent ni du calcul de réception ni de la migration 095. Ils ne sont pas masqués dans le verdict.

## Limites et mise en service

La migration 095 n'a pas été exécutée sur MySQL 8.4 dans cette mission, car aucune écriture de base ni modification Docker n'était autorisée. Sa validation présente est statique, TypeScript et applicative ; une recette SQL réelle devra être réalisée dans une base MySQL 8.4 isolée avant application contrôlée à l'environnement cible.

Ordre requis pour une future mise en service autorisée : sauvegarde vérifiée, exécution normale du gestionnaire de migrations jusqu'à 095, contrôle des cinq colonnes et contraintes, déploiement simultané du backend/frontend compatibles, puis recette création/édition/détail/devis/vente. Le nouveau code ne doit pas être démarré sur une base où 095 est absente.

## Verdict

L'évolution applicative B.3.4.4 est implémentée sans double remise et sans altération des données historiques. La qualification de code est favorable. Le verdict de mise en service reste **sous réserve de la validation et de l'application contrôlée de la migration 095 sur MySQL 8.4**.

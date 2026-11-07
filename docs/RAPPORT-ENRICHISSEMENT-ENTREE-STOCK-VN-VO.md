# Rapport d’enrichissement — Entrée en stock VN / VO

Date : 7 novembre 2026  
Périmètre : Stock véhicules, profils techniques communs, caractéristiques individuelles et fiche véhicule.  
État : modifications non commitées. Aucune migration n’a été exécutée sur une base.

## 1. Synthèse des développements

Les formulaires existants **Entrer en stock** et **Modifier** ont été enrichis par un composant technique commun. La saisie reste facultative et n’altère pas les validations existantes du VIN, du stock, des prix, de la réception, des emplacements ou des photographies.

Le développement ajoute trois niveaux explicites :

- profil commun rattaché à une version normalisée ;
- surcharges propres à un véhicule ;
- snapshot historique figé lors de la vente ou de la livraison.

La modification individuelle reste sélectionnée par défaut. Une modification commune exige `vehicles.catalog.manage`, une confirmation explicite, une révision à jour et produit une trace d’audit.

## 2. Caractéristiques techniques intégrées

Les 29 champs existants sont conservés. Les attributs suivants ont été ajoutés : catégorie technique, carrosserie technique, cylindrée, cylindres, type de motorisation, vitesse maximale, capacité du réservoir, consommation, nombre de rapports, configuration de conduite, revêtement intérieur, pneumatiques, suspension avant, freins avant/arrière, dispositifs de sécurité, technologies embarquées, connectivité, multimédia, autres technologies, durée et kilométrage de garantie.

Les unités sont visibles dans l’interface : cm³, kW, ch, Nm, secondes, km/h, km, L, L/100 km, mm et mois.

`advanced_sensors` et `battery_cooling_function` restent textuels de bout en bout. Les descriptions existantes ne sont plus transformées en booléens.

## 3. Correspondance avec GAC GS4 MAX

Le fichier `GAC GS4 MAX(1).xlsx` n’était pas disponible dans les ressources accessibles. Il n’a pas été analysé. Les désignations validées dans la mission ont été couvertes comme suit :

| Désignation fournie | Champ ERP |
|---|---|
| SUV compact | `technical_category` / `technical_body_type` |
| 1.5L Turbo, 4 cylindres | `engine_power`, `displacement_cc`, `cylinder_count` |
| 185 ch, 300 Nm | `power_ch`, `maximum_torque_nm` |
| DCT 6 vitesses | transmission unitaire, `gear_count`, `driving_configuration` |
| 0–100 en 7,5 s / 190 km/h | `acceleration_0_100_seconds`, `maximum_speed_kmh` |
| Réservoir 55 L / 6,0 L/100 km | `fuel_tank_capacity_l`, `fuel_consumption_l_100km` |
| Suspensions | `front_suspension`, `rear_suspension` |
| 5 passagers / revêtement / pneus | `seat_count`, `interior_trim`, `tire_dimensions` |
| Technologie / connectivité / multimédia | champs techniques dédiés |
| 3 ans ou 100 000 km | texte, durée et limite kilométrique de garantie |

Aucune donnée client, taxe ou condition propre à une pro forma n’a été ajoutée au profil technique.

## 4. Champs existants préservés

Les champs et comportements existants restent présents : agence, VN/VO, statut, identité, VIN, immatriculation, carrosserie, année, circulation, kilométrage, énergie, moteur, transmission, puissances, CO₂, couleurs, emplacement, fournisseur, coûts, prix, défaut de réception, photos, équipements et notes.

Les quatre champs préparés mais auparavant invisibles dans `NewVehicleModal` sont réexposés : moteur, puissance fiscale, puissance réelle et émissions CO₂.

## 5. Formulaire « Entrer en stock »

Le bouton de liste porte désormais l’intitulé exact **Entrer en stock**. Le formulaire comporte une section **Caractéristiques techniques complémentaires** divisée en sous-sections repliables.

La sélection suit marque → modèle → version. Les modèles et versions sont filtrés selon les choix précédents. La référence `versionId` devient l’autorité côté backend pour la marque, le modèle et la version.

Le véhicule et le profil éventuel sont écrits dans la même transaction. L’entrée minimale reste possible sans fiche technique complète.

## 6. Formulaire « Modifier »

Le formulaire existant charge le profil, les valeurs effectives et les particularités individuelles. Il réutilise exactement le même composant que l’entrée en stock. Les restrictions existantes sur les véhicules vendus/livrés, les transferts et la finance sont conservées.

Après enregistrement, les requêtes véhicule, liste et tableau de bord sont invalidées pour rafraîchir la fiche.

## 7. Préremplissage

Lorsqu’une version est sélectionnée, les caractéristiques communes sont chargées et affichées. Les champs non renseignés sont signalés. Les valeurs unitaires existantes moteur, énergie, transmission, puissance et prix catalogue continuent d’être préremplies.

À la modification, la valeur effective est calculée dans cet ordre : snapshot historique, surcharge individuelle, profil commun.

## 8. Modifications individuelles

**Ce véhicule uniquement** est la portée par défaut. Seules les différences par rapport au profil sont enregistrées dans `vehicles.technical_overrides`. Le profil partagé n’est jamais modifié par cette opération.

Revenir exactement à une valeur du profil supprime de fait la surcharge correspondante lors de l’enregistrement du nouvel ensemble de différences.

## 9. Modifications communes

La portée **Modifier le profil commun de cette version** exige `vehicles.catalog.manage`. Avant enregistrement, l’interface affiche :

- la version concernée ;
- le nombre de véhicules encore en stock potentiellement concernés ;
- les champs modifiés ;
- un rappel sur la conservation des exceptions.

Le backend refuse toute modification commune non confirmée. Une colonne `revision` fournit un verrou optimiste et empêche un écrasement silencieux après modification concurrente.

## 10. Exceptions individuelles

La résolution fusionne le profil et `technical_overrides`. Une modification commune ne réécrit jamais les surcharges. Un véhicule à 180 ch reste donc à 180 ch si le profil commun passe de 185 à 190 ch, tandis qu’un véhicule sans surcharge utilise 190 ch.

## 11. Véhicules vendus ou livrés

Un snapshot technique est créé transactionnellement lors du passage à `sold` et confirmé à la livraison. Il est écrit une seule fois avec `COALESCE`.

Pour les véhicules déjà vendus/livrés avant cette migration et sans snapshot, le système adopte le traitement conservateur demandé : il n’utilise pas le profil courant pour fabriquer une valeur historique. Seules les données unitaires réellement conservées peuvent être restituées. Une reprise historique nécessiterait une source métier fiable et n’a pas été inventée.

## 12. Photographies

Les galeries communes et individuelles restent séparées. Aucun stockage ni endpoint photo n’a été supprimé. Ajout, suppression, principale, optimisation, formats et ordre des photos communes sont préservés. Les photos restent facultatives.

La limite source client reste 8 Mo avant optimisation, tandis que la charge finale serveur reste limitée à 5 Mo. Cette différence est conservée car le client convertit et réduit l’image avant envoi.

## 13. Backend

- extension de `TECHNICAL_PROFILE_FIELDS` ;
- parsing filtré des valeurs techniques ;
- résolution profil/surcharge/snapshot avec provenance ;
- création ou mise à jour commune dans la transaction du véhicule ;
- vérification de permission, confirmation et révision ;
- calcul d’impact par version ;
- audit des créations et modifications communes ;
- autorité de `versionId` sur les libellés ;
- endpoint de référentiels accessible avec `vehicles.create` sans ouvrir la consultation complète du stock ;
- gel historique dans les workflows vente et livraison.

## 14. Schéma SQL

La migration additive `104_vehicle_technical_enrichment.sql` :

- ajoute les nouveaux champs à `commercial_models` ;
- ajoute `revision` et `updated_by` ;
- ajoute `technical_overrides`, `technical_snapshot` et `technical_frozen_at` à `vehicles`.

Aucune migration historique n’a été modifiée. Aucune suppression, conversion destructive ou reprise de données n’est incluse. La migration n’a pas été exécutée.

## 15. Permissions et scopes

- `vehicles.create` permet désormais de charger le référentiel minimal dans son propre scope ;
- `vehicles.view` continue de protéger la consultation du stock ;
- `vehicles.update` protège les modifications individuelles ;
- `vehicles.catalog.view` ou `vehicles.catalog.manage` permet de lire le profil ;
- `vehicles.catalog.manage` est obligatoire pour écrire le profil commun ;
- les contrôles financiers restent sous `vehicles.financials.view` ;
- les photos après création restent sous `vehicles.images.manage` ;
- OWN reste refusé pour le stock collectif, AGENCY/CONCESSION/GLOBAL restent appliqués.

Aucun nom de rôle fixe n’a été ajouté.

## 16. Factures pro forma

Les tables, routes, snapshots, PDF, GED et mécanismes d’émission existants n’ont pas été supprimés. Les snapshots commerciaux déjà émis restent immuables. Le résolveur technique enrichi fournit les nouvelles caractéristiques aux futurs mécanismes de snapshot sans réécrire les documents existants.

## 17. Fichiers modifiés pour cette mission

- `backend-node/database/migrations/104_vehicle_technical_enrichment.sql`
- `backend-node/src/modules/vehicles/vehicle-technical-profile.ts`
- `backend-node/src/modules/vehicles/vehicle.routes.ts`
- `backend-node/src/modules/vehicles/commercial-catalog.routes.ts`
- `backend-node/src/modules/sales/sale.service.ts`
- `backend-node/src/modules/deliveries/delivery.routes.ts`
- `frontend/src/modules/vehicles/TechnicalCharacteristicsForm.tsx`
- `frontend/src/modules/vehicles/NewVehicleModal.tsx`
- `frontend/src/modules/vehicles/EditVehicleModal.tsx`
- `frontend/src/modules/vehicles/VehicleDetailPage.tsx`
- `frontend/src/modules/vehicles/CommercialCatalogPage.tsx`
- `frontend/src/modules/vehicles/VehiclesListPage.tsx`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/types/index.ts`
- tests techniques dédiés backend et frontend.

Les autres fichiers déjà modifiés dans le worktree appartiennent à la restructuration antérieure et ont été préservés.

## 18. Tests techniques exécutés

| Vérification | Résultat |
|---|---|
| TypeScript backend `npm run lint` | Réussi |
| TypeScript frontend `npm run lint` | Réussi |
| Build backend | Réussi |
| Build frontend Vite | Réussi |
| Tests ciblés technique backend | Réussis |
| Tests ciblés technique frontend | Réussis |
| Tests stock/CRM/pro forma backend | Réussis |
| Tests workflow commercial backend | Réussis |
| Tests stock/CRM/pro forma frontend | Réussis |
| Tests workflow commercial frontend | Réussis |
| `git diff --check` | Réussi |

Aucune recette navigateur, aucune campagne E2E métier et aucune écriture en base métier n’ont été effectuées.

## 19. Réserves

- Le fichier Excel annoncé était absent. La correspondance repose uniquement sur les désignations validées dans la mission.
- Les véhicules déjà vendus/livrés sans snapshot ne peuvent pas recevoir rétroactivement des valeurs historiques fiables.
- La migration doit être examinée puis appliquée par le responsable dans l’environnement prévu avant utilisation des nouveaux champs.
- La validation fonctionnelle et ergonomique finale appartient au responsable du projet.

## 20. Procédure de vérification manuelle pour le responsable

### Entrée en stock

1. Ouvrir **Stock véhicules → Véhicules en stock → Entrer en stock**.
2. Vérifier que tous les champs historiques restent présents, dont moteur, puissances et CO₂.
3. Sélectionner successivement une marque, un modèle et une version. Vérifier le filtrage et le préremplissage.
4. Ouvrir les sous-sections techniques, renseigner des valeurs et ajouter une caractéristique avec unité.
5. Conserver **Ce véhicule uniquement**, enregistrer puis contrôler la fiche.
6. Avec `vehicles.catalog.manage`, recommencer en choisissant **Modifier le profil commun de cette version**. Vérifier la confirmation et le nombre de véhicules concernés.
7. Avec un utilisateur sans cette permission, vérifier que l’option commune est désactivée.

### Modification

1. Ouvrir **Stock véhicules → Véhicules en stock → Véhicule concerné → Modifier**.
2. Vérifier le préremplissage de toutes les catégories.
3. Modifier une valeur pour ce véhicule uniquement, enregistrer et vérifier qu’un autre véhicule de même version ne change pas.
4. Revenir à la valeur commune et vérifier la disparition de l’exception.
5. Modifier ensuite le profil commun avec confirmation. Vérifier qu’une exception individuelle est conservée.
6. Simuler deux éditions concurrentes du profil et vérifier que la seconde demande un rechargement.

### Fiche véhicule et historique

1. Ouvrir **Stock véhicules → Véhicules en stock → Fiche du véhicule**.
2. Vérifier l’affichage par catégories et les unités, sans valeurs artificielles pour les champs vides.
3. Vérifier les photos communes et individuelles.
4. Dans un environnement de recette autorisé par le responsable, faire suivre le workflow normal jusqu’à vendu/livré, puis modifier le profil commun et confirmer que la fiche historique reste inchangée.
5. Vérifier qu’une pro forma déjà émise n’est pas modifiée et qu’une nouvelle génération depuis la fiche reste disponible.


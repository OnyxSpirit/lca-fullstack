# Validation VIN souple et avertissement de conformité

Date : 20 novembre 2026  
Périmètre : création d'un véhicule en stock et véhicule extérieur lors de la création d'un ordre de réparation.

## Conclusion

La validation VIN comporte désormais deux niveaux indépendants :

1. une règle technique bloquante, limitée à exactement 17 caractères alphanumériques `A-Z` et `0-9` lorsqu'un VIN est fourni ;
2. une vérification informative qui affiche un avertissement non bloquant lorsque la valeur contient `I`, `O` ou `Q`.

La limite à 17 caractères, les majuscules, la suppression des espaces et tirets, les contrôles de doublons et la recherche interne SAV sont préservés. Aucun workflow, rôle, schéma ou enregistrement historique n'a été modifié.

## Matrice avant/après

| Situation | Avant | Après |
|---|---|---|
| 17 caractères alphanumériques sans I/O/Q | accepté | accepté |
| Lettre I, O ou Q | rejet bloquant | accepté avec avertissement |
| 16 caractères, Stock | rejeté | rejeté |
| 16 caractères, SAV si VIN fourni | rejeté au backend | rejeté dès le frontend et au backend |
| VIN absent, SAV extérieur | accepté | accepté |
| 18 ou 19 caractères dans le champ | borné à 17 | borné à 17 |
| 18 ou 19 caractères envoyés directement | HTTP 400 | HTTP 400 |
| Caractère spécial | rejeté | rejeté |
| Minuscules | normalisées en majuscules | normalisées en majuscules |
| Espaces et tirets | supprimés | supprimés |
| Doublon VIN | rejet existant | rejet existant inchangé |

## 1. Validations précédentes

Le frontend partagé utilisait `^[A-HJ-NPR-Z0-9]{17}$`. La route Stock et le normaliseur SAV possédaient chacun une expression équivalente. Ces trois règles excluaient techniquement `I`, `O` et `Q`. Les deux champs étaient déjà contrôlés, normalisés en majuscules et bornés à 17 caractères. Le VIN Stock était obligatoire ; celui du véhicule extérieur SAV restait facultatif.

## 2. Modifications réalisées

- L'alphabet technique frontend accepte désormais `A-Z` et `0-9` sur exactement 17 positions.
- Un détecteur distinct repère `I`, `O` ou `Q` sans influencer la validité technique.
- Le même texte d'avertissement est affiché près du champ VIN dans les deux formulaires avec `role="status"` et une présentation ambre non bloquante.
- L'avertissement est dérivé de la valeur contrôlée : il apparaît, se met à jour et disparaît immédiatement lorsque les lettres concernées sont retirées.
- Le SAV applique maintenant aussi la règle technique au frontend lorsqu'un VIN facultatif est renseigné.
- Les deux validations backend acceptent `I`, `O` et `Q`, tout en refusant longueurs incorrectes et caractères spéciaux avant insertion.

## 3. Fichiers concernés

Production :

- `frontend/src/modules/vehicles/vehicleVin.ts`
- `frontend/src/modules/vehicles/NewVehicleModal.tsx`
- `frontend/src/modules/service/NewRepairOrderModal.tsx`
- `backend-node/src/modules/vehicles/vehicle.routes.ts`
- `backend-node/src/modules/workshop/workshop-vehicle-normalization.ts`

Tests :

- `frontend/test/vin-stock-sav-harmonization.test.ts`
- `frontend/test/vin-documentation-lca.test.ts`
- `frontend/test/vehicles-stabilization.test.ts`
- `backend-node/test/vin-stock-sav-validation.test.ts`
- `backend-node/test/lot14c1-vehicle-foundation.test.ts`
- `backend-node/test/recette-critique-01.test.ts`

## 4. Nouvelle règle d'acceptation

La constante frontend `VIN_PATTERN` et les deux contrôles backend utilisent `^[A-Z0-9]{17}$`. Un VIN Stock doit respecter cette règle. Dans le SAV, une valeur vide reste acceptée ; toute valeur non vide doit la respecter. La normalisation ne remplace jamais `O` par `0`, ni `I` par `1`.

## 5. Règle d'avertissement

La présence de `/[IOQ]/` produit exactement le message suivant :

> Attention : ce numéro contient une ou plusieurs lettres (I, O ou Q) habituellement exclues des VIN standards. Vérifiez le numéro sur le véhicule ou ses documents avant de poursuivre.

Ce message ne modifie pas `VIN_PATTERN`, ne désactive pas le bouton de soumission et ne demande aucune approbation ou permission supplémentaire.

## 6. Comportement Stock Véhicules

Le champ reste obligatoire, contrôlé et limité par `maxLength={17}` ainsi que par `normalizeVinInput`. Un VIN complet contenant `I`, `O` ou `Q` est valide techniquement et soumis normalement. L'avertissement est visible tant que l'une de ces lettres est présente. Les erreurs de longueur ou de caractère spécial restent bloquantes.

## 7. Comportement SAV

Le VIN reste facultatif. Lorsqu'il est renseigné, il est contrôlé par la même règle technique avant la création du véhicule extérieur. L'avertissement est identique et non bloquant. La recherche `useWorkshopVehicleSearchQuery` à partir de 11 caractères et l'endpoint `/workshop/vehicles/search` sont inchangés ; ils reçoivent la valeur normalisée, y compris lorsqu'elle contient `I`, `O` ou `Q`. La confirmation de réutilisation et l'association à l'OR restent inchangées.

## 8. Validations backend

- Stock : `POST /vehicles` normalise puis valide avant toute transaction d'insertion.
- SAV : `/workshop/external-vehicles` appelle `normalizeWorkshopVin` avant sa transaction ; la recherche interne utilise le même normaliseur.
- Les valeurs trop courtes, trop longues ou comportant un caractère spécial produisent une erreur HTTP 400.
- Les contrôles d'unicité applicatifs et la contrainte `UNIQUE` de `vehicles.vin` sont conservés.
- Le schéma historique `VARCHAR(50) NULL UNIQUE` n'a pas été modifié.

## 9. Tests exécutés

Frontend VIN et parcours associés :

- `vin-stock-sav-harmonization.test.ts`
- `vin-documentation-lca.test.ts`
- `vehicles-stabilization.test.ts`
- `recette-critique-01.test.ts`
- `external-vehicle-reception.behavior.test.ts`

Backend VIN et parcours associés :

- `vin-stock-sav-validation.test.ts`
- `lot14c1-vehicle-foundation.test.ts`
- `lot14c2-workshop-external-vehicles.test.ts`
- `recette-critique-01.test.ts`

Contrôles complémentaires : TypeScript frontend, TypeScript backend, build Vite et `git diff --check`.

Les cas ajoutés couvrent VIN standard, `I`, `O`, `Q`, plusieurs lettres via `LO...`, minuscules, avertissement présent et absent après correction, 16/18/19 caractères, collage long, caractère spécial, VIN SAV absent, validation avant insertion, unicité SQL et maintien de la recherche interne.

## 10. Résultats

- Frontend ciblé : 5 fichiers passants, 0 échec.
- Backend ciblé : 4 fichiers passants, 0 échec.
- TypeScript frontend : réussi.
- TypeScript backend : réussi.
- Build frontend : réussi, 2 552 modules transformés.
- Tests VIN dédiés relancés séparément : réussis.
- `git diff --check` : réussi à la clôture.

Trois assertions historiques attendaient littéralement l'ancienne expression ou ses anciens messages. Elles ont été adaptées à la nouvelle règle métier ; aucun test n'a été supprimé ou neutralisé. Le défaut historique du harnais monolithique `app.test.ts` n'a pas été traité dans cette mission.

## 11. Réserves

Aucun navigateur local pilotable n'était disponible. La recette visuelle Docker demandée n'est donc pas déclarée comme réalisée. Les comportements DOM et métier sont couverts par les tests ciblés, mais la validation visuelle manuelle des deux écrans reste à effectuer dans l'environnement de recette.

Aucune écriture MySQL de recette n'a été provoquée afin de préserver l'environnement existant. Les normaliseurs, l'ordre validation/insertion, les routes de parcours et la contrainte SQL ont été qualifiés automatiquement.

## 12. Données historiques

Impact nul. Aucune migration, mise à jour de VIN, conversion `O/0` ou `I/1`, suppression ou réassociation n'a été exécutée. Les VIN historiques, ventes, livraisons, réservations et ordres de réparation restent inchangés.

## État de livraison

Aucun commit, push ou déploiement n'a été effectué.

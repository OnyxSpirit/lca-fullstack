# Audit ciblé VIN — Stock Véhicules et SAV

Date de qualification : 20 novembre 2026  
Périmètre : entrée en stock d'un véhicule et création d'un ordre de réparation pour un véhicule extérieur.

## Conclusion

Les deux parcours limitent désormais explicitement le champ contrôlé à 17 caractères et réutilisent la même normalisation frontend. Les collages et changements programmatiques passant par le gestionnaire React sont normalisés, convertis en majuscules et tronqués à 17 caractères. Le backend reste l'autorité : un VIN fourni doit comporter exactement 17 caractères autorisés et les lettres `I`, `O` et `Q` sont refusées. Aucun service de décodage VIN n'existe ou n'a été ajouté.

La seule incohérence trouvée était l'absence de l'attribut HTML `maxLength={17}` sur le VIN du véhicule extérieur SAV. La protection React y existait déjà. L'attribut a été ajouté sans modifier le workflow métier.

## Réponses explicites

### 1. Comment fonctionne actuellement le champ VIN dans Stock Véhicules ?

Le composant `frontend/src/modules/vehicles/NewVehicleModal.tsx` utilise un champ texte contrôlé. Son `onChange` passe la saisie à `normalizeVinInput` dans `frontend/src/modules/vehicles/vehicleVin.ts`. Cette fonction supprime espaces et tirets, met en majuscules, puis conserve au maximum 17 caractères. Le champ porte également `maxLength={17}`. La soumission impose un VIN complet et conforme à `^[A-HJ-NPR-Z0-9]{17}$`, puis envoie la valeur normalisée à l'API de création de véhicule.

### 2. Que se passe-t-il exactement au 17e caractère ?

Le 17e caractère est accepté. Le formulaire dispose alors d'une valeur potentiellement valide, sous réserve des caractères autorisés. Aucune requête, recherche, perte de focus, temporisation ou opération de décodage n'est déclenchée par l'arrivée du 17e caractère. Une erreur antérieure du champ est seulement remise à zéro par le gestionnaire de saisie.

### 3. Que se passe-t-il au 18e et au 19e caractère ?

En saisie native, `maxLength={17}` empêche leur apparition. Si une valeur plus longue atteint tout de même le gestionnaire React, `normalizeVinInput(...).slice(0, 17)` écarte immédiatement tout caractère supplémentaire. Il n'y a ni état transitoire trop long, ni erreur spécifique, ni requête supplémentaire.

### 4. Une valeur trop longue peut-elle être conservée dans l'état frontend ?

Non dans les deux parcours audités : leurs états contrôlés sont alimentés par `normalizeVinInput`, qui borne la valeur à 17. Cela couvre la saisie, le collage et les changements transmis au gestionnaire. Les valeurs initiales de ces formulaires sont vides ; aucun cache VIN distinct n'a été identifié.

### 5. Une valeur trop longue peut-elle être envoyée au backend ?

Pas par les deux interfaces auditées. Un client API direct peut néanmoins tenter de l'envoyer ; cette défense ne repose donc pas sur le frontend.

### 6. Une valeur trop longue peut-elle être enregistrée en MySQL ?

Non par les endpoints audités. Pour le stock, `backend-node/src/modules/vehicles/vehicle.routes.ts` normalise et valide strictement le VIN avant l'`INSERT`. Pour le SAV, `backend-node/src/modules/workshop/workshop-vehicle.routes.ts` appelle `normalizeWorkshopVin` de `backend-node/src/modules/workshop/workshop-vehicle-normalization.ts` avant la transaction et l'`INSERT`. Les valeurs de 18 ou 19 caractères produisent une erreur HTTP 400 et ne sont ni tronquées ni écrites.

La colonne historique commune `vehicles.vin` est un `VARCHAR(50) NULL UNIQUE`. Les véhicules stock et extérieurs sont conservés dans cette même table ; `repair_orders` référence le véhicule. Le type historique, plus large que 17, n'a pas été modifié car la règle est déjà imposée avant toute écriture et une réduction de colonne serait une migration inutilement risquée pour les données existantes. L'unicité protège également contre les doublons de VIN.

### 7. Le VIN déclenche-t-il une récupération automatique d'informations ?

Dans Stock Véhicules, non. Aucun décodeur et aucune recherche ne sont liés au champ VIN. La sélection explicite d'un catalogue ou d'une version peut renseigner d'autres données du véhicule, mais il s'agit d'un mécanisme séparé du VIN.

Dans le SAV, la saisie peut déclencher une recherche interne de correspondances à partir de 11 caractères afin de proposer la réutilisation d'un véhicule existant. Cette recherche n'est pas un décodage et ne renseigne pas automatiquement marque, modèle ou version.

### 8. Si oui, à quel moment et depuis quelle source ?

Seul le SAV effectue cette vérification : le hook `useWorkshopVehicleSearchQuery` interroge `/workshop/vehicles/search` lorsque le VIN normalisé atteint au moins 11 caractères. La source est la base interne de véhicules accessible à l'utilisateur. À 17 caractères, il s'agit du même critère normalisé ; une tentative de 18e ou 19e caractère reste tronquée à la même valeur et ne crée pas de nouveau critère utile. Le choix de réutiliser une correspondance reste explicite.

### 9. Comment fonctionne le VIN d'un véhicule extérieur dans le SAV ?

Le composant `frontend/src/modules/service/NewRepairOrderModal.tsx` stocke le VIN dans `externalForm`. `updateExternalForm` applique `normalizeVinInput` à la propriété `vin`. Le champ est facultatif pour ce parcours, mais s'il est renseigné il doit être un VIN complet de 17 caractères conforme. Le backend normalise, contrôle les caractères, recherche les doublons et associe le véhicule retenu ou créé à l'ordre de réparation sans changer les règles historiques de création de l'OR.

### 10. Les deux champs utilisent-ils les mêmes règles ?

Oui pour la limite, la casse, la suppression d'espaces/tirets et l'alphabet VIN. Ils partagent `normalizeVinInput` côté frontend et appliquent tous deux une validation stricte côté backend. La différence métier préexistante est conservée : le VIN est obligatoire dans la création stock, facultatif pour un véhicule extérieur SAV, mais strictement valide lorsqu'il est fourni.

### 11. Quelles incohérences ont été découvertes ?

Le champ SAV bénéficiait déjà du bornage React, mais ne déclarait pas `maxLength={17}` dans le DOM, contrairement au champ Stock. La protection réelle existait donc, mais le comportement HTML et l'ergonomie n'étaient pas explicitement harmonisés.

### 12. Quelles corrections ont été apportées ?

- Ajout conditionnel de `maxLength={17}` au champ VIN du véhicule extérieur dans `frontend/src/modules/service/NewRepairOrderModal.tsx`.
- Ajout de tests frontend couvrant le comportement partagé et les contrats des deux composants dans `frontend/test/vin-stock-sav-harmonization.test.ts`.
- Ajout de tests backend ciblant la normalisation SAV, l'ordre validation/écriture, la validation stock et la contrainte SQL historique dans `backend-node/test/vin-stock-sav-validation.test.ts`.

Aucun endpoint, contrat API, schéma, workflow métier, rôle ou donnée historique n'a été modifié.

### 13. Quels tests ont été exécutés ?

Frontend ciblé :

- `vin-stock-sav-harmonization.test.ts`
- `vin-documentation-lca.test.ts`
- `vehicles-stabilization.test.ts`
- `recette-critique-01.test.ts`
- `external-vehicle-reception.behavior.test.ts`

Les scénarios VIN couvrent 16, 17, 18 et 19 caractères, collages longs, suppression, remplacement, majuscules, VIN incomplet, VIN valide, caractères interdits, état contrôlé et absence de décodeur externe.

Backend ciblé :

- `vin-stock-sav-validation.test.ts`
- `lot14c2-workshop-external-vehicles.test.ts`
- `lot14c1-vehicle-foundation.test.ts`

La validation technique a aussi compris les contrôles TypeScript/lint frontend et backend, le build frontend et `git diff --check`.

Le fichier d'intégration monolithique `backend-node/test/app.test.ts` a été relancé séparément. Il échoue sur de nombreux domaines, y compris hors VIN, avec `TypeError: Cannot read properties of null (reading 'port')` dans Supertest : le serveur partagé est fermé avant ces requêtes. Ce défaut de harnais n'est pas lié à la modification VIN. Les suites dédiées ci-dessus, qui isolent les routes et normaliseurs concernés, sont passantes. Avant cette intervention ciblée, la suite backend globale de référence avait terminé avec 2 081 succès, 0 échec et 104 tests MySQL conditionnellement ignorés.

### 14. Quels sont leurs résultats ?

- Frontend ciblé : 5 fichiers passants, 0 échec.
- Backend ciblé : 3 fichiers passants, 0 échec.
- TypeScript/lint frontend : réussi.
- TypeScript/lint backend : réussi.
- Build frontend : réussi, 2 552 modules transformés.
- `git diff --check` : réussi.
- Test monolithique `app.test.ts` : non qualifiant en exécution isolée à cause du cycle de vie de son serveur partagé, défaut distinct et documenté ci-dessus.

## Matrice fonctionnelle vérifiée

| Cas | Stock | SAV extérieur |
|---|---|---|
| 1 à 16 caractères | conservés, incomplets | conservés, incomplets si VIN fourni |
| 17 caractères autorisés | acceptés | acceptés |
| 18e / 19e caractère | refusés/tronqués avant état | refusés/tronqués avant état |
| Collage de 18 ou 25 caractères | borné à 17 | borné à 17 |
| Suppression / remplacement | autorisé | autorisé |
| Minuscules | converties en majuscules | converties en majuscules |
| `I`, `O`, `Q` | refusés à la validation | refusés à la validation |
| Requête API directe trop longue | HTTP 400 avant écriture | HTTP 400 avant écriture |

## Recette navigateur

La preuve automatisée couvre le DOM, l'état contrôlé et les routes concernés. Une recette visuelle Docker n'a pas pu être certifiée dans cette session : aucun navigateur local pilotable n'était disponible et les conteneurs existants n'ont volontairement pas été reconstruits ni modifiés, afin de ne pas perturber l'environnement et les données historiques. Cette limite n'affecte pas les tests automatisés passants, mais la vérification visuelle manuelle des deux écrans reste à exécuter dans l'environnement de recette avant la validation utilisateur finale.

## État du dépôt

Aucun commit, push ou déploiement n'a été effectué. Aucune migration et aucune opération destructive n'ont été réalisées.

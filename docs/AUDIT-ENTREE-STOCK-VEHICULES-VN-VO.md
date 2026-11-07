# Audit approfondi — Entrée en stock des véhicules VN / VO

Date de l'audit : 6 novembre 2026  
Périmètre : `Stock > Véhicules en stock > Ajouter un véhicule`  
Nature : audit statique du code, du schéma SQL, des contrats API et des écrans associés. Aucun code applicatif n'a été modifié.

## 1. Synthèse exécutive

Le parcours permet bien de créer une unité physique VN ou VO, de la rattacher à une version normalisée, d'enregistrer ses données commerciales, son constat de réception, ses équipements libres et jusqu'à huit photos. Le modèle de données distingue correctement la fiche commune de version (`commercial_models`) de l'unité physique (`vehicles`).

La mise en œuvre n'est toutefois pas encore une « saisie complète et progressive » des caractéristiques techniques : le formulaire d'entrée ne présente aucun des 29 attributs du profil commun. La sélection d'une version préremplit seulement le moteur, l'énergie, la transmission, la puissance réelle et le prix catalogue. La création ou l'édition du profil exige de quitter le formulaire pour l'onglet `Modèles sur commande`.

### Verdict par axe

| Axe | Verdict | Résumé |
|---|---|---|
| Création d'une unité VN/VO | Conforme avec réserves | VIN, nature, identité, rattachement, localisation, fournisseur et données unitaires sont persistés. |
| Fiche technique commune | Partiel | Stockage et écran dédié présents, mais absence totale de saisie avancée dans le parcours d'entrée. |
| Préremplissage par version | Partiel | 5 valeurs seulement ; aucune reprise des dimensions, autonomies, garantie, équipements techniques, etc. |
| Séparation commun / individuel | Globalement cohérente | Le schéma est bien séparé, mais certains champs communs existent aussi sur l'unité sans règle d'héritage explicite. |
| VN / VO | Partiel | Choix présent, mais aucune adaptation du formulaire ni des obligations métier selon la nature. |
| Commercial / financier | Cohérent mais bloquant | Masquage par scope correct ; le prix de vente devient de fait obligatoire dès que la finance est visible. |
| Photos | Bon avec réserves | 8 images, optimisation et contrôles serveur ; pas de réordonnancement à la création et seuil client/serveur différent. |
| Permissions / périmètres | À corriger | Le formulaire de création dépend aussi de `vehicles.view` et éventuellement `vehicles.catalog.view`, sans garantie d'attribution conjointe. |
| Restitution de la fiche | Incomplète | La page véhicule omet plusieurs attributs pourtant stockés dans le profil. |

## 2. Inventaire exhaustif du formulaire `NewVehicleModal`

La section visuelle `A — Identification et rattachement` regroupe en réalité l'identification, la technique, la logistique et l'approvisionnement. Les lettres B à F ne sont pas matérialisées.

| Section réelle | Champ visible ou implicite | Type UI | Obligatoire réel | Source / valeur initiale | Destination | Observation |
|---|---|---:|---|---|---|---|
| A | Agence de rattachement | Select conditionnel | Oui, implicite | Première agence autorisée ou agence courante | `vehicles.agency_id` | Masqué si une seule agence. Changer d'agence efface localisation et valeurs financières. |
| A | Type | Select | Oui | `used` | `vehicles.vehicle_type` | VN=`new`, VO=`used`. Aucun comportement conditionnel. |
| A | Statut initial | Select | Oui | `received` | `vehicles.status` + historique/mouvement | Valeurs : commandé, transit, reçu, préparation, disponible. `available` exige un emplacement actif. |
| A | Marque | Texte + datalist | Oui | Saisie libre / marques actives | `brands` puis `models/versions`, lien par `vehicles.version_id` | Le datalist n'impose pas une référence existante. |
| A | Modèle | Texte | Oui | Saisie libre | Idem | Non filtré par marque. |
| A | Version / finition | Texte | Non | Saisie libre | `versions.name` si création libre | Le backend utilise « Standard » si vide. |
| A | Version normalisée et profil commun | Select | Non | Toutes les versions actives | `vehicles.version_id` | Si absent, création automatique marque/modèle/version. Aucun profil créé. |
| A | VIN | Texte, 17 caractères | Oui | Vide | `vehicles.vin` | Normalisé en majuscules ; alphabet VIN contrôlé client et serveur ; unicité DB. |
| A | Immatriculation | Texte | Non | Vide | `vehicles.registration_number` | Majuscules à l'envoi. |
| A | Carrosserie | Texte | Non | `SUV` | `vehicles.body_type` | Libre, pas de référentiel. |
| A | Année | Nombre | Non | Année courante | `vehicles.year` | Minimum HTML 1900 ; validation serveur limitée. |
| A | 1re mise en circulation | Date | Non | Vide | `vehicles.first_registration_date` | Aucun contrôle différencié VN/VO. |
| A | Kilométrage | Nombre entier | Non | Vide | `vehicles.mileage` | Minimum 0 ; non obligatoire même pour un VO. |
| A | Énergie | Select | Non | Essence | `vehicles.fuel_type` | Liste fermée côté UI, valeur texte en base. |
| A | Moteur | Texte | Non | Vide / profil ou version | `vehicles.engine` | Champ présent dans l'état et le payload mais son rendu est à vérifier : il n'apparaît pas dans le bloc visible entre énergie et transmission du composant actuel. |
| A | Transmission | Select | Non | Automatique | `vehicles.transmission` | Trois choix UI. |
| A | Puissance fiscale | Nombre | Non | Vide | `vehicles.fiscal_power` | Champ présent dans l'état et le payload mais non rendu dans le bloc actuel. |
| A | Puissance réelle | Nombre | Non | Vide / `profile.power_ch` ou `version.power` | `vehicles.real_power` | Champ présent dans l'état et le payload mais non rendu dans le bloc actuel. |
| A | Émissions CO₂ | Nombre | Non | Vide | `vehicles.co2_emissions` | Champ présent dans l'état et le payload mais non rendu dans le bloc actuel. |
| A | Couleur extérieure | Texte | Non | Vide | `vehicles.color` | Unitaire. |
| A | Couleur intérieure | Texte | Non | Vide | `vehicles.interior_color` | Unitaire. |
| A | Emplacement | Select | Conditionnel | Non affecté | `vehicles.location_id` | Filtré par agence. Obligatoire seulement pour le statut `available`. |
| A | Fournisseur véhicule | Select | Non | Non renseigné | `vehicles.supplier_id` | Fournisseurs véhicule actifs du référentiel. |
| G | Prix achat HT | Nombre décimal | Non en HTML | Vide | `vehicles.purchase_price` | Visible seulement si le scope financier couvre l'agence. |
| G | Remise en état HT | Nombre décimal | Non | Vide | `vehicles.refurbishment_cost` | Particulièrement pertinent VO, mais visible aussi VN. |
| G | Transport HT | Nombre décimal | Non | Vide | `vehicles.transport_cost` | Minimum 0. |
| G | Frais administratifs HT | Nombre décimal | Non | Vide | `vehicles.administrative_cost` | Minimum 0. |
| G | Autres frais HT | Nombre décimal | Non | Vide | `vehicles.additional_costs` | Minimum 0. |
| G | Prix catalogue HT | Nombre décimal | Non | Vide / profil commun | `vehicles.catalog_price` | Copie ponctuelle, non synchronisée avec le profil après création. |
| G | Prix de vente HT | Nombre décimal | Oui de fait | Vide | `vehicles.reception_initial_sale_price`, puis prix final dans `sale_price` | La validation interdit un prix nul dès que la section financière est visible. |
| G | Prix minimum HT | Nombre décimal | Non | Vide | `vehicles.minimum_price` | Le prix final ne peut lui être inférieur. |
| Réception | Aucun défaut / défaut constaté | Radio | Oui | Aucun défaut | Colonnes `reception_*` et audit de création | Section masquée sans permission financière. |
| Réception | Description du défaut | Textarea | Si défaut | Vide | `vehicles.reception_defect_description` | Maximum 2 000 caractères côté UI. |
| Réception | Réduction liée au défaut | Nombre décimal | Non | 0 | `vehicles.reception_defect_discount` | Doit être inférieure au prix initial. |
| Réception | Motif de la réduction | Textarea | Si réduction > 0 | Vide | `vehicles.reception_defect_discount_reason` | Maximum 2 000 caractères côté UI. |
| H | Photos individuelles | Fichiers multiples | Non | Vide | `vehicle_images` + stockage fichiers | JPEG/PNG/WebP, 8 maximum, première principale. |
| Hors section | Équipements | Texte séparé par virgules | Non | Vide | `vehicle_features` + `vehicle_feature_assignments` | Création libre de libellés ; pas de sélection du référentiel existant. |
| Hors section | Notes internes | Textarea | Non | Vide | `vehicles.notes` | Pas de longueur maximale visible. |

### Anomalie d'exposition des champs unitaires

`engine`, `fiscalPower`, `realPower` et `co2Emissions` sont définis, préremplis ou envoyés, mais aucun contrôle correspondant n'apparaît dans le JSX actuel du formulaire. Ils ne sont donc pas saisissables manuellement à l'entrée. Le préremplissage de `engine` et `realPower` peut néanmoins être envoyé silencieusement après sélection d'une version.

## 3. Matrice des caractéristiques du profil commun

Légende : **Oui** = pris en charge ; **Non** = absent ; **Partiel** = exposé indirectement ou restitution incomplète ; **Incohérent** = type UI/API différent du SQL.

| Caractéristique commune | SQL | API catalogue | Formulaire d'entrée | Éditeur profil | Détail véhicule | État |
|---|---:|---:|---:|---:|---:|---|
| Type véhicule du profil | Oui | Oui | Non | Oui | Non | Partiel ; distinct de la nature VN/VO unitaire. |
| Catégorie technique | Oui | Oui | Non | Oui | Non | Non restitué. |
| Configuration | Oui | Oui | Non | Oui | Oui | Conforme hors entrée. |
| Puissance / description moteur | Oui | Oui | Préremplit `engine` | Oui | Oui | Copie vers l'unité, sans synchronisation. |
| Puissance combinée kW | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Couple maximal Nm | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Puissance ch | Oui | Oui | Préremplit `realPower` | Oui | Oui | Copie vers l'unité. |
| 0–100 km/h | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Autonomie électrique | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Autonomie combinée | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Nombre de places | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Mode de motricité | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Longueur | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Largeur | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Hauteur | Oui | Oui | Non | Oui | Oui | Absent à l'entrée. |
| Capteurs avancés | TEXT | Oui | Non | Case booléenne | Non | **Incohérent** : perte possible d'une description textuelle. |
| Refroidissement batterie | TEXT | Oui | Non | Case booléenne | Non | **Incohérent** : perte possible d'une description textuelle. |
| Suspension arrière | Oui | Oui | Non | Oui | Non | Stocké mais non restitué. |
| Disques avant ventilés | Oui | Oui | Non | Oui | Non | Stocké mais non restitué. |
| Disques arrière ventilés | Oui | Oui | Non | Oui | Non | Stocké mais non restitué. |
| Écran central / tableau de bord | Oui | Oui | Non | Oui | Non | Stocké mais non restitué. |
| Contrôle par application | Oui | Oui | Non | Oui | Non | Stocké mais non restitué. |
| Direction | Oui | Oui | Non | Oui | Non | Stocké mais non restitué. |
| Garantie | Oui | Oui | Non | Oui | Oui | Accessible seulement via le profil séparé. |
| Disponibilité | Oui | Oui | Non | Oui | Oui | Accessible seulement via le profil séparé. |
| Délai de livraison | Oui | Oui | Non | Oui | Oui | Accessible seulement via le profil séparé. |
| Prix catalogue | Oui | Oui | Prérempli | Oui | Partiel | Valeur copiée sur l'unité, puis indépendante. |
| Devise | Oui | Oui | Non | Oui | Non | L'entrée utilise la devise de l'agence, pas celle du profil. |
| Spécifications additionnelles JSON | Oui | Oui | Non | Oui, JSON brut | Non | Puissant mais peu ergonomique et non restitué. |
| Commercialisable | Oui | Oui | Non | Oui | Non | Le sélecteur d'entrée charge aussi les profils indisponibles (`availableOnly=false`). |
| Galerie commune | Oui | Oui | Non | Oui | Oui | Jamais confondue avec les photos unitaires. |

## 4. Préremplissage et héritage

À la sélection d'une version normalisée, le formulaire applique :

1. marque, modèle et version depuis les référentiels ;
2. moteur depuis `commercial_models.engine_power`, sinon `versions.engine` ;
3. énergie depuis `versions.fuel_type` ;
4. transmission depuis `versions.transmission` ;
5. puissance réelle depuis `commercial_models.power_ch`, sinon `versions.power` ;
6. prix catalogue depuis `commercial_models.catalog_price`.

Les autres données communes ne sont ni affichées en lecture seule, ni saisies, ni recopiées. Les valeurs copiées deviennent des instantanés unitaires : une modification ultérieure du profil ne les met pas à jour. Inversement, modifier l'unité n'altère pas le profil.

Ce choix est acceptable pour conserver l'historique commercial, mais il doit être explicité dans l'interface et dans le contrat métier. Aujourd'hui, aucun indicateur ne distingue « hérité du profil », « recopié à la création » et « remplacé sur cette unité ».

## 5. Parcours VN et VO

Le même formulaire est utilisé pour les deux natures. Seul `vehicle_type` change.

| Règle métier attendue | VN | VO | Mise en œuvre actuelle |
|---|---|---|---|
| VIN obligatoire | Oui | Oui | Oui pour les deux. |
| Kilométrage | Souvent 0 / faible | Donnée structurante | Facultatif pour les deux. |
| 1re mise en circulation | Souvent vide | Généralement requise | Facultative pour les deux. |
| Immatriculation | Peut être absente | Généralement présente | Facultative pour les deux. |
| Remise en état | Rare | Fréquente | Toujours proposée si finance autorisée. |
| Profil commun | Fortement pertinent | Pertinent mais variantes possibles | Même logique pour les deux. |
| État / défaut de réception | Possible | Important | Même logique, uniquement avec permission financière. |

Conclusion : la distinction VN/VO est persistée, mais n'organise pas la collecte ni les validations. Pour un audit de qualité de données, les VO peuvent être créés sans kilométrage, immatriculation ni date de première circulation.

## 6. Informations commerciales, prix et défaut de réception

Le masquage des champs sensibles est robuste à deux niveaux : le frontend les retire du payload lorsque `financialAllowed=false`, et le backend exige `vehicles.financials.view` sur l'agence cible dès qu'un champ financier est transmis.

Points de vigilance :

- pour un utilisateur autorisé à la finance, le formulaire transmet les champs financiers et `receptionPricing` exige un prix de vente strictement positif ; le prix est donc obligatoire de fait, sans astérisque dans le libellé ;
- le constat de défaut est considéré comme financier et disparaît entièrement sans permission financière, même si sa description peut relever de la réception/logistique ;
- le prix après réduction est écrit dans `sale_price`, tandis que le prix avant réduction est conservé dans `reception_initial_sale_price` ;
- le prix catalogue du profil et celui de l'unité peuvent diverger sans avertissement ;
- le changement d'agence efface correctement les valeurs financières pour éviter une fuite inter-agences.

## 7. Photographies

### Photos de l'unité

- formats client et serveur : JPEG, PNG, WebP ;
- maximum : 8 ;
- le client refuse les fichiers source de plus de 8 Mo, redimensionne à 1600 × 1200 maximum et encode en WebP qualité 0,84 ;
- le serveur contrôle le Data URL, la signature binaire et limite le fichier reçu à 5 Mo ;
- la création place la première image comme principale ;
- avant création, l'utilisateur peut supprimer une image, mais pas réordonner ni choisir explicitement la principale ;
- après création, ajout/suppression/principale utilisent `vehicles.images.manage` ; aucun endpoint de réordonnancement des photos unitaires n'est présent.

Le seuil 8 Mo affiché au client et 5 Mo au serveur n'est pas nécessairement bloquant après compression, mais il constitue un contrat divergent. Une image très complexe peut passer la sélection puis être refusée après encodage.

### Photos communes du modèle

Elles sont stockées séparément dans `commercial_model_images`, avec ajout, suppression, image principale et ordre. Elles nécessitent `vehicles.catalog.manage`. Le détail véhicule peut afficher cette galerie commune sans la transformer en photos de l'unité.

## 8. Backend, API et persistance

### Création

`POST /vehicles` exige `vehicles.create`, valide le VIN et la nature VN/VO, contrôle l'agence cible selon le scope, puis exécute en transaction :

- résolution ou création marque/modèle/version ;
- validation emplacement et fournisseur ;
- insertion de l'unité et génération du numéro de stock ;
- historique de statut et mouvement initial ;
- création/rattachement des équipements ;
- écriture des photos ;
- audit et notification.

Si `versionId` est fourni, le backend valide que la version est active. Il ne vérifie cependant pas que les textes `brand`, `model` et `version` envoyés concordent avec cette version ; ces textes servent notamment au message de notification. La référence persistée reste `version_id`, mais une incohérence d'affichage/audit est possible.

### Mise à jour après création

`PATCH /vehicles/:id` permet de modifier les attributs unitaires et, avec permission, les prix. Il ne permet pas de changer la marque, le modèle ou la version. L'emplacement se modifie uniquement par le workflow de transfert. Les véhicules vendus ou livrés sont verrouillés.

Le formulaire d'édition réexpose moteur, puissances et CO₂, mais pas le rattachement à un autre profil. Une erreur de version à la création n'est donc pas corrigeable par le parcours standard.

### Catalogue commun

Les routes `/commercial-models` couvrent les 29 champs et la galerie, avec lecture `vehicles.catalog.view` et écriture `vehicles.catalog.manage`. Elles ne filtrent pas les profils par agence ou concession : le catalogue est global. C'est cohérent pour des modèles communs, mais doit être assumé, car un gestionnaire autorisé peut modifier un profil utilisé par toutes les agences.

## 9. Permissions et périmètres

| Action | Permission | Scope appliqué | Observation |
|---|---|---|---|
| Ouvrir / créer une unité | `vehicles.create` | GLOBAL, CONCESSION ou AGENCY | OWN explicitement refusé. |
| Charger les agences de création | `vehicles.create` | Idem | Retourne aussi `financialAllowed` par agence. |
| Charger marques, modèles, versions, emplacements, fournisseurs | `vehicles.view` | Agence cible | **Dépendance non alignée** : un créateur sans droit de lecture ne charge pas le formulaire. |
| Lire le profil commun | `vehicles.catalog.view` | Global | Facultatif : sans droit, la version reste sélectionnable mais sans préremplissage profil. |
| Gérer le profil et sa galerie | `vehicles.catalog.manage` | Global | Pas de restriction territoriale. |
| Saisir / modifier les prix | `vehicles.financials.view` | Agence cible | Une permission nommée « view » autorise aussi l'écriture financière. |
| Gérer les photos après création | `vehicles.images.manage` | Scope véhicule | À la création, les photos passent avec `vehicles.create`, sans cette permission. |
| Modifier l'unité | Permission de mise à jour véhicule | Scope véhicule | Profil/version non modifiable. |

Le principal risque RBAC est fonctionnel : l'écran peut s'ouvrir avec `vehicles.create`, mais son appel à `/vehicle-references` échoue si `vehicles.view` n'est pas également attribué. Il faut soit garantir cette implication dans les rôles, soit autoriser un référentiel minimal sous `vehicles.create`.

## 10. Ergonomie et saisie progressive

Points positifs :

- validation VIN immédiate et retour d'erreur ciblé ;
- masquage des données financières selon l'agence ;
- valeurs par défaut utiles ;
- optimisation des images avant envoi ;
- message clair lorsqu'un profil commun existe ou manque ;
- création possible sans profil, ce qui évite un blocage opérationnel.

Limites :

- une seule grande section A mélange trop de sujets ;
- aucune saisie progressive/repliable des caractéristiques techniques ;
- aucune action « créer le profil » ou « compléter le profil » depuis le modal ;
- quatre champs unitaires existent dans l'état mais ne sont pas rendus ;
- modèle non filtré par marque et version non filtrée par modèle ;
- profils non commercialisables proposés à l'entrée ;
- équipements saisis en texte libre plutôt que sélectionnés dans un référentiel ;
- aucune indication d'origine des valeurs préremplies ;
- aucune règle UX adaptée VN/VO ;
- le prix de vente obligatoire de fait n'est pas signalé comme tel ;
- une erreur de version ne peut pas être corrigée après création.

## 11. Risques classés

### Critiques / élevés

1. **Contrat de type incohérent pour deux attributs communs.** `advanced_sensors` et `battery_cooling_function` sont `TEXT` en SQL mais traités comme booléens dans l'éditeur et le type frontend. Une valeur descriptive existante peut être remplacée par `true/false`.
2. **Dépendance RBAC cachée.** `vehicles.create` ne suffit pas nécessairement à charger `/vehicle-references`, protégé par `vehicles.view`.
3. **Profil technique inaccessible dans le flux de création.** Un utilisateur autorisé au catalogue doit fermer le modal, ouvrir un autre onglet, créer le profil, puis reprendre l'entrée ; les autres utilisateurs ne peuvent que créer une unité techniquement incomplète.

### Moyens

4. Quatre champs unitaires envoyables ne sont pas visibles dans le formulaire.
5. Les profils marqués non commercialisables restent sélectionnables.
6. L'API ne garantit pas la concordance des libellés envoyés avec `versionId`.
7. Le détail véhicule ne restitue pas neuf attributs techniques stockés.
8. Absence de validations minimales propres aux VO.
9. Écriture financière contrôlée par une permission nommée `financials.view`.
10. Aucune correction standard de la version après création.

### Faibles

11. Seuil image client 8 Mo / serveur 5 Mo.
12. Pas de réordonnancement des photos unitaires.
13. Sectionnement A/G/H discontinu et peu progressif.
14. `additional_specs` exige du JSON brut dans l'éditeur.

## 12. Recommandations priorisées

### P0 — Corriger les incohérences susceptibles d'altérer les données

1. Aligner `advanced_sensors` et `battery_cooling_function` sur un contrat unique : texte structuré dans toute la chaîne ou booléens SQL explicites avec migration contrôlée.
2. Aligner les permissions du référentiel de création : implication formelle `vehicles.create → vehicles.view` ou endpoint dédié protégé par `vehicles.create`.
3. Faire dériver marque/modèle/version côté serveur de `versionId` lorsqu'il est fourni et ignorer les libellés clients.

### P1 — Rendre le parcours réellement complet et progressif

4. Réorganiser le modal en étapes : identité, rattachement modèle, données unitaires, technique commune, finance/réception, photos.
5. Afficher la fiche commune sélectionnée en lecture seule avec une action gouvernée « Compléter/modifier le profil » ; autoriser une création inline uniquement avec `vehicles.catalog.manage`.
6. Réexposer moteur, puissances et CO₂ dans le formulaire, avec indicateur « issu du profil » et possibilité de surcharge unitaire explicite.
7. Filtrer modèle par marque, version par modèle et, par défaut, profils disponibles commercialement.

### P2 — Renforcer qualité et restitution

8. Appliquer des règles VO configurables : kilométrage et première mise en circulation requis, immatriculation requise ou justification.
9. Restituer l'ensemble des caractéristiques communes sur la fiche véhicule, y compris sécurité, freinage, suspension, direction et spécifications additionnelles.
10. Séparer la permission d'écriture financière de la permission de lecture.
11. Ajouter un workflow gouverné de correction du rattachement version avant toute vente/livraison.
12. Harmoniser les limites d'image et ajouter choix de principale/ordre pour les photos unitaires.

## 13. Conclusion

L'architecture de fond est saine : version commune, unité physique, galeries séparées, transactions de création et scopes territoriaux existent. Le parcours d'entrée reste cependant un formulaire d'unité enrichi d'un rattachement au catalogue, et non un véritable assistant complet de saisie VN/VO. La priorité n'est pas d'ajouter de nouvelles colonnes, mais de rendre visibles et cohérents les champs déjà modélisés, de sécuriser le contrat de types et d'aligner les permissions nécessaires au parcours réel.

## 14. Fichiers principaux audités

- `frontend/src/modules/vehicles/NewVehicleModal.tsx`
- `frontend/src/modules/vehicles/EditVehicleModal.tsx`
- `frontend/src/modules/vehicles/CommercialCatalogPage.tsx`
- `frontend/src/modules/vehicles/VehicleDetailPage.tsx`
- `frontend/src/modules/vehicles/vehicleScopePolicy.ts`
- `frontend/src/modules/vehicles/vehicleReceptionPricing.ts`
- `frontend/src/api/erpHooks.ts`
- `backend-node/src/modules/vehicles/vehicle.routes.ts`
- `backend-node/src/modules/vehicles/commercial-catalog.routes.ts`
- `backend-node/src/modules/vehicles/vehicle-technical-profile.ts`
- `backend-node/src/modules/vehicles/vehicle-image-storage.ts`
- `backend-node/database/migrations/103_crm_commercial_documents.sql`


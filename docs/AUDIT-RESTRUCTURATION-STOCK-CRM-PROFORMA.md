# Audit préalable — restructuration Stock, CRM et pro forma

## 1. Synthèse exécutive

L'existant ne nécessite pas une reconstruction. La migration `103_crm_commercial_documents.sql` a déjà posé les bons blocs techniques : une fiche commune liée en 1:1 à `versions`, une galerie commune, des lignes de devis/pro forma capables de viser soit un véhicule physique soit un modèle commercial, des snapshots documentaires et un archivage GED. Le défaut principal est fonctionnel : ces capacités sont présentées comme un « Catalogue commercial » autonome, alors que le parcours attendu part du Stock.

La solution recommandée est donc de conserver `commercial_models` et `commercial_model_images` comme référentiel technique interne de version, de les afficher et de les éditer depuis le module Stock, et de conserver `vehicles` comme registre des unités physiques. Aucun véhicule fictif ne doit représenter un modèle sur commande. Les informations communes sont stockées une seule fois au niveau version ; VIN, kilométrage, état, couleur, agence, emplacement, disponibilité et photographies de l'unité restent sur le véhicule.

Le domaine pro forma est également réutilisable. Il manque surtout un parcours prérempli depuis `VehicleDetailPage.tsx` et une résolution serveur complète des caractéristiques/images d'un véhicule physique. L'écran indépendant peut rester comme registre et éditeur multivéhicule, mais ne doit plus être le parcours principal.

Le backend CRM autorise déjà toutes les transitions entre étapes non terminales et rend `won`/`lost` irréversibles. En revanche, le frontend ne propose que les premiers mouvements séquentiels, l'essai impose encore l'étape rendez-vous et la vente impose offre/négociation. Ces restrictions contredisent la règle définitive d'indépendance des opérations. Le lot devra les retirer tout en conservant les règles propres à chaque opération (droits, affectation, disponibilité du véhicule, rendez-vous réellement présent si l'opération en exige un, devis émis, archivage, prix et concurrence).

Verdict : restructuration réalisable en un lot, principalement par intégration d'interface et factorisation serveur. Une migration destructive est injustifiée. Une migration additive postérieure à 103 n'est nécessaire que si le développement confirme un besoin de métadonnées de gouvernance ; le cœur du besoin est déjà représentable.

## 2. Cartographie de l'existant

### 2.1 Stock véhicules

| Couche | Fichiers / éléments | Rôle actuel |
|---|---|---|
| Navigation | `frontend/src/components/layout/Sidebar.tsx` lignes 98-121 | Expose séparément Stock, Catalogue et Pro formas |
| Routage | `frontend/src/App.tsx` routes `/vehicles`, `/vehicles/catalog`, `/vehicles/:id`, `/proformas` | Quatre parcours distincts |
| Liste | `frontend/src/modules/vehicles/VehiclesListPage.tsx` | Recherche, filtres, pagination, ouverture de la fiche, création |
| Création | `frontend/src/modules/vehicles/NewVehicleModal.tsx` | Formulaire monolithique d'entrée d'une unité physique |
| Modification | `frontend/src/modules/vehicles/EditVehicleModal.tsx` | Modification des propriétés individuelles et financières |
| Fiche | `frontend/src/modules/vehicles/VehicleDetailPage.tsx` | Détails, photos, historique, finances, GED, transfert et vente |
| Hooks | `frontend/src/api/erpHooks.ts` (`useCreateVehicle`, `useUpdateVehicle`, hooks images/références) | Contrat frontend/backend |
| API | `backend-node/src/modules/vehicles/vehicle.routes.ts` | CRUD, images, scopes, statut, mouvements, historique |
| Schéma | `backend-node/database/baseline/001_initial_schema.sql` lignes 658-879 | `brands`, `models`, `versions`, `vehicles`, images et équipements |

`vehicleRouter.post('/vehicles')` dans `vehicle.routes.ts` valide le VIN, crée au besoin la marque, le modèle et la version par leur nom, puis insère l'unité. Cette création automatique évite le blocage, mais elle autorise des doublons orthographiques et ne recherche pas le profil technique commun. `vehicleRouter.patch('/vehicles/:id')` ne permet pas de changer marque/modèle/version et ne gère que les caractéristiques élémentaires de l'unité.

### 2.2 Référentiel commercial/technique

| Élément | Référence exacte | Observation |
|---|---|---|
| Tables | `backend-node/database/migrations/103_crm_commercial_documents.sql` lignes 10-69 | `commercial_models` lié en 1:1 à `versions`, galerie 1:N |
| API | `backend-node/src/modules/vehicles/commercial-catalog.routes.ts` | Liste, lecture, création, modification et gestion des images |
| Interface | `frontend/src/modules/vehicles/CommercialCatalogPage.tsx` | Écran autonome de gestion |
| Hooks/types | `frontend/src/api/erpHooks.ts`, notamment `useCommercialModelsQuery` | Type frontend incomplet par rapport au schéma |
| RBAC | migration 103, permissions `vehicles.catalog.view/manage` | Contrôle séparé du Stock |

Les routes du catalogue sont globales : elles vérifient la permission, mais n'appliquent aucun filtre de données par agence/concession. C'est cohérent pour une définition technique universelle de version, mais le sens des scopes autorisés doit être clarifié : un scope territorial ne doit pas créer plusieurs fiches concurrentes pour la même version.

### 2.3 Pro formas et documents

| Élément | Référence exacte |
|---|---|
| Tables et contraintes | migration 103, `proformas` lignes 78-118 et `proforma_items` lignes 120-139 |
| Routes | `backend-node/src/modules/proformas/proforma.routes.ts` |
| Rendu | `backend-node/src/modules/proformas/proforma-document.service.ts` |
| Interface | `frontend/src/modules/proformas/ProformasPage.tsx` |
| Hooks | `frontend/src/api/erpHooks.ts`, `useCreateProforma` et actions associées |
| GED | émission dans `POST /proformas/:id/issue`, via `archiveBusinessDocument` et `requireBusinessArchive` |

Le domaine gère déjà les brouillons, l'idempotence (`client_request_id`), l'émission, la numérotation, les snapshots d'identité/client/articles, le PDF historique et les lignes multiples. `insertItems()` enrichit correctement une ligne `commercialModelId`, mais une ligne `vehicleId` ne récupère pas automatiquement la fiche technique commune ni toutes les images : c'est le principal manque du parcours cible.

### 2.4 CRM

| Élément | Référence exacte | État |
|---|---|---|
| Matrice backend | `backend-node/src/modules/crm/crm.routes.ts`, `CRM_STAGE_TRANSITIONS` et `isCrmStageTransitionAllowed` | Conforme : toute transition entre non-terminaux, terminaux irréversibles |
| Transition | `PATCH /leads/:id/stage` lignes 95-106 | Permission, motif de perte, verrou optimiste, activité, temps réel et notification |
| Interface | `frontend/src/modules/crm/CrmPage.tsx` lignes 295-310, 430-440 et 528-536 | Séquentielle et incomplète |
| Essai | `backend-node/src/modules/showroom/showroom-test-drive.ts` | Impose opportunité à `appointment`, puis passage automatique à `test_drive` |
| Vente | `backend-node/src/modules/sales/sale.service.ts` ligne 80 | Impose `offer` ou `negotiation` |
| Devis | `backend-node/src/modules/quotations/quotation.service.ts` | `createFlexible()` est actif ; `createLegacy()` conserve une ancienne restriction mais n'est plus appelée |

Le Kanban affiché dans `CrmPage.tsx` n'implémente pas de glisser-déposer : les cartes ne sont pas `draggable` et seules les actions « Avancer » Nouveau/Contacté sont disponibles.

## 3. Écarts fonctionnels

1. Le Stock et la fiche technique de version sont deux écrans, deux parcours et deux vocabulaires.
2. Le formulaire Stock ne recharge pas les caractéristiques déjà connues d'une version.
3. Marque/modèle/version sont encore principalement des textes libres lors de la création ; le `version_id` n'est pas choisi explicitement dans le frontend.
4. Les 25 caractéristiques existent en base mais seule une partie est éditable dans `CommercialCatalogPage.tsx`.
5. Le type frontend du modèle commercial ne représente pas tous les champs SQL.
6. Les photos communes de version et les photos individuelles sont techniquement distinctes, mais le vocabulaire de `VehicleDetailPage.tsx` appelle les photos individuelles « catalogue ».
7. La fiche véhicule ne propose pas « Générer une pro forma ».
8. La création pro forma depuis un véhicule ne sait pas encore résoudre automatiquement profil, équipements et images.
9. L'interface CRM empêche les sauts et retours pourtant acceptés par le backend.
10. L'essai et la vente restent conditionnés par l'étape CRM ; l'essai déplace aussi automatiquement l'étape.
11. L'API catalogue ne matérialise pas le sens des scopes territoriaux.

## 4. Analyse du formulaire Stock véhicules

### 4.1 Champs actuellement couverts

`NewVehicleModal.tsx` couvre : agence, VIN, immatriculation, marque, modèle, version, nature VN/VO, carrosserie, année, première mise en circulation, kilométrage, couleurs, carburant, moteur, transmission, puissances fiscale/réelle, CO2, statut, emplacement, fournisseur, coûts/prix, défaut de réception, équipements libres, notes et jusqu'à huit images.

Obligatoires côté interface/backend : VIN valide de 17 caractères, marque, modèle et agence résolue. Un véhicule `available` exige un emplacement actif. Les caractéristiques techniques avancées ne doivent donc pas devenir obligatoires : l'existant permet déjà l'enrichissement progressif.

### 4.2 Défauts de structure

- Le formulaire est une longue grille sans sections métier suffisamment nettes.
- Le `datalist` n'est réellement exploité que pour la marque ; modèle et version restent des textes libres.
- La version sélectionnée n'est pas liée au profil `commercial_models`.
- Les équipements sont une chaîne séparée par des virgules.
- Les images communes et individuelles ne sont pas distinguées.
- `optimizeImage`, défini dans `NewVehicleModal.tsx`, est importé ailleurs : cet utilitaire doit être déplacé dans un module partagé.
- Une ancienne formulation d'état vide laisse entendre que la photo est obligatoire, alors que la validation et le texte d'aide autorisent l'ajout ultérieur.

### 4.3 Organisation cible

Un formulaire à sections repliables ou étapes non bloquantes :

1. **Identification et rattachement** : agence, emplacement, nature VN/VO, VIN, immatriculation, marque, modèle, version.
2. **Unité physique** : année, mise en circulation, kilométrage, état/statut, couleurs, carrosserie, fournisseur.
3. **Fiche technique commune de version** : motorisation, performances, transmission/motricité, dimensions, sécurité, technologies ; préremplie et explicitement marquée « commune à cette version ».
4. **Équipements de l'unité** : équipements/accessoires effectivement présents.
5. **Commercial et financier** : prix, coûts, garantie/disponibilité/délai communs lorsque pertinents, défaut de réception.
6. **Photographies** : onglets « photos de cette unité » et « galerie commune de la version ».
7. **Notes et récapitulatif**.

Le bouton principal doit pouvoir créer avec les seuls champs requis. Une action secondaire « Enregistrer et enrichir la fiche technique » peut guider sans rendre les champs avancés obligatoires.

## 5. Analyse des caractéristiques techniques

### 5.1 Couverture des 25 champs de la migration 103

Les 25 champs validés sont présents dans `commercial_models` et dans la liste `fields` de `commercial-catalog.routes.ts` :

`vehicle_type`, `configuration`, `engine_power`, `combined_power_kw`, `maximum_torque_nm`, `power_ch`, `acceleration_0_100_seconds`, `electric_range_km`, `combined_range_km`, `seat_count`, `drive_method`, `length_mm`, `width_mm`, `height_mm`, `advanced_sensors`, `battery_cooling_function`, `rear_suspension`, `ventilated_front_discs`, `ventilated_rear_discs`, `central_screen_dashboard`, `remote_app_control`, `steering_system`, `warranty_text`, `availability_text`, `delivery_lead_time`.

Le schéma ajoute utilement `catalog_price`, `currency_code`, `additional_specs` et `is_commercially_available`.

### 5.2 Champs non exploités ou partiellement exploités

`CommercialCatalogPage.tsx` n'expose visiblement qu'un sous-ensemble : type, configuration, motorisation, puissance, couple, places, motricité, autonomies, délai, prix/devise, garantie et disponibilité. Manquent notamment dans le formulaire : puissance combinée, accélération, dimensions, capteurs, refroidissement batterie, suspension, disques ventilés, écran central, application distante, direction et `additional_specs`. Le type TypeScript dans `erpHooks.ts` doit être aligné sur le contrat complet.

### 5.3 Redondances et nommage

- `commercial_models.engine_power`, `versions.engine` et `vehicles.engine` se chevauchent.
- `power_ch`, `versions.power` et `vehicles.real_power` se chevauchent.
- `catalog_price` existe sur le profil et l'unité.
- `vehicle_type` dans le profil est une description technique libre, alors que `vehicles.vehicle_type` signifie VN/VO : le nom est ambigu.
- `availability_text` décrit la disponibilité commerciale d'une version, tandis que `vehicles.status` décrit l'état d'une unité.
- `drive_method` (motricité) et `transmission` ne sont pas synonymes et ne doivent pas être fusionnés.

Recommandation de vocabulaire API/UI : renommer conceptuellement, sans renommer immédiatement les colonnes, `commercial_models.vehicle_type` en « catégorie technique », `power_ch` en « puissance système (ch) » si c'est bien la donnée attendue, et distinguer systématiquement prix catalogue de version et prix/prix de vente de l'unité.

### 5.4 Règle de résolution

Pour l'affichage courant : valeur individuelle existante lorsqu'elle représente réellement l'unité, sinon profil commun de version, sinon référentiel `versions`. Les documents émis ne doivent jamais recalculer ces valeurs : leurs snapshots restent l'autorité historique.

## 6. Analyse du catalogue commercial

### 6.1 Options architecturales

| Option | Avantage | Risque | Verdict |
|---|---|---|---|
| Conserver l'écran autonome inchangé | Aucun développement | Double saisie et deux référentiels visibles | Rejetée |
| Supprimer/fusionner les tables dans `vehicles` | Schéma apparemment simple | Duplication par VIN, perte des modèles sur commande, migration destructive | Rejetée |
| Fusionner dans `versions` | Référentiel unique | Alourdit un référentiel de base et mélange identité/marketing/images | Possible à long terme, non minimal |
| Conserver les tables comme profil interne 1:1 de version et intégrer leur UI au Stock | Réemploi maximal, aucune duplication, modèles sans VIN conservés | Nécessite une UI claire et une gouvernance des droits | Recommandée |

`commercial_models.version_id` est déjà unique : la relation directe à `versions` existe. Une « fusion » physique n'apporterait donc pas de gain immédiat.

### 6.2 Modèles sur commande

Ils doivent apparaître dans le module Stock sous un onglet ou une section « Modèles sur commande », alimentée par `commercial_models.is_commercially_available`, sans ligne dans `vehicles`. Une vue unifiée peut présenter :

- **Unités en stock** : chaque VIN, statut et emplacement ;
- **Modèles sur commande** : version, délai, disponibilité, prix indicatif et galerie commune.

Créer un véhicule sans VIN comme placeholder fausserait stock, réservations, ventes, rapports et contraintes. Cette alternative est exclue.

### 6.3 Navigation

Retirer « Catalogue commercial » de la navigation principale, conserver provisoirement `/vehicles/catalog` comme redirection ou compatibilité de lien, et intégrer ses composants dans `/vehicles`. Ne pas supprimer l'API ni les tables tant que devis/pro formas y font référence.

## 7. Analyse des pro formas

### 7.1 Forces existantes

- lignes véhicule physique ou modèle sans VIN ;
- jusqu'à 20 lignes ;
- idempotence ;
- taxes et permissions d'override ;
- brouillon modifiable, document émis immuable ;
- snapshots client, identité, caractéristiques, disponibilité et images ;
- numérotation à l'émission ;
- PDF dynamique en brouillon et archive historique après émission ;
- archivage GED obligatoire ;
- conversion depuis un devis source.

### 7.2 Parcours cible minimal

Ajouter dans `VehicleDetailPage.tsx`, sous `vehicles.view` + `proformas.create`, l'action « Générer une pro forma ». Elle ouvre un formulaire léger avec : destinataire/client ou opportunité, validité, conditions, images proposées et prix. La ligne véhicule est préremplie et non recherchée à nouveau. Une action « Ajouter d'autres véhicules » bascule vers l'éditeur complet en conservant la première ligne.

Le backend doit rester l'autorité. `POST /proformas` peut accepter le même `vehicleId`, puis :

1. verrouiller et vérifier le véhicule et son scope ;
2. charger marque/modèle/version, profil technique, équipements et galeries ;
3. construire la ligne et les snapshots serveur ;
4. utiliser les calculs, validations, idempotence et persistance existants.

Éviter un second service de création. Une route de commodité éventuelle doit appeler le même service de domaine.

### 7.3 Interface indépendante

Conserver `ProformasPage.tsx` comme registre documentaire et éditeur multivéhicule pour les profils habilités. Elle peut rester accessible par lien secondaire « Documents commerciaux » ; le bouton depuis la fiche devient le parcours normal. Sa suppression casserait le multivéhicule, la recherche, l'émission et la consultation historique.

### 7.4 Photographies

Pour un véhicule physique, proposer d'abord ses photos individuelles ; compléter éventuellement avec la galerie commune de version. Les chemins retenus doivent être copiés dans `selected_images_snapshot` avant émission. Une suppression ultérieure d'image source ne doit pas altérer un PDF émis/archivé.

## 8. Analyse du pipeline CRM

### 8.1 Transitions d'étape

`CRM_STAGE_TRANSITIONS` est conforme à la règle finale : chaque source non terminale liste toutes les autres étapes, `won` et `lost` ont une liste vide. `PATCH /leads/:id/stage` contrôle la permission `crm.pipeline.advance`, exige `crm.prospect.lose` et un motif pour Perdu, effectue une mise à jour optimiste et journalise. Aucun changement backend de matrice n'est requis.

Le frontend est non conforme :

- bouton rapide uniquement en Nouveau/Contacté ;
- sélecteur uniquement en Nouveau/Contacté et limité à l'étape suivante ;
- passage Négociation exposé seulement depuis Offre ;
- conversion vente visible seulement en Offre/Négociation ;
- aucun glisser-déposer Kanban.

Il faut un sélecteur complet de toutes les destinations lorsque la source n'est pas terminale, la collecte du motif avant Perdu, et un déplacement Kanban optionnel qui appelle exactement le même hook de transition. Les cartes terminales restent immobiles.

### 8.2 Indépendance des opérations

- **Rendez-vous** : la création est déjà autorisée sur tout non-terminal ; les règles de modification contiennent encore une notion de dépassement d'étape (`appointmentStageConflict`) à revoir.
- **Essai** : `requireCrmAppointmentForTestDrive()` exige `stage='appointment'` et `markCrmTestDriveStarted()` impose le passage automatique à `test_drive`. La présence d'un rendez-vous peut rester une règle propre à l'essai, mais l'étape CRM ne doit pas l'être et le démarrage ne doit pas déplacer automatiquement la colonne.
- **Devis** : l'export `create()` appelle `createFlexible()` ; l'ancienne `createLegacy()` impose essai/étape et doit être supprimée ou clairement isolée pour éviter une réactivation accidentelle. Vérifier que `createFlexible()` ne conditionne pas la création à l'étape.
- **Pro forma** : aucune restriction d'étape explicite n'a été relevée ; conserver les scopes client/opportunité.
- **Vente** : `sale.service.ts` refuse hors Offre/Négociation. Retirer cette condition, conserver devis émis/archivé, client, propriétaire, scope, véhicule disponible et unicité. La vente réussie place actuellement l'opportunité en Gagné : ce sens opération métier → état reste cohérent et ne viole pas la règle « un changement d'étape ne crée pas d'opération ». Il doit être documenté et testé.

### 8.3 Filtres, compteurs et temps réel

Les transitions libres ne modifient ni le modèle des étapes ni les compteurs. Après mutation, invalider les mêmes queries et conserver `publishCrmLeadUpdated`. Tester les déplacements rapides successifs, la concurrence et l'absence de duplication d'activité.

## 9. Analyse des permissions

Permissions existantes à réutiliser :

- Stock : `vehicles.view`, `vehicles.create`, `vehicles.update`, `vehicles.status.update`, `vehicles.images.manage`, `vehicles.financials.view`, `vehicles.assign_agency` ;
- profil de version : `vehicles.catalog.view`, `vehicles.catalog.manage` ;
- devis : `quotations.*` et permissions de remise/taxe ;
- pro formas : `proformas.view/create/update/issue/export` ;
- CRM : `crm.pipeline.advance`, `crm.prospect.lose`, permissions rendez-vous/essai/prospect ;
- GED : permissions de consultation/gestion et contrôles d'archive existants.

Règles recommandées :

1. Créer une unité : `vehicles.create` sur l'agence cible.
2. Lire le profil commun associé : `vehicles.catalog.view`; à défaut, afficher au minimum les données déjà nécessaires à la fiche accessible, sans exposer un registre global supplémentaire.
3. Modifier le profil commun : `vehicles.catalog.manage`, idéalement réservé à un scope GLOBAL ou à une gouvernance centrale. Un profil technique ne doit pas être dupliqué par agence.
4. Gérer photos individuelles : `vehicles.images.manage` avec scope de l'unité.
5. Gérer galerie commune : `vehicles.catalog.manage`.
6. Générer depuis une fiche : intersection effective de l'accès au véhicule et de `proformas.create` ; l'API revalide les deux.
7. Aucune règle basée sur `SUPER_ADMIN`, Commercial ou un autre nom de rôle : uniquement les permissions dynamiques et scopes.

La migration 103 attribue les nouvelles permissions au Super Admin. Le lot doit tester la délégation aux rôles métier sans les rendre implicitement globales.

## 10. Analyse des migrations

### 10.1 État structurel

- Baseline : `brands` → `models` → `versions` → `vehicles` ; `vehicles.version_id` est une FK et les identités textuelles restent accessibles via les jointures.
- Migration 103 : `commercial_models.version_id` unique, images en cascade, références devis/pro forma en `ON DELETE SET NULL`, snapshots persistants.
- Les tables catalogue ne sont pas orphelines : elles sont référencées par `quotation_items` et `proforma_items`.

### 10.2 Stratégie

Ne pas modifier 103 si elle a pu être appliquée. Pour le besoin principal, aucune modification SQL n'est obligatoire : l'intégration UI et la résolution serveur suffisent. Si le développement démontre un besoin non représenté, créer la prochaine migration disponible, additive et idempotente selon le runner, après vérification de `schema_migrations` dans l'environnement ciblé.

Ajouts seulement si justifiés : métadonnées d'auteur/mise à jour du profil, index de recherche mesuré, ou colonne de révision pour concurrence optimiste. Ne pas déplacer les 25 champs dans `vehicles`, ne pas supprimer les tables, ne pas réécrire les snapshots.

### 10.3 Compatibilité historique

Les unités existantes sans profil commun continuent avec leurs champs actuels. Un profil peut être créé plus tard pour leur `version_id`. Les devis/pro formas émis restent fondés sur leurs snapshots. Les liens `ON DELETE SET NULL` protègent les documents, mais aucune suppression de profil ne doit être ajoutée sans politique explicite.

## 11. Risques et dépendances

| Risque | Conséquence | Protection requise |
|---|---|---|
| Doublons marque/modèle/version issus du texte libre | Plusieurs profils pour une même version métier | Sélecteurs normalisés, recherche insensible, création contrôlée |
| Édition d'un profil partagé | Tous les affichages courants changent | Avertissement, audit, concurrence optimiste ; snapshots pour l'historique |
| Confusion photos communes/individuelles | Mauvaise photo sur document | Deux galeries nommées et sélection explicite |
| Recalcul d'un document émis | Rupture d'intégrité | Toujours servir l'archive GED/snapshot |
| Suppression de l'écran catalogue | Liens et usages cassés | Redirection/compatibilité, API conservée |
| Scope territorial sur une donnée globale | Copies contradictoires | Écriture centrale, lecture liée au véhicule accessible |
| Retrait des gardes CRM trop large | Opération métier invalide | Retirer seulement les conditions d'étape, garder toutes les validations propres |
| Vente depuis une étape quelconque | Passage à Gagné inattendu | Message explicite et test du side-effect existant |
| Rapports fondés sur colonnes véhicule | Valeurs différentes du profil | Ne pas changer silencieusement les sources financières/reporting |
| Tests autour de `createLegacy()` | Faux sentiment de couverture | Supprimer/archiver le code mort et cibler `createFlexible()` |

Dépendances majeures : calculs de devis/vente, génération PDF, archive GED, services d'images, scopes RBAC, notifications Socket.IO, réservations et disponibilité du véhicule.

## 12. Architecture recommandée

### 12.1 Modèle logique

```text
brands 1─N models 1─N versions
                         │
                         ├─1 commercial_models (fiche technique commune interne)
                         │       └─N commercial_model_images (galerie commune)
                         │
                         └─N vehicles (unités physiques / VIN)
                                 ├─N vehicle_images (photos de l'unité)
                                 └─N vehicle_feature_assignments

vehicles ou commercial_models ──> quotation_items / proforma_items
                                      └─ snapshots immuables à l'émission
```

### 12.2 Frontend à modifier

- `frontend/src/modules/vehicles/VehiclesListPage.tsx` : onglets unités/modèles sur commande et point d'entrée unique.
- `frontend/src/modules/vehicles/NewVehicleModal.tsx` : sections, sélecteurs normalisés, chargement du profil de version, distinction commun/individuel.
- `frontend/src/modules/vehicles/EditVehicleModal.tsx` : mêmes sections autorisées et lien vers l'enrichissement commun selon permission.
- `frontend/src/modules/vehicles/VehicleDetailPage.tsx` : afficher la fiche résolue, distinguer les galeries, ajouter « Générer une pro forma ».
- `frontend/src/modules/vehicles/CommercialCatalogPage.tsx` : extraire des sous-composants réutilisables puis retirer comme destination principale.
- `frontend/src/modules/proformas/ProformasPage.tsx` : accepter un contexte prérempli et préserver l'éditeur multiligne.
- `frontend/src/modules/crm/CrmPage.tsx` : sélecteur libre, actions/drag-and-drop, messages terminaux.
- `frontend/src/api/erpHooks.ts` : types complets, hook profil par version, création pro forma depuis contexte véhicule.
- `frontend/src/components/layout/Sidebar.tsx` et `frontend/src/App.tsx` : navigation simplifiée et route de compatibilité.
- Extraire l'optimisation image de `NewVehicleModal.tsx` dans un utilitaire partagé.

### 12.3 Backend à modifier

- `backend-node/src/modules/vehicles/vehicle.routes.ts` : accepter/résoudre explicitement `versionId`, retourner le profil commun dans la fiche, préserver la création contrôlée de référentiel.
- `backend-node/src/modules/vehicles/commercial-catalog.routes.ts` : renommer conceptuellement les DTO en profil technique, valider les types/limites, ajouter lecture par `versionId`, concurrence/audit et gouvernance de scope.
- `backend-node/src/modules/proformas/proforma.routes.ts` : factoriser la création et enrichir les lignes véhicule côté serveur.
- `backend-node/src/modules/proformas/proforma-document.service.ts` : vérifier le rendu des 25 champs, équipements et images sélectionnées.
- `backend-node/src/modules/crm/crm.routes.ts` : matrice à conserver ; revoir seulement conflits de rendez-vous liés à l'étape.
- `backend-node/src/modules/showroom/showroom-test-drive.ts` et routes showroom : découpler étape et opération, conserver rendez-vous/ressource/disponibilité/concurrence.
- `backend-node/src/modules/sales/sale.service.ts` : retirer la garde Offre/Négociation, conserver toutes les gardes de vente.
- `backend-node/src/modules/quotations/quotation.service.ts` : confirmer `createFlexible()` comme unique chemin et retirer le code legacy inutilisé.

## 13. Plan de développement en un seul lot

1. **Contrats et tests de caractérisation** : figer création véhicule, profil de version, snapshots, transitions CRM, essai/devis/vente.
2. **DTO/résolution commune** : type complet des 25 champs et service backend `resolveVehicleTechnicalProfile` réutilisable par fiche, devis et pro forma.
3. **API Stock** : `versionId` explicite, profil par version, validations et audits sans casser le payload historique.
4. **UI Stock unifiée** : composants de sections, modèles sur commande, deux galeries, enrichissement progressif.
5. **Pro forma depuis véhicule** : préremplissage, résolution serveur, images, multivéhicule, PDF et GED.
6. **CRM libre** : sélecteur/Kanban puis retrait ciblé des dépendances d'étape dans rendez-vous/essai/vente.
7. **Navigation** : masquer le catalogue autonome, conserver redirection et registre pro forma.
8. **Migration additive si et seulement si démontrée** : test vierge, séquentiel, reprise partielle et compatibilité 103.
9. **Qualification intégrale** : frontend/backend, MySQL isolé, HTTP multi-profils, PDF/GED et navigateur.
10. **Documentation et décision de livraison** : inventaire des écarts restants et procédure de déploiement séparée.

## 14. Scénarios de validation

### Stock et profil commun

1. Créer une unité avec seuls VIN/marque/modèle/version/agence requis, puis enrichir.
2. Créer une version et ses 25 champs, puis une première unité.
3. Créer une seconde unité de la même version : profil proposé sans duplication.
4. Modifier un champ commun avec droit ; vérifier les deux fiches et l'audit.
5. Modifier un champ individuel ; vérifier que l'autre unité ne change pas.
6. Refuser VIN dupliqué, version invalide, agence hors scope et profil modifié sans permission.
7. Gérer séparément galerie commune et photos individuelles, maximum, ordre, principale et suppression.
8. Afficher un modèle sur commande sans créer de véhicule ni modifier les compteurs de stock.
9. Vérifier une unité historique sans `commercial_models`.

### Pro formas

10. Depuis une fiche, créer un brouillon prérempli avec destinataire.
11. Vérifier marque/modèle/version/VIN, profil, équipements, prix, garantie et photos.
12. Modifier le brouillon puis émettre ; contrôler numéro, PDF, snapshots et GED.
13. Modifier ensuite véhicule/profil/image ; le document émis reste identique.
14. Créer une pro forma multivéhicule mélangeant unités physiques et modèle sur commande.
15. Tester idempotence, taxes, remises, scopes, client hors agence et permissions manquantes.

### CRM

16. Tester chaque non-terminal vers chaque autre étape, avant/arrière et saut.
17. Tester Nouveau → Gagné et Nouveau → Perdu avec motif/droit.
18. Refuser toute sortie de Gagné/Perdu et toute concurrence de transition.
19. Créer rendez-vous, essai, devis, pro forma et vente depuis diverses étapes non terminales sans mouvement implicite, sauf vente → Gagné explicitement conservé.
20. Vérifier règles propres : rendez-vous, retour d'essai, véhicule disponible, devis émis/archivé, marge, ownership et RBAC.
21. Vérifier Kanban, filtres, compteurs, pagination, temps réel, historique et notifications.

### Non-régression

22. Réservations, livraisons, vente d'une unité, retours et rapports de stock.
23. Devis/pro formas historiques, PDF et archives GED.
24. Installation vierge et migration depuis un schéma avec 103, sur MySQL 8.4 isolé.
25. Tests frontend/backend complets, lint, builds et `git diff --check`.

## 15. Questions métier résiduelles

Une seule décision est indispensable avant développement :

**Une vente validée doit-elle continuer à positionner automatiquement l'opportunité à Gagné ?**

Recommandation : oui. Une vente est un fait métier probant ; conserver l'effet actuel de `sale.service.ts` maintient la cohérence commerciale. Cela respecte la règle selon laquelle un simple changement d'étape ne crée jamais une vente. Si l'exigence vise une indépendance absolument bidirectionnelle, le lot devra retirer cet effet et accepter qu'une vente existe sur une opportunité encore « Nouveau », avec un risque fort d'incohérence des tableaux CRM.

Toutes les autres décisions peuvent être prises sans question supplémentaire : conserver le référentiel technique interne, garder les documents multivéhicules, ne pas créer de faux stock et rendre l'édition du profil commun explicitement globale/gouvernée.

---

### Conclusion d'audit

Le projet dispose déjà des fondations nécessaires. Le lot unique doit intégrer, factoriser et découpler, non réécrire : Stock comme façade unique, `commercial_models` comme fiche technique interne de version, `vehicles` pour les unités, création pro forma préremplie avec snapshots existants, et pipeline libre dans l'interface comme dans les opérations. Aucun développement ni aucune migration n'a été exécuté pendant cet audit.

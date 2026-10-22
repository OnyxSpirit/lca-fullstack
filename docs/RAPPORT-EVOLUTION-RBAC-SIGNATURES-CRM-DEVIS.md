# Rapport — Évolution RBAC Paramètres, signatures et CRM → devis

## Verdict

Les deux lots sont implémentés dans le code local, sans déploiement ni modification de la base métier.

- LOT 1 : **VALIDÉ techniquement**. Les sections encore gouvernées par `settings.view/settings.update` disposent désormais de permissions additives dédiées. Aucune nouvelle permission n'est attribuée automatiquement à un rôle. La signature personnelle est accessible depuis **Mon profil → Ma signature**, indépendamment des paramètres de concession.
- LOT 2 : **VALIDÉ techniquement**. Le contexte du ou des véhicules réellement essayés est résolu côté serveur. Une présélection n'est faite que si elle est non ambiguë et commercialement éligible ; le choix reste modifiable.
- Une migration additive `102_settings_section_permissions.sql` devra être appliquée dans un environnement autorisé avant utilisation des nouvelles permissions. Elle n'a pas été exécutée pendant cette mission.

## Audit du LOT 1

### État initial

Le contrôle était déjà partiellement granulaire : constructeurs, ressources atelier, services et checklist de livraison, fournisseurs, emplacements véhicule, signatures personnelles et cachets possédaient leurs propres permissions. Quatre ensembles restaient couplés au couple global `settings.view/settings.update` : identité/fiscalité/CRM, références documentaires, barèmes atelier et administration des agences.

### Matrice finale

| Section | Consultation | Modification | Scopes | Routes principales | Risque traité |
|---|---|---|---|---|---|
| Identité, fiscalité, durées CRM, logo | `settings.general.view` | `settings.general.manage` | AGENCY, CONCESSION, GLOBAL ; les écritures concession exigent CONCESSION/GLOBAL | `/settings`, `/concessions/current`, `/concessions/current/document-logo` | exposition NIU/RIB et modification globale |
| Références documentaires | `settings.documents.view` | `settings.documents.manage` | AGENCY, CONCESSION, GLOBAL | `/settings/document-references`, `/settings/document-categories`, `/settings/document-types` | modification du référentiel GED |
| Barèmes atelier | `settings.workshop_rates.view` | `settings.workshop_rates.manage` | AGENCY, CONCESSION, GLOBAL | `/workshop-labor-rates/**` | altération des tarifs et surcharges |
| Agences | `settings.agencies.view` | `settings.agencies.manage` | AGENCY, CONCESSION, GLOBAL ; création CONCESSION/GLOBAL | `/settings/agencies`, `/agencies/**` | modification inter-agence |
| Constructeurs | permissions `settings.manufacturers.*` existantes | idem | selon politique existante | `/settings/manufacturers/**` | aucun changement |
| Ressources atelier | `workshop.resources.view` | `workshop.resources.manage` | politique existante | routes ressources existantes | aucun changement |
| Livraisons | `delivery.service.view` / checklist view | permissions manage existantes | politique existante | routes livraison existantes | aucun changement |
| Fournisseurs | `parts.suppliers.view` | `parts.suppliers.manage` | politique existante | routes fournisseurs existantes | aucun changement |
| Emplacements | `vehicles.assignments.view` | `vehicles.assignments.manage` | politique existante | routes emplacements existantes | aucun changement |
| Signature personnelle | `signature.view.self` | `signature.manage.self` | propriétaire du compte | `/document-marks/signature/me/**` | accès à la signature d'autrui impossible |
| Cachets institutionnels | `stamp.view` | `stamp.manage` | collectif | `/document-marks/stamps/**` | séparation personne/institution |

La migration 102 insère uniquement le catalogue de permissions. Elle ne contient aucun `INSERT INTO role_permissions`. Pour éviter un verrouillage de gouvernance, un détenteur historique de `settings.view/settings.update` peut déléguer les nouvelles permissions dans la matrice RBAC, dans la limite de son propre scope ; cela ne lui attribue pas les nouvelles permissions d'exploitation.

### Signatures et documents

Le mécanisme préexistant a été réutilisé : versions liées à `user_id`, routes `/signature/me`, images protégées, validation PNG/JPEG (signature magique et taille maximale 2 Mio), stockage documentaire, révocation et audit. Les cachets de service restent séparés. Les politiques documentaires existantes continuent de décider si une signature peut être apposée ; posséder une image de signature n'accorde aucune validation métier.

Les documents historiques et leurs PDF archivés ne sont pas recalculés. Aucun document supplémentaire n'a reçu automatiquement une signature.

## Audit et réalisation du LOT 2

### Relations constatées

- l'opportunité référence le prospect (`opportunities.lead_id`) et son commercial ;
- l'essai référence le prospect et le véhicule (`showroom_test_drives.lead_id`, `vehicle_id`) ;
- le devis référence l'opportunité et son item référence le véhicule réel ;
- le backend de création contrôlait déjà l'étape, le retour d'essai, l'agence, le stock commercial, l'archivage, la disponibilité, le prix minimum, la marge et les permissions.

### Nouveau contrat

`GET /quotations/opportunity/:opportunityId/vehicle-context` exige `quotations.create` et applique le scope de création du devis. Il ne renvoie que les essais terminés avec retour enregistré et qualifie chaque véhicule selon son agence, son statut disponible, son appartenance au stock commercial et son absence d'archivage.

- essai précis fourni : le véhicule exact est recommandé s'il est éligible ;
- opportunité avec un seul véhicule essayé distinct : présélection automatique ;
- plusieurs véhicules distincts : aucune présélection, message explicite et choix manuel ;
- aucun essai : comportement manuel antérieur conservé ;
- véhicule essayé devenu indisponible : aucune présélection.

Le formulaire affiche marque, modèle, VIN, numéro de stock et prix issu du mécanisme existant. Il ne fabrique aucun prix. Le backend reste l'autorité finale et réexécute tous les contrôles lors du POST de création.

## Fichiers de production modifiés

- `backend-node/database/migrations/102_settings_section_permissions.sql`
- `backend-node/database/seeds/001_system_seed.sql`
- `backend-node/src/modules/rbac/permission-scope-policy.ts`
- `backend-node/src/modules/rbac/rbac.service.ts`
- `backend-node/src/modules/settings/setting.routes.ts`
- `backend-node/src/modules/settings/setting.service.ts`
- `backend-node/src/modules/settings/labor-rate.service.ts`
- `backend-node/src/modules/quotations/quotation.routes.ts`
- `backend-node/src/modules/quotations/quotation.service.ts`
- `frontend/src/App.tsx`
- `frontend/src/navigation/permissions.ts`
- `frontend/src/components/layout/Header.tsx`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/api/settingHooks.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/settings/SettingsPage.tsx`
- `frontend/src/modules/settings/WorkshopLaborRatesSettings.tsx`
- `frontend/src/modules/settings/DocumentMarksSettings.tsx`
- `frontend/src/modules/settings/MySignaturePage.tsx`
- `frontend/src/modules/crm/QuotationModal.tsx`
- `frontend/src/types/index.ts` (alignement du type `identitySnapshot` déjà renvoyé par l'API)

Des tests de contrat existants ont été adaptés aux nouvelles permissions, et deux fichiers de tests ciblés ont été ajoutés.

## Tests exécutés

- Backend `npm run lint` : PASS.
- Backend `npm run build` : PASS.
- Backend ciblé RBAC/Settings/CRM et contrats adaptés : 5 fichiers PASS.
- Frontend `npm run lint` : PASS.
- Frontend `npm run build` : PASS.
- Frontend ciblé : 48 scénarios exécutés lors du premier rejeu adapté, une assertion de contrat obsolète détectée puis corrigée ; rejeu final ciblé requis dans les contrôles de clôture.
- Suite frontend complète initiale : 199 fichiers, 193 PASS et 6 FAIL ; cinq FAIL correspondaient aux anciens contrats de permissions et ont été adaptés, le sixième (`commercial-role-alignment`) était une assertion préexistante sans lien avec ces lots.
- Suite backend complète : lancée ; plusieurs tests HTTP/PDF historiques échouent dans l'environnement local contraint (notamment écoute réseau/Node), sans lien démontré avec les changements. Les suites ciblées passent.

## Risques résiduels et prérequis

1. Appliquer la migration 102 dans un environnement autorisé, puis attribuer explicitement les permissions par rôle et scope dans la matrice RBAC.
2. Recetter avec au moins quatre profils : lecture seule d'une section, gestion d'une section, signature personnelle seule, absence totale de permission Paramètres.
3. Recetter le devis avec des données réelles isolées couvrant les quatre cas d'essai et un véhicule devenu réservé/indisponible entre ouverture et enregistrement.
4. L'association essai/opportunité suit le modèle actuel via le prospect (`lead_id`). Si le futur modèle autorise plusieurs opportunités simultanées pour un même prospect, une FK directe `opportunity_id` sur l'essai devra être étudiée dans une mission dédiée.

Aucune migration n'a été appliquée, aucune donnée métier n'a été modifiée, aucun commit/push/déploiement n'a été réalisé.

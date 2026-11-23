# Audit des paramètres de concession

## Cartographie

| Fonction | Frontend | API / permission | Stockage | Résultat |
|---|---|---|---|---|
| Identité/fiscalité | `SettingsPage` | `PATCH /concessions/current`, `settings.general.manage` | `concessions` | utilisateur ordinaire bloqué |
| Logo documentaire | `SettingsPage`, `documentLogoAccess` | PUT/DELETE `/concessions/current/document-logo` | BLOB + MIME | utilisateur ordinaire bloqué |
| Paramètres métier | `SettingsPage` | `PUT /settings` | `settings` | central, Super Admin seul |
| Agences | `SettingsPage` | POST/PATCH `/agencies` | `agencies` | central, Super Admin seul |
| Signatures | `DocumentMarksSettings` | `/document-marks/signature/me`, permissions `.self` | versions signature | propriété utilisateur cohérente |
| Cachets/catégories | `DocumentMarksSettings` | `/document-marks/stamps|categories`, `stamp.*` | tables cachets | création UI cassée |
| Documents/types | `DocumentReferencesSettings` | `/settings/document-*` | référentiels GED | central, Super Admin seul |
| Constructeurs | `ManufacturersSettings` | `/settings/manufacturers` | `warranty_providers` | même blocage central, y compris lecture |
| Services livraison | `DeliveryServicesSettings` | `/delivery-services/catalog` | catalogue concession | gestion centrale Super Admin seul |
| Checklist livraison | `DeliveryChecklistTemplates` | routes checklist | modèles concession | gestion centrale Super Admin seul |
| Barèmes atelier | `WorkshopLaborRatesSettings` | `/workshop-labor-rates` | barèmes concession | écriture centrale Super Admin seul |
| Fournisseurs | `SuppliersSettings` | permissions pièces | fournisseurs | contrôles métier/agence séparés |
| Parcs/showrooms/garages | `VehicleLocationsSettings` | `vehicles.assignments.*` | emplacements véhicule | permission dynamique |

## Parcours exact — cachets

1. Le formulaire conserve `{name, categoryId, documentContexts}` et un fichier.
2. Le hook sait techniquement accepter `agencyId?`, mais ne l'ajoute que s'il est présent.
3. Le multipart arrive avec `agencyId=null`.
4. `assertPermission` retourne `AGENCY` pour le Super Admin local comme pour un rôle habilité.
5. `target()` teste `agencyId !== activeAgencyId`; `null` échoue et génère le message constaté.
6. La catégorie appelle le même helper avec `null`, donc elle échoue aussi.

Il ne s'agit pas de `GLOBAL`/`CONCESSION`. La « portée cachet » est ici une cible métier, tandis que `AGENCY` est le scope RBAC.

## Parcours exact — identité et logo

Le frontend rend les champs éditables dès que `can('settings.general.manage')` est vrai. Le logo ajoute une vérification `scope === 'AGENCY'`. Les requêtes sont donc proposées à un utilisateur ordinaire habilité.

Les routes utilisent ensuite `requireCentralAgencyPermission`; ce helper exige `isSuperAdmin`. Le service répète l'autorisation dans une transaction centrale. Le refus intervient avant l'écriture, indépendamment de la validité du logo ou des données fiscales.

La validation de logo limite à 2 Mio, accepte PNG/JPEG, vérifie le Data URL, le MIME et des octets magiques avant stockage. Le défaut constaté est l'autorisation, pas l'upload.

## Décisions nécessaires

1. Déterminer si un cachet est exclusivement d'agence ou peut appartenir à la concession.
2. Définir les permissions de concession délégables et les opérations réellement réservées au rôle système.
3. Aligner l'affichage frontend et l'autorisation backend sur ce modèle unique.

# Rapport technique — évolutions CRM et documents commerciaux

## Synthèse

La livraison locale introduit la migration additive `103_crm_commercial_documents.sql`, la forme juridique de la concession, un catalogue commercial distinct du stock physique, les devis multivéhicules et le domaine des factures pro forma. Aucune migration n'a été appliquée à la base métier, aucun déploiement, commit ou push n'a été réalisé.

L'état actuel est **partiellement qualifié** : les compilations, lints, contrôles de diff et tests ciblés principaux passent. La migration n'a pas encore été rejouée sur une instance MySQL 8.4 isolée et la recette navigateur complète reste à effectuer. Les réserves fonctionnelles encore ouvertes sont listées explicitement ci-dessous.

## Modifications techniques

### Paramètres et documents officiels

- Ajout de `concessions.legal_form` et exposition dans les types, le resolver, le service et le formulaire Paramètres.
- Inclusion de la forme juridique dans l'identité des documents générés.
- Conservation du snapshot d'identité lors de l'émission : une modification ultérieure des paramètres ne réécrit pas une archive historique.

### Catalogue et stock véhicules

- Création de `commercial_models` et `commercial_model_images`.
- Caractéristiques techniques structurées, prix catalogue, disponibilité, délai et spécifications additionnelles JSON.
- API RBAC de consultation/création/modification du catalogue.
- Photos rendues facultatives à la création d'un véhicule physique.
- Les lectures du stock utilisent des jointures externes et les champs d'identité de secours lorsque `version_id` est absent.

### CRM

- Catégories : Particulier, Société, Administration et Institution.
- Transitions manuelles flexibles entre les étapes non terminales ; Gagné et Perdu restent terminaux.
- La création de devis n'exige plus un essai routier terminé.
- La vue Liste devient la vue initiale.

### Devis

- Création depuis une opportunité ou directement depuis un client côté API.
- Une à vingt lignes, mélangeant véhicules physiques et modèles du catalogue.
- Quantité forcée à 1 pour un VIN physique ; quantité libre et positive pour un modèle sur commande.
- Contrôles de disponibilité, agence, marge, prix plancher, fiscalité et permission de remise conservés.
- Clé `client_request_id` pour l'idempotence.
- Snapshots de disponibilité et caractéristiques.
- Lecture regroupée des lignes afin d'éviter la duplication d'un devis dans les listes.
- Interface CRM multiligne utilisant stock physique et catalogue.

### Factures pro forma

- Tables `proformas` et `proforma_items`.
- Création directe depuis un client ou transformation idempotente d'un devis.
- Transformation automatique des lignes et snapshots du devis source.
- Modification réservée au statut Brouillon ; émission irréversible avec numéro, snapshot d'identité, PDF et archive GED.
- Scopes OWN, AGENCY, CONCESSION et GLOBAL appliqués par permission.
- PDF centralisé via le moteur documentaire existant.

## Migration

- Nouvelle migration : `103_crm_commercial_documents.sql`, après `102_settings_section_permissions.sql`.
- Nature : additive, sans `DROP`, `TRUNCATE` ni suppression de données.
- Elle étend les ENUM clients/prospects, ajoute les tables de catalogue/pro forma et enrichit devis/lignes.
- Elle ajoute les permissions et les attribue uniquement au rôle système `SUPER_ADMIN`; les délégations métier restent administrables via la matrice dynamique.
- Précaution : exécuter d'abord sur une copie MySQL 8.4 isolée avec le runner officiel, puis contrôler `schema_migrations`, `schema_migration_steps`, les FK, CHECK et index avant autorisation sur la base métier.

## Permissions

- `vehicles.catalog.view`
- `vehicles.catalog.manage`
- `proformas.view`
- `proformas.create`
- `proformas.update`
- `proformas.issue`
- `proformas.export`

Les permissions existantes des devis, clients, ventes, remises et dérogations fiscales sont réutilisées. Aucune exception fondée sur un nom de rôle n'a été ajoutée dans les routes métier.

## Tests et contrôles exécutés

- Backend `npm run build` : PASS.
- Backend `npm run lint` : PASS.
- Frontend `npm run build` : PASS.
- Frontend `npm run lint` : PASS.
- `git diff --check` : PASS.
- Tests ciblés :
  - `crm-commercial-documents-103.test.ts` : PASS.
  - `crm-stage-transition-matrix.test.ts` : PASS.
  - `quotation-negotiation-issuance.test.ts` : PASS.
  - `settings-rbac-crm-quotation-evolution.test.ts` : PASS.
- `crm-appointment-endpoint.test.ts` : FAIL au niveau fichier après adaptation du contrat attendu ; ce test et l'implémentation historique du rendez-vous doivent être réalignés avant validation complète.

Non exécutés : migration réelle MySQL 8.4 isolée, suite backend/frontend complète, tests HTTP authentifiés, recette navigateur et inspection visuelle des PDF.

## Réserves ouvertes

1. Le parcours historique de rendez-vous contient encore une transition automatique vers `appointment` dans sa transaction et ses contrôles de modification/annulation restent liés à cette étape. Il doit être découplé avant de considérer l'indépendance CRM totalement validée.
2. Le Kanban utilise encore la pagination globale existante ; la pagination indépendante par colonne n'est pas finalisée.
3. L'API de catalogue ne propose pas encore le téléversement/suppression transactionnels des photographies.
4. Le backend pro forma est disponible, mais les écrans complets de liste, édition, émission, recherche de document existant et transformation depuis la fiche CRM restent à intégrer.
5. Le PDF pro forma réutilise la présentation commerciale centralisée, mais l'impression détaillée des fiches techniques et photographies sélectionnées reste à compléter et à contrôler visuellement.
6. La modification d'un devis multiligne existant et la conversion en vente doivent encore être adaptées/qualifiées pour plusieurs lignes et modèles sans VIN.

## Parcours de recette utilisateur

Après application autorisée de la migration 103 dans un environnement de recette :

1. Paramètres → Identité : saisir une forme juridique, enregistrer, générer un nouveau document et vérifier l'en-tête.
2. Stock véhicules : créer un véhicule sans photo puis avec photo ; vérifier également un véhicule historique sans version normalisée.
3. Catalogue commercial : avec `vehicles.catalog.manage`, créer un modèle, renseigner toutes les caractéristiques et vérifier sa consultation avec `vehicles.catalog.view`.
4. CRM : créer successivement un Particulier, une Société, une Administration et une Institution.
5. CRM → fiche prospect : changer librement d'étape non terminale, puis créer un devis sans essai préalable.
6. Devis : ajouter plusieurs véhicules physiques et/ou modèles sur commande, vérifier quantités, prix, remises, TVA, total, PDF et archive après émission.
7. Pro forma : créer directement pour un client puis transformer un devis ; rejouer la transformation et vérifier qu'aucun doublon n'est créé.
8. Vérifier un utilisateur OWN, AGENCY, CONCESSION, GLOBAL et un utilisateur sans permission sur catalogue, devis et pro formas.
9. Vérifier que les archives émises restent identiques après modification de l'identité de concession.

## État Git

- Modifications laissées non commitées.
- Aucun commit, push, tag, changement de branche ou déploiement.
- Le fichier préexistant non suivi `docs/RAPPORT-RECETTE-CRM-SHOWROOM-CRM03.md` a été préservé et n'a pas été modifié.

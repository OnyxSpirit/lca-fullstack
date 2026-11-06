# Rapport de finalisation — CRM et documents commerciaux

## Verdict

Le périmètre local CRM, Stock véhicules, catalogue commercial, devis multivéhicules et factures pro forma est **finalisé et qualifié techniquement**. La migration 103 a été validée avec le runner officiel sur MySQL 8.4 isolé, les compilations et lints passent, la suite frontend complète est verte et les réserves backend détectées pendant la campagne ont été corrigées puis rejouées.

Aucune migration n'a été appliquée à une base métier. Aucun service existant, volume métier, déploiement, commit ou push n'a été réalisé.

## Fonctionnalités finalisées

### CRM et rendez-vous

- Les rendez-vous sont indépendants de l'étape du pipeline : création, modification et annulation ne déplacent plus automatiquement l'opportunité.
- Les transitions manuelles non terminales sont flexibles ; `won` et `lost` restent terminaux.
- La vue Liste est l'affichage initial.
- Le Kanban interroge et pagine chaque colonne indépendamment, avec agrégats serveur et chargement progressif.
- La création d'un devis n'est plus conditionnée dans l'interface par un rendez-vous ou un essai routier.

### Catalogue commercial et Stock

- Écran complet de catalogue : recherche, création et modification des caractéristiques, disponibilité, prix et délais.
- Galerie indépendante du stock physique : ajout optimisé, maximum de huit images, image principale, ordre et suppression confirmée par le dialogue ERP.
- Les photos restent facultatives lors de la création d'un véhicule physique.
- Les véhicules historiques sans version normalisée restent lisibles grâce aux champs d'identité de secours et aux jointures externes.

### Devis multivéhicules

- Une à vingt lignes mélangeant VIN physiques et modèles sur commande.
- Quantité égale à 1 pour un VIN ; quantité positive libre pour un modèle de catalogue.
- Contrôles d'agence, disponibilité, marge, prix plancher, remise, TVA et permissions conservés côté serveur.
- Création et modification des brouillons multiligne, idempotence par clé client et snapshots techniques/disponibilité.
- Conversion protégée : les lignes sans VIN ne peuvent pas produire silencieusement une vente incohérente.

### Factures pro forma

- Liste paginée, recherche, consultation, création directe depuis un client ou un prospect CRM et transformation idempotente d'un devis.
- Modification limitée au brouillon, avec conservation des photographies sélectionnées lors d'une réédition.
- Modalités de paiement, garantie, disponibilité, livraison, notes, lignes, quantités et remises prises en charge.
- Émission irréversible avec numéro, snapshot de l'identité légale, snapshot du client, PDF et archive GED.
- Le PDF utilise le moteur documentaire partagé et inclut les caractéristiques et photographies sélectionnées.
- Scopes `OWN`, `AGENCY`, `CONCESSION` et `GLOBAL` appliqués par les permissions dynamiques.

### Paramètres et RBAC

- Forme juridique intégrée à l'identité concession et aux documents.
- Permissions ajoutées : `vehicles.catalog.view`, `vehicles.catalog.manage`, `proformas.view`, `proformas.create`, `proformas.update`, `proformas.issue`, `proformas.export`.
- Aucun contournement fondé sur le nom d'un rôle n'a été introduit.
- Le contrat de permission agences a été réaligné sur `settings.agencies.view`/`settings.agencies.manage`.

## Migration 103

La migration `backend-node/database/migrations/103_crm_commercial_documents.sql` est additive. Elle ajoute le catalogue, les galeries, les pro formas, les extensions des devis, les catégories CRM et les permissions.

Qualification réalisée sur un conteneur temporaire MySQL 8.4 avec stockage `tmpfs` :

- séquence complète baseline → migration 103 : PASS ;
- reprise du runner sur schéma déjà à niveau : PASS (`VERSIONED`, niveau supérieur ou égal à 103) ;
- migration 103 enregistrée dans `schema_migrations` : PASS ;
- onze étapes 103 enregistrées `APPLIED` : PASS ;
- tables, colonnes snapshot, sept permissions, clés étrangères et index attendus : PASS ;
- aucune duplication à la seconde exécution : PASS.

Une incompatibilité MySQL 8.4 a été trouvée pendant la première exécution : un `CHECK` imposant la présence d'une référence entrait en conflit avec une clé étrangère `ON DELETE SET NULL`. La migration encore non appliquée a été corrigée en supprimant uniquement ce `CHECK` incompatible. L'invariant reste vérifié transactionnellement par l'application ; les autres contraintes, dont les quantités positives et les clés étrangères, sont conservées.

## Tests exécutés

### Frontend

- `npm run lint` : PASS.
- `npm run build` : PASS, 2 521 modules transformés.
- suite complète via Node/tsx séquentiel : **203/203 PASS**, 0 échec, 0 skip.
- test du workflow commercial final : PASS.
- absence de dialogue natif navigateur : PASS.

Le lancement `npm test` standard ne peut pas ouvrir le canal IPC `tsx` dans le bac à sable. La même collection a donc été exécutée directement avec `node --import tsx --test --test-concurrency=1`, sans modifier ni ignorer de test.

### Backend

- `npm run lint` : PASS.
- `npm run build` : PASS.
- test HTTP principal `app.test.ts` : **119/119 PASS**.
- matrice RBAC Stock véhicules : **105/105 PASS**.
- contrats documentaires, RBAC, prix/snapshots et essai routier : **29/29 PASS**.
- tests CRM ciblés (documents 103, étapes, rendez-vous, négociation et RBAC devis) : **29/29 PASS**.
- suite backend complète : **2 045 tests, 1 954 PASS, 0 échec, 91 SKIP**. Les skips correspondent aux scénarios opt-in nécessitant leur infrastructure dédiée ; aucun test exécuté n'a échoué.

### Contrôles complémentaires

- PDF multipage et snapshots documentaires couverts par les tests backend : PASS.
- `git diff --check` : exécuté en clôture.
- aucune valeur secrète ni donnée métier n'a été introduite.

## Corrections de tests et fixtures

Les tests n'ont pas été supprimés. Les contrats devenus historiques ont été alignés sur les règles validées : rendez-vous découplés, Kanban par colonne, devis multivéhicules, disponibilité du devis indépendante de l'essai et forme juridique. La fixture SQL Stock reconnaît désormais les jointures externes utilisées pour les véhicules historiques, sans assouplir les assertions de scope, finance, transfert ou rollback.

## Fichiers principaux concernés

- Migration : `backend-node/database/migrations/103_crm_commercial_documents.sql`.
- Backend : routes/services CRM, catalogue, véhicules, devis, pro formas, ventes, paramètres et documents.
- Frontend : routes/navigation, hooks ERP, pages CRM, catalogue, pro formas, formulaire véhicule, devis et PDF.
- Tests : contrats CRM, documents commerciaux, RBAC, Stock, pagination, fuseau métier et dialogues.

La liste exhaustive reste visible dans le diff local, laissé volontairement non commité.

## Limites et procédure de mise en recette

- Aucune recette navigateur connectée à un schéma 103 n'a été exécutée, car l'environnement métier existant ne devait ni être reconstruit ni migré dans cette mission.
- Aucune inspection visuelle manuelle d'un PDF produit par une session métier réelle n'a été effectuée ; la génération, le format PDF, la pagination, les snapshots et l'archivage sont couverts techniquement.
- Avant mise en recette : sauvegarder la base de recette, exécuter le runner officiel, contrôler `schema_migrations` et `schema_migration_steps`, reconstruire uniquement backend/frontend, puis réaliser les parcours navigateur catalogue → devis → pro forma → PDF/GED avec des profils RBAC distincts.
- La base métier et la production restent inchangées jusqu'à autorisation explicite.

## État Git et environnement

- Modifications locales non commitées préservées.
- Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche.
- Aucun déploiement ni accès production.
- Le fichier préexistant `docs/RAPPORT-RECETTE-CRM-SHOWROOM-CRM03.md` est préservé.

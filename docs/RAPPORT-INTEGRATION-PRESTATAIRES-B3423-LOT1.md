# Rapport B.3.4.2.3 — LOT 1 — Socle Personnel et prestataires

## 1. Résultat

Le socle de données du LOT 1 est préparé et qualifié localement. Il introduit une identité Personnel commune, une relation prestataire et des rattachements agence, tout en conservant `employee_profiles` et toutes ses références historiques.

Aucune route publique prestataire, interface, contrat prestataire, rémunération, GED prestataire ou opération financière n’a été ajoutée. Les migrations 096 et 097 n’ont pas été appliquées à la base métier.

## 2. Fichiers modifiés

- `backend-node/database/migrations/097_personnel_provider_foundation.sql` : migration additive et backfill.
- `backend-node/src/modules/hr/personnel-identity.service.ts` : synchronisation transactionnelle employé → identité commune.
- `backend-node/src/modules/hr/hr-employee-sync.service.ts` : raccordement du parcours Utilisateurs & Habilitations.
- `backend-node/src/modules/hr/hr.routes.ts` : raccordement des créations/modifications/liaisons/photos du parcours RH.
- `backend-node/test/personnel-provider-foundation-b3423.test.ts` : contrats statiques du LOT 1.
- `backend-node/test/migration-097-mysql.integration.test.ts` : qualification MySQL 8.4 isolée.
- `backend-node/test/collaborator-hr-regression-b3420.test.ts` : fixture adaptée au nouveau service appelé dans la même transaction.
- `docs/RAPPORT-INTEGRATION-PRESTATAIRES-B3423-LOT1.md` : présent rapport.

La baseline n’a pas été modifiée. Elle reste consolidée en version 071 et le mécanisme normal applique ensuite les migrations futures, dont 096 puis 097. Intégrer directement les tables 097 dans cette baseline sans relever sa version ferait rejouer la migration et provoquerait un conflit ; aucune modification n’était donc nécessaire à sa cohérence.

## 3. Schéma de données final préparé

### `personnel_identities`

Identité commune avec :

- type `INDIVIDUAL` ou `COMPANY` ;
- code stable unique ;
- concession ;
- compte ERP facultatif et unique ;
- identité physique ou raison sociale/nom commercial ;
- contacts, adresse, identifiant administratif facultatif ;
- photographie/logo privé futur via `media_path` ;
- état commun ;
- acteurs et timestamps.

Une contrainte CHECK impose la cohérence personne physique/personne morale. Les FK de concession, compte et acteurs sont explicites. L’identifiant administratif reste facultatif mais devient unique dans une concession pour une même forme lorsqu’il est renseigné.

### `provider_profiles`

Relation prestataire spécialisée :

- identité commune unique ;
- code prestataire unique ;
- nature des prestations ;
- états `ACTIVE`, `SUSPENDED`, `ENDED` ;
- motifs, dates et responsables des suspensions/fins ;
- audit technique par acteurs/timestamps.

La table reste vide après backfill.

### `provider_agency_assignments`

Rattachement multi-agence :

- profil prestataire ;
- agence ;
- dates et état ;
- suspension motivée et attribuée ;
- unicité profil/agence ;
- index territorial.

La table reste vide après backfill.

### Relation salariée

`employee_profiles.personnel_identity_id` est une FK unique vers `personnel_identities`. Elle est additive et nullable au niveau SQL afin de ne pas casser les imports/fixtures historiques qui insèrent directement dans `employee_profiles`. Le backfill refuse néanmoins tout salarié historique sans identité, et les deux parcours applicatifs créent désormais cette relation dans leur transaction.

Les ID de `employee_profiles`, `salary_history`, contrats, congés, primes et rémunérations restent inchangés. Aucune FK historique n’a été remplacée.

## 4. Migration préparée

Migration disponible et utilisée : `097_personnel_provider_foundation.sql`.

Ordre des neuf étapes gérées par le runner :

1. création `personnel_identities` ;
2. création `provider_profiles` ;
3. création `provider_agency_assignments` ;
4. ajout relation 1:1 à `employee_profiles` ;
5. insertion des identités historiques ;
6. rattachement des employés historiques ;
7. contrôle des employés non rattachés ;
8. contrôle de cohérence identité/employé ;
9. contrôle d’absence de prestataire artificiel.

Les DML sont transactionnelles via le runner. Les contrôles produisent `MIGRATION_PREFLIGHT_CONFLICT` lorsqu’un groupe divergent est détecté. Les DDL restent soumis aux journaux d’étapes, checksums, reprises et postconditions existants.

## 5. Stratégie de backfill

Chaque employé historique reçoit une identité `INDIVIDUAL` dont le code déterministe est `EMP-` + son ID sur dix positions. Les valeurs reprises sont : concession, compte facultatif, prénom, nom, e-mail, téléphone, photo RH, acteurs et dates historiques.

Le backfill :

- ne change jamais l’ID employé ;
- ne met à jour que `personnel_identity_id` lorsqu’il est NULL ;
- ne crée aucune ligne dans `provider_profiles` ou `provider_agency_assignments` ;
- vérifie après écriture l’absence d’orphelin ;
- vérifie type, concession, noms et compte liés ;
- est protégé contre une duplication par le code déterministe et les contraintes uniques.

## 6. Synchronisation des nouveaux salariés

Le service `syncEmployeePersonnelIdentity` s’exécute dans la transaction métier appelante. Il verrouille le salarié, crée l’identité si elle manque, ou actualise son snapshot si elle existe.

Il est appelé par :

- création/mise à jour Oui–Non depuis Utilisateurs & Habilitations ;
- création directe depuis RH → Personnel ;
- modification d’identité/coordonnées/statut ;
- liaison et dissociation d’un compte ERP ;
- ajout/remplacement/retrait de photographie RH.

Le comportement salarié visible reste inchangé. Le statut de l’identité commune n’est pas automatiquement terminé lors d’un départ salarié, car cette identité pourra simultanément porter une relation prestataire.

## 7. Garanties de compatibilité

- migration 097 additive, sans `DROP`, `DELETE` ou `TRUNCATE` ;
- migrations 064–096 inchangées ;
- identifiants et FK salariés conservés ;
- `salary_history` et tous les workflows salariés inchangés ;
- synchronisation utilisateur/RH toujours dans la transaction de création/mise à jour ;
- aucune permission ni attribution RBAC ajoutée ;
- aucune nouvelle route publique ;
- aucune interface frontend modifiée ;
- aucune relation prestataire créée pendant le backfill ;
- aucune migration exécutée sur la base métier.

## 8. Tests réellement exécutés

### Tests ciblés backend

Commande ciblée finale : 64 tests.

Résultat : **64 PASS, 0 FAIL, 0 SKIP**.

Elle couvre :

- contrats statiques du LOT 1 ;
- B.3.4.2.0 synchronisation collaborateurs/RH ;
- B.3.4.2.1 photographies RH ;
- administration RH, schéma, salaires, stock, budgets et GED ;
- continuité de baseline et des migrations.

### MySQL 8.4 isolé

Un conteneur temporaire `mysql:8.4`, sans volume persistant et avec répertoire de données en tmpfs, a été créé uniquement pour ce test puis supprimé.

Résultat : **1 test d’intégration PASS**, couvrant quatre schémas temporaires supprimés en fin de test :

- baseline consolidée puis migration 096 puis 097 ;
- backfill d’un salarié avec salaire historique ;
- conservation exacte des ID employé et salaire/FK ;
- conservation du compte lié ;
- création d’un nouveau salarié et de son identité après migration ;
- unicité 1:1 ;
- zéro prestataire/rattachement artificiel ;
- interruption après le DDL de relation puis reprise `RECOVERED` ;
- interruption pendant le DML de backfill, rollback constaté, puis reprise ;
- suppression volontaire de la FK et détection `MIGRATION_SCHEMA_DIVERGED` à l’étape 4.

### Qualité TypeScript

- `npm run lint` backend : **PASS**.
- `npm run build` backend : **PASS**.
- `git diff --check` : **PASS** au contrôle final.

## 9. Anomalie observée

Le premier montage du test tentait de rejouer toutes les migrations 072–096 sur la baseline 071. Il a échoué dans la migration historique 094, car la baseline consolidée contient déjà les colonnes de contexte des notifications alors que son numéro reste 071. Ce comportement préexistant est hors du LOT 1 ; aucune migration historique ni baseline n’a été modifiée pour le contourner.

Le scénario a été aligné sur l’objectif exact : baseline consolidée actuelle, puis 096, puis 097. Cette séquence est PASS. L’écart de consolidation baseline/version reste à surveiller dans une future mission de gouvernance des migrations.

## 10. Risques résiduels

1. La FK identité d’un salarié reste nullable pour compatibilité avec les écritures SQL directes historiques. Les parcours applicatifs autorisés garantissent la relation ; tout nouvel import direct devra appeler le service ou renseigner la FK.
2. Le runner sait prouver les colonnes/index/FK de l’ALTER employé et détecte leur divergence. Pour une table créée, son mécanisme générique considère principalement son existence lors d’une reprise ; les tests MySQL vérifient donc explicitement la définition des nouvelles tables. Un renforcement générique du runner reste un chantier transversal hors périmètre.
3. `personnel_identities` et `employee_profiles` contiennent temporairement des snapshots communs dupliqués. Le service les synchronise pour tous les parcours actuels ; les imports SQL hors application restent responsables de leur cohérence.
4. Les règles de détection/fusion d’une personne physique déjà connue seront implémentées au LOT 2, pas dans ce socle.
5. Aucune recette fonctionnelle navigateur n’est pertinente à ce stade, puisqu’aucune interface n’a changé.

## 11. Prérequis du LOT 2

- autorisation explicite du LOT 2 ;
- application autorisée, sauvegardée et contrôlée des migrations 096 puis 097 dans l’environnement cible avant exécution du nouveau backend ;
- choix confirmé de la liaison manuelle lorsqu’aucun identifiant administratif fiable ne permet de reconnaître une personne existante ;
- définition des champs administratifs facultatifs exposés pour personne physique/morale ;
- nouvelles permissions `hr.providers.view`, `hr.providers.manage` et éventuellement `hr.provider.account.manage`, sans rôle fixe ;
- tests de scopes AGENCY/CONCESSION/GLOBAL et de non-création de compte ERP ;
- maintien de l’interdiction des routes, contrats, rémunérations et paiements prestataires tant que leurs lots ne sont pas autorisés.

## 12. Verdict

Le LOT 1 est **qualifié au niveau code, migration et MySQL 8.4 isolé**. Il ne constitue pas une validation fonctionnelle du module Prestataires. Le développement s’arrête ici conformément à la mission ; le LOT 2 n’est pas commencé.

# Rapport des corrections finales — Lot 2 LCA

Date de qualification : 12 octobre 2026  
Périmètre : gestion centralisée des signatures et cachets officiels

## 1. Résumé

Le socle introduit par la migration 069 a été étendu, sans système parallèle. Le lot ajoute les catégories de cachets, les associations cachet–rôle, les politiques documentaires, la résolution automatique côté serveur, le dessin tactile d’une signature et l’application des marques sur quatre générateurs officiellement archivés.

La compatibilité historique est conservée : en l’absence de politique active, aucun changement n’est appliqué au PDF. Un document déjà archivé est retourné avant toute résolution d’une politique actuelle et n’est jamais régénéré.

## 2. Architecture réutilisée

- Stockage GED existant (`storeDocument`, `readDocumentFile`, empreinte SHA-256).
- Tables versionnées `user_signature_versions`, `service_stamps`, `service_stamp_versions`.
- Snapshots `document_mark_snapshots`.
- Middleware RBAC dynamique et scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.
- Générateurs PDF, pied de page et archive documentaire existants.
- Flux historique du PV de livraison, laissé intact.

## 3. Fichiers créés

- `backend-node/database/migrations/080_document_mark_policies.sql`
- `backend-node/src/modules/document-marks/document-mark-policy.service.ts`
- `backend-node/test/document-marks-lot2.test.ts`
- `frontend/src/modules/settings/SignaturePad.tsx`
- `docs/RAPPORT-CORRECTIONS-FINALES-LOT2-LCA.md`

## 4. Fichiers modifiés

- `backend-node/src/modules/document-marks/document-mark.routes.ts`
- `backend-node/src/modules/documents/business-document.service.ts`
- `backend-node/src/modules/documents/commercial-document.ts`
- `backend-node/src/modules/documents/document-layout.ts`
- `frontend/src/api/documentMarkHooks.ts`
- `frontend/src/modules/settings/DocumentMarksSettings.tsx`
- `frontend/src/modules/users/RoleManagementPanel.tsx`

## 5. Modèle de données et migration

La migration additive 080 crée :

- `service_stamp_categories` : catégorie stable, unique par concession, activable et non supprimée par l’interface ;
- `service_stamp_role_authorizations` : association par identifiants réels de cachet et rôle ;
- `document_mark_policies` : politique par concession/agence et type de document ;
- `service_stamps.category_id` et élargissement maîtrisé de `document_context` ;
- `document_mark_snapshots.policy_id` et élargissement de son contexte.

Les clés étrangères sont en `RESTRICT` pour les éléments historiques. Les index couvrent la résolution par périmètre, contexte et état actif. Aucune migration antérieure n’a été réécrite.

## 6. Permissions

Aucune permission nouvelle : `signature.view.self`, `signature.manage.self`, `stamp.view`, `stamp.manage`, `stamp.use` et `document.signature.apply` sont réutilisées. L’identité de la signature personnelle vient exclusivement du JWT. Le scope `OWN` est refusé pour l’administration ou l’usage d’un cachet collectif.

## 7. Interfaces

- Signature personnelle : import PNG/JPEG ou dessin souris/tactile, modes exclusifs, effacement, prévisualisation/enregistrement, remplacement et révocation.
- Catégories : création, consultation, modification via l’API, activation et désactivation.
- Cachets : catégorie, contexte documentaire, image, nouvelle version, activation/désactivation et consultation versionnée via l’API.
- Rôles dynamiques : section « Cachets autorisés » utilisant les identifiants de rôles, avec catégorie, contexte et état actif.
- Documents officiels : politique dynamique, exigences de signature/cachet, cachet par défaut, comportement d’absence et activation.

## 8. Documents intégrés

Les marques sont résolues uniquement pendant l’événement officiel existant puis figées dans le PDF et le snapshot :

- devis commercial lors de l’émission ;
- bon de commande automobile lors de la confirmation ;
- facture lors de l’émission ;
- reçu lors de la confirmation du paiement.

Les marques sont placées sur une page de validation dédiée, dans les marges, avec conservation des proportions ; le pied de page et la pagination existants s’appliquent ensuite à toutes les pages.

## 9. Documents non intégrés

- PV de livraison : son workflow multi-acteurs, ses références de versions et ses snapshots existants sont préservés intégralement. Il reste dans le registre pour une évolution ultérieure, mais la politique 080 ne remplace pas sa résolution éprouvée.
- Ordre de réparation : l’événement exact représentant l’approbation humaine autorisée doit encore être arrêté ; une clôture technique ne suffit pas à attribuer une signature.
- PV de retour véhicule : générateur archivé présent, mais absence d’un validateur explicitement défini dans le workflow actuel.
- Fiche employé : génération à la demande sans événement officiel d’approbation stable ; le lot 1 est conservé.

## 10. Résolution automatique

1. Recherche d’une politique active correspondant au document et à la concession ; une politique agence est prioritaire sur la politique concession.
2. Contrôle de l’utilisateur actif, de ses rôles actifs et des permissions existantes.
3. Contrôle du contexte documentaire, de la concession, de l’agence, du service/département, de l’état du cachet et de sa version active.
4. Intersection avec les associations cachet–rôle.
5. Cachet par défaut utilisé seulement s’il appartient encore à l’ensemble admissible.
6. À défaut, cachet unique appliqué automatiquement.
7. En cas de pluralité, erreur métier `STAMP_SELECTION_REQUIRED` contenant uniquement les choix admissibles.
8. En absence de marque, application de `BLOCK` ou `ALLOW_WITHOUT_MARK`.

Un choix fourni par un client doit être revérifié par le même résolveur. Aucun cachet arbitraire n’est choisi.

## 11. Politique des signatures

La signature est toujours celle de l’utilisateur ayant déclenché l’action officielle. Sa permission `document.signature.apply`, son scope, son état actif et sa version active sont contrôlés. Aucune signature de tiers n’est chargée et aucun brouillon n’est signé. Il s’agit d’un fac-similé numérisé, sans affirmation de conformité à une signature électronique qualifiée.

## 12. Immutabilité et traçabilité

- Les versions remplacées restent stockées et révocables, jamais écrasées.
- Le PDF officiel contient les octets des versions résolues au moment de l’émission.
- Le snapshot enregistre le document, le contexte, la politique, le validateur, les identifiants de versions, les identités et les empreintes.
- Une recherche d’archive existante précède la politique et le rendu : une politique ajoutée plus tard ne peut ni bloquer ni modifier un PDF historique.
- Les insertions de document et de snapshot sont dans la même transaction de métadonnées.

## 13. Tests exécutés

Résultats obtenus localement :

- compilation TypeScript backend : réussie ;
- build Vite frontend : réussi, 2 490 modules transformés ;
- `document-marks-lot2.test.ts` : réussi ;
- `document-marks-lot13.test.ts` : réussi ;
- `document-payment-receipt.test.ts` : réussi ;
- `document-preview-immutability.test.ts` : réussi ;
- `document-visual-standard.test.ts` : réussi ;
- `rbac-role-edit.test.ts` : réussi ;
- `hr-employee-lot10.test.ts` : réussi.

Le premier groupe transversal a produit 6 succès et 1 échec dû à une assertion de test sensible à la casse (`pointerdown` contre `onPointerDown`). L’assertion a été corrigée, puis les tests Lot 2 et Lot 13 ont été réexécutés avec succès. Ce défaut concernait le test, pas le composant.

## 14. Vérification MySQL

Le conteneur isolé MySQL 8.4 `lca-recette-mysql-1` est disponible. La création d’une base temporaire sans données destinée à appliquer la migration 080 a été refusée par la protection d’exécution avant toute mutation. La migration n’a donc pas été exécutée sur MySQL dans ce lot. Aucune base, table, donnée, volume ou configuration Docker n’a été modifiée.

## 15. Anomalies et décisions restantes

- Le backend renvoie les cachets admissibles en cas d’ambiguïté, mais les quatre écrans métier d’émission ne proposent pas encore un sélecteur dédié ni ne transmettent un choix au service d’archive. Une politique avec plusieurs cachets sans défaut bloque donc correctement l’émission, mais le parcours interactif de résolution reste à intégrer.
- L’interface de cachet ne propose pas encore de sélecteurs agence/service ; ces champs sont contrôlés et acceptés par l’API existante.
- L’historique complet des versions de cachet est exposé par l’API, mais l’écran affiche seulement la version active.
- Une approbation explicite doit être définie avant d’apposer une marque sur les ordres de réparation, retours véhicule et fiches employés.
- Une validation MySQL 8.4 sur schéma temporaire reste nécessaire avant livraison.

Ces points interdisent de déclarer le Lot 2 intégralement terminé en recette métier, même si le socle, les contrôles et les quatre intégrations documentaires compilent et passent les tests ciblés.

## 16. Risques de régression

Le risque principal se situe dans les actions métier qui changent l’état avant l’archivage : une politique bloquante peut refuser l’archive après la transition déjà validée, conformément au mécanisme historique `requireBusinessArchive`. L’utilisateur peut corriger la configuration puis répéter l’action, mais une transaction métier+GED entièrement atomique demanderait une refonte plus large. L’absence de politique conserve strictement le comportement antérieur.

## 17. Protection de la livraison

`livrables/LCA-ERP-LIVRAISON-FINALE.zip` n’a pas été modifié. Empreinte vérifiée :

`7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`

## 18. État Git

Aucun commit, push, tag, stash, reset, restore, clean ou changement de branche n’a été effectué. Toutes les modifications restent non commitées pour inspection.

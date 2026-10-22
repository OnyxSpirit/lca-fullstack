# Audit critique — régressions devis, confirmation des ventes et archives PDF

Date de l'audit : 22 octobre 2026  
Nature : audit statique local, lecture seule du code et de l'historique Git  
Verdict global : **ANOMALIES CONFIRMÉES — correction requise avant nouvelle qualification**

## 1. Périmètre et limites

L'audit a porté sur les parcours suivants :

- émission d'un devis ;
- génération et consultation de son archive PDF officielle ;
- transformation d'un devis en vente ;
- transitions de statut d'une vente et confirmation ;
- génération et consultation du bon de commande archivé ;
- comportement du frontend après erreur ;
- idempotence des reprises ;
- origine Git des changements.

Aucun code métier, fichier de configuration, schéma, rôle, permission ou donnée n'a été modifié. Aucun accès VPS/SSH, déploiement, commit ou push n'a été effectué. L'état réel de production n'a donc pas été interrogé. Les conclusions relatives aux enregistrements précis de production sont distinguées des preuves établies dans le code.

## 2. Synthèse exécutive

Le système possède un état intermédiaire durable non représenté explicitement : **métier finalisé, archive officielle absente**.

Pour les devis comme pour les ventes, la transaction MySQL qui change le statut est validée avant la génération du PDF et avant l'insertion du document GED. Si l'archivage échoue ensuite, l'API renvoie une erreur, mais le changement métier demeure. Cette séquence explique exactement le devis qui paraît émis, la disparition du bouton et l'impossibilité d'ouvrir le PDF.

La deuxième anomalie observée ne prouve pas qu'une vente a été insérée. Le libellé frontend « Vente non enregistrée » correspond au formulaire de création de vente. Celui-ci exige l'archive du devis **avant** d'ouvrir la transaction de création. En l'absence de cette archive, il répond HTTP 409 et n'insère aucune vente. Il s'agit donc très probablement d'une conséquence directe de l'anomalie du devis, et non d'un échec de la transition d'une vente déjà créée.

Le Super Administrateur ne peut pas contourner ces contrôles : le défaut n'est pas un refus RBAC, mais l'absence d'un artefact documentaire obligatoire.

## 3. Anomalie 1 — émission du devis

### 3.1 Parcours technique

1. Le frontend appelle `POST /api/quotations/:id/validate`.
2. Le backend ouvre une transaction et verrouille le devis.
3. Il écrit le statut (`sent` depuis `draft`, ou conserve `negotiation`) et `document_identity_snapshot`.
4. La transaction est validée.
5. Seulement après ce commit, `archiveQuotation()` résout les signatures/cachets, rend le PDF, écrit le fichier GED et insère la ligne `documents`.
6. Toute erreur technique de cette étape devient une réponse HTTP 503 contenant « Finalisation enregistrée, mais archive officielle temporairement indisponible ».

Preuve principale : `quotation.service.ts`, fonction `validate`, ligne 98. Le `await transaction(...)` est terminé avant `await requireBusinessArchive(...)`.

### 3.2 État produit après échec

Après un échec d'archive post-commit :

- le devis garde son numéro officiel d'origine ;
- le statut est `sent` si le devis était `draft`, ou demeure `negotiation` si émis depuis la négociation ;
- `document_identity_snapshot` est non nul ;
- l'audit `quotation.issued` est déjà écrit ;
- aucune ligne `documents` avec `source_key = quotation:<id>:issued:v2` n'est garantie ;
- le fichier peut être absent, ou avoir été supprimé si l'insertion transactionnelle du document a échoué ;
- la réponse HTTP est néanmoins une erreur.

Il s'agit d'une incohérence transactionnelle inter-systèmes, pas d'une perte du devis.

### 3.3 Pourquoi le bouton disparaît

Dans `frontend/src/modules/crm/CrmPage.tsx`, l'action n'est affichée que si :

```text
permission quotations.validate
ET absence de identitySnapshot
ET statut draft ou negotiation
```

Le snapshot ayant été validé en base avant l'échec PDF, la condition devient fausse. L'utilisateur perd donc l'unique action graphique qui appelle l'endpoint de reprise.

### 3.4 Pourquoi le PDF reste indisponible

`GET /api/quotations/:id/pdf` utilise le PDF rendu à la volée seulement avant émission. Dès que `identitySnapshot` existe, la route exige une archive historique. Si aucune ligne GED n'existe, `requiredHistoricalBusinessPdf()` répond HTTP 409 avec le message observé :

> Archive officielle absente. Réessayez l'action de finalisation avant de consulter ce document.

Le bouton PDF reste visible, mais il ne répare jamais l'archive : la consultation est volontairement sans écriture.

### 3.5 Reprise et idempotence

Le backend est partiellement réparateur : un nouvel appel à `POST /quotations/:id/validate` détecte le snapshot, ne rejoue pas la mutation métier, puis retente l'archivage. La clé unique `quotation:<id>:issued:v2` empêche les doublons GED.

La reprise est donc idempotente côté backend, mais **inaccessible depuis l'interface normale** parce que le bouton a disparu. Aucun endpoint administratif distinct, état « archivage à reprendre », tâche asynchrone ou bouton de réparation n'existe.

### 3.6 Statut de l'anomalie 1

**CONFIRMÉE par le code.** Le scénario décrit est la conséquence déterministe de la séquence transactionnelle actuelle.

Pour le devis de production `DEV-20261022-F9788D6C`, le statut exact, son identifiant interne et l'absence exacte de la ligne GED restent à confirmer par lecture autorisée de production.

## 4. Anomalie 2 — « Vente non enregistrée »

### 4.1 Origine exacte du message

Le titre « Vente non enregistrée » est émis uniquement par `SaleWizardModal.tsx` lorsque `POST /api/sales` échoue. Ce n'est pas le message de la transition de statut d'une vente existante, qui affiche « Transition impossible ».

### 4.2 Précondition documentaire

Dans `sale.service.ts`, la création depuis un devis exécute :

```text
requiredHistoricalBusinessPdf(quotation:<quotationId>:issued:)
```

avant `transactionWithDeadlockRetry(...)`. Si l'archive du devis manque, le backend renvoie HTTP 409 avant toute insertion de vente, réservation, mouvement de véhicule ou écriture financière.

Ainsi, le couple de messages observé :

- « Vente non enregistrée » ;
- « Archive officielle absente… »

identifie le parcours **création/conversion du devis en vente**, pas la confirmation d'une vente déjà enregistrée.

### 4.3 Vente existante ou non

Le message ne doit pas être interprété seul comme preuve d'absence en base. Cependant, dans ce chemin précis et en exécution simple, le contrôle documentaire précède la transaction et garantit qu'aucune nouvelle vente n'est créée par cette tentative.

Une vérification de production reste nécessaire pour exclure :

- une tentative antérieure déjà réussie ;
- un doublon créé par un autre utilisateur ;
- une vente liée au même devis avant l'incident.

### 4.4 Confirmation d'une vente déjà créée

La transition vers `confirmed` reproduit le même défaut architectural : statut de vente, statut du véhicule et historique sont committés, puis `archiveSaleOrder()` est appelé. Un échec peut donc laisser une vente confirmée et un véhicule vendu sans bon de commande archivé.

Cette reprise est toutefois idempotente côté backend : renvoyer `confirmed` sur une vente déjà confirmée court-circuite les mutations, puis retente l'archive. Le frontend n'expose normalement plus l'action une fois le statut confirmé. Les transitions ultérieures sont bloquées tant que l'archive manque.

### 4.5 Statut de l'anomalie 2

**CONFIRMÉE comme blocage de conversion causé par l'archive du devis manquante.**  
**NON DÉMONTRÉE comme échec de confirmation d'une vente existante**, car le libellé rapporté correspond au formulaire de création et aucune lecture de la base de production n'a été réalisée.

## 5. Cause racine et origine Git

### 5.1 Cause structurelle

La cause racine est la combinaison de trois choix :

1. mutation métier commitée avant l'archivage ;
2. archive rendue obligatoire pour toute consultation ou opération aval ;
3. absence de représentation et de reprise UI de l'état « finalisé sans archive ».

### 5.2 Historique

- Commit `42102cc` — `LOT-1A` : remplacement de l'archivage tolérant par `requireBusinessArchive`, ajout des contrôles `requiredHistoricalBusinessPdf` et du message HTTP 503, sans déplacer l'archive dans une unité de finalisation cohérente. C'est l'introduction principale de la régression fonctionnelle.
- Commit `a192607` — `Lot 2 : gestion dynamique des signatures et cachets officiels` : ajout de la résolution des politiques, lecture des fichiers de signatures/cachets et snapshots. Ce changement ajoute des points de panne possibles avant la création GED, mais ne suffit pas à identifier l'erreur opérationnelle précise du VPS.
- Commit `160ab1b` — `Correction CRM et recette complète` : l'action d'émission devient conditionnée par `!quotation.identitySnapshot` et autorise aussi la négociation. Cela rend explicite l'impossibilité de relance graphique après snapshot.

### 5.3 Cause opérationnelle immédiate non prouvée

Le message HTTP 503 indique que l'archive a échoué sur une erreur technique ou serveur. Une erreur métier contrôlée en 4xx (signature/cachet absent, sélection ambiguë, intégrité invalide) serait propagée telle quelle et non transformée en ce 503.

Les causes encore compatibles sont notamment :

- stockage `GED_STORAGE_DIR` non inscriptible ou indisponible ;
- table/colonne de la migration des politiques ou snapshots absente sur le VPS ;
- erreur SQL pendant l'insertion du document ou de son snapshot ;
- exception du rendu PDF ;
- fichier de signature/cachet inaccessible produisant une erreur 5xx.

Les logs backend contenant `[GED] archive officielle requise échouée` et le champ `reason` sont indispensables pour trancher. Affirmer l'une de ces causes sans ces logs serait spéculatif.

## 6. RBAC et Super Administrateur

Les routes vérifient bien `quotations.validate`, `quotations.view`, `quotations.convert`, `sales.create`, `sales.confirm` ou `sales.view`. Une fois la permission accordée, l'existence de l'archive est une précondition indépendante du rôle.

Le Super Administrateur n'est donc pas volontairement exclu : il atteint le même contrôle documentaire. Accorder davantage de droits ne répare ni le fichier ni la ligne GED.

## 7. Atomicité et cohérence

| Opération | Transaction métier | Archive | Résultat possible en cas d'échec archive |
|---|---|---|---|
| Émettre un devis | commit statut + snapshot + audit | après commit | devis émis sans PDF |
| Créer une vente depuis devis | archive vérifiée avant transaction | aucune nouvelle archive | aucune insertion par cette tentative |
| Confirmer une vente | commit vente + véhicule + audit | après commit | vente confirmée sans bon de commande |
| Lire un PDF finalisé | lecture seule | archive exigée | HTTP 409, aucune réparation |

Les contraintes d'unicité sur `documents.source_key` et le traitement de `ER_DUP_ENTRY` protègent contre les doublons. Elles assurent l'idempotence documentaire, mais pas l'atomicité entre état métier, fichier et ligne GED.

## 8. Impact transverse

Le même patron `transaction métier -> requireBusinessArchive` existe dans d'autres flux : factures, paiements, facturation atelier et certains services de livraison. L'impact est donc **potentiellement transverse** pour toute finalisation dont l'archive est ensuite exigée.

Les cas suivants sont particulièrement exposés :

- facture émise mais PDF absent, puis paiement bloqué ;
- paiement confirmé mais reçu absent ;
- facture atelier émise mais archive absente ;
- document finalisé non consultable malgré un statut définitif.

Le parcours de livraison possède en plus un mécanisme transactionnel spécialisé pour certaines finalisations ; il doit servir de point de comparaison, sans conclure que toutes les variantes de livraison sont sûres.

## 9. Contrôles production recommandés en lecture seule

Avant toute réparation, relever sans afficher de donnée sensible :

1. identifiant, statut et présence de `document_identity_snapshot` pour `DEV-20261022-F9788D6C` ;
2. ligne `documents` dont `source_key` vaut `quotation:<id>:issued:v2` ;
3. éventuelles ventes liées par `quotation_id` ;
4. audit `quotation.issued` ;
5. logs backend corrélés à `quotation:<id>:issued` ;
6. présence des migrations relatives à GED, politiques et snapshots ;
7. existence et lisibilité du volume GED, et droits d'écriture du processus backend ;
8. si une vente existe, son statut, le statut du véhicule et l'archive `sale:<id>:confirmed:v2`.

Ces contrôles doivent rester strictement en lecture seule. Aucun `UPDATE`, `INSERT`, marquage artificiel ou copie manuelle de fichier ne doit être utilisé comme réparation.

## 10. Stratégie de correction recommandée

### Priorité P0 — rendre l'état récupérable

- Exposer explicitement l'état `archiveAvailable`/`archiveStatus` dans les DTO concernés.
- Afficher une action habilitée « Finaliser l'archivage » lorsque le statut métier est finalisé mais l'archive absente.
- Cette action doit réutiliser l'endpoint idempotent existant ou un endpoint dédié soumis aux mêmes permissions et scopes.
- Ne jamais régénérer silencieusement depuis la route GET PDF.

### Priorité P0 — fiabiliser l'orchestration

Choisir et tester un modèle explicite :

- soit un état durable `FINALIZING` et une reprise asynchrone/outbox jusqu'à archivage, puis passage au statut final ;
- soit une préparation du PDF avant la mutation finale, suivie d'une transaction liant la ligne GED et le statut, avec suppression sûre de tout fichier orphelin ;
- soit une saga documentée avec état d'échec et commande de reprise accessible.

Une transaction MySQL seule ne peut pas rendre atomique l'écriture du système de fichiers ; prétendre le contraire déplacerait seulement le risque.

### Priorité P1 — éviter les faux messages

- Distinguer « vente non créée car archive du devis absente » de « confirmation enregistrée, archive en attente ».
- Après une erreur post-commit, invalider/refetcher les données et afficher l'état réellement enregistré.
- Ne pas masquer l'action de reprise uniquement à partir du snapshot ou du statut.

### Priorité P1 — tests manquants

Ajouter des tests d'intégration avec injection de panne à chaque étape :

- échec avant écriture du fichier ;
- échec après fichier mais avant `documents` ;
- échec du snapshot de cachet/signature ;
- nouvelle tentative via l'interface ;
- concurrence de deux reprises ;
- conversion bloquée sans vente créée ;
- vente confirmée sans archive puis reprise ;
- impossibilité de poursuivre un workflow sans archive ;
- absence de duplication des audits, documents, ventes et historiques véhicule.

## 11. Tests réellement exécutés

Commande ciblée, sans base métier :

```text
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 \
  test/document-preview-immutability.test.ts \
  test/ged-business-archive.test.ts \
  test/commercial-residuals.test.ts
```

Résultat au niveau fichiers :

- `document-preview-immutability.test.ts` : PASS ;
- `ged-business-archive.test.ts` : PASS ;
- `commercial-residuals.test.ts` : FAIL au chargement/fichier, sans détail de cas fourni par le runner dans cette exécution.

Ce dernier échec est une réserve de la campagne et n'a pas été masqué. Les deux suites PASS vérifient surtout la présence de garde-fous et de motifs dans le code ; elles ne simulent pas la coupure entre commit métier et archive. Elles ne couvrent donc pas la régression observée.

Aucun test MySQL, HTTP sur le VPS ou navigateur de production n'a été exécuté pendant cet audit.

## 12. Verdict détaillé

| Sujet | Verdict | Justification |
|---|---|---|
| Devis émis sans archive | CONFIRMÉ | commit métier antérieur à l'archive |
| Bouton d'émission disparu | CONFIRMÉ | condition frontend basée sur le snapshot |
| PDF indisponible | CONFIRMÉ | archive historique obligatoire après snapshot |
| Blocage de création de vente | CONFIRMÉ | contrôle archive avant transaction de vente |
| Vente créée malgré ce message précis | NON DÉMONTRÉ | le contrôle précède l'insertion ; lecture prod absente |
| Vente confirmée sans bon de commande | RISQUE CONFIRMÉ PAR LE CODE | même séquence post-commit, cas prod non observé ici |
| Défaut RBAC Super Admin | ÉCARTÉ | contrôle documentaire indépendant des rôles |
| Cause opérationnelle du 503 VPS | À CONFIRMER | logs/état prod non disponibles |
| Impact autres documents | PARTIELLEMENT CONFIRMÉ | même patron présent dans plusieurs flux |

## 13. Conclusion

La régression est réelle et critique : l'application peut annoncer une erreur tout en conservant un état métier finalisé, puis masquer l'action nécessaire à la réparation. Le devis concerné ne doit être ni réémis artificiellement ni modifié directement en base. La prochaine intervention doit d'abord confirmer en lecture seule la raison technique enregistrée dans les logs et l'état GED, puis implémenter une reprise explicite et testée.

**Verdict final : NON VALIDÉ — correction P0 requise.**

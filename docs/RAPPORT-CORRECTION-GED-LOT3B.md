# RAPPORT — LOT 3B — Fiabilisation documentaire des factures et reçus

Date de qualification : 22 octobre 2026  
Périmètre : GED-P1-03 uniquement  
Verdict : **CORRIGÉ ET QUALIFIÉ SUR LE PÉRIMÈTRE AUTOMATISÉ CIBLÉ**

## 1. Synthèse et cause confirmée

L'émission d'une facture et l'encaissement commitent leurs effets métier avant la génération de leur PDF officiel. Une panne de rendu, de stockage ou d'insertion GED peut donc produire une réponse HTTP en erreur alors que la facture est déjà émise ou que le paiement, le solde et le mouvement de trésorerie sont déjà enregistrés.

La capacité technique de régénération existait dans le service documentaire, mais elle n'était pas durablement accessible après rechargement : aucune route documentaire dédiée n'exposait la reprise des factures et reçus, les DTO ne publiaient pas leur diagnostic GED précis et les mutations frontend n'invalidaient les données qu'en cas de succès. L'opérateur pouvait ainsi voir une erreur sans constater le succès métier déjà commité.

La correction sépare désormais strictement la transition métier de sa finalisation documentaire. Elle ne modifie aucune transaction financière existante et n'ajoute aucune migration.

## 2. Fichiers modifiés

Backend :

- `backend-node/src/modules/billing/billing.routes.ts`
- `backend-node/test/ged-billing-recovery-lot3b.test.ts`

Frontend :

- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/billing/InvoiceDetailPage.tsx`
- `frontend/src/modules/billing/InvoicePaymentComponents.tsx`
- `frontend/src/types/index.ts`
- `frontend/test/ged-billing-recovery-lot3b.test.ts`

Documentation :

- `docs/RAPPORT-CORRECTION-GED-LOT3B.md`

## 3. Endpoints et contrats API

### `POST /invoices/:id/archive`

- Permission : `billing.invoice.issue`.
- Scope : contrôle métier existant `access`, donc mêmes règles OWN / AGENCY / CONCESSION / GLOBAL que la facture.
- États métier admis : `issued`, `partially_paid`, `paid`.
- Clé canonique : `invoice:<id>:issued:v2`.
- Effet : création de la seule archive GED manquante et audit `invoice.archive_retry_completed` uniquement lorsque le document vient réellement d'être créé.
- Résultat : `invoiceId`, `archiveStatus`, `archiveAvailable`, `created`.

### `POST /payments/:id/receipt/archive`

- Permission : `billing.payment.collect`.
- Scope : le paiement est rattaché à sa facture, puis `access` contrôle l'accès à cette facture avec la permission de collecte.
- État métier admis : paiement `confirmed`.
- Clé canonique : `payment:<id>:confirmed:v1`.
- Effet : création du seul reçu GED manquant et audit `payment.receipt_archive_retry_completed` uniquement lors de la création effective.
- Résultat : `paymentId`, `invoiceId`, `archiveStatus`, `archiveAvailable`, `created`.

Les deux endpoints sont idempotents : une archive canonique déjà `AVAILABLE` retourne HTTP succès avec `created=false`. Une ligne canonique existante en `FILE_MISSING`, `INTEGRITY_ERROR` ou `STORAGE_UNAVAILABLE` est refusée ; elle n'est jamais remplacée silencieusement. Une archive historique seule est diagnostiquée dans l'interface, mais l'absence de la clé canonique autorise la finalisation canonique explicite.

## 4. États documentaires et interface

Le détail d'une facture expose maintenant `archive_status` et `archive_available`. Chaque règlement expose `receipt_archive_status` et `receipt_archive_available`. Les contrôles d'intégrité complets sont exécutés dans ce détail ciblé.

L'interface `/billing/:id` :

- affiche le diagnostic LOT 3A : `AVAILABLE`, `MISSING_RECORD`, `FILE_MISSING`, `INTEGRITY_ERROR`, `STORAGE_UNAVAILABLE` ou `HISTORICAL_ONLY` ;
- désactive impression/téléchargement lorsque le document officiel n'est pas lisible ;
- propose **Finaliser l'archivage** uniquement pour une absence canonique récupérable et un utilisateur habilité ;
- affiche le même diagnostic et la même reprise dédiée pour chaque reçu ;
- maintient le bouton **Reçu**, désactivé lorsque l'archive n'est pas disponible ;
- affiche l'état de chargement, le succès et l'échec par les composants et notifications existants.

Les mutations d'émission, d'encaissement et de reprise invalident maintenant les requêtes facture/Atelier dans `onSettled`. Après un HTTP 503 post-commit, le rechargement montre donc la facture émise ou le paiement enregistré et sa reprise documentaire, au lieu d'inciter à répéter l'opération financière.

## 5. Idempotence et protections financières

Le service GED conserve l'unicité de `documents.source_key`. En concurrence, chaque appel peut rendre un PDF, mais une seule insertion canonique gagne ; le fichier perdant est supprimé sur `ER_DUP_ENTRY` et l'appel retourne le document gagnant avec `created=false`. Un appel ultérieur ne relance même plus le rendu.

Les routes de reprise n'appellent jamais :

- la création ou l'émission d'une facture ;
- l'insertion d'un paiement ;
- la mise à jour du solde ou du statut financier ;
- `postAutomaticMovement` ;
- une notification d'encaissement ;
- un workflow de vente, d'OR, de remboursement ou de trésorerie.

Les tests instrumentés confirment zéro écriture dans `payments`, `invoices` ou les structures de trésorerie pendant la reprise. Numéro, statut, total, montant encaissé, solde et référence de paiement restent inchangés.

## 6. Facturation Atelier

La facture Atelier reste une facture centrale et utilise la même clé `invoice:<id>:issued:v2`. Elle est consultable par `/billing/:id` et bénéficie donc du même diagnostic et du même endpoint de reprise. L'écran OR réutilise également les composants centraux de règlements et la requête de paiements invalidée après erreur.

Aucune seconde logique GED Atelier, aucune transition d'OR et aucune règle de garantie n'ont été ajoutées ou modifiées.

## 7. Tests exécutés

### Campagne ciblée backend

Commande Node avec mocks de modules officiels, 10 fichiers : **10 PASS, 0 FAIL**.

Couverture :

- échec de rendu facture après commit simulé ;
- échec d'insertion GED et compensation du fichier ;
- reprise facture payée ;
- échec de rendu reçu après encaissement simulé ;
- reprise de reçu ;
- répétition et concurrence, un seul document canonique ;
- invariance des montants, statuts, soldes, numéros et références ;
- zéro nouveau paiement et zéro mouvement de trésorerie ;
- permissions et accès métier des nouvelles routes ;
- facture Atelier, reçu central, remboursements, LOT 1 et résolution canonique LOT 3A.

Fichiers exécutés : `ged-billing-recovery-lot3b`, `ged-canonical-resolution-lot3a`, `archive-recovery-lot1`, `erp17-ged-recovery`, `ged-business-archive`, `document-payment-receipt`, `commercial-payments.behavior`, `billing-dynamic-rbac`, `erp08-workshop-document` et `billing-creditnote-ux-01`.

### Campagne ciblée frontend

10 fichiers : **10 PASS, 0 FAIL**.

Couverture : mapping des états, boutons conditionnels, endpoints dédiés, `onSettled`, absence de rejeu de l'encaissement, RBAC, facturation, avoirs, finance Atelier et LOT 3A.

### Non-régression globale

- Frontend complet : **201 PASS, 0 FAIL, 0 SKIP** avec l'invocation directe `node --import tsx`, équivalente au script projet. Le wrapper CLI `tsx` de `npm test` ne peut pas ouvrir son socket IPC dans le sandbox (`EPERM /tmp/tsx-1000/19.pipe`) ; il s'agit d'une limitation d'exécution, pas d'un échec de test.
- Backend global : campagne démarrée mais non qualifiable jusqu'au bout. Elle a rencontré des échecs dans 15 fichiers hors périmètre GED-P1-03 (`app`, rate-limit, tris, CRM, clients, livraisons et calibrage de marques documentaires), puis n'a plus produit de progression pendant plus de deux minutes après `erp17-ged-recovery`; elle a été interrompue proprement. Les 10 suites ciblées concernées par le lot restent toutes vertes. Aucun résultat global incomplet n'est présenté comme réussi.

### Compilation et qualité

- Backend `npm run lint` : PASS.
- Frontend `npm run lint` : PASS.
- Backend `npm run build` : PASS.
- Frontend `npm run build` : PASS, 2 519 modules transformés.
- `git diff --check` : PASS.

## 8. Tests non exécutés et limites

- Aucune recette navigateur réelle ni test Docker : non nécessaire à la correction locale et aucune reconstruction/donnée métier n'était autorisée.
- Aucun test MySQL réel : les scénarios d'écriture auraient nécessité un environnement isolé supplémentaire ; l'idempotence documentaire et l'unicité ont été exercées avec un modèle de contrainte `ER_DUP_ENTRY` instrumenté.
- La campagne backend globale n'a pas achevé son exécution, comme détaillé ci-dessus.
- Le diagnostic d'intégrité de chaque reçu implique une lecture/hachage dans le détail d'une facture. Il est volontairement ciblé, mais une facture possédant un historique exceptionnellement volumineux pourrait justifier ultérieurement une stratégie bornée.

## 9. Risques résiduels et recommandation LOT 3C

Le risque résiduel principal est opérationnel : les tests HTTP/MySQL et navigateur sur une base isolée restent souhaitables avant livraison, en simulant une panne de stockage après commit puis un rechargement réel. Ils ne doivent jamais être exécutés sur les données métier sans autorisation.

Le LOT 3C devra rester séparé. Il pourra traiter les autres anomalies documentaires identifiées par le LOT 2 (avoirs et retours) sans généraliser aveuglément les permissions ni réutiliser une transition métier comme reprise GED.

## 10. Verdict

**GED-P1-03 est corrigée sur le code local et qualifiée par les campagnes ciblées.**

La facture ou le paiement déjà commité demeure visible après erreur, la reprise est explicitement documentaire, idempotente et protégée par le RBAC et les scopes existants. Aucune duplication financière, aucun nouveau mouvement de trésorerie et aucune modification des données métier n'ont été introduits.

Aucun commit, push, déploiement, accès VPS, migration ou modification de base métier n'a été réalisé. Le LOT 3C n'a pas été commencé.

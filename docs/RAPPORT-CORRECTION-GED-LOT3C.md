# RAPPORT — LOT 3C — Fiabilisation documentaire des avoirs et retours

Date de qualification : 22 octobre 2026  
Périmètre : GED-P1-04 et GED-P1-05 uniquement

## 1. Synthèse

Le lot rend les avoirs standards et les documents des retours durablement consultables sans rejouer leur opération métier d'origine.

- Un avoir standard est désormais archivé automatiquement après son commit financier.
- Un avoir déjà émis sans archive dispose d'une reprise GED dédiée.
- Les avoirs issus d'un retour réutilisent le même service documentaire central, mais leur consultation et leur reprise conservent les permissions et scopes propres au retour.
- Un retour clôturé expose l'état réel de son PV et une reprise dédiée.
- Les interfaces refetchent après succès comme après erreur post-commit.
- Les reprises n'écrivent ni avoir, ni remboursement, ni facture, ni mouvement de trésorerie, ni stock, ni vente, ni livraison.

Aucune migration et aucune modification du schéma ou des données métier réelles n'ont été réalisées.

## 2. Causes confirmées

### GED-P1-04

`POST /invoices/:id/credit-notes` créait l'avoir et recalculait la situation financière dans une transaction, mais ne lançait pas `archiveCreditNote`. Ce service n'était utilisé que par la résolution financière d'un retour. Aucune route PDF ou reprise documentaire n'était exposée pour l'avoir standard.

### GED-P1-05

Le backend savait déjà générer `vehicle-return:<id>:closed:v1` lors de la clôture et savait retrouver l'opération financière d'un retour lors d'un rejeu. Après rechargement, l'interface ne connaissait toutefois ni l'état physique/intègre du PV, ni l'état des avoirs associés, et les actions métier avaient disparu avec l'avancement du statut. La seule récupération possible consistait donc implicitement à rejouer une transition métier.

## 3. Parcours examinés

### Avoirs

- Avoir standard partiel ou total créé depuis `/billing/:id`.
- Avoir rattaché à une facture commerciale ou Atelier : même table et même mécanisme central.
- Avoir `issued` ou `applied` utilisé comme justificatif d'un remboursement.
- Avoir produit par la résolution d'un retour, avec ou sans remboursement effectif.
- Rejeu par clé d'idempotence après panne GED post-commit.

La clé officielle préexistante est conservée : `credit-note:<id>:issued:v1`.

### Retours

- Création, inspection, approbation, retenues et résolution financière.
- Création transactionnelle des avoirs et remboursements.
- Réception physique, décision de stock et clôture.
- Archivage du PV après commit de clôture.
- Consultation et récupération après clôture.

La clé officielle préexistante est conservée : `vehicle-return:<id>:closed:v1`.

Les avoirs et le PV restent deux identités documentaires distinctes. Aucun service ou endpoint ne les fusionne.

## 4. Fichiers modifiés dans le LOT 3C

Backend :

- `backend-node/src/modules/documents/business-document.service.ts`
- `backend-node/src/modules/billing/billing.routes.ts`
- `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts`
- `backend-node/test/ged-credit-return-recovery-lot3c.test.ts`

Frontend :

- `frontend/src/types/index.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/billing/InvoiceDetailPage.tsx`
- `frontend/src/modules/vehicle-returns/VehicleReturnPage.tsx`
- `frontend/test/ged-credit-return-recovery-lot3c.test.ts`

Documentation :

- `docs/RAPPORT-CORRECTION-GED-LOT3C.md`

## 5. Endpoints et contrats API

### Avoir standard

- `GET /credit-notes/:id/pdf`
  - permission `billing.invoice.view` ;
  - scope contrôlé sur la facture par `access` ;
  - états admis `issued` et `applied` ;
  - lecture canonique puis fallback historique explicite LOT 3A.

- `POST /credit-notes/:id/archive`
  - permission `billing.invoice.cancel`, identique à la création de l'avoir ;
  - scope contrôlé sur la facture ;
  - aucune écriture financière ;
  - réponse : `creditNoteId`, `invoiceId`, `archiveStatus`, `archiveAvailable`, `created`.

`POST /invoices/:id/credit-notes` appelle désormais l'archivage après le commit. Un échec GED retourne l'erreur documentaire habituelle, mais l'invalidation `onSettled` permet de retrouver l'avoir déjà enregistré et de finaliser uniquement son archive.

### Retour et avoir de retour

- `POST /vehicle-returns/:id/archive`
  - permission `vehicle.return.stock.receive` ;
  - scopes OWN / AGENCY / CONCESSION / GLOBAL par `accessible` ;
  - uniquement pour un retour `CLOSED`.

- `GET /vehicle-returns/:id/credit-notes/:creditNoteId/pdf`
  - permission `vehicle.return.view` ;
  - vérification du scope du retour et de l'appartenance réelle de l'avoir à une ligne de résolution.

- `POST /vehicle-returns/:id/credit-notes/:creditNoteId/archive`
  - permission `vehicle.return.financial.resolve` ;
  - même contrôle de scope et de rattachement ;
  - aucune nouvelle résolution financière.

Les endpoints sont idempotents : `AVAILABLE` retourne un succès avec `created=false`. Seul `MISSING_RECORD` autorise une génération. `FILE_MISSING`, `INTEGRITY_ERROR` et `STORAGE_UNAVAILABLE` sont refusés sans remplacement. Une version historique seule est signalée et peut coexister avec une nouvelle archive canonique explicitement demandée.

## 6. Modèle documentaire et limite historique

Le modèle officiel existant `archiveCreditNote` a été conservé. Il rend uniquement les données persistées et stables disponibles dans `credit_notes` et ses relations : numéro, date, facture d'origine, client, montant, devise et motif.

Le schéma courant ne stocke pas de snapshot autonome du détail fiscal, des lignes ou de l'identité documentaire de l'avoir. La correction n'invente donc aucun taux, aucune ventilation HT/TVA et ne présente pas le PDF comme une reconstitution plus détaillée que les données figées disponibles. Une évolution réglementaire exigeant cette ventilation nécessiterait une décision métier et une migration additive distincte ; elle n'a pas été anticipée dans ce lot.

## 7. Idempotence et protections

`archiveCreditNote` et `archiveVehicleReturn` vérifient désormais la clé canonique avant même le rendu. La contrainte unique `documents.source_key` reste l'autorité en concurrence : un seul insert gagne, le fichier du concurrent perdant est compensé et l'appel retourne le document existant.

Les tests instrumentés interdisent et comptent les écritures sensibles. Résultat pendant les reprises : zéro insertion d'avoir/remboursement, zéro mise à jour de facture/vente/livraison/retour/véhicule, zéro mouvement de trésorerie, de véhicule ou de statut stock.

Les références et montants de l'avoir, ainsi que le statut, les montants crédités/remboursés et la décision de stock du retour, restent inchangés.

## 8. Interface

### Facturation

La section « Avoirs » affiche le diagnostic GED, active le bouton PDF seulement si le document est lisible et propose « Finaliser l'archivage » uniquement à un utilisateur disposant de `billing.invoice.cancel` lorsque l'archive canonique est absente.

### Retours

La page existante `/vehicle-returns/:id` affiche :

- l'état du PV clôturé ;
- le bouton « PV officiel » uniquement lorsqu'il est lisible ;
- sa reprise exceptionnelle pour `vehicle.return.stock.receive` ;
- l'état et le PDF de chaque avoir de résolution ;
- la reprise d'un avoir manquant pour `vehicle.return.financial.resolve`.

Le workflow, les statuts et les actions de résolution, réception, stock et clôture sont inchangés. Les mutations du retour utilisent `onSettled`, de sorte qu'une opération déjà commitée redevient visible même si son archivage post-commit échoue.

## 9. Tests exécutés

### Backend ciblé

10 fichiers : **10 PASS, 0 FAIL**.

Couverture : panne de rendu PDF, panne de stockage, panne d'insertion GED avec compensation, reprises répétées et concurrentes, une seule clé canonique, invariance financière et stock, routes/RBAC/scopes, rattachement retour-avoir, retour non clôturé, LOT 1, LOT 3A, LOT 3B, facturation Atelier, remboursements et modèle historique des retours.

Le fichier d'intégration MySQL `vehicle-return-concurrency-mysql.integration.test.ts` a été chargé sans erreur, mais ses scénarios réels restent **SKIP** car `VEHICLE_RETURN_MYSQL_TEST=1` n'était pas activé et aucune base isolée n'a été créée pour ce lot. Il n'est pas présenté comme une validation MySQL réelle.

### Frontend ciblé

6 fichiers : **6 PASS, 0 FAIL**.

Couverture : états documentaires, PDF, boutons conditionnels, permissions visuelles, endpoints dédiés, refetch `onSettled`, non-régression remboursements, LOT 3A et LOT 3B.

### Frontend complet

**202 PASS, 0 FAIL, 0 SKIP**, durée 129,4 secondes, avec `node --import tsx` afin d'éviter la restriction IPC du wrapper CLI `tsx` dans le sandbox.

### Qualité et compilation

- Lint backend : PASS.
- Build backend : PASS.
- Lint frontend : PASS.
- Build frontend : PASS, 2 519 modules transformés.
- `git diff --check` : PASS.

## 10. Campagne backend globale et échecs préexistants

La campagne backend globale n'a pas été relancée : son exécution immédiatement précédente, sur ce même état de travail avant les modifications 3C, avait déjà rencontré des échecs dans 15 fichiers hors GED-P1-03 puis cessé de progresser pendant plus de deux minutes après `erp17-ged-recovery`. Elle avait été interrompue avec un résultat explicitement non qualifiable. Relancer la même campagne non bornée n'aurait pas apporté une preuve supplémentaire au lot.

Les campagnes ciblées de ce lot, y compris les non-régressions documentaires et financières directement concernées, sont toutes vertes. Aucun échec ciblé nouveau n'est observé. Les échecs globaux antérieurs restent hors périmètre et ne sont pas déclarés corrigés.

## 11. Limites et risques résiduels

- Pas de recette HTTP/MySQL réelle ni navigateur sur une base isolée ; aucune écriture sur la base métier n'était autorisée.
- Le contrôle d'intégrité complet des documents est effectué sur les écrans de détail. Un retour contenant un très grand nombre d'avoirs pourrait à terme justifier une stratégie de contrôle bornée.
- Les avoirs historiques dont les données fiscales détaillées n'ont jamais été snapshotées ne peuvent pas être enrichis rétroactivement sans inventer d'information.
- Les incohérences `FILE_MISSING` ou `INTEGRITY_ERROR` nécessitent une intervention distincte explicitement autorisée ; le lot ne les répare pas silencieusement.

## 12. Préparation du LOT 3D

Le LOT 3D devra conserver les contrats canoniques et permissions ci-dessus. Toute évolution vers un document d'avoir fiscal plus détaillé devra traiter le snapshot au moment de l'émission, sans recalcul depuis une facture susceptible d'avoir évolué et sans réécrire les archives historiques.

## 13. Verdicts

### GED-P1-04

**CORRIGÉE ET QUALIFIÉE SUR LE PÉRIMÈTRE AUTOMATISÉ.** Les avoirs standards sont archivés automatiquement, consultables et récupérables sans création d'un second avoir ou mouvement financier.

### GED-P1-05

**CORRIGÉE ET QUALIFIÉE SUR LE PÉRIMÈTRE AUTOMATISÉ.** Le PV d'un retour clôturé et ses avoirs sont consultables et récupérables depuis l'interface sans reclôture, résolution financière ou modification de stock.

Aucun commit, push, déploiement, accès VPS, migration ou modification de base métier n'a été effectué. Le LOT 3D n'a pas été commencé.

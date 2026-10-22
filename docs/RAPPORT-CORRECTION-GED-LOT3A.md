# RAPPORT — LOT 3A — Fiabilisation de la cohérence des archives GED

Date de qualification : 22 octobre 2026  
Périmètre : GED-P1-01 et GED-P1-02 uniquement  
Verdict : **VALIDÉ POUR LE PÉRIMÈTRE LOT 3A**, avec quatre échecs préexistants hors périmètre dans la campagne backend globale.

## 1. Anomalies corrigées

### GED-P1-01 — état SQL annoncé comme disponibilité physique

La présence d'une ligne `documents` suffisait à produire `archiveAvailable=true`. Le fichier pouvait pourtant être absent, inaccessible ou altéré.

La lecture documentaire centralisée distingue désormais :

- `AVAILABLE` ;
- `MISSING_RECORD` ;
- `FILE_MISSING` ;
- `INTEGRITY_ERROR` ;
- `STORAGE_UNAVAILABLE` ;
- `HISTORICAL_ONLY` pour une version antérieure lisible en l'absence de version canonique.

Les listes effectuent un contrôle physique léger (`fs.access`) sans relire ni hacher tous les PDF. Le détail ciblé et le téléchargement relisent le fichier et vérifient son SHA-256 lorsqu'une empreinte est enregistrée. Une ligne SQL seule n'est donc plus présentée comme une archive disponible.

### GED-P1-02 — sélection arbitraire de l'archive la plus ancienne

L'ancienne résolution cherchait `source_key LIKE <préfixe>% ORDER BY created_at ASC, id ASC`. Elle pouvait ainsi retourner une version ancienne alors qu'une version canonique était définie.

La résolution applique maintenant la politique suivante :

1. recherche exacte de la clé canonique propre au document ;
2. lecture et contrôle de cette version si elle existe ;
3. aucun fallback si cette version canonique est absente physiquement, inaccessible ou corrompue ;
4. uniquement si l'enregistrement canonique est absent, recherche historique explicite par préfixe ;
5. choix historique déterministe de la version la plus récente (`created_at DESC, id DESC`) ;
6. état API `HISTORICAL_ONLY`, sans présenter cette version comme la version canonique actuelle.

Les conventions réellement existantes ont été conservées : devis `issued:v2`, bon de commande `confirmed:v2`, facture `issued:v2`, reçu `confirmed:v1`, livraison `finalized:v2` et retour véhicule `closed:v1`. Les appelants facture, reçu, livraison et retour ont uniquement été adaptés au contrat de résolution canonique commun ; aucun mécanisme de reprise ou de régénération propre aux lots 3B/3C n'a été développé.

## 2. Comportement API et interface

Les DTO Devis et Vente exposent l'état documentaire précis. `archiveAvailable` signifie qu'un PDF est effectivement consultable ; une archive historique lisible reste consultable, mais son état demeure explicitement `HISTORICAL_ONLY`.

Les écrans CRM, liste des ventes/devis et détail d'une vente affichent des messages métier distincts :

- Archive disponible ;
- Archive absente ;
- Fichier de l'archive indisponible ;
- Intégrité de l'archive invalide ;
- Stockage documentaire temporairement inaccessible ;
- Archive historique uniquement ;
- Archivage en cours ;
- Archivage en échec.

Aucun chemin serveur, hash, détail de stockage ou trace technique n'est exposé. L'action de reprise du LOT 1 n'est proposée que pour `MISSING_RECORD`. Elle n'est jamais utilisée pour recréer silencieusement une ligne dont le fichier manque ou dont l'intégrité est invalide.

## 3. Compatibilité et intégrité

- Aucun PDF historique supprimé ou réécrit.
- Aucune empreinte, snapshot, signature ou cachet modifié.
- Aucune archive créée pendant une lecture.
- Aucun fallback silencieux lorsqu'une version canonique existe mais échoue au contrôle.
- Les reprises documentaires Devis/Vente du LOT 1 restent idempotentes.
- Aucun traitement des anomalies fonctionnelles factures, reçus, avoirs ou retours réservé aux lots suivants.
- Aucune migration et aucune écriture en base métier.
- Aucun accès VPS, déploiement, reconstruction Docker, commit ou push.

## 4. Fichiers modifiés dans le LOT 3A

Backend :

- `backend-node/src/modules/documents/document-storage.ts`
- `backend-node/src/modules/documents/business-document.service.ts`
- `backend-node/src/modules/quotations/quotation.service.ts`
- `backend-node/src/modules/quotations/quotation.routes.ts`
- `backend-node/src/modules/sales/sale.service.ts`
- `backend-node/src/modules/core/core.routes.ts`
- `backend-node/src/modules/billing/billing.routes.ts`
- `backend-node/src/modules/deliveries/delivery.routes.ts`
- `backend-node/src/modules/vehicle-returns/vehicle-return.routes.ts`

Frontend :

- `frontend/src/services/businessArchiveStatus.ts`
- `frontend/src/types/index.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/sales/SalesListPage.tsx`
- `frontend/src/modules/sales/SaleDetailPage.tsx`

Tests adaptés ou ajoutés :

- `backend-node/test/ged-canonical-resolution-lot3a.test.ts`
- `backend-node/test/archive-recovery-lot1.test.ts`
- `backend-node/test/erp17-ged-recovery.test.ts`
- `backend-node/test/commercial-residuals.test.ts`
- `frontend/test/business-archive-status-lot3a.test.ts`
- `frontend/test/crm-negotiation-ui.behavior.test.ts`

## 5. Tests exécutés

### Qualification ciblée

- Backend : **52 PASS, 0 FAIL**.
- Frontend : **15 PASS, 0 FAIL**.

Cas couverts : clé canonique présente, coexistence v1/v2, fallback uniquement en absence du canonique, version historique déterministe, fichier absent, stockage inaccessible, empreinte invalide, contrôle léger de liste, contrôle complet à la lecture, aucun fallback d'un canonique illisible, reprises LOT 1, routes PDF, règles financières/livraison connexes et présentation frontend.

### Non-régression globale

- Frontend complet : **978 PASS, 0 FAIL, 0 SKIP**.
- Backend complet : campagne exécutée jusqu'au bout ; quatre assertions hors LOT 3A restent en échec : validation de paramètres d'agence, tri/validation collective des agences, assertion historique d'émission d'un devis et assertion de délégation RBAC avec scope `NULL`. Les suites GED LOT 3A et les suites commerciales directement impactées sont toutes PASS. Ces échecs ne proviennent pas des chemins documentaires modifiés et n'ont pas été corrigés afin de respecter le périmètre strict.

### Contrôles statiques et compilation

- Backend `npm run lint` : PASS.
- Backend `npm run build` : PASS.
- Frontend `npm run lint` : PASS.
- Frontend `npm run build` : PASS (2 519 modules transformés).
- `git diff --check` : PASS.

## 6. Limites et risques résiduels

- Le contrôle de liste confirme l'accessibilité physique, pas l'intégrité cryptographique définitive ; le SHA-256 est volontairement vérifié lors du détail ciblé et de la lecture afin d'éviter le hachage massif des listings.
- Le diagnostic ajoute une consultation documentaire par élément affiché. Il n'effectue aucune lecture intégrale en liste, mais un futur volume très élevé pourrait justifier une agrégation SQL suivie d'un contrôle physique borné par page.
- Une archive historique est conservée et consultable, mais ne devient jamais implicitement la version canonique.
- Les quatre échecs backend globaux hors périmètre restent à traiter dans leurs lots propriétaires.

## 7. Verdict

**GED-P1-01 : corrigée et testée.**  
**GED-P1-02 : corrigée et testée.**

Le LOT 3A est qualifié sur son périmètre. Les données et archives existantes ont été préservées. Les lots 3B et 3C n'ont pas été commencés.

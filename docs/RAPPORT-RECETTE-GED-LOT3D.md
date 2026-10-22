# LOT 3D — Recette intégrée et non-régression GED

Date de recette : 22 octobre 2026  
Projet : ERP / CRM — La Congolaise de l'Automobile  
Nature : qualification uniquement, sans correction fonctionnelle

## 1. Résumé exécutif

Le noyau GED et les corrections des LOTS 1, 3A, 3B et 3C sont **VALIDÉS AVEC RÉSERVES** sur le périmètre réellement automatisé.

- La campagne MySQL 8.4 réelle et isolée a exécuté **24 tests : 24 PASS, 0 FAIL, 0 SKIP**.
- La campagne frontend documentaire ciblée a exécuté **41 fichiers : 41 PASS, 0 FAIL**.
- La campagne backend documentaire ciblée a exécuté **68 fichiers : 62 PASS, 6 FAIL**. Toutes les suites propres aux LOTS 1/3A/3B/3C sont PASS ; les six échecs appartiennent à des assertions historiques déjà identifiées autour du CRM, de la livraison et du calibrage visuel.
- La suite frontend complète est **202/202 PASS**.
- La suite backend globale bornée à 360 secondes reproduit le blocage historique après `erp17-ged-recovery` et n'est pas qualifiable : 15 fichiers en échec observés avant timeout, sans résumé final.
- Les lint et builds backend/frontend sont PASS ; le build frontend transforme 2 519 modules.

Aucun P0 ou P1 GED nouveau n'a été démontré. La recette navigateur du bundle courant n'a pas été exécutée : l'environnement `lca-recette` actif est à la migration 079 et utilise une image antérieure au code local qui atteint la migration 102. Il aurait été trompeur de le présenter comme une preuve du LOT 3D.

## 2. Environnement utilisé

### Code

- Dépôt local existant, branche inchangée.
- Modifications non commitées des LOTS précédents préservées.
- Node et dépendances déjà installées dans les répertoires `backend-node` et `frontend`.
- MySQL réel : image `mysql:8.4`, serveur 8.4.11 du projet Docker local `lca-recette`.

### Conteneurs observés

- `lca-recette-mysql-1` : healthy, port hôte loopback `127.0.0.1:33321`.
- `lca-recette-backend-1` : healthy, port `127.0.0.1:3004`.
- `lca-recette-frontend-1` : healthy, port `127.0.0.1:4176`.

L'application active n'a pas servi à la preuve fonctionnelle du code courant : sa base persistante est journalisée seulement jusqu'à 079 et son backend provient d'une image/configuration plus ancienne.

## 3. Isolation de la base et des fichiers

Le projet `lca-recette` utilise des volumes propres :

- `lca_recette_mysql_data` ;
- `lca_recette_ged_data` ;
- `lca_recette_uploads_data`.

Un schéma dédié `lca_ged_lot3d_tmp` a été créé sur le serveur MySQL de recette. Il a reçu uniquement le baseline, le seed système et les migrations du dépôt. Les fichiers GED et uploads des tests ont été dirigés vers :

- `/tmp/lca-ged-lot3d-storage` ;
- `/tmp/lca-ged-lot3d-uploads`.

Après relevé des preuves, le schéma et ces deux répertoires ont été supprimés. Aucun volume n'a été supprimé ou écrasé. Aucune donnée de `lca`, de la base persistante `lca-recette`, du VPS ou de production n'a été modifiée.

Une dérive de composition demeure visible sur le conteneur MySQL de recette : ses labels indiquent une fusion de `docker-compose.yml` et `docker-compose.recette.yml`, avec deux montages d'initialisation et un réseau supplémentaires. Le volume de données reste néanmoins distinct. Aucun changement Compose n'a été effectué dans ce lot.

## 4. Migrations appliquées

Le schéma temporaire a été construit depuis le baseline officiel 071 puis migré séquentiellement jusqu'à **102** par le runner officiel.

- État final : `VERSIONED`.
- Entrées dans `schema_migrations` : 32.
- Version maximale : 102.
- Les migrations 072 à 102, dont 080, 085, 087 et 097–102, ont été appliquées au seul schéma temporaire.

La base persistante `lca-recette` a été inspectée uniquement en lecture : 9 entrées, versions 071 à 079. Aucune migration n'y a été exécutée.

## 5. Utilisateurs fictifs et RBAC

Les tests MySQL ont créé leurs acteurs fictifs dans le schéma temporaire via les helpers officiels : administrateur HTTP de recette, acteurs AGENCY, CONCESSION, GLOBAL, SELF/OWN, acteurs sans permission, faux `SUPER_ADMIN` non système et acteurs inter-agence/inter-concession.

Contrôles réussis :

- permission absente : refus 403 ;
- ressource hors scope : refus 403/404 selon le contrat de route ;
- absence de bypass par simple code de rôle `SUPER_ADMIN` ;
- accès du véritable rôle système ;
- anti-IDOR inter-agence et inter-concession ;
- lecture, téléchargement, archive et restauration selon les permissions dédiées.

Ces identités ont disparu avec le schéma temporaire.

## 6. Matrice des scénarios

| Domaine | Automatisé local | MySQL 8.4 réel | Navigateur réel | Verdict |
|---|---:|---:|---:|---|
| Devis : émission, archive, PDF, reprise, concurrence | Oui | Non | Non | VALIDÉ AVEC RÉSERVES |
| Vente : confirmation, archive, PDF, reprise, unicité | Oui | Non | Non | VALIDÉ AVEC RÉSERVES |
| Facture : émission, archive, reprise, immutabilité | Oui | Partiel via fixtures retours | Non | VALIDÉ AVEC RÉSERVES |
| Paiement/reçu : post-commit, reprise, aucun double paiement | Oui | Oui dans le workflow retours | Non | VALIDÉ AVEC RÉSERVES |
| Avoir standard/retour : archive, PDF, reprise, concurrence | Oui | Oui pour concurrence financière/retour | Non | VALIDÉ AVEC RÉSERVES |
| Retour véhicule : cycle, PV, stock, clôture et mutations tardives | Oui | Oui | Non | VALIDÉ AVEC RÉSERVES |
| Livraison : finalisation atomique, archive et rollback | Oui | Oui | Non | VALIDÉ AVEC RÉSERVES |
| Atelier : facture/reçu et absence de double encaissement | Oui | Non dans ce lot | Non | VALIDÉ AVEC RÉSERVES |
| GED générique : upload, versions, archive/restauration, audit | Oui | Oui | Non | VALIDÉ |

Un statut MySQL réel n'est attribué que lorsque le test a effectivement utilisé le schéma temporaire.

## 7. Résultats par module

### Devis et ventes

`archive-recovery-lot1.test.ts`, `ged-business-archive.test.ts`, `ged-canonical-resolution-lot3a.test.ts` et les contrats frontend correspondants sont PASS. Les injections contrôlées démontrent l'échec de rendu/stockage/insertion, la reprise, la convergence concurrente vers une clé canonique et l'absence de seconde opération commerciale.

Réserve : aucun parcours navigateur ni scénario MySQL complet devis/vente n'a été exécuté pendant ce lot.

### Factures, paiements et reçus

`ged-billing-recovery-lot3b.test.ts`, `document-payment-receipt.test.ts`, les tests d'avoir/remboursement et les contrats frontend sont PASS. Les contrôles couvrent la persistance de l'opération métier après panne GED, l'invalidation `onSettled`, la reprise dédiée et l'absence de nouveau mouvement financier.

Le workflow MySQL des retours a réellement vérifié les paiements, remboursements et mouvements de trésorerie concurrents.

### Avoirs et retours

`ged-credit-return-recovery-lot3c.test.ts` backend/frontend est PASS. Le test MySQL `vehicle-return-concurrency-mysql.integration.test.ts` a réellement exécuté les scénarios `CONC-RET-01` à `10` et `12`, tous PASS : double création, décisions concurrentes, paiement contre résolution, avoir externe, plafonnement des remboursements, double résolution, double réception, décision stock contre vente, retenue concurrente, clôture et rollback/retry.

### Livraisons

`document-marks-lot13-mysql.integration.test.ts` est PASS. Il démontre notamment :

- une seule signature, archive canonique, série de snapshots et trace d'audit en concurrence ;
- conservation byte-identique d'une archive historique ;
- rollback complet après panne GED injectée ;
- compensation du fichier ;
- absence d'écriture financière parasite ;
- retry réussi ;
- scopes et anti-IDOR.

### Atelier

Les suites `erp08-workshop-document`, `workshop-dynamic-rbac`, `lot14c2-workshop-external-vehicles` et le reporting Atelier ciblé sont PASS. Aucun parcours HTTP/MySQL Atelier complet avec encaissement n'a été rejoué dans le LOT 3D.

## 8. Résultats des tests d'intégrité

Les états suivants sont couverts par les suites LOT 3A–3C et frontend :

- `AVAILABLE` : lecture et téléchargement du canonique ;
- `MISSING_RECORD` : reprise présentée seulement avec permission ;
- `FILE_MISSING` : HTTP 410, aucune régénération silencieuse ;
- `INTEGRITY_ERROR` : HTTP 409, aucun fallback trompeur ;
- `STORAGE_UNAVAILABLE` : erreur explicite ;
- `HISTORICAL_ONLY` : signalement distinct, consultation selon le contrat existant ;
- coexistence historique/canonique : priorité stricte au canonique.

Le test MySQL GED HTTP a également validé upload, pagination, version 2, archive, restauration, téléchargement et audit. Les contrôles de traversal, MIME/signature binaire et chemin privé sont PASS dans les suites ciblées malgré l'échec du fichier historique `delivery-document-security.test.ts` lorsqu'il est lancé au sein de la campagne large.

## 9. Résultats de concurrence

Preuves MySQL réelles :

- livraison répétée : une archive `delivery:<id>:finalized:v2` ;
- retour : décisions sérialisées et mutations tardives refusées ;
- double résolution : un avoir et un remboursement uniques ;
- double réception : un événement unique ;
- paiement/résolution/remboursement : bornes financières respectées ;
- stock contre nouvelle vente : sérialisation dans les deux ordres.

Relevé final avant nettoyage : **17 documents et 0 groupe de `source_key` dupliqué**.

Pour devis, vente, facture, reçu et reprise directe d'avoir, la concurrence est validée par les tests de services/routes avec mocks déterministes, pas par un test MySQL réel dans ce lot.

## 10. Résultats des échecs post-commit

Les hooks de test limités au processus ont simulé :

- échec de rendu PDF ;
- indisponibilité/échec de stockage ;
- échec d'insertion après stockage ;
- échec GED après validation métier ;
- échec de livraison après écriture du fichier mais avant commit.

Résultats : statut métier conservé pour les workflows volontairement post-commit, interface refetchée par `onSettled`, action de reprise conditionnelle, fichier orphelin compensé, archive canonique unique et absence de rejeu financier/stock. La livraison, dont l'archive appartient à la transaction, effectue au contraire un rollback complet attendu puis réussit au retry.

## 11. Contrôles financiers et stock

Le test MySQL a relevé et comparé factures, paiements, avoirs, remboursements, mouvements de trésorerie, retours, mouvements véhicule, statut vente/livraison et statut véhicule pendant ses scénarios.

Avant suppression du schéma, l'état résiduel de la dernière fixture était : 1 paiement, 1 remboursement, 3 mouvements de trésorerie, 1 avoir, 3 mouvements véhicule et 1 retour. Ces lignes étaient les seules fixtures actives du dernier scénario et ont été supprimées avec le schéma temporaire.

Les assertions démontrent :

- aucun deuxième paiement ;
- aucun remboursement au-delà du montant autorisé ;
- un seul mouvement de remboursement gagnant ;
- aucun second avoir lors d'une double résolution ;
- aucune duplication de réception ou de décision stock ;
- aucune mutation tardive après `CLOSED` ;
- aucune écriture financière pendant une simple reprise documentaire.

## 12. Résultats frontend et navigateur

### Frontend automatisé

- Campagne documentaire ciblée : **41 PASS, 0 FAIL**.
- Suite complète : **202 PASS, 0 FAIL, 0 SKIP**, durée 134,6 s.
- Les indicateurs d'état, boutons PDF, actions de reprise, permissions visuelles, messages et invalidations après erreur sont couverts par les tests de contrat/comportement.

### Navigateur

**NON EXÉCUTÉ sur le code courant.** Le frontend actif sur `127.0.0.1:4176` n'est pas le bundle local qualifié et sa base est à 079. Aucun conteneur existant n'a été reconstruit ou redémarré. Les téléchargements réels via navigateur, la persistance visuelle après rechargement et les notifications restent une réserve de recette manuelle sur un environnement construit depuis l'état local courant.

## 13. Tests automatisés

### Backend documentaire ciblé

- 68 fichiers chargés ;
- 62 PASS ;
- 6 FAIL ;
- 0 SKIP déclaré par ce runner (les tests opt-in chargés mais désactivés comptent comme fichiers réussis ; la preuve MySQL réelle est rapportée séparément).

Échecs :

1. `commercial-residuals.test.ts` ;
2. `delivery-candidates.test.ts` ;
3. `delivery-document-security.test.ts` ;
4. `document-marks-b33-pdf.test.ts` ;
5. `document-marks-b331-pdf.test.ts` ;
6. `quotations-dynamic-rbac.test.ts`.

### MySQL ciblé

- `ged-http-mysql.integration.test.ts` ;
- `document-marks-lot13-mysql.integration.test.ts` ;
- `vehicle-return-concurrency-mysql.integration.test.ts`.

Résultat agrégé : **24 PASS, 0 FAIL, 0 SKIP**, durée 82,5 s.

### Qualité statique et builds

- Backend lint : PASS.
- Backend build : PASS.
- Frontend lint : PASS.
- Frontend build : PASS, 2 519 modules.
- `git diff --check` : exécuté après rédaction dans le contrôle final.

## 14. Échecs préexistants et campagne backend globale

La campagne backend globale, bornée par `timeout 360s`, reproduit le comportement documenté dans le LOT 3B : absence de progression après `erp17-ged-recovery`, puis sortie 124 sans résumé.

Quinze fichiers en échec ont été observés avant le blocage :

- `app.test.ts` ;
- `auth-rate-limit.test.ts` ;
- `code500-sort-regression.test.ts` ;
- `commercial-residuals.test.ts` ;
- `commercial-transversal-routes.test.ts` ;
- `crm-appointment-endpoint.test.ts` ;
- `crm-appointment-integrity-b341.test.ts` ;
- `crm-assignment-endpoint.test.ts` ;
- `crm-reassignment-endpoint.test.ts` ;
- `customers-list-pagination-b3451.test.ts` ;
- `customers360-endpoint.test.ts` ;
- `delivery-candidates.test.ts` ;
- `delivery-document-security.test.ts` ;
- `document-marks-b33-pdf.test.ts` ;
- `document-marks-b331-pdf.test.ts`.

Cette liste correspond aux familles d'échecs déjà consignées lors du LOT 3B : application/rate-limit, tris et contrats CRM/clients, livraisons et calibrage des marques documentaires. Aucun de ces modules n'a été corrigé pendant cette recette.

## 15. Anomalies nouvelles

**Aucune anomalie P0 ou P1 GED nouvelle démontrée.**

Les six échecs de la campagne documentaire large et les quinze échecs de la campagne globale sont classés comme écarts préexistants/non isolés, pas comme nouvelles anomalies GED, car :

- ils étaient déjà observés avant LOT 3C/3D ;
- les suites dédiées LOT 1/3A/3B/3C sont vertes ;
- les tests MySQL réels du noyau GED, de la livraison et des retours sont verts ;
- aucune correction n'a été introduite pendant LOT 3D.

## 16. Scénarios bloqués ou non exécutés

- Recette navigateur du bundle local courant : **BLOQUÉE** par l'écart de version de l'environnement actif.
- Parcours MySQL bout en bout devis/vente/facture/Atelier : **NON EXÉCUTÉS** dans ce lot ; couverture automatisée par mocks seulement.
- Téléchargement manuel des PDF dans chaque écran après rechargement : **NON EXÉCUTÉ**.
- Matrice HTTP réelle multi-profils sur chaque document métier : **PARTIELLEMENT EXÉCUTÉE** via GED générique, livraison et retours.
- Backend global après `erp17-ged-recovery` : **BLOQUÉ/timeout**.

## 17. Risques résiduels

1. Absence de preuve navigateur sur le bundle courant.
2. Absence de preuve MySQL bout en bout pour les reprises devis, vente, facture, reçu et avoir standard, bien que leurs tests ciblés soient verts.
3. Campagne backend globale non terminable dans la fenêtre bornée.
4. Échecs historiques des tests de calibrage visuel B3.3/B3.3.1 et de contrats CRM/livraison.
5. Risques P2 déjà documentés au LOT 2 : OR/remise Atelier non figés comme archives officielles autonomes et créances constructeur sans pièce autonome, sous réserve de décision métier.
6. Dérive de fusion Compose du MySQL de recette à traiter séparément avant de considérer cet environnement comme référence reproductible.

## 18. Verdict final

### Noyau GED et corrections LOTS 1, 3A, 3B, 3C

**VALIDÉ AVEC RÉSERVES.**

La disponibilité physique, la résolution canonique, les reprises dédiées, l'idempotence, la compensation des fichiers, les protections financières/stock et les scopes sont démontrés par les campagnes ciblées. Les 24 tests MySQL réels renforcent cette conclusion pour la GED générique, la livraison et les retours.

### Non-régression frontend

**VALIDÉE** : 202/202 tests, lint et build réussis.

### Non-régression backend globale

**NON VALIDÉE / BLOQUÉE** : timeout après les mêmes familles d'échecs préexistants, sans résumé final.

### Recette navigateur complète

**NON EXÉCUTÉE** sur le code courant.

Le verdict global du LOT 3D est donc **VALIDÉ AVEC RÉSERVES**, sans anomalie GED P0/P1 nouvelle, mais sans autorisation de conclure à une recette navigateur ou backend globale complète.

## 19. Recommandations

1. Construire un environnement temporaire distinct depuis le code local courant, avec baseline et migrations jusqu'à 102, puis exécuter la matrice navigateur sans toucher aux conteneurs existants.
2. Isoler la cause du blocage de la suite backend après `erp17-ged-recovery` dans un lot de stabilisation des tests, sans modifier les workflows GED validés.
3. Requalifier séparément les six fichiers en échec de la campagne documentaire large, en particulier les dépendances externes des tests PDF et les contrats de routes historiques.
4. Ajouter, dans un lot de tests uniquement, des scénarios MySQL dédiés aux reprises concurrentes devis, vente, facture, reçu et avoir standard.
5. Corriger la dérive Compose de l'environnement de recette dans une mission DevOps explicitement autorisée.

## Restrictions respectées

Aucun commit, push, déploiement, accès VPS, accès production, changement de branche, reset, restore, stash ou clean. Aucune donnée métier réelle, archive officielle, transaction financière ou volume existant n'a été modifié ou supprimé. CRM-01 n'a pas été commencé.

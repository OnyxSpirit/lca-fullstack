# FIN-05 — Factures, dettes et règlements fournisseurs

## A. Verdict

**CONFORME sur le périmètre livré.** La dette fournisseur est reconnue uniquement par une facture validée. Les règlements sont les décaissements FIN-02 réellement comptabilisés dans Treasury, nets de contrepassations. Aucun grand livre, acompte fournisseur ou montant historique fictif n'a été créé.

## B. État Git et garde-fous

- Branche contrôlée : `main` ; point de départ : `5b23d29` ; arbre initial propre.
- Migrations 072, 073 et 074 inchangées.
- Migration additive créée : `075_supplier_invoice_debt_management.sql`.
- Aucun commit, push, VPS, base persistante ou volume existant modifié.

## C. Cartographie de l'existant

| Événement | Source de vérité existante / retenue |
|---|---|
| Fournisseur | `suppliers`, référentiel unique |
| Commande | `purchase_orders`, `purchase_order_items` |
| Réception | `purchase_order_receipts`, `purchase_order_receipt_items` |
| Stock | `part_stocks`, `part_movements`, alimentés à la réception, jamais par FIN-05 |
| Facture/dette | nouvelles tables `supplier_invoices`, lignes et historique |
| Engagement budgétaire | une seule `budget_expense` FIN-02 reliée à la facture |
| Réservation | `treasury_reservations` FIN-03, facultative au paiement |
| Paiement | `budget_expense_disbursements` + `treasury_movements` |
| Contrepassation | `treasury_movements.reversal_of_id`, append-only |
| GED | `documents`, stockage central existant |
| Audit | historique métier + `audit_logs` via `writeAudit` |

## D. Modèle livré

La migration 075 ajoute les factures, leurs lignes, leur historique, les avoirs imputés et leur historique. L'unicité `(concession, fournisseur, référence)` protège les doublons multi-entités. Une facture ne peut référencer qu'une dépense budgétaire, et réciproquement.

## E. Workflow facture

`DRAFT/REJECTED → SUBMITTED → VALIDATED` ou `REJECTED`. L'annulation est limitée aux brouillons/rejets. Une facture validée est figée ; elle ne peut être modifiée ou annulée silencieusement. Le créateur ne peut pas valider sa propre facture.

## F. Rapprochement

L'API contrôle fournisseur, agence, commande, réception et lignes. Elle signale quantité facturée supérieure au reçu, prix différent et absence de réception. Une marchandise avec écart exige un motif d'exception avant soumission. Une prestation `SERVICE` peut explicitement rester sans réception. La saisie n'écrit jamais dans le stock.

## G. Dette et échéance

`solde = total validé - avoirs validés - paiements Treasury nets`. Les mouvements contrepassés ne sont pas payés. `CURDATE()` détermine jours restants, échus, non échus et échéances à trente jours. Aucune pénalité ni intérêt n'est calculé.

## H. Avoirs

Un avoir imputé suit `DRAFT → SUBMITTED → VALIDATED/REJECTED`. Seul `VALIDATED` réduit la dette. La validation verrouille la même dépense que le paiement et refuse tout dépassement du solde imputable. Aucun mouvement Treasury n'est créé pour un avoir.

## I. Budget FIN-02

L'action d'imputation crée au plus une dépense brouillon sur un budget actif, compatible en devise/périmètre/période et suffisamment disponible. Les endpoints FIN-02 existants assurent ensuite soumission et approbation. Les paiements partiels réutilisent cette dépense : aucun double engagement.

## J. Treasury FIN-03

Le règlement délègue au décaissement existant. Le verrou de la dépense est acquis avant le verrou facture ; avoirs et paiements partagent cet ordre. Le solde fournisseur est vérifié dans la transaction qui crée le décaissement et l'unique mouvement Treasury. Clé UUID, paiement partiel, réservation facultative et contrepassation restent ceux de FIN-03.

## K. Concurrence

La recette a lancé deux paiements simultanés de 800 000 XAF sur un solde de 1 000 000 XAF : un seul a été accepté, l'autre rejeté, avec un seul mouvement Treasury et un reste de 200 000 XAF.

## L. RBAC

Onze permissions granulaires séparent vue, création, modification, soumission, validation, rejet, dette, avoir, règlement et historique. Aucun rôle métier n'est ajouté. `OWN` est refusé pour ces ressources collectives ; `AGENCY`, `CONCESSION` et `GLOBAL` produisent des prédicats SQL serveur. Aucun bypass SUPER_ADMIN n'a été introduit.

## M. GED

Les entités GED `supplier_invoice`, `supplier_credit_note`, `purchase_order` et `purchase_receipt` ont été ajoutées aux politiques existantes. Les types documentaires facture, avoir, commande, bon de livraison et preuve de paiement existaient déjà. Les contrôles GED et de périmètre restent centraux.

## N. Interface

Un onglet « Factures fournisseurs » est intégré à Pièces/Magasin : filtres fournisseur/statut/période/échues/soldées, indicateurs par devise, tableau des montants payés et soldes, détail rapprochement/avoirs/paiements/GED, dialogues de workflow, imputation, avoir et paiement. Les comptes, catégories Treasury et réservations FIN-03 sont sélectionnés depuis les référentiels existants. Aucun `window.prompt` ou `window.confirm` n'a été ajouté à FIN-05.

## O. Indicateurs

Les soldes sont groupés par devise : dette totale, échue, non échue, prochaine, partiellement réglée et soldée. Les règlements de période sont calculés séparément comme flux Treasury nets, sans addition inter-devise.

## P. Historique

Aucune ancienne commande ou réception ne devient automatiquement une facture. Les données historiques restent inchangées et nécessitent une saisie/réconciliation manuelle explicite.

## Q. Limites explicites

- Aucun mécanisme d'avance fournisseur n'existait : FIN-05 n'en invente pas.
- Les avoirs autonomes non imputés et les remboursements fournisseurs restent hors périmètre ; une entrée Treasury doit être réellement constatée par le workflow approprié.
- Pas de comptabilité générale, plan comptable, intérêts ou pénalités.

## R. Recette FIN05-01 à FIN05-40

| ID | État initial / action | Résultat obtenu | Verdict |
|---|---|---|---|
| 01 | Agence + fournisseur ; création | Brouillon et lignes créés | Conforme |
| 02 | Même fournisseur/référence ; création | HTTP 409 + contrainte unique | Conforme |
| 03 | Sans commande | Brouillon accepté | Conforme |
| 04 | Commande compatible | Lien contrôlé | Conforme |
| 05 | Réception compatible | Lien contrôlé | Conforme |
| 06 | Quantité > reçue | Écart `QUANTITY_OVER_RECEIVED` | Conforme |
| 07 | Prix différent | Écart `PRICE_MISMATCH` | Conforme |
| 08 | Brouillon ; soumission | Statut `SUBMITTED` | Conforme |
| 09 | Soumise ; validation autre acteur | Statut `VALIDATED` | Conforme |
| 10 | Créateur ; auto-validation | HTTP 409 | Conforme |
| 11 | Soumise ; rejet motivé | Statut/historique `REJECTED` | Conforme |
| 12 | Validée ; modification | HTTP 409 | Conforme |
| 13 | Validée sans paiement/avoir | Dette = total | Conforme |
| 14 | Paiement 800 000 / 1 000 000 | Payé 800 000, solde 200 000 | Conforme |
| 15 | Paiement/avoir au solde | Solde 0, statut payé | Conforme |
| 16 | Paiement > solde | HTTP 409 | Conforme |
| 17 | Deux paiements concurrents | 201 + 409, un mouvement | Conforme |
| 18 | Même UUID/contenu | Réponse idempotente, pas de doublon | Conforme |
| 19 | Avoir soumis puis validé | Dette réduite | Conforme |
| 20 | Avoir brouillon | Dette inchangée | Conforme |
| 21 | Avoir > solde | HTTP 409 sous verrou | Conforme |
| 22 | Mouvement contrepassé | Exclu du payé net | Conforme |
| 23 | Échéance passée | Marquée échue par date serveur | Conforme |
| 24 | Échéance future | Jours restants/non échue | Conforme |
| 25 | Budget actif compatible | Dépense FIN-02 brouillon créée | Conforme |
| 26 | Réservation valide | Consommation FIN-03 déléguée | Conforme |
| 27 | Deux imputations | Même dépense réutilisée | Conforme |
| 28 | Un règlement | Un mouvement Treasury | Conforme |
| 29 | Deux agences | Prédicat agence isole les données | Conforme |
| 30 | Deux concessions | Prédicat concession isole les données | Conforme |
| 31 | Plusieurs devises | Groupes séparés | Conforme |
| 32 | Permission absente | HTTP 403 | Conforme |
| 33 | Scope OWN/hors périmètre | HTTP 403 | Conforme |
| 34 | Pièces justificatives | Entités GED résolues et filtrées | Conforme |
| 35 | Historique sans facture | Aucun backfill inventé | Conforme |
| 36 | Facture validée/payée ; annulation | Refus, contrepassation exigée | Conforme |
| 37 | Réception seule | Aucune dette créée | Conforme |
| 38 | Service sans réception | Accepté explicitement | Conforme |
| 39 | Paiement rejeté | Aucun mouvement ni payé | Conforme |
| 40 | Solde/flux/indicateurs | Cohérents avec Treasury net | Conforme |

## S. MySQL 8.4 réel

- Image : MySQL `8.4.11`, conteneur jetable sur `tmpfs`, sans volume.
- Bootstrap frais : baseline puis migrations 072–075, version finale 75.
- Endpoints appelés avec JWT et session persistée ; création, doublon, quatre yeux, budget, paiements concurrents, avoir et indicateurs réussis.
- Conteneur arrêté et supprimé après la recette.

## T. Contrôles techniques

- Backend TypeScript : réussi.
- Frontend TypeScript/Vite : réussi.
- Tests statiques FIN-05 : 10/10 groupes réussis, couverture FIN05-01..40.
- Intégration MySQL/authentifiée FIN-05 : 1/1 scénario transversal réussi.
- `git diff --check` : réussi.

## U. Fichiers principaux

- `backend-node/database/migrations/075_supplier_invoice_debt_management.sql`
- `backend-node/src/modules/parts/supplier-finance.routes.ts`
- `backend-node/src/modules/treasury/treasury.service.ts`
- `backend-node/src/modules/documents/document-access.ts`
- `frontend/src/modules/parts/SupplierInvoicesPanel.tsx`
- `backend-node/test/fin05-supplier-invoices.test.ts`
- `backend-node/test/fin05-supplier-invoices-mysql.integration.test.ts`

## V. Déploiement

Non exécuté. Avant déploiement : sauvegarde, revue des permissions à affecter aux rôles dynamiques, migration 075 sur copie, puis recette métier comptable/achats/trésorerie.

## W. Retour arrière

La migration est additive, mais aucune suppression automatique n'est fournie. En cas de non-adoption avant données métier : sauvegarder, retirer les routes/UI, puis supprimer manuellement les seules tables 075 après validation DBA. Après utilisation, conserver les données et corriger par migration additive.

## X. Sécurité résiduelle

Le paiement exige cumulativement les permissions FIN-05, FIN-02 et Treasury. Les identifiants métier sont revérifiés côté serveur et les montants sont bornés à deux décimales. Les contraintes et verrouillages MySQL restent l'ultime barrière concurrente.

## Y. Exploitation

Surveiller les rejets 409 (doublon, écarts non justifiés, dépassement de solde), la file des factures soumises, les dépenses non approuvées et les dettes échues par devise.

## Z. Conclusion

FIN-05 relie désormais les achats, le budget et Treasury sans les confondre. Le registre auxiliaire est traçable, multi-entités, concurrent-safe et compatible avec les workflows FIN-02/03/04 existants.

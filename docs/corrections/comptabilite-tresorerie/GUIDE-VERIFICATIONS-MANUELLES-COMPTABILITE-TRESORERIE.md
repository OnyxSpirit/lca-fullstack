# Guide de vérifications manuelles — Comptabilité & Trésorerie

Utiliser exclusivement une base isolée et des données fictives. Ne jamais exécuter ces parcours sur `concession_erp`. Préparer deux agences A/B, un importateur bancaire, un valideur, un comptable, un responsable clôture, deux exercices et des périodes ouvertes.

## 1. Accès RBAC et changement d'agence

- Chemin : barre latérale **Trésorerie** → **Comptabilité** (`/treasury/accounting`).
- Permissions : tester séparément `accounting.entry.view`, `accounting.ledger.view`, `accounting.control.view`, puis aucune permission comptable.
- Étapes : connecter un utilisateur limité ; vérifier l'accès et les seuls onglets autorisés ; basculer de l'agence A vers B où les droits diffèrent.
- Attendu : la page reste accessible avec toute permission comptable utile ; l'onglet interdit disparaît et un onglet autorisé est sélectionné ; aucun 403 en boucle.
- Surveiller : absence de données de l'autre agence.

## 2. Écriture et comptabilisation

- Chemin : **Trésorerie** → **Comptabilité** → **Écritures**.
- Permissions : `accounting.entry.view`, puis permissions de création/validation/comptabilisation définies dans le rôle.
- Données : journal OD fictif, période ouverte, comptes imputables débit/crédit.
- Étapes : créer une écriture équilibrée ; tenter une écriture déséquilibrée ; valider puis comptabiliser ; retenter la modification.
- Attendu : déséquilibre refusé, succès visibles, boutons en attente pendant l'appel, écriture définitive non modifiable.
- Surveiller : dates dans la période, séquence, agence, absence de faux toast de succès.

## 3. Référentiels comptables

- Chemin : onglets **Plan comptable**, **Journaux**, **Liaisons**.
- Permissions : `accounting.chart.manage`, `accounting.journal.manage`, `accounting.mapping.manage`.
- Étapes : modifier une subdivision non protégée, consulter son historique, désactiver/réactiver un journal et une liaison.
- Attendu : historique visible, protections des comptes de référence respectées, erreurs serveur lisibles.

## 4. Clôture et réouverture

- Chemin : **Comptabilité** → **Contrôles & clôtures**.
- Permissions : `accounting.control.execute`, `accounting.control.view`, `accounting.closure.manage`.
- Étapes : exécuter les contrôles et ouvrir le détail ; tenter de clôturer sans préparation ; préparer puis clôturer ; ouvrir la modale de réouverture ; essayer un motif court puis un motif ≥ 10 caractères.
- Attendu : clôture non préparée refusée ; détail des anomalies visible ; réouverture courte refusée ; journal des clôtures actualisé.
- Surveiller : aucune action directe dans l'onglet **Exercices**, audit du motif, boutons désactivés pendant traitement.

## 5. Clôture annuelle et report à nouveau

- Chemin : **Comptabilité** → **Contrôles & clôtures** → cartes **Clôture annuelle et report à nouveau** / **Préparer le report à nouveau**.
- Permissions : `accounting.closure.manage`, `accounting.carryforward.manage`.
- Étapes : préparer un exercice ; sélectionner source et destination distinctes ; lancer la préparation du report.
- Attendu : analyse des soldes, statut `BLOCKED` et raison explicite tant que journal d'ouverture/contreparties/règles d'affectation ne sont pas validés ; aucune écriture générée silencieusement.

## 6. Import bancaire et séparation des rôles

- Chemin : **Trésorerie** → **Rapprochement bancaire**.
- Permissions : importateur `treasury.reconciliation.import`; valideur `treasury.reconciliation.validate_import`.
- Données : CSV <5 Mo, XLSX <10 Mo, PDF <15 Mo ; un fichier juste au-dessus de chaque limite.
- Étapes : importer/prévisualiser avec l'importateur ; vérifier l'absence de validation ; se connecter comme valideur ; valider, rejeter puis annuler avec motif.
- Attendu : limites exactes côté client, séparation import/validation, motifs obligatoires, historique conservé.

## 7. Profils d'import et OCR

- Chemin : **Rapprochement bancaire** → **Profils d'import**.
- Permission : `treasury.reconciliation.profile.manage`.
- Étapes : créer un brouillon, tenter de l'utiliser, valider le profil, le sélectionner à l'import, puis le désactiver. Importer un PDF bancaire scanné fictif lisible en français et anglais.
- Attendu : seuls les profils validés sont applicables ; configuration inconnue refusée/ignorée selon contrat ; diagnostic OCR sans alerte ; texte extrait et aperçu contrôlable.
- Surveiller : qualité OCR, dates/montants/signes, aucun relevé validé avant contrôle humain.

## 8. Rapprochement unitaire, groupé et partiel

- Chemin : **Rapprochement bancaire** → opérations, **Rapprochements groupés et allocations partielles**, puis historique des groupes.
- Permissions : `treasury.reconciliation.view`, `.reconcile`, `.cancel`, `.dashboard`.
- Données : deux lignes bancaires et deux mouvements fictifs permettant 1↔1, 1↔N et N↔1.
- Étapes : rapprocher unitaire ; créer plusieurs allocations ; tenter une surallocation ; ouvrir le détail du groupe ; annuler avec motif.
- Attendu : surallocation refusée, totaux cohérents, allocations détaillées, annulation auditée, aucun mouvement Treasury créé/modifié par le rapprochement.

## 9. Écarts et mouvements non rapprochés

- Chemin : même écran, sections **Mouvements Treasury sans contrepartie** et **Écarts**.
- Permission : `treasury.reconciliation.discrepancy.manage` pour créer l'écart.
- Étapes : créer un écart documenté sur une ligne ; vérifier liste et tableau de bord.
- Attendu : écart visible, KPI recalculés, agence respectée.

## 10. États, échanges et exports

- Chemin : **Comptabilité** → **Grand livre & balances** puis **États & échanges** ; tableau de bord financier pour son export.
- Permissions : `accounting.ledger.view`, `accounting.statement.view`, `accounting.exchange.view`, permissions d'export.
- Étapes : exporter CSV/PDF/XLSX ; ouvrir le XLSX ; consulter modèles et profils.
- Attendu : extension `.xlsx`, aucun avertissement de format, données/monnaie/agence cohérentes ; les états restent qualifiés de préparatoires ; Sage reste inactif sans spécification.

## Fin des essais

Conserver les captures, identifiants fictifs et messages d'erreur. Ne pas lancer la recette globale finale automatiquement : transmettre d'abord les écarts observés pour arbitrage et correction.

